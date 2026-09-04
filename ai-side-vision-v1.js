/* Stick Lanes — percepção honesta da IA v1
   Durante a decisão de cada lado, força inimiga só inclui unidades atualmente
   visíveis para aquele lado através de SL_VISION. Força aliada continua completa. */
'use strict';
(function boot(){
 if(!window.SL_VISION||typeof runSideAI!=='function'||typeof armyPower!=='function'||typeof laneSide!=='function'){setTimeout(boot,40);return}
 if(window.SL_AI_SIDE_VISION?.version>=1)return;
 const rawArmyPower=armyPower,rawRunSideAI=runSideAI;
 let viewer=0,filteredReads=0;
 function powerOf(list){return list.reduce((sum,u)=>sum+u.hp/Math.max(1,u.maxHp)*(u.atk/Math.max(.5,u.rate))*(u.minion?.55:1),0)}
 armyPower=function(side,lane){
   if(viewer&&(side===-viewer)){
     filteredReads++;return powerOf(laneSide(side,lane).filter(u=>SL_VISION.isVisibleTo(viewer,u)))
   }
   return rawArmyPower(side,lane)
 };
 runSideAI=function(side,t){viewer=side;try{return rawRunSideAI(side,t)}finally{viewer=0}};
 window.SL_AI_SIDE_VISION={version:1,health:()=>({loaded:true,viewer,filteredReads,usesOwnSideVision:true})};
})();
