/* Stick Lanes — camada de macro/rotações inspirada em conceitos de LoL profissional v1
   Ordem mental: PRIO -> TEMPO -> NÚMEROS -> STRONG/WEAK SIDE -> SETUP ->
   OBJECTIVE/CROSS-MAP/COLLAPSE -> SIEGE. A micro da Lenda continua soberana
   durante RETREAT, KITE, PEEL, ALL-IN e POKE. Sem bônus oculto. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map||typeof runSideAI!=='function'||typeof spawnUnit!=='function')return;

const FRONT=new Set(['tank','fighter','bruiser']);
const BACK=new Set(['ranged','siege','support','controller']);
const DIVE=new Set(['assassin','skirmisher']);
const MICRO_LOCK=new Set(['RETREAT','KITE','PEEL','ALL_IN','POKE']);
const ROTATION_TERMS=Object.freeze({
 PRIO:'prioridade de lane: quem empurrou e pode se mover primeiro',
 TEMPO:'janela livre criada por pressão/crash para agir antes da resposta inimiga',
 STRONG_SIDE:'lado do mapa onde vale concentrar recursos e pressão',
 WEAK_SIDE:'lado que deve sobreviver e absorver pressão com menos recursos',
 NUMBERS:'vantagem ou desvantagem numérica antes de comprometer uma rotação',
 SETUP:'preparar lanes adjacentes antes de entrar num objetivo',
 CROSS_MAP:'trocar a resposta para o lado oposto quando o inimigo já comprometeu recursos',
 COLLAPSE:'convergir sobre um alvo isolado com superioridade local',
 LANE_ASSIGNMENT:'realocar novas tropas para sustentar o plano macro atual',
 SIEGE:'converter prioridade e vantagem em dano estrutural',
 TURN:'abandonar a captura e lutar quando o adversário entra numa disputa favorável'
});
const runtime={1:freshRuntime(),'-1':freshRuntime()};
function freshRuntime(){return{nextThink:0,nextLegend:0,plan:null,lastPlan:null,lastAssigned:null}}
const clampM=(v,a,b)=>Math.max(a,Math.min(b,v));
function isAISide(side){return side===-1||gameMode==='robot'}
function hpRatio(o){return o?.maxHp?clampM(o.hp/o.maxHp,0,1):0}
function progressFor(u,side=u.side){let q=(u.x-BASE_X[1])/Math.max(1,BASE_X[-1]-BASE_X[1]);return clampM(side===1?q:1-q,0,1)}
function laneUnits(side,lane){return units.filter(u=>!u.dead&&u.side===side&&u.lane===lane&&!u.tacticalWorld)}
function frontStructure(side,lane){let list=aliveTowers(side,lane);if(!list.length)return null;return list.sort((a,b)=>side===1?b.x-a.x:a.x-b.x)[0]}
function laneState(side,lane){
 const own=laneUnits(side,lane),foe=laneUnits(-side,lane),ownPower=armyPower(side,lane),foePower=armyPower(-side,lane),sum=Math.max(30,ownPower+foePower),ownS=frontStructure(side,lane),foeS=frontStructure(-side,lane);
 const ownMinions=own.filter(u=>u.minion),foeMinions=foe.filter(u=>u.minion),ownTroops=own.filter(u=>!u.minion),foeTroops=foe.filter(u=>!u.minion);
 const forward=own.length?own.reduce((n,u)=>n+progressFor(u,side),0)/own.length:.18;
 const prio=clampM((ownPower-foePower)/sum,-1,1),enemyWeak=foeS?1-hpRatio(foeS):1,ownWeak=ownS?1-hpRatio(ownS):1;
 const waveEdge=clampM((ownMinions.length-foeMinions.length)/6,-1,1),crash=ownMinions.length>=foeMinions.length+2&&forward>.48;
 const tempo=clampM(prio*.48+waveEdge*.18+(crash?.22:0)+enemyWeak*.16+(forward-.5)*.18,-1,1);
 const numbers=ownTroops.length-foeTroops.length;
 return{lane,ownPower,foePower,prio,enemyWeak,ownWeak,forward,waveEdge,crash,tempo,numbers,ownCount:ownTroops.length,foeCount:foeTroops.length,ownS,foeS}
}
function allLaneStates(side){return[0,1,2].map(l=>laneState(side,l))}
function legend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function worldOf(u){return map.unitPos(u)}
function zoneForUnit(u){if(!u)return null;const p=worldOf(u);return window.SL_BUFF_SYSTEM?.zones?.find(z=>window.SL_BUFF_SYSTEM?.containsBuff?.(z,p))||null}
function adjacentLanes(zone){return zone?.jungleId==='upper'?[0,1]:zone?.jungleId==='lower'?[1,2]:[1]}
function oppositeJungle(id){return id==='upper'?'lower':id==='lower'?'upper':null}
function underEnemyTower(side,target){if(!target||!Number.isInteger(target.lane))return false;return structures.some(s=>!s.dead&&s.side===-side&&s.lane===target.lane&&Math.abs(s.x-target.x)<=Math.max(180,(s.range||5)*PX*.9))}
function nearbyPower(side,point,r=760){let n=0,count=0;for(const u of units){if(u.dead||u.side!==side)continue;const p=worldOf(u),d=Math.hypot(p.x-point.x,p.y-point.y);if(d>r)continue;const hp=.25+.75*hpRatio(u),dps=Math.max(1,u.atk)/Math.max(.45,u.rate||1),dur=1+Math.max(0,u.def||0)/180,w=u.minion?.42:1;n+=dps*dur*hp*w;count++}return{power:n,count}}
function isolatedEnemyLegend(side){
 const enemy=legend(-side);if(!enemy||enemy.tacticalWorld)return null;const p=worldOf(enemy),escort=units.filter(u=>!u.dead&&u.side===-side&&u!==enemy&&!u.minion).filter(u=>{const q=worldOf(u);return Math.hypot(q.x-p.x,q.y-p.y)<650}).length;
 const ours=nearbyPower(side,p),theirs=nearbyPower(-side,p);if(escort<=1&&ours.power>theirs.power*.92&&ours.count>=theirs.count)return enemy;return null
}
function objectiveValue(side,zone,states,t){
 const api=window.SL_BUFF_SYSTEM,s=api?.zoneState?.(zone.id,t);if(!api||!api.canCapture?.(zone,t)||s?.owner===side)return-Infinity;
 const me=legend(side),enemy=legend(-side),adj=adjacentLanes(zone),prio=adj.reduce((n,l)=>n+states[l].prio,0)/adj.length,tempo=adj.reduce((n,l)=>n+states[l].tempo,0)/adj.length;
 let score=.16+prio*.30+tempo*.24+(s?.capturingSide===-side?.30:0)+(s?.contested?.12:0),def=api.defs?.[zone.id];
 if(zone.id==='buff3'&&me)score+=(1-hpRatio(me))*.24;
 if(zone.id==='buff4')score+=units.filter(u=>!u.dead&&u.side===side&&!u.minion&&!u.special?.legend).length>=5?.14:.03;
 if(zone.id==='buff1'&&me?.special?.legendKind==='vesper')score+=.08;
 if(zone.id==='buff2')score+=states.some(x=>x.enemyWeak>.45)?.08:0;
 if(def?.damage)score+=.04;
 if(me){const a=worldOf(me);score-=Math.min(.22,Math.hypot(a.x-zone.x,a.y-zone.y)/9500)}
 if(enemy){const ez=zoneForUnit(enemy);if(ez?.id===zone.id&&hpRatio(me)<hpRatio(enemy)-.12)score-=.22}
 return score
}
function enemyCommitment(side,states){
 const enemy=legend(-side);if(enemy){const z=zoneForUnit(enemy);if(z)return{kind:'jungle',jungleId:z.jungleId,zone:z,lane:null};if(!enemy.tacticalWorld&&Number.isInteger(enemy.lane))return{kind:'lane',lane:enemy.lane,jungleId:enemy.lane===0?'upper':enemy.lane===2?'lower':null}}
 const upper=states[0].foePower+states[1].foePower*.55,lower=states[2].foePower+states[1].foePower*.55;if(Math.abs(upper-lower)>Math.max(40,(upper+lower)*.18))return{kind:'mass',jungleId:upper>lower?'upper':'lower',lane:upper>lower?0:2};return null
}
function chooseStrongWeak(states){
 const strong=states.slice().sort((a,b)=>(b.prio*.36+b.tempo*.31+b.enemyWeak*.28-b.ownWeak*.08)-(a.prio*.36+a.tempo*.31+a.enemyWeak*.28-a.ownWeak*.08))[0];
 const weak=states.slice().sort((a,b)=>(b.ownWeak*.38-b.prio*.34+(b.foePower-b.ownPower)/Math.max(30,b.foePower+b.ownPower)*.28)-(a.ownWeak*.38-a.prio*.34+(a.foePower-a.ownPower)/Math.max(30,a.foePower+a.ownPower)*.28))[0];
 return{strong:strong.lane,weak:weak.lane}
}
function makePlan(side,t){
 const states=allLaneStates(side),{strong,weak}=chooseStrongWeak(states),baseDanger=1-baseHp(side)/BASE_HP,enemy=legend(-side),commit=enemyCommitment(side,states),api=window.SL_BUFF_SYSTEM,zones=api?.zones||[];
 let plan={mode:'NEUTRAL',term:'STRONG_SIDE',strongLane:strong,weakLane:weak,targetLane:strong,objective:null,setupLanes:[],prio:states[strong].prio,tempo:states[strong].tempo,confidence:.30,reason:'default-pressure',states,enemyCommit:commit,t};
 const emergency=states.slice().sort((a,b)=>(b.ownWeak-b.prio)-(a.ownWeak-a.prio))[0];
 if(baseDanger>.62||emergency.prio<-.48&&emergency.ownWeak>.32)return{...plan,mode:'STABILIZE',term:'WEAK_SIDE',weakLane:emergency.lane,targetLane:emergency.lane,confidence:.92,reason:'base-or-tower-under-heavy-pressure'};
 const collapse=isolatedEnemyLegend(side);if(collapse&&!underEnemyTower(side,collapse)&&hpRatio(legend(side))>.46)return{...plan,mode:'COLLAPSE',term:'COLLAPSE',targetLane:collapse.lane,targetUnitId:collapse.id,strongLane:collapse.lane,confidence:.84,reason:'isolated-enemy-legend-with-local-numbers'};
 const scored=zones.map(z=>({zone:z,score:objectiveValue(side,z,states,t)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score),best=scored[0]||null;
 if(commit?.jungleId){
   const opposite=oppositeJungle(commit.jungleId),cross=scored.filter(x=>x.zone.jungleId===opposite).sort((a,b)=>b.score-a.score)[0];
   const ourLegend=legend(side),enemyLegend=legend(-side),badDirect=ourLegend&&enemyLegend&&hpRatio(ourLegend)+.10<hpRatio(enemyLegend);
   if(cross&&cross.score>.10&&(badDirect||best?.zone?.jungleId===commit.jungleId&&states[weak].prio<-.12)){
     const lanes=adjacentLanes(cross.zone),target=lanes.slice().sort((a,b)=>states[b].tempo-states[a].tempo)[0];return{...plan,mode:'CROSS_MAP',term:'CROSS_MAP',objective:cross.zone,setupLanes:lanes,targetLane:target,strongLane:target,confidence:.86,reason:'enemy-committed-opposite-side'}
   }
 }
 if(commit?.lane===0&&states[2].tempo>.16&&states[2].enemyWeak>.18)return{...plan,mode:'CROSS_MAP',term:'CROSS_MAP',targetLane:2,strongLane:2,confidence:.72,reason:'enemy-commit-top-opens-bot'};
 if(commit?.lane===2&&states[0].tempo>.16&&states[0].enemyWeak>.18)return{...plan,mode:'CROSS_MAP',term:'CROSS_MAP',targetLane:0,strongLane:0,confidence:.72,reason:'enemy-commit-bot-opens-top'};
 if(best&&best.score>.22){
   const lanes=adjacentLanes(best.zone),avgPrio=lanes.reduce((n,l)=>n+states[l].prio,0)/lanes.length,avgTempo=lanes.reduce((n,l)=>n+states[l].tempo,0)/lanes.length,target=lanes.slice().sort((a,b)=>states[b].tempo-states[a].tempo)[0];
   if(avgPrio<.08||avgTempo<.05)return{...plan,mode:'SETUP',term:'SETUP',objective:best.zone,setupLanes:lanes,targetLane:target,strongLane:target,confidence:.70,reason:'objective-needs-adjacent-lane-prio'};
   return{...plan,mode:'OBJECTIVE',term:'PRIO',objective:best.zone,setupLanes:lanes,targetLane:target,strongLane:target,confidence:.78,reason:'prio-and-tempo-open-objective'}
 }
 const siege=states.slice().sort((a,b)=>(b.enemyWeak+b.prio*.55+b.tempo*.45)-(a.enemyWeak+a.prio*.55+a.tempo*.45))[0];
 if(!enemy&&siege.prio>-.05||siege.enemyWeak>.62&&siege.prio>.10)return{...plan,mode:'SIEGE',term:'SIEGE',targetLane:siege.lane,strongLane:siege.lane,confidence:.82,reason:!enemy?'enemy-legend-dead-convert':'weak-enemy-structure-with-prio'};
 if(states[strong].tempo>.18)return{...plan,mode:'TEMPO',term:'TEMPO',targetLane:strong,strongLane:strong,confidence:.58,reason:'crash-or-pressure-created-free-window'};
 return plan
}
function planFor(side,t=simTime){let r=runtime[side];if(!r.plan||t>=r.nextThink){r.lastPlan=r.plan;r.plan=makePlan(side,t);r.nextThink=t+1.8}return r.plan}
function setOrder(side,lane,order){if(Number.isInteger(lane)&&orders?.[side])orders[side][lane]=order}
function applyMacroOrders(side,plan){
 if(!plan)return;
 if(plan.mode==='STABILIZE'){setOrder(side,plan.weakLane,plan.states[plan.weakLane].prio<-.62?'base':'behind');for(const l of[0,1,2])if(l!==plan.weakLane&&plan.states[l].prio>.08)setOrder(side,l,'advance');return}
 if(plan.mode==='SETUP'||plan.mode==='OBJECTIVE'){for(const l of plan.setupLanes)setOrder(side,l,plan.states[l].prio>.24?'attack':'advance');if(!plan.setupLanes.includes(plan.weakLane)&&plan.states[plan.weakLane].prio<-.20)setOrder(side,plan.weakLane,'behind');return}
 if(plan.mode==='COLLAPSE'){setOrder(side,plan.targetLane,'attack');return}
 if(plan.mode==='CROSS_MAP'||plan.mode==='SIEGE'){setOrder(side,plan.targetLane,'attack');if(plan.weakLane!==plan.targetLane&&plan.states[plan.weakLane].prio<-.14)setOrder(side,plan.weakLane,'behind');return}
 if(plan.mode==='TEMPO'){setOrder(side,plan.targetLane,plan.states[plan.targetLane].enemyWeak>.28?'attack':'advance');return}
 setOrder(side,plan.strongLane,'advance');if(plan.weakLane!==plan.strongLane&&plan.states[plan.weakLane].prio<-.25)setOrder(side,plan.weakLane,'behind')
}
function clearLegendManual(u){delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination}
function sendLegendPoint(u,lane,ratio){if(!u)return false;ratio=clampM(ratio,.07,.93);const p=map.routePoint(lane,ratio),x=BASE_X[1]+ratio*(BASE_X[-1]-BASE_X[1]),start=worldOf(u);clearLegendManual(u);u.tacticalWorld={x:start.x,y:start.y,a:start.a||0};u.tacticalDestination={kind:'point',lane,x,t:ratio,world:{x:p.x,y:p.y}};return true}
function sendLegendLane(u,lane,aggressive=false){const ratio=aggressive?(u.side===1?.58:.42):(u.side===1?.34:.66);return sendLegendPoint(u,lane,ratio)}
function sendLegendTarget(u,target){if(!u||!target||target.dead||target.side===u.side)return false;const a=worldOf(u),p=worldOf(target);clearLegendManual(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'unit',unitId:target.id,lane:target.lane,x:target.x,world:{x:p.x,y:p.y}};return true}
function applyLegendRotation(side,plan,t){
 const u=legend(side);if(!u||t<runtime[side].nextLegend)return;runtime[side].nextLegend=t+.95;
 const micro=window.SL_LIVE_STRATEGY_AI?.getLegendState?.(side);if(MICRO_LOCK.has(micro))return;
 const hp=hpRatio(u),recent=t-u.lastDamaged<3.2;if(hp<.43||recent&&hp<.56)return;
 if(plan.mode==='COLLAPSE'){const target=units.find(v=>!v.dead&&v.id===plan.targetUnitId&&v.side===-side);if(target)sendLegendTarget(u,target);return}
 if((plan.mode==='OBJECTIVE'||plan.mode==='CROSS_MAP')&&plan.objective&&window.SL_BUFF_SYSTEM?.canCapture?.(plan.objective,t)){window.SL_BUFF_SYSTEM.travelToZone(u,plan.objective);return}
 if(plan.mode==='SETUP'){if(u.lane!==plan.targetLane||u.tacticalWorld)sendLegendLane(u,plan.targetLane,false);return}
 if(plan.mode==='SIEGE'||plan.mode==='TEMPO'||plan.mode==='CROSS_MAP'){if(u.lane!==plan.targetLane||!u.tacticalDestination)sendLegendLane(u,plan.targetLane,true);return}
 if(plan.mode==='STABILIZE'){if(u.lane!==plan.weakLane||u.tacticalWorld)sendLegendLane(u,plan.weakLane,false);return}
 if(plan.strongLane!==u.lane&&!u.manualBuff)sendLegendLane(u,plan.strongLane,false)
}
function assignmentLane(side,original,u,t){
 const plan=planFor(side,t);if(!plan||plan.confidence<.52)return original;const role=u.role||'';
 if(plan.mode==='STABILIZE'&&(FRONT.has(role)||role==='support'||role==='controller'))return plan.weakLane;
 if((plan.mode==='SETUP'||plan.mode==='OBJECTIVE')&&plan.setupLanes.length){if(FRONT.has(role)||role==='support')return plan.setupLanes.slice().sort((a,b)=>plan.states[a].prio-plan.states[b].prio)[0];return plan.strongLane}
 if(['COLLAPSE','CROSS_MAP','SIEGE','TEMPO'].includes(plan.mode))return plan.targetLane;
 if(t>300&&BACK.has(role)&&plan.states[1].prio>-.28)return 1;
 if(DIVE.has(role)||role==='bruiser')return plan.strongLane;
 return original
}

const previousSpawn=spawnUnit;
spawnUnit=function(side,lane,fac,u,opts={}){if(isAISide(side)&&!opts.minion&&!u?.special?.legend){const assigned=assignmentLane(side,lane,u,simTime);runtime[side].lastAssigned={unit:u?.name,role:u?.role,from:lane,to:assigned,t:simTime,term:'LANE_ASSIGNMENT'};lane=assigned}return previousSpawn(side,lane,fac,u,opts)};
const previousAI=runSideAI;
runSideAI=function(side,t){previousAI(side,t);if(!isAISide(side))return;const plan=planFor(side,t);applyMacroOrders(side,plan);applyLegendRotation(side,plan,t);const el=document.querySelector('#modeStatus');if(el){el.dataset.adaptive='4';if(/IA adaptativa v\d+/.test(el.textContent))el.textContent=el.textContent.replace(/IA adaptativa v\d+/,'IA adaptativa v4');else if(!el.textContent.includes('IA adaptativa v4'))el.textContent+=(el.textContent?' • ':'')+'IA adaptativa v4'}};

const oldReset=reset;
reset=function(){runtime[1]=freshRuntime();runtime[-1]=freshRuntime();return oldReset()};
if(window.SL_LIVE_STRATEGY_AI){window.SL_LIVE_STRATEGY_AI.version=4;window.SL_LIVE_STRATEGY_AI.rotationTerms=ROTATION_TERMS;window.SL_LIVE_STRATEGY_AI.getRotationPlan=side=>runtime[side]?.plan||null;window.SL_LIVE_STRATEGY_AI.coverage+=' + pro-style macro rotations (prio/tempo/strong-side/weak-side/setup/cross-map/collapse/lane-assignment/siege)'}
window.SL_MACRO_ROTATION_AI={version:1,terms:ROTATION_TERMS,getPlan:side=>runtime[side]?.plan||null,getRuntime:side=>runtime[side],rethink:side=>{runtime[side].nextThink=0;return planFor(side,simTime)},health(){return{loaded:true,aiVersion:window.SL_LIVE_STRATEGY_AI?.version||null,hasBuffs:!!window.SL_BUFF_SYSTEM,hasMap:!!map}}};
})();