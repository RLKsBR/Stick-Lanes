/* Percepção explícita: uma fotografia por decisão, sem alterar armyPower global. */
'use strict';
(function(){
 const vision=window.SL_VISION;
 if(!vision)throw new Error('AI perception requires SL_VISION before ai-side-vision-v1.js');
 let filteredReads=0,snapshots=0;
 function powerOf(list){return list.reduce((sum,u)=>sum+u.hp/Math.max(1,u.maxHp)*(u.atk/Math.max(.5,u.rate))*(u.minion?.55:1),0)}
 function capture(side){
   if(side!==1&&side!==-1)throw new Error('Invalid perception side');
   const own=[[],[],[]],enemy=[[],[],[]],sources=vision.visionSources(side);
   for(const u of units){
     if(u.dead||u.tacticalWorld)continue;
     if(u.side===side)own[u.lane].push(u);
     else if(u.side===-side){filteredReads++;if(vision.isVisibleTo(side,u,sources))enemy[u.lane].push(u)}
   }
   snapshots++;
   return own.map((list,lane)=>({lane,own:powerOf(list),foe:powerOf(enemy[lane]),ownWave:list.filter(u=>u.minion).length,foeWave:enemy[lane].filter(u=>u.minion).length}));
 }
 window.SL_AI_SIDE_VISION={version:2,capture,health:()=>({loaded:true,filteredReads,snapshots,usesOwnSideVision:true,explicitPerception:true})};
})();
