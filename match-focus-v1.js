/* Stick Lanes — comandos compactos da faixa superior */
(function(){
'use strict';
const lanes=document.querySelector('#laneControls');
if(!lanes)return;
const laneNames=['TOP','MID','BOT'];
const labels={base:'Base',behind:'Atrás',ahead:'Frente',advance:'Avançar',attack:'Atacar'};
function compact(){
  lanes.querySelectorAll('.laneControl').forEach((box,i)=>{
    const strong=box.querySelector('strong');if(strong)strong.textContent=laneNames[i]||('L'+(i+1));
    box.querySelectorAll('button[data-v]').forEach(b=>{const txt=labels[b.dataset.v];if(txt)b.textContent=txt});
  });
}
new MutationObserver(compact).observe(lanes,{childList:true,subtree:true});
compact();
window.SL_MATCH_FOCUS_V1={compact};
})();
