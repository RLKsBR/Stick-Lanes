/* Optional assisted-mode diagnostics. Bounded history, updated on AI decisions. */
'use strict';
(function(){
 const panel=document.createElement('details');panel.id='aiDiagnostics';panel.className='panel compactPanel';panel.hidden=true;
 const summary=document.createElement('summary');summary.textContent='Decisões da IA';panel.appendChild(summary);
 const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px';panel.appendChild(output);
 const button=document.createElement('button');button.className='secondary';button.textContent='Exportar diagnóstico';panel.appendChild(button);
 document.querySelector('#gameUI').appendChild(panel);
 const lanes=['Top','Mid','Bot'],modes={PUSH:'Pressionar',DEFEND:'Defender',FINISH:'Finalizar'},reasons={'initial':'plano inicial','same-plan':'plano mantido','forced-lock':'comando de teste','commitment':'tempo de compromisso','hysteresis':'vantagem insuficiente para trocar','emergency':'emergência','better-score':'melhor pontuação'};
 function report(){return{format:'stick-lanes-diagnostics-v1',ruleset:'runtime-consolidation-2026-09-10',simTime,controller:SL_AI_FUNCTIONAL_CONTROLLER.health(),decisions:SL_AI_FUNCTIONAL_CONTROLLER.trace(),navigation:SL_JUNGLE_PATHFINDING.health(),perception:SL_AI_SIDE_VISION.health(),runtime:window.SL_RUNTIME_HEALTH?.snapshot?.()||null}}
 function update(){
   panel.hidden=gameMode!=='robot';if(panel.hidden||!panel.open)return;
   output.textContent=[1,-1].map(side=>{
     const s=SL_AI_FUNCTIONAL_CONTROLLER.get(side),p=s.plan,d=s.lastDecision;
     if(!p)return(side===1?'Laranja':'Vermelho')+': aguardando';
     return(side===1?'Laranja':'Vermelho')+': '+modes[p.mode]+' '+lanes[p.lane]+' | compromisso '+Math.max(0,p.lockUntil-simTime).toFixed(1)+'s\n'+
       (d?reasons[d.outcome]||d.outcome:'')+' — '+p.reason+'\n'+
       (d?.lanes||[]).map(l=>lanes[l.lane]+': pressão '+l.push.toFixed(2)+', perigo '+l.danger.toFixed(2)+', minions visíveis '+l.foeWave).join(' | ');
   }).join('\n\n');
 }
 panel.addEventListener('toggle',update);
 button.onclick=()=>{
   const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='stick-lanes-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 window.SL_AI_DIAGNOSTICS={update,report};
})();
