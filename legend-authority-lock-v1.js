/* Stick Lanes — IA funcional single-owner v3
   Um único controlador decide plano, ordens, compras e rotação da Lenda.
   Os controladores estratégicos antigos continuam carregados por compatibilidade,
   mas deixam de participar do runSideAI: não existe mais rollback de comandos
   concorrentes como mecanismo principal de controle.

   Princípios: plano persistente (Running), histerese para troca, fallback sempre
   executável, destino com chegada explícita e hand-off sem manualHold.
*/
'use strict';
(function boot(){
const map=window.SL_MOBA_SQUARE_V2,tt=window.SL_TACTICAL_TARGETING;
if(!map||!tt||typeof runSideAI!=='function'||typeof reset!=='function'){setTimeout(boot,40);return}
if(window.SL_AI_FUNCTIONAL_CONTROLLER?.version>=3)return;

const oldRunSideAI=runSideAI;
const state={1:fresh(),'-1':fresh()};
let decisions=0,planSwitches=0,purchases=0,legendRotations=0,noHoldHandOffs=0,
    staleHoldClears=0,stuckRecoveries=0,legacyCalls=0,planSeq=0;

function fresh(){return{nextThink:0,nextBuy:0,plan:null,forcedUntil:-1,watchAt:-1,watchX:null,watchY:null,watchPlan:0,lastDecisionAt:-1,lastBuyAt:-1}}
function isAI(side){return side===-1||gameMode==='robot'}
function legend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function baseRatio(side){return Math.max(0,Math.min(1,baseHp(side)/Math.max(1,BASE_HP)))}
function frontTower(side,lane){
 const list=aliveTowers(side,lane);if(!list.length)return null;
 return [...list].sort((a,b)=>side===1?b.x-a.x:a.x-b.x)[0]
}
function towerRatio(s){return s?Math.max(0,Math.min(1,s.hp/Math.max(1,s.maxHp||s.hp))):0}
function laneInfo(side,lane){
 const own=armyPower(side,lane),foe=armyPower(-side,lane),sum=Math.max(40,own+foe),edge=(own-foe)/sum,
       ownTower=frontTower(side,lane),enemyTower=frontTower(-side,lane),
       ownWeak=ownTower?1-towerRatio(ownTower):1,enemyWeak=enemyTower?1-towerRatio(enemyTower):1,
       ownWave=units.filter(u=>!u.dead&&u.side===side&&u.lane===lane&&u.minion).length,
       foeWave=units.filter(u=>!u.dead&&u.side===-side&&u.lane===lane&&u.minion).length;
 const danger=(-edge)*1.15+ownWeak*.68+(!ownTower ? .25 : 0)+(foeWave>ownWave+2 ? .18 : 0);
 const push=edge*.92+enemyWeak*.72+(!enemyTower ? .42 : 0)+(ownWave>foeWave ? .12 : 0);
 return{lane,own,foe,edge,ownTower,enemyTower,ownWeak,enemyWeak,ownWave,foeWave,danger,push}
}
function snapshot(side){return{ownBase:baseRatio(side),enemyBase:baseRatio(-side),lanes:[0,1,2].map(l=>laneInfo(side,l))}}
function bestBy(a,key){return [...a].sort((x,y)=>y[key]-x[key]||x.lane-y.lane)[0]}
function candidate(side){
 const s=snapshot(side),danger=bestBy(s.lanes,'danger'),push=bestBy(s.lanes,'push'),open=s.lanes.filter(x=>!x.enemyTower).sort((a,b)=>b.edge-a.edge)[0];
 if(s.ownBase<.42||danger.danger>1.34)return{mode:'DEFEND',lane:danger.lane,score:8+danger.danger+(1-s.ownBase)*3,emergency:true,reason:'ameaça concreta à retaguarda',ctx:s};
 if(open&&(s.enemyBase<.34||open.edge>-.02))return{mode:'FINISH',lane:open.lane,score:5.4+(1-s.enemyBase)*2+open.edge,emergency:s.enemyBase<.16,reason:'rota aberta para a base',ctx:s};
 if(danger.danger>1.05&&push.push<.15)return{mode:'DEFEND',lane:danger.lane,score:2.8+danger.danger,emergency:false,reason:'estabilizar a lane sob pressão',ctx:s};
 return{mode:'PUSH',lane:push.lane,score:3+push.push,emergency:false,reason:'melhor pressão sustentável',ctx:s}
}
function currentScore(side,p){
 if(!p)return-999;const s=snapshot(side),l=s.lanes[p.lane];
 if(p.mode==='DEFEND')return 2.8+l.danger;
 if(p.mode==='FINISH')return(!l.enemyTower?5.4:2)+(1-s.enemyBase)*2+l.edge;
 return 3+l.push
}
function samePlan(a,b){return!!a&&!!b&&a.mode===b.mode&&a.lane===b.lane}
function accept(side,c,t,forced=false){
 const s=state[side],old=s.plan,life=c.mode==='DEFEND'?10:c.mode==='FINISH'?13:15;
 s.plan={id:++planSeq,mode:c.mode,lane:c.lane,score:c.score,reason:c.reason,startedAt:t,lockUntil:t+life,forced:!!forced};
 s.lastDecisionAt=t;planSwitches+=old&&!samePlan(old,s.plan)?1:0;applyOrders(side,s.plan,c.ctx||snapshot(side));issueLegend(side,s.plan,t,true)
}
function decide(side,t){
 const s=state[side],c=candidate(side);decisions++;
 if(!s.plan){accept(side,c,t);return}
 if(s.forcedUntil>t){applyOrders(side,s.plan,snapshot(side));return}
 if(s.plan.forced&&s.forcedUntil<=t)s.plan.forced=false;
 if(samePlan(s.plan,c)){s.plan.score=c.score;s.plan.reason=c.reason;applyOrders(side,s.plan,c.ctx);return}
 if(c.emergency){accept(side,c,t);return}
 if(t<s.plan.lockUntil){applyOrders(side,s.plan,c.ctx);return}
 const oldScore=currentScore(side,s.plan);
 if(c.score>oldScore+.38)accept(side,c,t);else applyOrders(side,s.plan,c.ctx)
}
function applyOrders(side,p,ctx=snapshot(side)){
 for(let lane=0;lane<3;lane++){
  const l=ctx.lanes[lane];
  if(p.mode==='DEFEND')orders[side][lane]=lane===p.lane?(l.ownTower?'behind':'base'):(l.danger>1.12?'behind':'advance');
  else if(p.mode==='FINISH')orders[side][lane]=lane===p.lane?'attack':(l.danger>1.18?'behind':'advance');
  else orders[side][lane]=lane===p.lane?(l.edge>-.18||l.enemyWeak>.42?'attack':'advance'):(l.danger>1.18?'behind':'advance')
 }
 if(side===1&&gameMode==='robot')syncOrderButtons(1)
}
function clearManual(u,keepTravel=false){
 delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;
 if(u.manualHold){delete u.manualHold;staleHoldClears++}
 if(!keepTravel){delete u.tacticalWorld;delete u.tacticalDestination}
}
function routeRatio(side,mode){
 if(mode==='DEFEND')return side===1 ? .28 : .72;
 if(mode==='FINISH')return side===1 ? .72 : .28;
 return side===1 ? .52 : .48
}
function issueLegend(side,p,t,force=false){
 const u=legend(side);if(!u||!p)return false;
 if(u.manualHold){delete u.manualHold;staleHoldClears++}
 const d=u.tacticalDestination;
 if(u.tacticalWorld&&!force&&d?.slFunctional&&d.slPlanId===p.id)return true;
 if(u.lane===p.lane&&!u.tacticalWorld){clearManual(u);state[side].watchAt=-1;return true}
 const ratio=routeRatio(side,p.mode),point=map.routePoint(p.lane,ratio),a=map.unitPos(u);
 clearManual(u);u.tacticalWorld={x:a.x,y:a.y,a:a.a||0};
 u.tacticalDestination={kind:'point',lane:p.lane,t:ratio,x:BASE_X[1]+ratio*(BASE_X[-1]-BASE_X[1]),world:{x:point.x,y:point.y},slNoHold:true,slFunctionalNoHold:true,slFunctional:true,slPlanId:p.id};
 state[side].watchAt=t;state[side].watchX=a.x;state[side].watchY=a.y;state[side].watchPlan=p.id;legendRotations++;return true
}
function maintainLegend(side,t){
 const s=state[side],p=s.plan,u=legend(side);if(!u||!p)return;
 if(u.manualHold){delete u.manualHold;staleHoldClears++}
 if(!u.tacticalWorld){
  s.watchAt=-1;s.watchX=null;s.watchY=null;
  if(u.lane!==p.lane)issueLegend(side,p,t,true);
  else{delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.tacticalDestination}
  return
 }
 const d=u.tacticalDestination;
 if(!d?.slFunctional||d.slPlanId!==p.id){issueLegend(side,p,t,true);return}
 const w=u.tacticalWorld;
 if(s.watchAt<0||s.watchPlan!==p.id){s.watchAt=t;s.watchX=w.x;s.watchY=w.y;s.watchPlan=p.id;return}
 const moved=Math.hypot(w.x-s.watchX,w.y-s.watchY);
 if(moved>=30){s.watchAt=t;s.watchX=w.x;s.watchY=w.y;return}
 if(t-s.watchAt>=3.2&&t>=(u.stunUntil||0)){stuckRecoveries++;issueLegend(side,p,t,true)}
}
function buy(side,t){
 const roster=sideRoster(side),ready=aiSpawnCd[side],usage=aiUse[side];if(!roster?.length)return;
 const available=roster.filter(({fac,u})=>sideGold(side)>=u.cost&&t>=(ready[fac+'|'+u.name]||0)&&canSpawnUnit(side,u));if(!available.length)return;
 const own=units.filter(v=>!v.dead&&v.side===side&&!v.minion&&!v.special?.legend),tanks=own.filter(v=>v.role==='tank'||v.role==='fighter').length,ranged=own.filter(v=>v.role==='ranged'||v.role==='siege').length;
 let best=null,bestScore=-Infinity;
 for(const x of available){
  const key=x.fac+'|'+x.u.name,novelty=(usage[key]||0)===0?1.22:1/Math.pow(1+(usage[key]||0)*.14,.32),
        frontNeed=tanks<Math.max(2,ranged*.7)&&(x.u.role==='tank'||x.u.role==='fighter')?1.28:1,
        score=unitValue(x.u)*novelty*frontNeed;
  if(score>bestScore){best=x;bestScore=score}
 }
 if(!best)return;const key=best.fac+'|'+best.u.name,p=state[side].plan,ctx=snapshot(side),weak=[...ctx.lanes].sort((a,b)=>a.edge-b.edge||b.danger-a.danger)[0];
 let lane=p?.mode==='DEFEND'?p.lane:(weak.edge<-.42?weak.lane:(p?.lane??weak.lane));
 spendSideGold(side,best.u.cost);ready[key]=t+best.u.gen;usage[key]=(usage[key]||0)+1;spawnUnit(side,lane,best.fac,best.u);purchases++;state[side].lastBuyAt=t
}
function updateLabel(){
 const el=document.querySelector('#modeStatus');if(!el)return;
 if(gameMode==='robot')el.textContent='Simulação assistida • IA funcional single-owner v3';
 else if(el.textContent.includes('IA adaptativa'))el.textContent='Player versus IA • IA funcional v3'
}

// A causa concreta da paralisia anterior: tactical-targeting transformava uma
// viagem slNoHold concluída em manualHold. O wrapper preserva o clique manual do
// jogador e só remove o hold criado na chegada de viagens da IA single-owner.
const rawHandle=tt.handleUnit.bind(tt);
tt.handleUnit=function(u,dt,t){
 const noHold=!!(u?.special?.legend&&isAI(u.side)&&u.tacticalDestination?.slFunctionalNoHold);
 const r=rawHandle(u,dt,t);
 if(noHold&&!u.tacticalWorld&&u.manualHold){delete u.manualHold;delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;noHoldHandOffs++}
 return r
};

// Desliga a fonte do conflito: a cadeia antiga de runSideAI não é mais chamada.
// O arbiter legado também fica sem proposta para os wrappers de simulationStep.
runSideAI=function(side,t){
 if(!isAI(side))return;const s=state[side];
 if(t>=s.nextThink){s.nextThink=t+1;decide(side,t);updateLabel()}
 if(t>=s.nextBuy){s.nextBuy=t+.7;buy(side,t)}
 maintainLegend(side,t)
};
if(window.SL_LEGEND_INTENT_ARBITER){
 window.SL_LEGEND_INTENT_ARBITER.get=()=>null;
 window.SL_LEGEND_INTENT_ARBITER.reconsider=()=>null
}

const prevReset=reset;
reset=function(){
 state[1]=fresh();state[-1]=fresh();decisions=0;planSwitches=0;purchases=0;legendRotations=0;noHoldHandOffs=0;staleHoldClears=0;stuckRecoveries=0;planSeq=0;
 return prevReset()
};
function forcePlan(side,lane,mode='PUSH',seconds=30){
 if(!isAI(side)||!Number.isInteger(lane)||lane<0||lane>2)return false;const t=simTime,s=state[side],c={mode,lane,score:999,reason:'qa/forced',emergency:true,ctx:snapshot(side)};
 accept(side,c,t,true);s.forcedUntil=t+Math.max(1,seconds);return true
}
function health(){
 const q=window.SL_AI_LEGACY_QUARANTINE?.health?.();
 return{loaded:true,version:3,singleDecisionOwner:true,singleMovementWriter:true,legacyRunSideAIDisabled:true,legacyCalls,decisions,planSwitches,purchases,legendRotations,noHoldHandOffs,staleHoldClears,stuckRecoveries,legacyQuarantinePasses:q?.passes??null,red:state[-1],orange:gameMode==='robot'?state[1]:null}
}
window.SL_AI_FUNCTIONAL_CONTROLLER={version:3,forcePlan,get:side=>state[side],health,legacyRunSideAI:oldRunSideAI};
window.SL_AI_LEGEND_AUTHORITY={version:3,get:side=>state[side],health};
})();
