/* Stick Lanes — cérebro de objetivo + árbitro de intenção v3
   Regra principal: a base é a condição de vitória/derrota. A IA calcula ameaça,
   corrida de base, defesa estrutural e só então considera buff/rotação. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2,macro=window.SL_MACRO_ROTATION_AI,live=window.SL_LIVE_STRATEGY_AI;
if(!map||typeof runSideAI!=='function')return;

/* Durabilidade: base = 15.000 HP efetivos; torres +75%; torretas +100%. */
const BASE_MULT=2.5,BASE_MAX=BASE_HP*BASE_MULT,TOWER_MULT=1.75,TURRET_MULT=2;
if(!window.SL_STRUCTURE_DURABILITY_V3){
 for(const t of Object.values(COMBAT.tower||{})){if(!t._slDurabilityV3){t.hp=Math.round(t.hp*TOWER_MULT);t._slDurabilityV3=true}}
 if(!AUX_TURRET._slDurabilityV3){AUX_TURRET.hp=Math.round(AUX_TURRET.hp*TURRET_MULT);AUX_TURRET._slDurabilityV3=true}
 const baseDamage=damageBase;damageBase=function(side,d){return baseDamage(side,d/BASE_MULT)};
 const baseHud=hud;hud=function(t){baseHud(t);const a=document.querySelector('#playerBase'),b=document.querySelector('#enemyBase');if(a)a.textContent=Math.ceil(playerBase*BASE_MULT);if(b)b.textContent=Math.ceil(enemyBase*BASE_MULT)};
 window.SL_STRUCTURE_DURABILITY_V3={baseMaxHp:BASE_MAX,baseMultiplier:BASE_MULT,towerMultiplier:TOWER_MULT,turretMultiplier:TURRET_MULT};
}

const intents={1:null,'-1':null},intentMeta={1:{last:-999,switches:0},'-1':{last:-999,switches:0}},goals={1:null,'-1':null},goalMeta={1:{last:-999,revisions:0},'-1':{last:-999,revisions:0}};
const clampG=(v,a,b)=>Math.max(a,Math.min(b,v));
function isAI(side){return side===-1||gameMode==='robot'}
function leg(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function ratio(o){return o?.maxHp?clampG(o.hp/o.maxHp,0,1):0}
function visible(side,u){return !window.SL_VISION||window.SL_VISION.isVisibleTo(side,u)}
function wpos(u){return map.unitPos(u)}
function dps(u){return Math.max(1,u.atk)/Math.max(.42,u.rate||1)}
function pressureWeight(u){return(u.minion?.55:1)*(u.special?.legend?2.2:u.role==='siege'?1.75:u.role==='tank'?1.12:['support','controller'].includes(u.role)?.82:1)*(.35+.65*ratio(u))}
function baseDist(u,side){return Math.abs(u.x-BASE_X[side])}
function openLane(side,lane){return aliveTowers(side,lane).length===0}
function logicalT(x){return clampG((x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),0,1)}
function clearManual(u){delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination}

function laneBaseThreat(side,lane){
 const open=openLane(side,lane),foes=units.filter(u=>!u.dead&&u.side===-side&&u.lane===lane&&!u.tacticalWorld&&visible(side,u));let score=0,nearDps=0,closest=Infinity,count=0;
 for(const u of foes){const d=baseDist(u,side);closest=Math.min(closest,d);if(d>4800)continue;count++;const c=clampG(1-d/4800,0,1),p=dps(u)*pressureWeight(u);score+=p*(.2+.8*c*c)*(open?1.35:.72);if(open&&d<1550)nearDps+=p}
 return{lane,open,score,nearDps,closest,count};
}
function finishingLane(side){
 let best=null;for(let lane=0;lane<3;lane++){
  if(!openLane(-side,lane))continue;const ours=units.filter(u=>!u.dead&&u.side===side&&u.lane===lane&&!u.tacticalWorld),foes=units.filter(u=>!u.dead&&u.side===-side&&u.lane===lane&&!u.tacticalWorld&&visible(side,u));
  let push=0,nearDps=0,closest=Infinity;for(const u of ours){const d=baseDist(u,-side);closest=Math.min(closest,d);if(d<4400)push+=dps(u)*pressureWeight(u);if(d<1550)nearDps+=dps(u)*pressureWeight(u)}
  const defense=foes.filter(u=>baseDist(u,-side)<3600).reduce((n,u)=>n+dps(u)*pressureWeight(u),0),score=push-defense*.65+(closest<2600?45:0);if(!best||score>best.score)best={lane,push,nearDps,closest,defense,score};
 }return best;
}
function towerDanger(side){
 let best=null;for(const s of structures){if(s.dead||s.side!==side)continue;const foes=units.filter(u=>!u.dead&&u.side===-side&&u.lane===s.lane&&!u.tacticalWorld&&visible(side,u)&&Math.abs(u.x-s.x)<1900);if(!foes.length)continue;
  const p=foes.reduce((n,u)=>n+dps(u)*pressureWeight(u),0),r=ratio(s),score=p*(1.15-r)*(s.auxiliary?.72:1.15);if(!best||score>best.score)best={lane:s.lane,structure:s,ratio:r,score,t:logicalT(s.x)};
 }return best;
}
function computeGoal(side){
 const lanes=[0,1,2].map(l=>laneBaseThreat(side,l)),worst=lanes.slice().sort((a,b)=>(b.score+(b.open?34:0))-(a.score+(a.open?34:0)))[0],incoming=lanes.reduce((n,x)=>n+x.nearDps,0),finish=finishingLane(side),outgoing=finish?.nearDps||0;
 const ownTTD=incoming>1?(baseHp(side)*BASE_MULT)/incoming:Infinity,enemyTTD=outgoing>1?(baseHp(-side)*BASE_MULT)/outgoing:Infinity,ownR=baseHp(side)/BASE_HP,enemyR=baseHp(-side)/BASE_HP;
 const threatLanes=lanes.filter(x=>(x.open&&x.closest<3800)||x.score>42).map(x=>x.lane),approach=worst.open&&worst.closest<3500,immediate=worst.open&&worst.closest<1650;
 const defend=immediate||ownTTD<30||(ownR<.42&&(approach||worst.score>35))||(worst.open&&worst.count>=3&&worst.closest<2600);
 const finishNow=!!finish&&(enemyTTD<28||(enemyR<.30&&finish.closest<3300)||(finish.push>finish.defense*1.35&&finish.closest<2350));
 if(defend&&finishNow&&enemyTTD+5<ownTTD&&ownR>.20)return{mode:'FINISH',lane:finish.lane,priority:109,reason:'win-base-race',lanes,finish,ownTTD,enemyTTD,threatLanes};
 if(defend)return{mode:'BASE_DEFENSE',lane:worst.lane,priority:116,reason:'own-base-is-loss-condition',lanes,finish,ownTTD,enemyTTD,threatLanes};
 if(finishNow)return{mode:'FINISH',lane:finish.lane,priority:109,reason:'enemy-base-is-win-condition',lanes,finish,ownTTD,enemyTTD,threatLanes};
 const tower=towerDanger(side);if(tower&&tower.ratio<.48&&tower.score>20)return{mode:'TOWER_DEFENSE',lane:tower.lane,priority:91,reason:'protect-critical-structure',tower,lanes,finish,ownTTD,enemyTTD,threatLanes};
 return{mode:'NORMAL',lane:null,priority:0,reason:'normal-macro',lanes,finish,ownTTD,enemyTTD,threatLanes};
}
function goalLife(g){return g.mode==='BASE_DEFENSE'?8:g.mode==='FINISH'?9:g.mode==='TOWER_DEFENSE'?6:2.2}
function stableGoal(side,t){
 const raw=computeGoal(side),cur=goals[side],meta=goalMeta[side];if(!cur||t>=cur.until||raw.mode==='BASE_DEFENSE'&&cur.mode!=='BASE_DEFENSE'||raw.priority>=cur.priority+16||raw.mode==='FINISH'&&cur.mode==='NORMAL'){
  goals[side]={...raw,until:t+goalLife(raw)};meta.last=t;meta.revisions++;return goals[side];
 }
 cur.lanes=raw.lanes;cur.finish=raw.finish;cur.ownTTD=raw.ownTTD;cur.enemyTTD=raw.enemyTTD;cur.threatLanes=raw.threatLanes;if(cur.mode==='BASE_DEFENSE'&&raw.mode==='BASE_DEFENSE')cur.lane=raw.lane;return cur;
}
function applyOrders(side,g){
 if(!g||g.mode==='NORMAL')return;if(g.mode==='BASE_DEFENSE'){const hot=new Set(g.threatLanes?.length?g.threatLanes:[g.lane]);for(let l=0;l<3;l++)orders[side][l]=hot.has(l)?'base':g.lanes[l].score>20?'behind':'advance';return}
 if(g.mode==='FINISH'){orders[side][g.lane]='attack';for(let l=0;l<3;l++)if(l!==g.lane&&g.lanes[l].open&&g.lanes[l].closest<3200)orders[side][l]='base';return}
 if(g.mode==='TOWER_DEFENSE')orders[side][g.lane]=aliveTowers(side,g.lane).length<=1?'base':'behind';
}

function sendRatio(u,lane,t){const p=map.routePoint(lane,t),x=BASE_X[1]+t*(BASE_X[-1]-BASE_X[1]),a=wpos(u);clearManual(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'point',lane,x,t,world:{x:p.x,y:p.y},slNoHold:true};return true}
function sendLane(u,lane,aggressive=false){return sendRatio(u,lane,aggressive?(u.side===1?.58:.42):(u.side===1?.34:.66))}
function sendBase(u,lane){if(!u.tacticalWorld&&u.lane===lane){clearManual(u);orders[u.side][lane]='base';return true}return sendRatio(u,lane,u.side===1?.16:.84)}
function sendFinish(u,lane){if(!u.tacticalWorld&&u.lane===lane){clearManual(u);orders[u.side][lane]='attack';return true}return sendRatio(u,lane,.5)}
function sendGuard(u,lane,t){if(!u.tacticalWorld&&u.lane===lane&&Math.abs(logicalT(u.x)-t)<.10){clearManual(u);orders[u.side][lane]='behind';return true}return sendRatio(u,lane,t)}
function sendBuff(u,id){const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===id);return!!(u&&z&&api?.canCapture?.(z,simTime)&&api.travelToZone(u,z))}
function sendUnit(u,id){const v=units.find(x=>!x.dead&&x.id===id&&x.side===-u.side);if(!v||!visible(u.side,v))return false;const a=wpos(u),p=wpos(v);clearManual(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'unit',unitId:v.id,lane:v.lane,x:v.x,world:{x:p.x,y:p.y}};return true}
function execute(u,i){if(i.kind==='base')return sendBase(u,i.lane);if(i.kind==='finish')return sendFinish(u,i.lane);if(i.kind==='guard')return sendGuard(u,i.lane,i.t);if(i.kind==='buff')return sendBuff(u,i.buffId);if(i.kind==='unit')return sendUnit(u,i.unitId);return sendLane(u,i.lane,!!i.aggressive)}
function same(a,b){if(!a||!b||a.kind!==b.kind)return false;if(a.kind==='buff')return a.buffId===b.buffId;if(a.kind==='unit')return a.unitId===b.unitId;return a.lane===b.lane}
function valid(side,i){if(!i)return false;if(i.kind==='unit'){const v=units.find(x=>!x.dead&&x.id===i.unitId&&x.side===-side);return!!(v&&visible(side,v))}if(i.kind==='buff'){const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===i.buffId),s=z&&api.zoneState?.(z.id,simTime);return!!(z&&s?.owner!==side&&api.canCapture?.(z,simTime))}return Number.isInteger(i.lane)}
function intentLife(i){return i.kind==='buff'?22:i.kind==='base'?9:i.kind==='finish'?10:i.kind==='guard'?7:i.kind==='unit'?4.2:6}
function retreat(side,u,t){const term=live?.getLegendState?.(side);return term==='RETREAT'||term==='DISENGAGE'?{kind:'base',lane:Number.isInteger(u.lane)?u.lane:1,priority:125,term,source:'micro',reason:'survive',created:t}:null}
function combat(side,u,t){const term=live?.getLegendState?.(side);if(term!=='PEEL'&&term!=='ALL_IN')return null;const p=wpos(u),foes=units.filter(v=>!v.dead&&v.side===-side&&visible(side,v)).map(v=>({v,d:Math.hypot(wpos(v).x-p.x,wpos(v).y-p.y)})).filter(x=>x.d<1050).sort((a,b)=>a.d-b.d);if(!foes.length)return null;const target=term==='ALL_IN'?foes.slice().sort((a,b)=>ratio(a.v)-ratio(b.v)||a.d-b.d)[0].v:foes[0].v;return{kind:'unit',unitId:target.id,priority:term==='PEEL'?108:101,term,source:'micro',reason:term.toLowerCase(),created:t}}
function goalCandidate(g,t){if(!g||g.mode==='NORMAL')return null;if(g.mode==='BASE_DEFENSE')return{kind:'base',lane:g.lane,priority:116,term:'DEFEND_BASE',source:'win-condition',reason:g.reason,created:t};if(g.mode==='FINISH')return{kind:'finish',lane:g.lane,priority:109,term:'END_GAME',source:'win-condition',reason:g.reason,created:t};return{kind:'guard',lane:g.lane,t:g.tower?.t??.5,priority:91,term:'DEFEND_STRUCTURE',source:'win-condition',reason:g.reason,created:t}}
function buffCommit(side,u,t){const api=window.SL_BUFF_SYSTEM,id=u.manualBuff||u.tacticalDestination?.buff?.id;if(!id)return null;const z=api?.zones?.find(x=>x.id===id),s=z&&api.zoneState?.(id,t);if(!z||s?.owner===side)return null;return{kind:'buff',buffId:id,priority:s?.contested?98:84,term:s?.contested?'TURN':'OBJECTIVE_COMMIT',source:'commit',reason:s?.contested?'contested-buff':'finish-buff',created:t}}
function macroCandidate(side,u,t){
 const p=macro?.getPlan?.(side);if(!p)return null;const enemy=units.find(x=>!x.dead&&x.side===-side&&x.special?.legend);
 if((p.mode==='COLLAPSE'||p.enemyCommit?.kind==='jungle'||p.enemyCommit?.kind==='lane')&&enemy&&!visible(side,enemy))return{kind:'lane',lane:Number.isInteger(p.strongLane)?p.strongLane:1,priority:42,term:'HOLD_VISION',source:'macro',reason:'enemy-hidden',created:t};
 if(p.mode==='COLLAPSE'&&p.targetUnitId){const v=units.find(x=>!x.dead&&x.id===p.targetUnitId);if(v&&visible(side,v))return{kind:'unit',unitId:v.id,priority:78,term:'COLLAPSE',source:'macro',reason:p.reason,created:t}}
 if((p.mode==='OBJECTIVE'||p.mode==='CROSS_MAP')&&p.objective)return{kind:'buff',buffId:p.objective.id,priority:p.mode==='OBJECTIVE'?76:72,term:p.mode,source:'macro',reason:p.reason,created:t};
 if(p.mode==='STABILIZE')return{kind:'lane',lane:p.weakLane,priority:82,term:'STABILIZE',source:'macro',reason:p.reason,created:t};
 return{kind:'lane',lane:Number.isInteger(p.targetLane)?p.targetLane:Number.isInteger(p.strongLane)?p.strongLane:u.lane,aggressive:p.mode==='SIEGE'||p.mode==='TEMPO',priority:p.mode==='SETUP'?62:p.mode==='SIEGE'?60:48,term:p.mode||'HOLD',source:'macro',reason:p.reason,created:t};
}
function choose(side,u,g,t){return[retreat(side,u,t),goalCandidate(g,t),combat(side,u,t),buffCommit(side,u,t),macroCandidate(side,u,t)].filter(Boolean).sort((a,b)=>b.priority-a.priority)[0]||{kind:'lane',lane:u.lane,priority:30,term:'HOLD',source:'fallback',reason:'no-plan',created:t}}
function adopt(side,c,t){const cur=intents[side],meta=intentMeta[side];if(!cur||!valid(side,cur)||t>=cur.until){intents[side]={...c,until:t+intentLife(c)};meta.last=t;meta.switches++;return intents[side]}if(same(cur,c)){cur.priority=Math.max(cur.priority,c.priority);if(c.kind==='buff')cur.until=Math.max(cur.until,t+5);return cur}const emergency=c.priority>=108,margin=c.priority-cur.priority,cool=t-meta.last<2.4;if(emergency||(!cool&&margin>=18)){intents[side]={...c,until:t+intentLife(c)};meta.last=t;meta.switches++}return intents[side]}
function enforce(side,u,i){if(i.kind==='base'&&!u.tacticalWorld&&u.lane===i.lane&&orders[side][i.lane]==='base')return;if(i.kind==='finish'&&!u.tacticalWorld&&u.lane===i.lane&&orders[side][i.lane]==='attack')return;if(i.kind==='guard'&&!u.tacticalWorld&&u.lane===i.lane&&Math.abs(logicalT(u.x)-i.t)<.10)return;execute(u,i)}
function arbitrate(side,g,t){const u=leg(side);if(!u){intents[side]=null;return}const i=adopt(side,choose(side,u,g,t),t);enforce(side,u,i);u.slIntent={kind:i.kind,term:i.term,source:i.source,until:i.until,reason:i.reason,target:i.kind==='buff'?i.buffId:i.kind==='unit'?i.unitId:i.lane}}

/* Em emergência/finish, até as novas compras entram na lane que decide o jogo. */
const oldSpawn=spawnUnit;spawnUnit=function(side,lane,fac,u,opts={}){const obj=oldSpawn(side,lane,fac,u,opts);if(!obj||!isAI(side)||opts.minion||u?.special?.legend)return obj;const g=goals[side];if(g&&g.mode!=='NORMAL'){obj.lane=g.lane;obj.sub=roleSub(obj.role);obj.subTarget=obj.sub}return obj};
const oldAI=runSideAI;runSideAI=function(side,t){oldAI(side,t);if(!isAI(side))return;const g=stableGoal(side,t);applyOrders(side,g);arbitrate(side,g,t);const el=document.querySelector('#modeStatus');if(el){el.dataset.goalAi='3';if(!el.textContent.includes('objetivo v3'))el.textContent+=(el.textContent?' • ':'')+'objetivo v3'}};
const oldReset=reset;reset=function(){for(const s of[1,-1]){intents[s]=null;intentMeta[s]={last:-999,switches:0};goals[s]=null;goalMeta[s]={last:-999,revisions:0}}return oldReset()};

window.SL_GAME_GOAL_AI={version:3,baseEffectiveMax:BASE_MAX,getGoal:s=>goals[s],effectiveBaseHp:s=>baseHp(s)*BASE_MULT,rethink(s){goals[s]=null;return stableGoal(s,simTime)},health(){return{loaded:true,baseMax:BASE_MAX,towerMultiplier:TOWER_MULT,turretMultiplier:TURRET_MULT,red:goals[-1],orange:gameMode==='robot'?goals[1]:null}}};
window.SL_LEGEND_INTENT_ARBITER={version:3,get:s=>intents[s],getState:s=>({intent:intents[s],meta:intentMeta[s]}),reconsider(s){intents[s]=null;const g=stableGoal(s,simTime);return arbitrate(s,g,simTime)},health(){return{loaded:true,goalAi:3,red:intents[-1],orange:gameMode==='robot'?intents[1]:null}}};
})();