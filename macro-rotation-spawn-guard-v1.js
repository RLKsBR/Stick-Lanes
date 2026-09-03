/* Stick Lanes — guarda da lane assignment macro v1
   O macro pode realocar APENAS tropas compradas durante a execução da IA.
   Spawns de QA, respawn, Lendas, minions e scripts auxiliares preservam a lane pedida. */
'use strict';
(function(){
if(typeof runSideAI!=='function'||typeof spawnUnit!=='function'||!window.SL_MACRO_ROTATION_AI)return;
let buyingSide=0;
const FRONT=new Set(['tank','fighter','bruiser']),BACK=new Set(['ranged','siege','support','controller']),DIVE=new Set(['assassin','skirmisher']);
function laneByPlan(side,lane,u){
 const plan=window.SL_MACRO_ROTATION_AI.getPlan?.(side),role=u?.role||'';if(!plan||plan.confidence<.52)return lane;
 if(plan.mode==='STABILIZE'&&(FRONT.has(role)||role==='support'||role==='controller'))return plan.weakLane;
 if((plan.mode==='SETUP'||plan.mode==='OBJECTIVE')&&plan.setupLanes?.length){if(FRONT.has(role)||role==='support')return plan.setupLanes.slice().sort((a,b)=>plan.states[a].prio-plan.states[b].prio)[0];return plan.strongLane}
 if(['COLLAPSE','CROSS_MAP','SIEGE','TEMPO'].includes(plan.mode))return plan.targetLane;
 if(simTime>300&&BACK.has(role)&&plan.states?.[1]?.prio>-.28)return 1;
 if(DIVE.has(role)||role==='bruiser')return plan.strongLane;
 return lane
}
/* Reinstala a implementação-base do spawn para não depender do wrapper amplo da v1. */
spawnUnit=function(side,lane,fac,u,opts={}){
 if(buyingSide===side&&!opts.minion&&!u?.special?.legend)lane=laneByPlan(side,lane,u);
 let born=simTime,initialSub=opts.sub??roleSub(u.role);
 let obj={id:++unitSeq,side,lane,sub:initialSub,subTarget:initialSub,fac,name:u.name,role:u.role,cost:opts.minion?0:(u.cost||0),
   x:side===1?BASE_X[1]+95:BASE_X[-1]-95,hp:u.hp,maxHp:u.hp,def:u.def,atk:u.atk,speed:u.speed,range:u.range,rate:u.rate,
   special:{...(u.special||{})},ability:u.ability,minion:!!opts.minion,minionType:opts.minionType||null,lastAttack:0,lastSkill:-999,lastDamaged:-999,
   stunUntil:0,slowUntil:0,dead:false,rewarded:false,chargeReady:true,revived:false,born,anim:Math.random()*10,
   powerFlash:-999,origSide:side,attackCount:0,radiation:0,acidStacks:0,lastMoved:born,runTime:0,combatSince:null,
   lastTargetId:null,lastTargetSwitch:-999,objectiveId:null,mentalGuardReadyAt:born,musicUntil:-999};
 applySpawnPassive(obj);units.push(obj);return obj
};
const previousAI=runSideAI;
runSideAI=function(side,t){buyingSide=side;try{return previousAI(side,t)}finally{buyingSide=0}};
window.SL_MACRO_ROTATION_SPAWN_GUARD={version:1,get buyingSide(){return buyingSide}};
})();