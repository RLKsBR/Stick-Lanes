/* Stick Lanes — comandos compactos da faixa superior */
(function(){
'use strict';
const lanes=document.querySelector('#laneControls');
if(!lanes)return;
const laneNames=['TOP','MID','BOT'];
const labels={base:'Base',behind:'Atrás',ahead:'Frente',advance:'Avançar',attack:'Atacar'};

function setTextIfChanged(node,text){
  if(node&&node.textContent!==text)node.textContent=text;
}

function compact(){
  let laneIndex=0;
  lanes.querySelectorAll('.laneControl').forEach(box=>{
    const strong=box.querySelector('strong');
    setTextIfChanged(strong,box.classList.contains('laneControlAll')?'TODAS':laneNames[laneIndex++]);
    box.querySelectorAll('button[data-v]').forEach(b=>{
      const txt=labels[b.dataset.v];
      if(txt)setTextIfChanged(b,txt);
    });
  });
}

/*
 * Observa apenas filhos DIRETOS de #laneControls.
 * buildUI() adiciona/remove os cards de lane nesse nível; não precisamos observar
 * a subárvore. Isso evita o antigo ciclo de feedback em que compact() alterava
 * textContent, gerava outra mutação e chamava compact() indefinidamente.
 */
const observer=new MutationObserver(compact);
observer.observe(lanes,{childList:true});
compact();
window.SL_MATCH_FOCUS_V1={compact,observer};
})();
