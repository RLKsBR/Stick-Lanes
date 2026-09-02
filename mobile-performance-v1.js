/* Stick Lanes — proteção de performance para aparelhos móveis.
   Mantém a simulação completa, mas evita redesenhar o canvas 60x/s em touch/mobile. */
(function(){
'use strict';

const coarse=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);
const touch=(navigator.maxTouchPoints||0)>0;
const mobile=coarse||touch||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||'');
const targetFrameMs=mobile?32:16; // ~31 FPS mobile, ~60 FPS desktop

const oldDraw=typeof draw==='function'?draw:null;
let lastDrawAt=-Infinity,drawCalls=0,drawSkipped=0,lastFrameAt=performance.now(),rafFrames=0;

if(oldDraw){
  draw=function(t){
    const now=performance.now();
    if(now-lastDrawAt<targetFrameMs){drawSkipped++;return}
    lastDrawAt=now;drawCalls++;
    return oldDraw(t)
  };
}

/* HUD não precisa ser reconstruído 60x/s no celular. */
const oldHud=typeof hud==='function'?hud:null;
let lastHudAt=-Infinity;
if(oldHud){
  hud=function(t){
    const now=performance.now();
    if(mobile&&now-lastHudAt<90)return;
    lastHudAt=now;
    return oldHud(t)
  };
}

function pulse(){
  rafFrames++;
  lastFrameAt=performance.now();
  requestAnimationFrame(pulse);
}
requestAnimationFrame(pulse);

window.addEventListener('error',e=>{
  window.SL_LAST_RUNTIME_ERROR={message:String(e.message||e.error||'erro'),source:e.filename||'',line:e.lineno||0,time:Date.now()};
});
window.addEventListener('unhandledrejection',e=>{
  window.SL_LAST_RUNTIME_ERROR={message:String(e.reason||'promise rejeitada'),source:'promise',line:0,time:Date.now()};
});

window.SL_RUNTIME_HEALTH={
  mobile,
  targetFrameMs,
  get drawCalls(){return drawCalls},
  get drawSkipped(){return drawSkipped},
  get rafFrames(){return rafFrames},
  get lastFrameAgeMs(){return performance.now()-lastFrameAt},
  snapshot(){return{mobile,targetFrameMs,drawCalls,drawSkipped,rafFrames,lastFrameAgeMs:performance.now()-lastFrameAt,error:window.SL_LAST_RUNTIME_ERROR||null}}
};
})();
