/* Stick Lanes — layout defensivo v5: posições percentuais e cinco sub-lanes */
'use strict';
(function(){
const TOWER_PROGRESS=[.10,.20,.30,.40];
const LANE_TOWER_SUB={0:1.5,1:0,2:-1.5};
const LANE_BLOCKED={0:[1,2],1:[0],2:[-2,-1]};
makeStructures=function(){
  structures=[];structureSeq=0;
  const span=BASE_X[-1]-BASE_X[1];
  for(const side of [1,-1])for(let lane=0;lane<3;lane++)TOWER_PROGRESS.forEach((ownProgress,i)=>{
    const progress=side===1?ownProgress:1-ownProgress,x=BASE_X[1]+span*progress;
    const base=towerTypes[i],heavy=lane===1,hp=Math.round(base.hp*(heavy?1.65:1));
    structures.push({
      id:++structureSeq,side,lane,x,progress,ownProgress,kind:'tower',...base,hp,maxHp:hp,
      atk:Math.round(base.atk*(heavy?1.24:1)),range:base.range+(heavy?5:0),rate:base.rate*(heavy?.90:1),
      subOffset:LANE_TOWER_SUB[lane],blockedSubs:[...LANE_BLOCKED[lane]],openSubs:[-2,-1,0,1,2].filter(v=>!LANE_BLOCKED[lane].includes(v)),
      collisionSpan:2,lastAttack:0,dead:false,fortified:true,breachUntil:-999,centerHeavy:heavy
    })
  })
};
window.SL_LAYOUT_V5={name:'percentage-five-sublanes',towerProgress:TOWER_PROGRESS,laneTowerSub:LANE_TOWER_SUB,noMansLand:true};
})();
