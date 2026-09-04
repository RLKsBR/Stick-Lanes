/* Stick Lanes — Legacy Strategic Quarantine v2
   Research v2 finding: old strategic layers were still writing directly into the
   Legend's movement state AND team lane orders inside runSideAI. This wrapper keeps
   their economy, purchases and learning, but rolls back legacy movement/order writes
   before the Research Director gets control.
*/
'use strict';
(function(){
if(typeof runSideAI!=='function'||window.SL_AI_LEGACY_QUARANTINE?.version>=2)return;

const MOVEMENT_KEYS=['lane','x','sub','subTarget','tacticalWorld','tacticalDestination','manualBuff','manualTargetId','manualUnitTargetId','manualHold'];
const rawAI=runSideAI;
let blockedMovementWrites=0,blockedOrderWrites=0,passes=0;
const isAI=side=>side===-1||gameMode==='robot';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function legends(side){return units.filter(u=>!u.dead&&u.side===side&&u.special?.legend)}
function snapshot(u){
 const props={};for(const k of MOVEMENT_KEYS)props[k]={had:own(u,k),value:u[k]};
 return{u,props,signature:signature(u)}
}
function signature(u){
 const d=u.tacticalDestination;
 return JSON.stringify({lane:u.lane,x:u.x,sub:u.sub,subTarget:u.subTarget,tw:!!u.tacticalWorld,td:d?{kind:d.kind,lane:d.lane,t:d.t,buffId:d.buffId||d.buff?.id,unitId:d.unitId,authority:!!d.slAuthority}:null,mb:u.manualBuff,mt:u.manualTargetId,mu:u.manualUnitTargetId,mh:u.manualHold?{lane:u.manualHold.lane,x:u.manualHold.x}:null})
}
function restore(s){
 const u=s.u;if(!u||u.dead)return;
 if(signature(u)!==s.signature)blockedMovementWrites++;
 for(const [k,p] of Object.entries(s.props)){if(p.had)u[k]=p.value;else delete u[k]}
}
function sameOrders(a,b){return!!a&&!!b&&a.length===b.length&&a.every((v,i)=>v===b[i])}
runSideAI=function(side,t){
 if(!isAI(side))return rawAI(side,t);
 const snaps=legends(side).map(snapshot),orderSnap=Array.isArray(orders?.[side])?orders[side].slice():null;
 const out=rawAI(side,t);passes++;
 for(const s of snaps)restore(s);
 if(orderSnap&&Array.isArray(orders?.[side])&&!sameOrders(orderSnap,orders[side])){
   blockedOrderWrites++;orders[side].splice(0,orders[side].length,...orderSnap)
 }
 return out
};
window.SL_AI_LEGACY_QUARANTINE={version:2,health(){return{loaded:true,exclusiveLegendWriter:true,exclusiveTeamOrderWriter:true,blockedMovementWrites,blockedOrderWrites,passes}}};
})();