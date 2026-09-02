/* Stick Lanes — modo mobile landscape/fullscreen */
(function(){
'use strict';
let notice;
function ensureNotice(){
  if(notice)return notice;
  notice=document.createElement('div');notice.id='rotateNotice';notice.innerHTML='<b>Gire o celular</b><span>Stick Lanes é jogado na horizontal.</span>';
  document.body.appendChild(notice);return notice;
}
function syncOrientation(){
  const active=gameUI&&!gameUI.hidden,portrait=innerHeight>innerWidth;
  document.documentElement.classList.toggle('sl-match-active',active);
  document.documentElement.classList.toggle('sl-portrait-match',active&&portrait);
  if(active){ensureNotice();notice.hidden=!portrait;requestAnimationFrame(()=>{window.scrollTo(0,0)})}
}
function requestLandscape(){
  const el=document.documentElement;
  try{if(!document.fullscreenElement&&el.requestFullscreen)el.requestFullscreen({navigationUI:'hide'}).catch(()=>{})}catch(_){ }
  const lock=()=>{try{screen.orientation?.lock?.('landscape').catch(()=>{})}catch(_){ }};
  if(document.fullscreenElement)lock();else document.addEventListener('fullscreenchange',lock,{once:true});
  setTimeout(syncOrientation,60);
}
const oldLaunch=launchBattle;
launchBattle=function(...args){const r=oldLaunch.apply(this,args);requestLandscape();syncOrientation();return r};
window.addEventListener('resize',syncOrientation,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(syncOrientation,80),{passive:true});
document.addEventListener('fullscreenchange',syncOrientation);
syncOrientation();
})();
