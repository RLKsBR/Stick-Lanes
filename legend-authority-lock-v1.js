/* Stick Lanes — autoridade final de movimento da Lenda IA v2
   Research pass 2: strict single-writer ownership, semantic destination matching,
   longer commitment, arrival normalization and stuck recovery.

   Critical fix: an old controller could write a different point on the SAME lane.
   v1 considered that command equivalent because only the lane matched, allowing
   forward/backward oscillation. v2 accepts only destinations stamped slAuthority.
*/
'use strict';
(function boot(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map||!window.SL_LEGEND_INTENT_ARBITER||typeof simulationStep!=='function'){setTimeout(boot,40);return}
if(window.SL_AI_LEGEND_AUTHORITY?.version>=2)return;

const state={1:fresh(),'-1':fresh()};
let executing=false,blockedBuffHijacks=0,restores=0,hijacksRejected=0,stuckRecoveries=0;
function fresh(){return{intent:null,adoptedAt:-999,until:-999,lastSig:'',switches:0,blockedSwitches:0,watchSig:'',watchX:null,watchY:null,watchAt:-999}}
function isAI(side){return side===-1||gameMode==='robot'}
function legend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function sig(i){if(!i)return'';if(i.kind==='buff')return'buff:'+i.buffId;if(i.kind==='unit')return'unit:'+i.unitId;return i.kind+':'+i.lane+':'+targetRatioRaw(i)}
function clear(u){delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination}
function world(u){return map.unitPos(u)}
function intentLife(i){if(!i)return 0;if(i.kind==='buff')return 24;if(i.kind==='base')return 11;if(i.kind==='finish')return 12;if(i.kind==='guard')return 10;if(i.kind==='unit')return 7;return 12}
function emergency(i){return(i?.priority||0)>=109||['RETREAT','DISENGAGE','DEFEND_BASE','END_GAME'].includes(i?.term)}
function intentValid(side,i){
 if(!i)return false;
 if(i.kind==='buff'){
  const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===i.buffId),s=z&&api?.zoneState?.(z.id,simTime);
  return!!(z&&s?.owner!==side&&api?.canCapture?.(z,simTime));
 }
 if(i.kind==='unit'){const v=units.find(x=>!x.dead&&x.id===i.unitId&&x.side===-side);return!!(v&&(!window.SL_VISION||window.SL_VISION.isVisibleTo(side,v)))}
 return Number.isInteger(i.lane)
}
function desiredOrder(i){
 if(!i)return null;if(i.kind==='base')return'base';if(i.kind==='finish')return'attack';if(i.kind==='guard'||i.term==='HOLD')return'behind';return i.aggressive?'attack':'advance'
}
function targetRatioRaw(i){
 if(!i)return.5;if(i.kind==='base')return i.lane===undefined?.14:.14;if(i.kind==='finish')return.78;if(i.kind==='guard')return Number.isFinite(i.t)?i.t:.30;return i.aggressive?.58:.34
}
function targetRatio(u,i){
 if(i.kind==='base')return u.side===1?.14:.86;
 if(i.kind==='finish')return u.side===1?.78:.22;
 if(i.kind==='guard')return Number.isFinite(i.t)?i.t:(u.side===1?.30:.70);
 return i.aggressive?(u.side===1?.58:.42):(u.side===1?.34:.66);
}
function arrived(u,i){
 if(!u||!i)return true;
 if(i.kind==='buff'){
  const z=window.SL_BUFF_SYSTEM?.zones?.find(x=>x.id===i.buffId);return!!(z&&window.SL_BUFF_SYSTEM?.containsBuff?.(z,world(u))&&u.manualBuff===i.buffId)
 }
 if(i.kind==='unit')return false;
 if(u.tacticalWorld||u.tacticalDestination)return false;
 if(u.lane!==i.lane)return false;
 return orders?.[u.side]?.[i.lane]===desiredOrder(i)
}
function adopt(side,proposal,t,force=false){
 const s=state[side],cur=s.intent;
 if(!proposal)return cur;
 if(!cur||!intentValid(side,cur)||force||t>=s.until){
  s.intent={...proposal};s.adoptedAt=t;s.until=t+intentLife(proposal);s.lastSig=sig(proposal);s.switches++;resetWatch(s);return s.intent
 }
 if(sig(cur)===sig(proposal)){
  cur.priority=Math.max(cur.priority||0,proposal.priority||0);cur.term=proposal.term||cur.term;cur.reason=proposal.reason||cur.reason;return cur
 }
 if(emergency(proposal)&&(!emergency(cur)||(proposal.priority||0)>(cur.priority||0)+2)){
  s.intent={...proposal};s.adoptedAt=t;s.until=t+intentLife(proposal);s.lastSig=sig(proposal);s.switches++;resetWatch(s);return s.intent
 }
 s.blockedSwitches++;return cur
}
function resetWatch(s){s.watchSig='';s.watchX=null;s.watchY=null;s.watchAt=-999}
function expectedPoint(u,i){const t=Math.max(.03,Math.min(.97,targetRatio(u,i))),p=map.routePoint(i.lane,t);return{t,p,x:BASE_X[1]+t*(BASE_X[-1]-BASE_X[1])}}
function issueLane(u,i){
 const {t,p,x}=expectedPoint(u,i);
 if(!u.tacticalWorld&&u.lane===i.lane){
  clear(u);orders[u.side][i.lane]=desiredOrder(i);u.slAuthority={intent:sig(i),until:state[u.side].until,restores,blockedSwitches:state[u.side].blockedSwitches};return true
 }
 const a=world(u);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'point',lane:i.lane,x,t,world:{x:p.x,y:p.y},slNoHold:true,slAuthority:true,slIntent:sig(i)};return true
}
function issueUnit(u,i){
 const v=units.find(x=>!x.dead&&x.id===i.unitId&&x.side===-u.side);if(!v)return false;const a=world(u),b=world(v);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'unit',unitId:v.id,lane:v.lane,x:v.x,world:{x:b.x,y:b.y},slAuthority:true,slIntent:sig(i)};return true
}
function issueBuff(u,i){
 const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===i.buffId);if(!z||!api?.canCapture?.(z,simTime))return false;
 executing=true;try{const ok=api.travelToZone(u,z);if(ok&&u.tacticalDestination){u.tacticalDestination.slAuthority=true;u.tacticalDestination.slIntent=sig(i)}return ok}finally{executing=false}
}
function authorityPointMatches(u,i,d){
 if(!d?.slAuthority||d.slIntent!==sig(i)||d.kind!=='point'||d.lane!==i.lane)return false;const expected=targetRatio(u,i);return !Number.isFinite(d.t)||Math.abs(d.t-expected)<=.055
}
function commandMatches(u,i){
 if(!u||!i)return true;
 if(i.kind==='buff')return u.manualBuff===i.buffId||u.tacticalDestination?.slAuthority&&u.tacticalDestination?.slIntent===sig(i)&&u.tacticalDestination?.kind==='buff';
 if(i.kind==='unit')return u.tacticalDestination?.slAuthority&&u.tacticalDestination?.slIntent===sig(i)&&u.tacticalDestination?.kind==='unit'&&u.tacticalDestination?.unitId===i.unitId;
 if(u.tacticalDestination)return authorityPointMatches(u,i,u.tacticalDestination);
 return arrived(u,i)
}
function issue(u,i){if(i.kind==='buff')return issueBuff(u,i);if(i.kind==='unit')return issueUnit(u,i);return issueLane(u,i)}
function watchMovement(side,u,i,t){
 const s=state[side];if(!u.tacticalWorld||!u.tacticalDestination?.slAuthority){resetWatch(s);return}
 const w=u.tacticalWorld,signature=sig(i);
 if(s.watchSig!==signature||s.watchX===null){s.watchSig=signature;s.watchX=w.x;s.watchY=w.y;s.watchAt=t;return}
 const moved=Math.hypot(w.x-s.watchX,w.y-s.watchY);
 if(moved>=28){s.watchX=w.x;s.watchY=w.y;s.watchAt=t;return}
 if(t-s.watchAt<2.8)return;
 stuckRecoveries++;s.watchX=w.x;s.watchY=w.y;s.watchAt=t;executing=true;try{issue(u,i)}finally{executing=false}
}
function enforce(side,t){
 if(!isAI(side))return;const u=legend(side);if(!u){state[side].intent=null;resetWatch(state[side]);return}
 const proposal=window.SL_LEGEND_INTENT_ARBITER?.get?.(side)||null,i=adopt(side,proposal,t);if(!i||!intentValid(side,i))return;
 if(commandMatches(u,i)){watchMovement(side,u,i,t);return}
 if(u.tacticalDestination&&!u.tacticalDestination.slAuthority)hijacksRejected++;
 restores++;executing=true;try{issue(u,i)}finally{executing=false}
 u.slAuthority={intent:sig(i),until:state[side].until,restores,blockedSwitches:state[side].blockedSwitches,hijacksRejected,stuckRecoveries};watchMovement(side,u,i,t)
}

const buffs=window.SL_BUFF_SYSTEM;
if(buffs?.travelToZone){
 const rawTravel=buffs.travelToZone;
 buffs.travelToZone=function(u,z){
  if(u?.special?.legend&&isAI(u.side)&&!executing){blockedBuffHijacks++;return false}
  return rawTravel(u,z)
 };
}

const prevStep=simulationStep;
simulationStep=function(dt){for(const side of[1,-1])enforce(side,simTime);prevStep(dt);for(const side of[1,-1])enforce(side,simTime)};
const prevReset=reset;reset=function(){state[1]=fresh();state[-1]=fresh();blockedBuffHijacks=0;restores=0;hijacksRejected=0;stuckRecoveries=0;return prevReset()};
window.SL_AI_LEGEND_AUTHORITY={version:2,get:side=>state[side],health(){return{loaded:true,singleAuthority:true,strictDestinationOwnership:true,blockedBuffHijacks,restores,hijacksRejected,stuckRecoveries,red:state[-1],orange:gameMode==='robot'?state[1]:null}}};
})();