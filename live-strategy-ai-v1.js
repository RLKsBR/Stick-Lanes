/* Stick Lanes — IA estratégica adaptativa ao vivo v1
   Aprende ordens, lanes e compras a partir do resultado observado. A IA usa
   somente as mesmas ordens, ouro, recargas e tropas disponíveis ao jogador. */
'use strict';
(function(){
const STORE_KEY='stickLanesLiveStrategy.v1';
const ACTIONS=['base','behind','ahead','advance','attack'];
const FEATURES=['bias','threat','opportunity','wave','enemyWeak','ownWeak','forward','center'];
const clampAI=(v,a,b)=>Math.max(a,Math.min(b,v));
const defaultWeights={
 base:[-.65,1.35,-.85,-.45,-.15,1.30,-.55,0],
 behind:[-.10,1.05,-.45,-.05,-.10,.85,-.18,0],
 ahead:[.05,.08,.20,.12,.18,-.08,.24,0],
 advance:[.38,-.18,.52,1.05,.48,-.15,.22,.04],
 attack:[-.12,-.45,1.05,-.30,1.18,-.28,.68,.02]
};
let memory=loadMemory(),episodes={},lastSavedAt=0,ended=false;

function freshPolicy(){return{weights:Object.fromEntries(ACTIONS.map(a=>[a,defaultWeights[a].slice()])),unitQ:{},laneQ:[0,0,0],adjustments:0,games:0,wins:0}}
function loadMemory(){
 try{let x=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(x&&x.version===1&&x.policies)return x}catch(_){/* armazenamento opcional */}
 return{version:1,policies:{},totalAdjustments:0,totalGames:0}
}
function saveMemory(force=false){
 if(!force&&simTime-lastSavedAt<15)return;lastSavedAt=simTime;
 try{localStorage.setItem(STORE_KEY,JSON.stringify(memory))}catch(_){/* jogo continua sem persistência */}
}
function pairKey(side){return(sideFactions[side]||[]).slice().sort().join('+')||'geral'}
function policyFor(side){let key=pairKey(side);return memory.policies[key]||(memory.policies[key]=freshPolicy())}
function healthRatio(s){return s.maxHp?clampAI(s.hp/s.maxHp,0,1):0}
function frontStructure(side,lane){
 let list=aliveTowers(side,lane);if(!list.length)return null;
 return list.sort((a,b)=>side===1?b.x-a.x:a.x-b.x)[0]
}
function laneFeatures(side,lane){
 let own=armyPower(side,lane),foe=armyPower(-side,lane),sum=Math.max(20,own+foe),ownS=frontStructure(side,lane),foeS=frontStructure(-side,lane);
 let ours=units.filter(u=>!u.dead&&u.side===side&&u.lane===lane),forward=0;
 if(ours.length)forward=ours.reduce((n,u)=>n+(side===1?u.x/WORLD_W:1-u.x/WORLD_W),0)/ours.length;
 return[
  1,
  clampAI((foe-own)/sum,-1,1),
  clampAI((own-foe)/sum,-1,1),
  units.some(u=>!u.dead&&u.minion&&u.side===side&&u.lane===lane)?1:-.25,
  foeS?1-healthRatio(foeS):1,
  ownS?1-healthRatio(ownS):1,
  clampAI((forward-.5)*2,-1,1),
  lane===1?1:0
 ]
}
function dot(a,b){let n=0;for(let i=0;i<b.length;i++)n+=(a[i]||0)*b[i];return n}
function softChoice(options,temp=.46,explore=.08){
 if(Math.random()<explore)return options[Math.floor(Math.random()*options.length)];
 let max=Math.max(...options.map(x=>x.score)),weights=options.map(x=>Math.exp(clampAI((x.score-max)/temp,-16,4))),sum=weights.reduce((a,b)=>a+b,0),r=Math.random()*sum;
 for(let i=0;i<options.length;i++){r-=weights[i];if(r<=0)return options[i]}return options[options.length-1]
}
function laneOutcome(side,lane){
 let own=armyPower(side,lane),foe=armyPower(-side,lane),ownS=frontStructure(side,lane),foeS=frontStructure(-side,lane);
 let power=(own-foe)/Math.max(40,own+foe),structure=(foeS?1-healthRatio(foeS):1)-(ownS?1-healthRatio(ownS):1);
 return clampAI(power*.45+structure*.55,-1.5,1.5)
}
function matchOutcome(side){
 let ownStruct=structures.filter(s=>s.side===side).reduce((n,s)=>n+healthRatio(s),0),foeStruct=structures.filter(s=>s.side===-side).reduce((n,s)=>n+healthRatio(s),0);
 let ownBase=baseHp(side)/BASE_HP,foeBase=baseHp(-side)/BASE_HP;
 return (ownBase-foeBase)*1.8+(ownStruct-foeStruct)/Math.max(1,structures.length/2)
}
function episodeFor(side){
 if(episodes[side])return episodes[side];
 return episodes[side]={policy:policyFor(side),lastOrders:[null,null,null],pendingOrders:[null,null,null],pendingBuys:[],nextOrder:0,nextBuy:0}
}
function learnOrder(ep,pending,reward,terminal=false){
 if(!pending)return;let scale=terminal?.11:.035,delta=clampAI(reward,-1,1)*scale;
 let w=ep.policy.weights[pending.action];for(let i=0;i<w.length;i++)w[i]=clampAI(w[i]+delta*pending.features[i],-3,3);
 ep.policy.adjustments++;memory.totalAdjustments++
}
function settleOrders(side,terminalReward=null){
 let ep=episodeFor(side);
 for(let lane=0;lane<3;lane++){let p=ep.pendingOrders[lane];if(!p)continue;let reward=terminalReward===null?laneOutcome(side,lane)-p.before:terminalReward;learnOrder(ep,p,reward,terminalReward!==null);if(terminalReward===null)ep.pendingOrders[lane]=null}
}
function chooseOrders(side,t){
 let ep=episodeFor(side);if(t<ep.nextOrder)return;ep.nextOrder=t+2.4;settleOrders(side);
 for(let lane=0;lane<3;lane++){
  let features=laneFeatures(side,lane),options=ACTIONS.map(action=>({action,score:dot(ep.policy.weights[action],features)+(ep.lastOrders[lane]===action?.08:0)})),pick=softChoice(options);
  orders[side][lane]=pick.action;ep.lastOrders[lane]=pick.action;ep.pendingOrders[lane]={action:pick.action,features,before:laneOutcome(side,lane),t}
 }
 if(side===1&&gameMode==='robot')syncOrderButtons(1)
}
function settleBuys(side,t,forceReward=null){
 let ep=episodeFor(side),keep=[];
 for(const p of ep.pendingBuys){
  if(forceReward===null&&t-p.t<12){keep.push(p);continue}
  let reward=forceReward===null?laneOutcome(side,p.lane)-p.before:forceReward,q=ep.policy.unitQ[p.key]||0;
  ep.policy.unitQ[p.key]=clampAI(q*.88+clampAI(reward,-1,1)*.12,-1.5,1.5);ep.policy.laneQ[p.lane]=clampAI(ep.policy.laneQ[p.lane]*.9+clampAI(reward,-1,1)*.1,-1,1);
  ep.policy.adjustments++;memory.totalAdjustments++
 }
 ep.pendingBuys=keep
}
function buyUnit(side,t){
 let ep=episodeFor(side);settleBuys(side,t);if(t<ep.nextBuy)return;ep.nextBuy=t+.7;
 let ready=aiSpawnCd[side],usage=aiUse[side],roster=sideRoster(side),options=[];
 for(const x of roster){let key=x.fac+'|'+x.u.name;if(sideGold(side)<x.u.cost||t<(ready[key]||0)||!canSpawnUnit(side,x.u))continue;
  for(let lane=0;lane<3;lane++){
   let f=laneFeatures(side,lane),learned=ep.policy.unitQ[key]||0,laneLearned=ep.policy.laneQ[lane]||0;
   let prior=sideSpawnWeights?.[side]||[1,1,1],priorSum=prior.reduce((a,b)=>a+b,0)||3,openingBias=clampAI(1-t/240,0,.22)*(prior[lane]/priorSum-1/3)*3;
   let needFront=f[1]>.18&&(x.u.role==='tank'||x.u.role==='fighter'||x.u.role==='bruiser')?.28:0;
   let needRange=f[2]>.18&&(x.u.role==='ranged'||x.u.role==='siege'||x.u.role==='support')?.16:0;
   let value=Math.log1p(Math.max(0,unitValue(x.u))*40)*.32;
   options.push({x,key,lane,score:value+learned+laneLearned+openingBias+f[1]*.30+needFront+needRange-Math.min(1,x.u.cost/Math.max(1,sideGold(side)))*.10})
  }
 }
 if(!options.length)return;let pick=softChoice(options,.40,.10),u=pick.x.u;
 spendSideGold(side,u.cost);ready[pick.key]=t+u.gen;usage[pick.key]=(usage[pick.key]||0)+1;spawnUnit(side,pick.lane,pick.x.fac,u);
 ep.pendingBuys.push({key:pick.key,lane:pick.lane,before:laneOutcome(side,pick.lane),t})
}
function updateStatus(){
 let el=document.querySelector('#modeStatus');if(!el||el.dataset.adaptive)return;el.dataset.adaptive='1';el.textContent+=(el.textContent?' • ':'')+'IA adaptativa'
}
runSideAI=function(side,t){chooseOrders(side,t);buyUnit(side,t);updateStatus();saveMemory()};

const baseReset=reset;
reset=function(){episodes={};ended=false;lastSavedAt=0;baseReset()};
const baseSimulationStep=simulationStep;
simulationStep=function(dt){
 baseSimulationStep(dt);
 if(!ended&&(playerBase<=0||enemyBase<=0)){
  ended=true;
  for(const side of [1,-1])if(side===-1||gameMode==='robot'){
   let ep=episodeFor(side),won=baseHp(side)>0&&baseHp(-side)<=0,reward=won?1:-1;
   settleOrders(side,reward);settleBuys(side,simTime,reward);ep.policy.games++;if(won)ep.policy.wins++;memory.totalGames++
  }
  saveMemory(true)
 }
};

window.SL_LIVE_STRATEGY_AI={version:1,actions:ACTIONS,features:FEATURES,getMemory:()=>memory,coverage:'same-actions-no-hidden-bonuses'};
})();
