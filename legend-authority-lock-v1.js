/* Stick Lanes — autoridade final de movimento da Lenda IA v1
   O árbitro PROPÕE; este módulo EXECUTA. Nenhum subsistema antigo pode trocar
   o destino físico da Lenda por fora da intenção comprometida.

   Corrige o ping-pong observado em gameplay: lane -> buff -> lane -> buff.
*/
'use strict';
(function boot(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map||!window.SL_LEGEND_INTENT_ARBITER||typeof simulationStep!=='function'){setTimeout(boot,40);return}
if(window.SL_AI_LEGEND_AUTHORITY?.version>=1)return;

const state={1:fresh(),'-1':fresh()};
let executing=false,blockedBuffHijacks=0,restores=0;
function fresh(){return{intent:null,adoptedAt:-999,until:-999,lastSig:'',switches:0,blockedSwitches:0}}
function isAI(side){return side===-1||gameMode==='robot'}
function legend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function sig(i){if(!i)return'';if(i.kind==='buff')return'buff:'+i.buffId;if(i.kind==='unit')return'unit:'+i.unitId;return i.kind+':'+i.lane}
function clear(u){delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination}
function world(u){return map.unitPos(u)}
function intentLife(i){if(!i)return 0;if(i.kind==='buff')return 25;if(i.kind==='base')return 10;if(i.kind==='finish')return 11;if(i.kind==='guard')return 8;if(i.kind==='unit')return 5;return 7}
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
function arrived(u,i){
 if(!u||!i)return true;
 if(i.kind==='buff'){
  const z=window.SL_BUFF_SYSTEM?.zones?.find(x=>x.id===i.buffId);return!!(z&&window.SL_BUFF_SYSTEM?.containsBuff?.(z,world(u))&&u.manualBuff===i.buffId);
 }
 if(i.kind==='unit')return false;
 if(u.tacticalWorld)return false;
 if(u.lane!==i.lane)return false;
 if(i.kind==='base')return orders[u.side]?.[i.lane]==='base';
 if(i.kind==='finish')return orders[u.side]?.[i.lane]==='attack';
 if(i.kind==='guard')return orders[u.side]?.[i.lane]==='behind'||orders[u.side]?.[i.lane]==='base';
 return true;
}
function adopt(side,proposal,t,force=false){
 const s=state[side],cur=s.intent;
 if(!proposal)return cur;
 if(!cur||!intentValid(side,cur)||force||t>=s.until||arrived(legend(side),cur)&&t-s.adoptedAt>=2.5){
  s.intent={...proposal};s.adoptedAt=t;s.until=t+intentLife(proposal);s.lastSig=sig(proposal);s.switches++;return s.intent;
 }
 if(sig(cur)===sig(proposal)){
  cur.priority=Math.max(cur.priority||0,proposal.priority||0);cur.term=proposal.term||cur.term;return cur;
 }
 if(emergency(proposal)&&(!emergency(cur)||(proposal.priority||0)>(cur.priority||0)+2)){
  s.intent={...proposal};s.adoptedAt=t;s.until=t+intentLife(proposal);s.lastSig=sig(proposal);s.switches++;return s.intent;
 }
 s.blockedSwitches++;return cur;
}
function targetRatio(u,i){
 if(i.kind==='base')return u.side===1?.14:.86;
 if(i.kind==='finish')return u.side===1?.78:.22;
 if(i.kind==='guard')return Number.isFinite(i.t)?i.t:(u.side===1?.30:.70);
 return i.aggressive?(u.side===1?.58:.42):(u.side===1?.34:.66);
}
function issueLane(u,i){
 const t=Math.max(.03,Math.min(.97,targetRatio(u,i))),p=map.routePoint(i.lane,t),x=BASE_X[1]+t*(BASE_X[-1]-BASE_X[1]);
 if(!u.tacticalWorld&&u.lane===i.lane){
  clear(u);if(i.kind==='base')orders[u.side][i.lane]='base';else if(i.kind==='finish')orders[u.side][i.lane]='attack';else if(i.kind==='guard')orders[u.side][i.lane]='behind';return true;
 }
 const a=world(u);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'point',lane:i.lane,x,t,world:{x:p.x,y:p.y},slNoHold:true,slAuthority:true};return true;
}
function issueUnit(u,i){
 const v=units.find(x=>!x.dead&&x.id===i.unitId&&x.side===-u.side);if(!v)return false;const a=world(u),b=world(v);clear(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};u.tacticalDestination={kind:'unit',unitId:v.id,lane:v.lane,x:v.x,world:{x:b.x,y:b.y},slAuthority:true};return true;
}
function issueBuff(u,i){
 const api=window.SL_BUFF_SYSTEM,z=api?.zones?.find(x=>x.id===i.buffId);if(!z||!api?.canCapture?.(z,simTime))return false;
 executing=true;try{return api.travelToZone(u,z)}finally{executing=false}
}
function commandMatches(u,i){
 if(!u||!i)return true;
 if(i.kind==='buff')return u.manualBuff===i.buffId||u.tacticalDestination?.kind==='buff'&&(u.tacticalDestination.buff?.id===i.buffId||u.tacticalDestination.buffId===i.buffId);
 if(i.kind==='unit')return u.manualUnitTargetId===i.unitId||u.tacticalDestination?.kind==='unit'&&u.tacticalDestination.unitId===i.unitId;
 if(u.tacticalDestination?.kind==='point'&&u.tacticalDestination.lane===i.lane)return true;
 return arrived(u,i);
}
function enforce(side,t){
 if(!isAI(side))return;const u=legend(side);if(!u){state[side].intent=null;return}
 const proposal=window.SL_LEGEND_INTENT_ARBITER?.get?.(side)||null,i=adopt(side,proposal,t);if(!i||!intentValid(side,i))return;
 if(commandMatches(u,i))return;
 restores++;executing=true;try{if(i.kind==='buff')issueBuff(u,i);else if(i.kind==='unit')issueUnit(u,i);else issueLane(u,i)}finally{executing=false}
 u.slAuthority={intent:sig(i),until:state[side].until,restores,blockedSwitches:state[side].blockedSwitches};
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
simulationStep=function(dt){
 for(const side of[1,-1])enforce(side,simTime);
 prevStep(dt);
 for(const side of[1,-1])enforce(side,simTime);
};
const prevReset=reset;reset=function(){state[1]=fresh();state[-1]=fresh();blockedBuffHijacks=0;restores=0;return prevReset()};
window.SL_AI_LEGEND_AUTHORITY={version:1,get:side=>state[side],health(){return{loaded:true,singleAuthority:true,blockedBuffHijacks,restores,red:state[-1],orange:gameMode==='robot'?state[1]:null}}};
})();