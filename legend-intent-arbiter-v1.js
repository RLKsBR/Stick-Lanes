/* Stick Lanes — árbitro de intenção da Lenda v1
   Uma Lenda executa UMA intenção por vez. Macro e micro podem sugerir jogadas,
   mas só emergências quebram um compromisso antes do prazo. Histerese evita
   Top->Buff->Mid->Bot em poucos segundos. Usa visão compartilhada quando existe. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2,macro=window.SL_MACRO_ROTATION_AI,live=window.SL_LIVE_STRATEGY_AI;
if(!map||typeof runSideAI!=='function')return;
const state={1:fresh(),'-1':fresh()};
const HARD_MICRO=new Set(['RETREAT','DISENGAGE','PEEL','ALL_IN']);
function fresh(){return{intent:null,lastSwitch:-999,lastReason:null,switches:0}}
function legend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function hp(u){return u?.maxHp?Math.max(0,Math.min(1,u.hp/u.maxHp)):0}
function visible(side,u){return !window.SL_VISION||window.SL_VISION.isVisibleTo(side,u)}
function world(u){return map.unitPos(u)}
function clear(u){delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination}
function laneRatio(side,aggressive){return aggressive?(side===1?.58:.42):(side===1?.34:.66)}
function sendLane(u,lane,aggressive=false){if(!u||!Number.isInteger(lane))return false;const r=laneRatio(u.side,aggressive),p=map.routePoint(lane,r),x=BASE_X[1]+r*(BASE_X[-1]-BASE_X[1]),a=world(u);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'point',lane,x,t:r,world:{x:p.x,y:p.y}};return true}
function sendBuff(u,id){const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===id);if(!u||!z||!api?.canCapture?.(z,simTime))return false;return api.travelToZone(u,z)}
function sendUnit(u,id){const v=units.find(x=>!x.dead&&x.id===id&&x.side===-u.side);if(!u||!v||!visible(u.side,v))return false;const a=world(u),p=world(v);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'unit',unitId:v.id,lane:v.lane,x:v.x,world:{x:p.x,y:p.y}};return true}
function currentCommand(u){
 if(!u)return null;
 if(u.manualBuff)return{kind:'buff',buffId:u.manualBuff};
 const d=u.tacticalDestination;if(d?.kind==='buff')return{kind:'buff',buffId:d.buff?.id||d.buffId||u.manualBuff};
 if(d?.kind==='unit')return{kind:'unit',unitId:d.unitId};
 if(d?.kind==='point')return{kind:'lane',lane:d.lane,aggressive:(u.side===1?d.t>.48:d.t<.52)};
 if(Number.isInteger(u.lane))return{kind:'lane',lane:u.lane,aggressive:false};return null
}
function same(a,b){if(!a||!b||a.kind!==b.kind)return false;if(a.kind==='buff')return a.buffId===b.buffId;if(a.kind==='unit')return a.unitId===b.unitId;if(a.kind==='lane')return a.lane===b.lane&&!!a.aggressive===!!b.aggressive;return false}
function execute(u,i){if(!u||!i)return false;if(i.kind==='buff')return sendBuff(u,i.buffId);if(i.kind==='unit')return sendUnit(u,i.unitId);if(i.kind==='lane')return sendLane(u,i.lane,i.aggressive);return false}
function valid(side,i){
 if(!i)return false;if(i.kind==='unit'){const v=units.find(x=>!x.dead&&x.id===i.unitId&&x.side===-side);return!!(v&&visible(side,v))}
 if(i.kind==='buff'){const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===i.buffId),zs=z&&api?.zoneState?.(z.id,simTime);if(!z)return false;if(zs?.owner===side)return false;return!!api?.canCapture?.(z,simTime)}
 return Number.isInteger(i.lane)
}
function commitmentSeconds(kind,priority){if(kind==='buff')return 22;if(kind==='unit')return priority>=90?4.0:3.0;if(kind==='lane')return priority>=70?7.5:6.0;return 5}
function hardMicroCandidate(side,u,t){
 const term=live?.getLegendState?.(side);if(!HARD_MICRO.has(term))return null;
 const ep=live?.getEpisode?.(side),cmd=currentCommand(u);if(!cmd)return null;
 let priority=term==='RETREAT'||term==='DISENGAGE'?100:term==='PEEL'?94:90;
 return{...cmd,priority,source:'micro',term,reason:ep?.lastDecision?.reason||term,created:t}
}
function macroCandidate(side,u,t){
 let p=macro?.getPlan?.(side);if(!p)return null;
 const enemy=units.find(x=>!x.dead&&x.side===-side&&x.special?.legend);
 /* Se o plano nasceu de uma posição da Lenda inimiga que está atrás de parede,
    ele não pode usar essa informação para uma rotação precisa. */
 if((p.mode==='COLLAPSE'||p.enemyCommit?.kind==='jungle'||p.enemyCommit?.kind==='lane')&&enemy&&!visible(side,enemy)){
   return{kind:'lane',lane:Number.isInteger(p.strongLane)?p.strongLane:1,aggressive:false,priority:42,source:'macro',term:'HOLD_VISION',reason:'enemy-hidden-by-wall',created:t}
 }
 if(p.mode==='COLLAPSE'&&p.targetUnitId){const v=units.find(x=>!x.dead&&x.id===p.targetUnitId);if(v&&visible(side,v))return{kind:'unit',unitId:v.id,priority:78,source:'macro',term:'COLLAPSE',reason:p.reason,created:t}}
 if((p.mode==='OBJECTIVE'||p.mode==='CROSS_MAP')&&p.objective)return{kind:'buff',buffId:p.objective.id,priority:p.mode==='OBJECTIVE'?76:72,source:'macro',term:p.mode,reason:p.reason,created:t};
 if(p.mode==='STABILIZE')return{kind:'lane',lane:p.weakLane,aggressive:false,priority:82,source:'macro',term:'STABILIZE',reason:p.reason,created:t};
 if(p.mode==='SETUP')return{kind:'lane',lane:p.targetLane,aggressive:false,priority:62,source:'macro',term:'SETUP',reason:p.reason,created:t};
 if(p.mode==='SIEGE')return{kind:'lane',lane:p.targetLane,aggressive:true,priority:60,source:'macro',term:'SIEGE',reason:p.reason,created:t};
 if(p.mode==='TEMPO'||p.mode==='CROSS_MAP')return{kind:'lane',lane:p.targetLane,aggressive:true,priority:56,source:'macro',term:p.mode,reason:p.reason,created:t};
 return{kind:'lane',lane:Number.isInteger(p.strongLane)?p.strongLane:u.lane,aggressive:false,priority:40,source:'macro',term:'HOLD',reason:p.reason,created:t}
}
function buffCommitCandidate(side,u,t){
 const api=window.SL_BUFF_SYSTEM,id=u.manualBuff||u.tacticalDestination?.buff?.id;if(!id)return null;const z=api?.zones?.find(x=>x.id===id),zs=z&&api?.zoneState?.(id,t);if(!z||zs?.owner===side)return null;
 return{kind:'buff',buffId:id,priority:84,source:'commit',term:zs?.contested?'TURN':'OBJECTIVE_COMMIT',reason:zs?.contested?'fight-for-current-buff':'finish-current-buff',created:t}
}
function chooseCandidate(side,u,t){return hardMicroCandidate(side,u,t)||buffCommitCandidate(side,u,t)||macroCandidate(side,u,t)||{kind:'lane',lane:u.lane,aggressive:false,priority:30,source:'fallback',term:'HOLD',reason:'no-plan',created:t}}
function setIntent(side,i,t){const s=state[side];s.intent={...i,until:t+commitmentSeconds(i.kind,i.priority)};s.lastSwitch=t;s.lastReason=i.reason;s.switches++;return s.intent}
function maybeAdopt(side,u,candidate,t){
 const s=state[side],cur=s.intent;if(!cur||!valid(side,cur)||t>=cur.until)return setIntent(side,candidate,t);
 if(same(cur,candidate)){cur.priority=Math.max(cur.priority,candidate.priority);if(candidate.kind==='buff')cur.until=Math.max(cur.until,t+5);return cur}
 const emergency=candidate.priority>=90,margin=candidate.priority-(cur.priority||0),cool=t-s.lastSwitch<2.2;
 if(emergency||(!cool&&margin>=18))return setIntent(side,candidate,t);
 return cur
}
function enforce(side,u,i){
 if(!i)return;const now=currentCommand(u);if(same(now,i))return;
 execute(u,i)
}
function arbitrate(side,t){
 const u=legend(side);if(!u){state[side].intent=null;return}
 const c=chooseCandidate(side,u,t),i=maybeAdopt(side,u,c,t);enforce(side,u,i);
 u.slIntent={kind:i.kind,term:i.term,source:i.source,until:i.until,reason:i.reason,target:i.kind==='buff'?i.buffId:i.kind==='unit'?i.unitId:i.lane}
}
const previousAI=runSideAI;runSideAI=function(side,t){previousAI(side,t);if(side===-1||gameMode==='robot')arbitrate(side,t)};
const oldReset=reset;reset=function(){state[1]=fresh();state[-1]=fresh();return oldReset()};
window.SL_LEGEND_INTENT_ARBITER={version:1,get:side=>state[side]?.intent||null,getState:side=>state[side],reconsider(side){state[side].intent=null;return arbitrate(side,simTime)},health(){return{loaded:true,red:state[-1]?.intent||null,orange:gameMode==='robot'?state[1]?.intent||null:null}}};
})();