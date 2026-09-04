/* Stick Lanes — Research AI plan stability v2
   Second research pass focused on oscillation, cyclic repetition, deadlock and
   movement-task thrashing. The Research Director still scores options; this layer
   governs WHEN a non-emergency plan is allowed to replace the committed plan.
*/
'use strict';
(function(){
const dir=window.SL_AI_RESEARCH_DIRECTOR;
if(!dir||typeof runSideAI!=='function'||window.SL_AI_PLAN_STABILITY?.version>=2)return;

const rawAI=runSideAI;
const state={1:fresh(),'-1':fresh()};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
function fresh(){return{committed:null,committedAt:-999,lastProgressAt:-999,lastMetric:null,rejectedSwitches:0,acceptedSwitches:0,reversalBlocks:0,emergencySwitches:0,lastProposal:null}}
function isAI(side){return side===-1||gameMode==='robot'}
function hpRatio(o){return o?.maxHp?clamp(o.hp/o.maxHp,0,1):0}
function laneFrom(plan){
 if(!plan)return null;const k=plan.key||'',m=k.match(/_(0|1|2)$/);if(m)return Number(m[1]);const c=plan.ctx;
 if(k==='DEFEND_BASE')return c?.worst?.threat?.lane??null;
 if(k==='FINISH_BASE')return c?.bestPush?.lane??null;
 if(k==='DEFEND_TOWER'){
   let best=null;for(let l=0;l<3;l++){const s=c?.lanes?.[l]?.ownTower;if(!s)continue;const score=(1-hpRatio(s))*.65+(c.lanes[l].threat?.score||0)*.35;if(!best||score>best.score)best={lane:l,score}}
   return best?.lane??c?.worst?.threat?.lane??null
 }
 if(k==='HUNT'&&c?.enemySeen)return c.enemy?.lane??null;
 return c?.me?.lane??null
}
function critical(plan){
 if(!plan)return false;const k=plan.key,c=plan.ctx;
 if(k==='RESET')return hpRatio(c?.me)<.28;
 if(k==='DEFEND_BASE')return (c?.worst?.threat?.score||0)>.66||(c?.ownTTD??Infinity)<28||(c?.ownBase??1)<.35;
 if(k==='FINISH_BASE')return (c?.enemyTTD??Infinity)<16||(c?.enemyBase??1)<.16;
 return false
}
function commitment(plan){const k=plan?.key||'';if(k.startsWith('OBJ_'))return 18;if(k==='DEFEND_TOWER')return 9;if(k==='HUNT')return 7;if(k==='RESET')return 7;if(k==='DEFEND_BASE'||k==='FINISH_BASE')return 10;return 12}
function metric(plan,side){
 if(!plan?.ctx)return 0;const c=plan.ctx,k=plan.key,l=laneFrom(plan);
 if(k==='DEFEND_BASE')return 1-(c.worst?.threat?.score||0);
 if(k==='FINISH_BASE')return 1-(c.enemyBase??1);
 if(k==='DEFEND_TOWER'&&Number.isInteger(l))return hpRatio(c.lanes?.[l]?.ownTower);
 if(k.startsWith('PUSH_')||k.startsWith('CROSS_'))return c.lanes?.[l]?.push?.score||0;
 if(k.startsWith('HOLD_'))return 1-(c.lanes?.[l]?.threat?.score||0);
 if(k.startsWith('OBJ_')){const id=k.slice(4),z=window.SL_BUFF_SYSTEM?.zoneState?.(id,simTime);if(z?.owner===side)return 1;if(z?.capturingSide===side)return clamp((z.progress||0)/15,0,1);return 0}
 if(k==='RESET')return 1-hpRatio(c.me);
 if(k==='HUNT'&&c.enemySeen)return 1-hpRatio(c.enemy);
 return .5
}
function scoreFor(bb,key){return bb?.scoreTrace?.find(x=>x.key===key)?.score??-Infinity}
function sameFamily(a,b){if(!a||!b)return false;const fa=(a.key||'').split('_')[0],fb=(b.key||'').split('_')[0];return fa===fb}
function freshen(old,proposal,t){return{...old,ctx:proposal.ctx,score:scoreFor(dir.getBlackboard(old.ctx?.side||proposal.ctx?.side),old.key),until:Math.max(old.until||0,t+3.5)}}
function desiredOrder(plan,lane){const k=plan.key;if(k==='DEFEND_BASE')return lane===laneFrom(plan)?'base':(plan.ctx?.lanes?.[lane]?.threat?.score||0)>.42?'behind':'advance';if(k==='FINISH_BASE')return lane===laneFrom(plan)?'attack':(plan.ctx?.lanes?.[lane]?.threat?.score||0)>.58?'base':'advance';if(k==='DEFEND_TOWER')return lane===laneFrom(plan)?'behind':null;if(k.startsWith('PUSH_')||k.startsWith('CROSS_'))return lane===laneFrom(plan)?'attack':(plan.ctx?.lanes?.[lane]?.threat?.score||0)>.62?'behind':null;if(k.startsWith('HOLD_'))return lane===laneFrom(plan)?'behind':null;if(k==='HUNT'&&plan.ctx?.enemySeen)return lane===plan.ctx.enemy.lane?'attack':null;if(k==='RESET')return(plan.ctx?.lanes?.[lane]?.threat?.score||0)>.45?'behind':null;return null}
function reapplyOrders(side,plan){if(!plan||!orders?.[side])return;for(let l=0;l<3;l++){const o=desiredOrder(plan,l);if(o)orders[side][l]=o}}
function refreshProgress(side,s,t){
 if(!s.committed)return;const m=metric(s.committed,side);
 if(s.lastMetric===null||m>s.lastMetric+.025){s.lastMetric=m;s.lastProgressAt=t;s.committed.progressAt=t}
}
function accept(side,s,p,t,emergency=false){s.committed={...p};s.committedAt=t;s.lastMetric=metric(p,side);s.lastProgressAt=t;s.committed.progressAt=t;s.acceptedSwitches++;if(emergency)s.emergencySwitches++;const b=dir.getBlackboard(side);if(b){b.plan=s.committed;b.lastProgress=s.lastMetric;b.lastProgressAt=t}return s.committed}
function govern(side,t){
 const b=dir.getBlackboard(side),s=state[side],p=b?.plan;if(!p)return null;s.lastProposal=p.key;
 if(!s.committed)return accept(side,s,p,t,critical(p));
 if(p.key===s.committed.key){s.committed={...p,created:s.committed.created,progressAt:s.committed.progressAt};refreshProgress(side,s,t);b.plan=s.committed;b.lastProgress=s.lastMetric;b.lastProgressAt=s.lastProgressAt;return s.committed}
 const elapsed=t-s.committedAt,curCritical=critical(s.committed),nextCritical=critical(p),oldLane=laneFrom(s.committed),newLane=laneFrom(p),legend=p.ctx?.me;
 refreshProgress(side,s,t);
 const stalled=t-s.lastProgressAt>11.5,scoreGap=scoreFor(b,p.key)-scoreFor(b,s.committed.key),rotating=!!legend?.tacticalWorld,laneReverse=Number.isInteger(oldLane)&&Number.isInteger(newLane)&&oldLane!==newLane;
 let allow=false;
 if(nextCritical&&!curCritical){allow=true}
 else if(nextCritical&&scoreGap>.25){allow=true}
 else if(curCritical&&!nextCritical&&!stalled){allow=false}
 else if(stalled){allow=true}
 else if(elapsed>=commitment(s.committed)&&scoreGap>.72){allow=true}
 else if(elapsed>=commitment(s.committed)+4&&sameFamily(s.committed,p)&&scoreGap>.35){allow=true}
 if(laneReverse&&rotating&&elapsed<18&&!nextCritical){allow=false;s.reversalBlocks++}
 if(allow)return accept(side,s,p,t,nextCritical);
 s.rejectedSwitches++;
 const kept={...s.committed,ctx:p.ctx,until:Math.max(s.committed.until||0,t+3.5),progressAt:s.lastProgressAt};s.committed=kept;b.plan=kept;b.lastProgress=s.lastMetric;b.lastProgressAt=s.lastProgressAt;reapplyOrders(side,kept);return kept
}
runSideAI=function(side,t){const out=rawAI(side,t);if(isAI(side))govern(side,t);return out};
const rawReset=reset;reset=function(){state[1]=fresh();state[-1]=fresh();return rawReset()};
window.SL_AI_PLAN_STABILITY={version:2,get:side=>state[side],health(){return{loaded:true,commitment:true,red:state[-1],orange:gameMode==='robot'?state[1]:null}}};
})();