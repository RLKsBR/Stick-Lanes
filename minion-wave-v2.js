/* Stick Lanes — formação de minions v2
   Por lane: 1 tanque na frente, 2 lutadores no meio, 3 ranged atrás. */
'use strict';
(function(){
const FORMATION=[
  {type:'tank',sub:0,offset:185},
  {type:'fighter',sub:-1,offset:95},
  {type:'fighter',sub:1,offset:75},
  {type:'ranged',sub:-2,offset:-35},
  {type:'ranged',sub:0,offset:-65},
  {type:'ranged',sub:2,offset:-95}
];

spawnWave=function(side){
  const fac=sideFactions[side][waveIndex%2];
  for(let lane=0;lane<3;lane++){
    for(const slot of FORMATION){
      const p=SL_MINION_PROFILES[slot.type],name=facMeta(fac).minions[slot.type];
      const u={
        name,role:slot.type,hp:p.hp,def:p.def,atk:p.atk,speed:p.speed,range:p.range,rate:p.rate,cost:0,gen:0,
        special:slot.type==='tank'?{block:.06,tank:true}:slot.type==='ranged'?{ranged:true}:{},
        ability:{name:'Minion',desc:'Unidade automática'}
      };
      const obj=spawnUnit(side,lane,fac,u,{minion:true,minionType:slot.type,sub:slot.sub});
      obj.x=clamp(obj.x+side*slot.offset,BASE_X[1]+70,BASE_X[-1]-70);
    }
  }
};

window.SL_MINION_WAVE_V2={formation:FORMATION,subLanes:5,totalPerLane:6,totalPerSide:18};
})();
