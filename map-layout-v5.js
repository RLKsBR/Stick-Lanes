/* Stick Lanes — layout defensivo v5: torres não duelam nariz com nariz */
'use strict';
(function(){
makeStructures=function(){
  structures=[];
  const layouts={
    0:{1:[2300,4700,7000,9300],'-1':[20200,17800,15400,13200]},
    1:{1:[1850,3600,5550,7800],'-1':[20650,18900,16950,14700]},
    2:{1:[2600,5200,7600,9800],'-1':[19900,17400,15000,12700]}
  };
  for(const side of [1,-1])for(let lane=0;lane<3;lane++)layouts[lane][side].forEach((x,i)=>{
    const base=towerTypes[i],heavy=lane===1,hp=Math.round(base.hp*(heavy?1.65:1));
    structures.push({
      side,lane,x,kind:'tower',...base,hp,maxHp:hp,
      atk:Math.round(base.atk*(heavy?1.24:1)),range:base.range+(heavy?5:0),rate:base.rate*(heavy?.90:1),
      lastAttack:0,dead:false,fortified:true,breachUntil:-999,centerHeavy:heavy
    })
  })
};
window.SL_LAYOUT_V5={name:'staggered-defense-lines',noMansLand:true};
})();
