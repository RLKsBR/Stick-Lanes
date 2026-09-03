/* Stick Lanes — cérebro de objetivo + árbitro de intenção v2
   Vitória vem antes de estilo: sobreviver a própria base, finalizar a base inimiga,
   proteger estrutura crítica e só depois executar rotações/buffs. A Lenda mantém
   uma intenção estável e só troca quando existe diferença real de prioridade. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2,macro=window.SL_MACRO_ROTATION_AI,live=window.SL_LIVE_STRATEGY_AI;
if(!map||typeof runSideAI!=='function')return;

/* ---------- DURABILIDADE ESTRUTURAL ----------
   Base: 2,5x de vida efetiva (15.000 mostrados, mantendo a barra proporcional).
   Torres principais: +75%. Torretas: +100%. */
const BASE_EFFECTIVE_MULT=2.5,TOWER_HP_MULT=1.75,TURRET_HP_MULT=2.0,BASE_EFFECTIVE_MAX=BASE_HP*BASE_EFFECTIVE_MULT;
if(!window.SL_STRUCTURE_DURABILITY_V2){
 for(const t of Object.values(COMBAT.tower||{})){if(!t._slDurabilityV2){t.hp=Math.round(t.hp*TOWER_HP_MULT);t._slDurabilityV2=true}}
 if(!AUX_TURRET._slDurabilityV2){AUX_TURRET.hp=Math.round(AUX_TURRET.hp*TURRET_HP_MULT);AUX_TURRET._slDurabilityV2=true}
 const previousDamageBase=damageBase;damageBase=function(side,d){return previousDamageBase(side,d/BASE_EFFECTIVE_MULT)};
 const previousHud=hud;hud=function(t){previousHud(t);const p=document.querySelector('#playerBase'),e=document.querySelector('#enemyBase');if(p)p.textContent=Math.ceil(playerBase*BASE_EFFECTIVE_MULT);if(e)e.textContent=Math.ceil(enemyBase*BASE_EFFECTIVE_MULT)};
 window.SL_STRUCTURE_DURABILITY_V2={baseMultiplier:BASE_EFFECTIVE_MULT,baseMaxHp:BASE_EFFECTIVE_MAX,towerHpMultiplier:TOWER_HP_MULT,turretHpMultiplier:TURRET_HP_MULT};
}

const intentState={1:freshIntent(),'-1':freshIntent()},goalState={1:freshGoal(),'-1':freshGoal()};
function freshIntent(){return{intent:null,lastSwitch:-999,lastReason:null,switches:0}}
function freshGoal(){return{goal:null,lastSwitch:-999,revisions:0}}
const clampI=(v,a,b)=>Math.max(a,Math.min(b,v));
function aiSide(side){return side===-1||gameMode==='robot'}
function legend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function hp(u){return u?.maxHp?clampI(u.hp/u.maxHp,0,1):0}
function visible(side,u){return !window.SL_VISION||window.SL_VISION.isVisibleTo(side,u)}
function world(u){return map.unitPos(u)}
function effectiveBaseHp(side){return baseHp(side)*BASE_EFFECTIVE_MULT}
function baseRatio(side){return clampI(baseHp(side)/BASE_HP,0,1)}
function clear(u){delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination}
function unitDps(u){return Math.max(1,u.atk)/Math.max(.42,u.rate||1)}
function rolePressure(u){if(u.special?.legend)return 2.2;if(u.role==='siege')return 1.75;if(u.role==='tank')return 1.12;if(u.role==='support'||u.role==='controller')return .82;return 1}
function baseDistance(u,side){return Math.abs(u.x-BASE_X[side])}
function laneOpen(side,lane){return aliveTowers(side,lane).length===0}
function logicalT(x){return clampI((x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),0,1)}

/* Quanto dano está realmente chegando à condição de derrota, não apenas “quem ganhou a lane”. */
function baseLanePressure(observerSide,defenderSide,lane){
 const open=laneOpen(defenderSide,lane),attackers=units.filter(u=>!u.dead&&u.side===-defenderSide&&u.lane===lane&&!u.tacticalWorld&&(u.side===observerSide||visible(observerSide,u)));
 let threat=0,nearDps=0,closest=Infinity,count=0;
 for(const u of attackers){
  const d=baseDistance(u,defenderSide);closest=Math.min(closest,d);if(d>4800)continue;count++;
  const closeness=clampI(1-d/4800,0,1),weight=(u.minion?.55:1)*rolePressure(u)*(.35+.65*hp(u));
  threat+=unitDps(u)*weight*(.2+.8*closeness*closeness)*(open?1.35:.72);
  if(open&&d<1550)nearDps+=unitDps(u)*weight;
 }
 const towers=aliveTowers(defenderSide,lane),front=towers.sort((a,b)=>Math.abs(a.x-BASE_X[defenderSide])-Math.abs(b.x-BASE_X[defenderSide]))[0]||null;
 return{lane,open,threat,nearDps,closest,count,front,frontHp:front?hp(front):0};
}
function towerEmergency(side){
 let best=null;
 for(const s of structures){
  if(s.dead||s.side!==side)continue;const attackers=units.filter(u=>!u.dead&&u.side===-side&&u.lane===s.lane&&!u.tacticalWorld&&visible(side,u)&&Math.abs(u.x-s.x)<1900);
  if(!attackers.length)continue;const pressure=attackers.reduce((n,u)=>n+unitDps(u)*(u.minion?.55:1)*rolePressure(u),0),ratio=hp(s),score=pressure*(1.15-ratio)*(s.auxiliary?.72:1.15);
  if(!best||score>best.score)best={structure:s,lane:s.lane,ratio,pressure,score,t:logicalT(s.x)};
 }
 return best;
}
function finishLane(side){
 let best=null;
 for(let lane=0;lane<3;lane++){
  if(!laneOpen(-side,lane))continue;
  const ours=units.filter(u=>!u.dead&&u.side===side&&u.lane===lane&&!u.tacticalWorld),enemies=units.filter(u=>!u.dead&&u.side===-side&&u.lane===lane&&!u.tacticalWorld&&visible(side,u));
  let pressure=0,closest=Infinity,nearDps=0;for(const u of ours){const d=baseDistance(u,-side);closest=Math.min(closest,d);if(d<4400)pressure+=unitDps(u)*(u.minion?.55:1)*rolePressure(u)*(.35+.65*hp(u));if(d<1550)nearDps+=unitDps(u)*(u.minion?.55:1)*rolePressure(u)}
  const defense=enemies.filter(u=>baseDistance(u,-side)<3600).reduce((n,u)=>n+unitDps(u)*(u.minion?.55:1)*rolePressure(u),0),score=pressure-defense*.65+(closest<2600?45:0);
  if(!best||score>best.score)best={lane,pressure,defense,score,closest,nearDps};
 }
 return best;
}
function rawGoal(side,t){
 const lanes=[0,1,2].map(l=>baseLanePressure(side,side,l)),worst=lanes.slice().sort((a,b)=>(b.threat+(b.open?34:0))-(a.threat+(a.open?34:0)))[0],threatLanes=lanes.filter(x=>x.open&&x.closest<3800||x.threat>42).map(x=>x.lane);
 const ownDps=lanes.reduce((n,x)=>n+x.nearDps,0),finish=finishLane(side),enemyDps=finish?.nearDps||0,ownTTD=ownDps>1?effectiveBaseHp(side)/ownDps:Infinity,enemyTTD=enemyDps>1?effectiveBaseHp(-side)/enemyDps:Infinity;
 const ownR=baseRatio(side),enemyR=baseRatio(-side),approaching=worst.open&&worst.closest<3500,immediate=worst.open&&worst.closest<1650;
 const mustDefend=immediate||ownTTD<30||ownR<.42&&(approaching||worst.threat>35)||worst.open&&worst.count>=3&&worst.closest<2600;
 const canFinish=!!finish&&(enemyTTD<28||enemyR<.30&&finish.closest<3300||finish.pressure>finish.defense*1.35&&finish.closest<2350);
 if(mustDefend&&canFinish){
  if(enemyTTD+5<ownTTD&&ownR>.20)return{mode:'FINISH',lane:finish.lane,priority:109,reason:'win-race-before-own-base-falls',ownTTD,enemyTTD,lanes,finish,threatLanes};
  return{mode:'BASE_DEFENSE',lane:worst.lane,priority:116,reason:'own-base-is-loss-condition',ownTTD,enemyTTD,lanes,finish,threatLanes};
 }
 if(mustDefend)return{mode:'BASE_DEFENSE',lane:worst.lane,priority:116,reason:'enemy-pressure-reached-own-base',ownTTD,enemyTTD,lanes,finish,threatLanes};
 if(canFinish)return{mode:'FINISH',lane:finish.lane,priority:109,reason:'enemy-base-is-the-win-condition',ownTTD,enemyTTD,lanes,finish,threatLanes};
 const tower=towerEmergency(side);if(tower&&tower.ratio<.48&&tower.score>20)return{mode:'TOWER_DEFENSE',lane:tower.lane,priority:91,reason:'preserve-critical-structure-before-neutral-objective',tower,lanes,finish,ownTTD,enemyTTD,threatLanes};
 return{mode:'NORMAL',lane:null,priority:0,reason:'no-win-condition-emergency',lanes,finish,ownTTD,enemyTTD,threatLanes};
}
function goalDuration(g){return g.mode==='BASE_DEFENSE'?8:g.mode==='FINISH'?9:g.mode==='TOWER_DEFENSE'?6:2.2}
function stabilizeGoal(side,raw,t){
 const s=goalState[side],cur=s.goal;if(!cur){s.goal={...raw,until:t+goalDuration(raw)};s.lastSwitch=t;s.revisions++;return s.goal}
 const urgent=raw.mode==='BASE_DEFENSE'&&cur.mode!=='BASE_DEFENSE',finishOverride=raw.mode==='FINISH'&&cur.mode==='NORMAL',expired=t>=cur.until;
 if(urgent||finishOverride||expired||raw.priority>=cur.priority+16){s.goal={...raw,until:t+goalDuration(raw)};s.lastSwitch=t;s.revisions++;return s.goal}
 /* atualiza métricas sem trocar a decisão durante a janela de compromisso */
 cur.lanes=raw.lanes;cur.finish=raw.finish;cur.ownTTD=raw.ownTTD;cur.enemyTTD=raw.enemyTTD;cur.threatLanes=raw.threatLanes;
 if(cur.mode==='BASE_DEFENSE'&&raw.mode==='BASE_DEFENSE')cur.lane=raw.lane;
 return cur;
}
function goalFor(side,t=simTime){return stabilizeGoal(side,rawGoal(side,t),t)}
function applyGoalOrders(side,g){
 if(!g||g.mode==='NORMAL')return;
 if(g.mode==='BASE_DEFENSE'){
  const threatened=new Set(g.threatLanes?.length?g.threatLanes:[g.lane]);for(let lane=0;lane<3;lane++){if(threatened.has(lane))orders[side][lane]='base';else if(g.lanes?.[lane]?.threat>20)orders[side][lane]='behind';else orders[side][lane]='advance'}return;
 }
 if(g.mode==='FINISH'){orders[side][g.lane]='attack';for(let lane=0;lane<3;lane++)if(lane!==g.lane&&g.lanes?.[lane]?.open&&g.lanes[lane].closest<3200)orders[side][lane]='base';return}
 if(g.mode==='TOWER_DEFENSE'){orders[side][g.lane]=g.tower?.structure&&aliveTowers(side,g.lane).length<=1?'base':'behind'}
}

/* ---------- INTENÇÃO DA LENDA ---------- */
function sendRatio(u,lane,r,slNoHold=true){if(!u||!Number.isInteger(lane))return false;r=clampI(r,.03,.97);const p=map.routePoint(lane,r),x=BASE_X[1]+r*(BASE_X[-1]-BASE_X[1]),a=world(u);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'point',lane,x,t:r,world:{x:p.x,y:p.y},slNoHold};return true}
function sendLane(u,lane,aggressive=false){const r=aggressive?(u.side===1?.58:.42):(u.side===1?.34:.66);return sendRatio(u,lane,r)}
function sendBase(u,lane){if(!u)return false;if(!u.tacticalWorld&&u.lane===lane){clear(u);orders[u.side][lane]='base';return true}return sendRatio(u,lane,u.side===1?.16:.84)}
function sendFinish(u,lane){if(!u)return false;if(!u.tacticalWorld&&u.lane===lane){clear(u);orders[u.side][lane]='attack';return true}return sendRatio(u,lane,.50)}
function sendGuard(u,lane,t){if(!u)return false;if(!u.tacticalWorld&&u.lane===lane&&Math.abs(logicalT(u.x)-t)<.10){clear(u);orders[u.side][lane]='behind';return true}return sendRatio(u,lane,t)}
function sendBuff(u,id){const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===id);if(!u||!z||!api?.canCapture?.(z,simTime))return false;return api.travelToZone(u,z)}
function sendUnit(u,id){const v=units.find(x=>!x.dead&&x.id===id&&x.side===-u.side);if(!u||!v||!visible(u.side,v))return false;const a=world(u),p=world(v);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'unit',unitId:v.id,lane:v.lane,x:v.x,world:{x:p.x,y:p.y}};return true}
function currentCommand(u){
 if(!u)return null;if(u.manualBuff)return{kind:'buff',buffId:u.manualBuff};const d=u.tacticalDestination;
 if(d?.kind==='buff')return{kind:'buff',buffId:d.buff?.id||d.buffId||u.manualBuff};if(d?.kind==='unit')return{kind:'unit',unitId:d.unitId};
 if(d?.kind==='point')return{kind:'lane',lane:d.lane,aggressive:(u.side===1?d.t>.48:d.t<.52)};if(Number.isInteger(u.lane))return{kind:'lane',lane:u.lane,aggressive:false};return null;
}
function same(a,b){if(!a||!b||a.kind!==b.kind)return false;if(a.kind==='buff')return a.buffId===b.buffId;if(a.kind==='unit')return a.unitId===b.unitId;if(['lane','base','finish','guard'].includes(a.kind))return a.lane===b.lane;return false}
function execute(u,i){if(!u||!i)return false;if(i.kind==='buff')return sendBuff(u,i.buffId);if(i.kind==='unit')return sendUnit(u,i.unitId);if(i.kind==='base')return sendBase(u,i.lane);if(i.kind==='finish')return sendFinish(u,i.lane);if(i.kind==='guard')return sendGuard(u,i.lane,i.t);if(i.kind==='lane')return sendLane(u,i.lane,i.aggressive);return false}
function valid(side,i){
 if(!i)return false;if(i.kind==='unit'){const v=units.find(x=>!x.dead&&x.id===i.unitId&&x.side===-side);return!!(v&&visible(side,v))}
 if(i.kind==='buff'){const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===i.buffId),zs=z&&api?.zoneState?.(z.id,simTime);return!!(z&&zs?.owner!==side&&api?.canCapture?.(z,simTime))}
 return Number.isInteger(i.lane);
}
function commitmentSeconds(i){if(i.kind==='buff')return 22;if(i.kind==='base')return 9;if(i.kind==='finish')return 10;if(i.kind==='guard')return 7;if(i.kind==='unit')return i.priority>=100?4.5:3.2;if(i.kind==='lane')return i.priority>=70?7.5:6;return 5}
function retreatCandidate(side,u,t){const term=live?.getLegendState?.(side);if(term!=='RETREAT'&&term!=='DISENGAGE')return null;return{kind:'base',lane:Number.isInteger(u.lane)?u.lane:1,priority:125,source:'micro',term,reason:'survive-before-any-macro-call',created:t}}
function combatCandidate(side,u,t){
 const term=live?.getLegendState?.(side);if(term!=='PEEL'&&term!=='ALL_IN')return null;const here=world(u),targets=units.filter(v=>!v.dead&&v.side===-side&&visible(side,v)).map(v=>({v,d:Math.hypot(map.unitPos(v).x-here.x,map.unitPos(v).y-here.y)})).filter(x=>x.d<1050).sort((a,b)=>a.d-b.d);
 if(!targets.length)return null;let target=term==='ALL_IN'?targets.slice().sort((a,b)=>(hp(a.v)-hp(b.v))||a.d-b.d)[0].v:targets[0].v;
 return{kind:'unit',unitId:target.id,priority:term==='PEEL'?108:101,source:'micro',term,reason:term==='PEEL'?'protect-nearby-allies':'finish-favorable-fight',created:t};
}
function goalCandidate(side,g,t){
 if(!g||g.mode==='NORMAL')return null;if(g.mode==='BASE_DEFENSE')return{kind:'base',lane:g.lane,priority:g.priority,source:'win-condition',term:'DEFEND_BASE',reason:g.reason,created:t};
 if(g.mode==='FINISH')return{kind:'finish',lane:g.lane,priority:g.priority,source:'win-condition',term:'END_GAME',reason:g.reason,created:t};
 if(g.mode==='TOWER_DEFENSE')return{kind:'guard',lane:g.lane,t:g.tower?.t??(side===1?.25:.75),priority:g.priority,source:'win-condition',term:'DEFEND_STRUCTURE',reason:g.reason,created:t};return null;
}
function macroCandidate(side,u,t){
 const p=macro?.getPlan?.(side);if(!p)return null,enemy=units.find(x=>!x.dead&&x.side===-side&&x.special?.legend);
 if((p.mode==='COLLAPSE'||p.enemyCommit?.kind==='jungle'||p.enemyCommit?.kind==='lane')&&enemy&&!visible(side,enemy))return{kind:'lane',lane:Number.isInteger(p.strongLane)?p.strongLane:1,aggressive:false,priority:42,source:'macro',term:'HOLD_VISION',reason:'enemy-hidden-by-wall',created:t};
 if(p.mode==='COLLAPSE'&&p.targetUnitId){const v=units.find(x=>!x.dead&&x.id===p.targetUnitId);if(v&&visible(side,v))return{kind:'unit',unitId:v.id,priority:78,source:'macro',term:'COLLAPSE',reason:p.reason,created:t}}
 if((p.mode==='OBJECTIVE'||p.mode==='CROSS_MAP')&&p.objective)return{kind:'buff',buffId:p.objective.id,priority:p.mode==='OBJECTIVE'?76:72,source:'macro',term:p.mode,reason:p.reason,created:t};
 if(p.mode==='STABILIZE')return{kind:'lane',lane:p.weakLane,aggressive:false,priority:82,source:'macro',term:'STABILIZE',reason:p.reason,created:t};
 if(p.mode==='SETUP')return{kind:'lane',lane:p.targetLane,aggressive:false,priority:62,source:'macro',term:'SETUP',reason:p.reason,created:t};
 if(p.mode==='SIEGE')return{kind:'lane',lane:p.targetLane,aggressive:true,priority:60,source:'macro',term:'SIEGE',reason:p.reason,created:t};
 if(p.mode==='TEMPO'||p.mode==='CROSS_MAP')return{kind:'lane',lane:p.targetLane,aggressive:true,priority:56,source:'macro',term:p.mode,reason:p.reason,created:t};
 return{kind:'lane',lane:Number.isInteger(p.strongLane)?p.strongLane:u.lane,aggressive:false,priority:40,source:'macro',term:'HOLD',reason:p.reason,created:t};
}
function buffCommitCandidate(side,u,t){
 const api=window.SL_BUFF_SYSTEM,id=u.manualBuff||u.tacticalDestination?.buff?.id;if(!id)return null;const z=api?.zones?.find(x=>x.id===id),zs=z&&api?.zoneState?.(id,t);if(!z||zs?.owner===side)return null;
 return{kind:'buff',buffId:id,priority:zs?.contested?98:84,source:'commit',term:zs?.contested?'TURN':'OBJECTIVE_COMMIT',reason:zs?.contested?'fight-for-current-buff':'finish-current-buff',created:t};
}
function chooseCandidate(side,u,g,t){
 const list=[retreatCandidate(side,u,t),goalCandidate(side,g,t),combatCandidate(side,u,t),buffCommitCandidate(side,u,t),macroCandidate(side,u,t)].filter(Boolean).sort((a,b)=>b.priority-a.priority);
 return list[0]||{kind:'lane',lane:Number.isInteger(u.lane)?u.lane:1,aggressive:false,priority:30,source:'fallback',term:'HOLD',reason:'no-plan',created:t};
}
function setIntent(side,i,t){const s=intentState[side];s.intent={...i,until:t+commitmentSeconds(i)};s.lastSwitch=t;s.lastReason=i.reason;s.switches++;return s.intent}
function maybeAdopt(side,candidate,t){
 const s=intentState[side],cur=s.intent;if(!cur||!valid(side,cur)||t>=cur.until)return setIntent(side,candidate,t);
 if(same(cur,candidate)){cur.priority=Math.max(cur.priority,candidate.priority);if(candidate.kind==='buff')cur.until=Math.max(cur.until,t+5);return cur}
 const emergency=candidate.priority>=108,margin=candidate.priority-(cur.priority||0),cool=t-s.lastSwitch<2.4;if(emergency||(!cool&&margin>=18))return setIntent(side,candidate,t);return cur;
}
function enforce(side,u,i){
 if(!i)return;
 if(i.kind==='base'&&!u.tacticalWorld&&u.lane===i.lane&&orders[side][i.lane]==='base')return;
 if(i.kind==='finish'&&!u.tacticalWorld&&u.lane===i.lane&&orders[side][i.lane]==='attack')return;
 if(i.kind==='guard'&&!u.tacticalWorld&&u.lane===i.lane&&Math.abs(logicalT(u.x)-i.t)<.10)return;
 const now=currentCommand(u);if(['buff','unit','lane'].includes(i.kind)&&same(now,i))return;execute(u,i);
}
function arbitrate(side,g,t){
 const u=legend(side);if(!u){intentState[side].intent=null;return}const c=chooseCandidate(side,u,g,t),i=maybeAdopt(side,c,t);enforce(side,u,i);
 u.slIntent={kind:i.kind,term:i.term,source:i.source,until:i.until,reason:i.reason,target:i.kind==='buff'?i.buffId:i.kind==='unit'?i.unitId:i.lane};
}

/* Tropas compradas pela IA reforçam a condição de vitória atual, não uma lane aleatória. */
const previousSpawn=spawnUnit;spawnUnit=function(side,lane,fac,u,opts={}){
 const obj=previousSpawn(side,lane,fac,u,opts);if(!obj||!aiSide(side)||opts.minion||u?.special?.legend)return obj;const g=goalState[side]?.goal;
 if(g?.mode==='BASE_DEFENSE'||g?.mode==='FINISH'||g?.mode==='TOWER_DEFENSE'){obj.lane=g.lane;obj.sub=roleSub(obj.role);obj.subTarget=obj.sub}return obj;
};

const previousAI=runSideAI;runSideAI=function(side,t){
 previousAI(side,t);if(!aiSide(side))return;const g=goalFor(side,t);applyGoalOrders(side,g);arbitrate(side,g,t);
 const el=document.querySelector('#modeStatus');if(el){el.dataset.goalAi='2';if(!el.textContent.includes('objetivo v2'))el.textContent+=(el.textContent?' • ':'')+'objetivo v2'}
};
const oldReset=reset;reset=function(){intentState[1]=freshIntent();intentState[-1]=freshIntent();goalState[1]=freshGoal();goalState[-1]=freshGoal();return oldReset()};

window.SL_GAME_GOAL_AI={version:2,baseEffectiveMax:BASE_EFFECTIVE_MAX,getGoal:side=>goalState[side]?.goal||null,rethink:side=>{goalState[side]=freshGoal();return goalFor(side,simTime)},effectiveBaseHp,baseRatio,health(){return{loaded:true,baseMax:BASE_EFFECTIVE_MAX,towerHpMultiplier:TOWER_HP_MULT,turretHpMultiplier:TURRET_HP_MULT,red:goalState[-1]?.goal||null,orange:gameMode==='robot'?goalState[1]?.goal||null:null}}};
window.SL_LEGEND_INTENT_ARBITER={version:2,get:side=>intentState[side]?.intent||null,getState:side=>intentState[side],reconsider(side){intentState[side].intent=null;const g=goalFor(side,simTime);return arbitrate(side,g,simTime)},health(){return{loaded:true,red:intentState[-1]?.intent||null,orange:gameMode==='robot'?intentState[1]?.intent||null:null,goalAi:2}}};
})();