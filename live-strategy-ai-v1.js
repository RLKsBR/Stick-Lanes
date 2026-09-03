/* Stick Lanes — IA estratégica adaptativa ao vivo v3
   Aprende durante e entre partidas: ordens, lanes, compras, resposta de composição
   e decisões da Lenda. A micro das Lendas usa conceitos de MOBA/LoL como trade,
   retreat/disengage, kite, peel, all-in, poke, reset, contest, hold, push e roam.
   Usa somente estado de jogo disponível; não recebe bônus ou informação oculta. */
'use strict';
(function(){
const STORE_KEY='stickLanesLiveStrategy.v2';
const LEGACY_KEY='stickLanesLiveStrategy.v1';
const ACTIONS=['base','behind','ahead','advance','attack'];
const FEATURES=['bias','threat','opportunity','wave','enemyWeak','ownWeak','forward','center','enemyRange','enemyFront','ownRange','ownFront','legendThreat','baseDanger'];
const clampAI=(v,a,b)=>Math.max(a,Math.min(b,v));
const FRONT=new Set(['tank','fighter','bruiser']);
const BACK=new Set(['ranged','siege','support','controller']);
const DIVE=new Set(['assassin','skirmisher']);
const KITE_ROLES=new Set(['ranged','siege','support','controller']);
const LEGEND_TERMS=Object.freeze({
 TRADE:'troca curta de dano para medir vantagem',
 RETREAT:'recuar quando a luta deixou de valer a pena',
 DISENGAGE:'romper uma luta desfavorável antes de morrer',
 KITE:'atacar mantendo distância e recuando do perseguidor',
 PEEL:'proteger a retaguarda focando quem mergulhou nela',
 ALL_IN:'comprometer recursos para finalizar uma janela favorável',
 POKE:'causar dano à distância sem se comprometer numa luta longa',
 RESET:'sair da pressão e reposicionar em segurança antes da próxima jogada',
 CONTEST:'disputar objetivo neutro quando o risco é aceitável',
 HOLD:'segurar posição sem forçar uma luta ruim',
 PUSH:'pressionar a lane quando há vantagem',
 ROAM:'rotacionar para outra lane onde a presença da Lenda vale mais'
});
const defaultWeights={
 base:[-.68,1.38,-.88,-.42,-.12,1.30,-.58,0,.12,.18,-.05,.22,.30,.72],
 behind:[-.12,1.08,-.46,-.03,-.08,.86,-.20,0,.08,.16,0,.15,.20,.34],
 ahead:[.05,.04,.24,.12,.18,-.08,.26,0,.06,-.04,.04,0,-.04,-.10],
 advance:[.36,-.18,.54,1.02,.50,-.14,.24,.04,.05,.03,.05,.04,-.08,-.16],
 attack:[-.14,-.48,1.08,-.28,1.20,-.28,.70,.02,.08,-.06,.05,-.03,-.04,-.24]
};
let memory=loadMemory(),episodes={},lastSavedAt=0,ended=false;

function blankRoleQ(){return{tank:0,fighter:0,bruiser:0,ranged:0,siege:0,support:0,controller:0,assassin:0,skirmisher:0,other:0}}
function freshPolicy(){return{weights:Object.fromEntries(ACTIONS.map(a=>[a,defaultWeights[a].slice()])),unitQ:{},roleQ:blankRoleQ(),laneQ:[0,0,0],buffQ:{buff1:0,buff2:0,buff3:0,buff4:0},adjustments:0,games:0,wins:0}}
function normalizePolicy(p){
 const fresh=freshPolicy(),out={...fresh,...(p||{})};
 out.weights={...fresh.weights,...(p?.weights||{})};
 for(const action of ACTIONS){let w=out.weights[action]||[];out.weights[action]=FEATURES.map((_,i)=>Number.isFinite(w[i])?w[i]:fresh.weights[action][i])}
 out.unitQ={...(p?.unitQ||{})};out.roleQ={...fresh.roleQ,...(p?.roleQ||{})};out.laneQ=[0,1,2].map(i=>Number(p?.laneQ?.[i])||0);out.buffQ={...fresh.buffQ,...(p?.buffQ||{})};return out
}
function loadMemory(){
 try{let x=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(x&&x.version===2&&x.policies){for(const k of Object.keys(x.policies))x.policies[k]=normalizePolicy(x.policies[k]);return x}}catch(_){}
 try{
  let old=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');if(old&&old.policies){
   const converted={version:2,policies:{},totalAdjustments:old.totalAdjustments||0,totalGames:old.totalGames||0};
   for(const [k,p] of Object.entries(old.policies))converted.policies[k]=normalizePolicy(p);return converted
  }
 }catch(_){}
 return{version:2,policies:{},totalAdjustments:0,totalGames:0}
}
function saveMemory(force=false){if(!force&&simTime-lastSavedAt<12)return;lastSavedAt=simTime;try{localStorage.setItem(STORE_KEY,JSON.stringify(memory))}catch(_){}}
function pairKey(side){return(sideFactions[side]||[]).slice().sort().join('+')||'geral'}
function policyFor(side){let key=pairKey(side);return memory.policies[key]||(memory.policies[key]=freshPolicy())}
function healthRatio(s){return s?.maxHp?clampAI(s.hp/s.maxHp,0,1):0}
function frontStructure(side,lane){let list=aliveTowers(side,lane);if(!list.length)return null;return list.sort((a,b)=>side===1?b.x-a.x:a.x-b.x)[0]}
function liveInLane(side,lane){return units.filter(u=>!u.dead&&u.side===side&&u.lane===lane)}
function roleBucket(role){if(FRONT.has(role))return'front';if(BACK.has(role))return'back';if(DIVE.has(role))return'dive';return'other'}
function roleProfile(side,lane=null){
 const list=units.filter(u=>!u.dead&&u.side===side&&!u.minion&&(lane===null||u.lane===lane));let out={front:0,back:0,dive:0,other:0,total:0,ranged:0,tanks:0};
 for(const u of list){let b=roleBucket(u.role);out[b]++;out.total++;if(u.role==='ranged'||u.role==='siege')out.ranged++;if(u.role==='tank'||u.role==='bruiser')out.tanks++}return out
}
function legendInLane(side,lane){return units.some(u=>!u.dead&&u.side===side&&u.special?.legend&&u.lane===lane&&!u.tacticalWorld)}
function laneFeatures(side,lane){
 let own=armyPower(side,lane),foe=armyPower(-side,lane),sum=Math.max(20,own+foe),ownS=frontStructure(side,lane),foeS=frontStructure(-side,lane),ours=liveInLane(side,lane),forward=0;
 if(ours.length)forward=ours.reduce((n,u)=>n+(side===1?u.x/WORLD_W:1-u.x/WORLD_W),0)/ours.length;
 let ep=roleProfile(-side,lane),op=roleProfile(side,lane),enemyRange=ep.total?ep.ranged/ep.total:0,enemyFront=ep.total?ep.front/ep.total:0,ownRange=op.total?op.ranged/op.total:0,ownFront=op.total?op.front/op.total:0;
 let ownBase=baseHp(side)/BASE_HP,baseDanger=clampAI((1-ownBase)*.55+(ownS?1-healthRatio(ownS):.75),0,1);
 return[1,clampAI((foe-own)/sum,-1,1),clampAI((own-foe)/sum,-1,1),units.some(u=>!u.dead&&u.minion&&u.side===side&&u.lane===lane)?1:-.25,foeS?1-healthRatio(foeS):1,ownS?1-healthRatio(ownS):1,clampAI((forward-.5)*2,-1,1),lane===1?1:0,enemyRange,enemyFront,ownRange,ownFront,legendInLane(-side,lane)?1:0,baseDanger]
}
function dot(a,b){let n=0;for(let i=0;i<b.length;i++)n+=(a[i]||0)*b[i];return n}
function softChoice(options,temp=.44,explore=.07){if(!options.length)return null;if(Math.random()<explore)return options[Math.floor(Math.random()*options.length)];let max=Math.max(...options.map(x=>x.score)),weights=options.map(x=>Math.exp(clampAI((x.score-max)/temp,-16,4))),sum=weights.reduce((a,b)=>a+b,0),r=Math.random()*sum;for(let i=0;i<options.length;i++){r-=weights[i];if(r<=0)return options[i]}return options[options.length-1]}
function laneOutcome(side,lane){let own=armyPower(side,lane),foe=armyPower(-side,lane),ownS=frontStructure(side,lane),foeS=frontStructure(-side,lane),power=(own-foe)/Math.max(40,own+foe),structure=(foeS?1-healthRatio(foeS):1)-(ownS?1-healthRatio(ownS):1);return clampAI(power*.45+structure*.55,-1.5,1.5)}
function matchOutcome(side){let ownStruct=structures.filter(s=>s.side===side).reduce((n,s)=>n+healthRatio(s),0),foeStruct=structures.filter(s=>s.side===-side).reduce((n,s)=>n+healthRatio(s),0),ownBase=baseHp(side)/BASE_HP,foeBase=baseHp(-side)/BASE_HP;return(ownBase-foeBase)*1.8+(ownStruct-foeStruct)/Math.max(1,structures.length/2)}
function episodeFor(side){if(episodes[side])return episodes[side];return episodes[side]={policy:policyFor(side),lastOrders:[null,null,null],pendingOrders:[null,null,null],pendingBuys:[],pendingLegend:null,nextOrder:0,nextBuy:0,nextObserve:0,nextLegend:4,enemyProfile:{front:0,back:0,dive:0,ranged:0,total:0},legendTrade:null,legendState:'HOLD',lastDecision:null}}
function learnOrder(ep,pending,reward,terminal=false){if(!pending)return;let scale=terminal?.105:.032,delta=clampAI(reward,-1,1)*scale,w=ep.policy.weights[pending.action];for(let i=0;i<w.length;i++)w[i]=clampAI(w[i]+delta*pending.features[i],-3,3);ep.policy.adjustments++;memory.totalAdjustments++}
function settleOrders(side,terminalReward=null){let ep=episodeFor(side);for(let lane=0;lane<3;lane++){let p=ep.pendingOrders[lane];if(!p)continue;let reward=terminalReward===null?laneOutcome(side,lane)-p.before:terminalReward;learnOrder(ep,p,reward,terminalReward!==null);if(terminalReward===null)ep.pendingOrders[lane]=null}}
function chooseOrders(side,t){let ep=episodeFor(side);if(t<ep.nextOrder)return;ep.nextOrder=t+2.2;settleOrders(side);for(let lane=0;lane<3;lane++){let features=laneFeatures(side,lane),options=ACTIONS.map(action=>({action,score:dot(ep.policy.weights[action],features)+(ep.lastOrders[lane]===action?.07:0)})),pick=softChoice(options);orders[side][lane]=pick.action;ep.lastOrders[lane]=pick.action;ep.pendingOrders[lane]={action:pick.action,features,before:laneOutcome(side,lane),t}}if(side===1&&gameMode==='robot')syncOrderButtons(1)}

function observeOpponent(side,t){let ep=episodeFor(side);if(t<ep.nextObserve)return;ep.nextObserve=t+3;let p=roleProfile(-side),alpha=.28;for(const k of ['front','back','dive','ranged','total'])ep.enemyProfile[k]=(1-alpha)*(ep.enemyProfile[k]||0)+alpha*(p[k]||0)}
function roleCounterScore(role,enemy,own,laneThreat){
 let s=0,enemyTotal=Math.max(1,enemy.total),ownTotal=Math.max(1,own.total),enemyFront=enemy.front/enemyTotal,enemyBack=enemy.back/enemyTotal,enemyDive=enemy.dive/enemyTotal,ownFront=own.front/ownTotal,ownBack=own.back/ownTotal;
 if(enemyFront>.34&&(role==='ranged'||role==='siege'||role==='controller'))s+=.30;
 if(enemyBack>.34&&(role==='assassin'||role==='skirmisher'))s+=.34;
 if(enemyDive>.18&&(role==='tank'||role==='fighter'||role==='support'))s+=.30;
 if(ownFront<.30&&(role==='tank'||role==='bruiser'||role==='fighter'))s+=.24;
 if(ownBack<.28&&(role==='ranged'||role==='support'||role==='siege'))s+=.18;
 if(laneThreat>.22&&(role==='tank'||role==='fighter'||role==='bruiser'||role==='support'))s+=.18;
 if(laneThreat<-.20&&(role==='ranged'||role==='siege'||role==='assassin'))s+=.14;
 return s
}
function settleBuys(side,t,forceReward=null){let ep=episodeFor(side),keep=[];for(const p of ep.pendingBuys){if(forceReward===null&&t-p.t<11){keep.push(p);continue}let reward=forceReward===null?laneOutcome(side,p.lane)-p.before:forceReward,q=ep.policy.unitQ[p.key]||0,rq=ep.policy.roleQ[p.role]||0,r=clampAI(reward,-1,1);ep.policy.unitQ[p.key]=clampAI(q*.87+r*.13,-1.5,1.5);ep.policy.roleQ[p.role]=clampAI(rq*.91+r*.09,-1,1);ep.policy.laneQ[p.lane]=clampAI(ep.policy.laneQ[p.lane]*.90+r*.10,-1,1);ep.policy.adjustments++;memory.totalAdjustments++}ep.pendingBuys=keep}
function buyUnit(side,t){
 let ep=episodeFor(side);settleBuys(side,t);if(t<ep.nextBuy)return;ep.nextBuy=t+.65;let ready=aiSpawnCd[side],usage=aiUse[side],roster=sideRoster(side),options=[],enemyGlobal=roleProfile(-side),ownGlobal=roleProfile(side);
 for(const x of roster){let key=x.fac+'|'+x.u.name;if(sideGold(side)<x.u.cost||t<(ready[key]||0)||!canSpawnUnit(side,x.u))continue;for(let lane=0;lane<3;lane++){
   let f=laneFeatures(side,lane),learned=ep.policy.unitQ[key]||0,roleLearned=ep.policy.roleQ[x.u.role]||0,laneLearned=ep.policy.laneQ[lane]||0,prior=sideSpawnWeights?.[side]||[1,1,1],priorSum=prior.reduce((a,b)=>a+b,0)||3,openingBias=clampAI(1-t/240,0,.20)*(prior[lane]/priorSum-1/3)*3;
   let laneEnemy=roleProfile(-side,lane),laneOwn=roleProfile(side,lane),counter=roleCounterScore(x.u.role,laneEnemy.total?laneEnemy:enemyGlobal,laneOwn.total?laneOwn:ownGlobal,f[1]),novelty=(usage[key]||0)===0?.12:0,value=Math.log1p(Math.max(0,unitValue(x.u))*40)*.30,tempo=Math.min(.12,18/Math.max(18,x.u.gen||18)),costPenalty=Math.min(.16,x.u.cost/Math.max(1,sideGold(side))*.12);
   options.push({x,key,lane,score:value+learned+roleLearned*.55+laneLearned+openingBias+f[1]*.28+counter+novelty+tempo-costPenalty})
  }}
 if(!options.length)return;let pick=softChoice(options,.38,.08),u=pick.x.u;spendSideGold(side,u.cost);ready[pick.key]=t+u.gen;usage[pick.key]=(usage[pick.key]||0)+1;spawnUnit(side,pick.lane,pick.x.fac,u);ep.pendingBuys.push({key:pick.key,role:u.role,lane:pick.lane,before:laneOutcome(side,pick.lane),t});ep.lastDecision={type:'buy',unit:u.name,lane:pick.lane,t}
}

function livingLegend(side){return units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null}
function legendWorld(u){return window.SL_MOBA_SQUARE_V2?.unitPos?.(u)||{x:u.x,y:yOf(u)}}
function clearLegendManual(legend){delete legend.manualBuff;delete legend.manualTargetId;delete legend.manualUnitTargetId;delete legend.manualHold;delete legend.tacticalDestination}
function sendLegendPoint(legend,lane,ratio){
 const map=window.SL_MOBA_SQUARE_V2;if(!map||!legend)return false;ratio=clampAI(ratio,.06,.94);let point=map.routePoint(lane,ratio),x=BASE_X[1]+ratio*(BASE_X[-1]-BASE_X[1]),start=legendWorld(legend);clearLegendManual(legend);legend.tacticalWorld={x:start.x,y:start.y,a:start.a||0};legend.tacticalDestination={kind:'point',lane,x,t:ratio,world:{x:point.x,y:point.y}};return true
}
function sendLegendLane(legend,lane,aggressive=false){let ratio=aggressive?(legend.side===1?.54:.46):(legend.side===1?.27:.73);return sendLegendPoint(legend,lane,ratio)}
function sendLegendRatio(legend,lane,step=.07){
 const map=window.SL_MOBA_SQUARE_V2;if(!map||!legend)return false;let start=legendWorld(legend),route=map.nearestRoutePoint(start),ratio=Number.isFinite(route?.t)?route.t:(legend.x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]);ratio+=legend.side===1?-step:step;return sendLegendPoint(legend,lane,ratio)
}
function sendLegendTarget(legend,target){
 const map=window.SL_MOBA_SQUARE_V2;if(!map||!legend||!target||target.dead||target.side===legend.side)return false;let start=legendWorld(legend),p=legendWorld(target);clearLegendManual(legend);legend.tacticalWorld={x:start.x,y:start.y,a:start.a||0};legend.tacticalDestination={kind:'unit',unitId:target.id,lane:target.lane,x:target.x,world:{x:p.x,y:p.y}};return true
}
function bestLaneForLegend(side){let scored=[0,1,2].map(lane=>{let f=laneFeatures(side,lane),score=f[1]*.75+f[5]*.42+f[4]*.28+f[12]*.20;return{lane,score,aggressive:f[2]>.22&&f[4]>.20}});return scored.sort((a,b)=>b.score-a.score)[0]}
function combatValue(u){let hp=.25+.75*healthRatio(u),dps=Math.max(1,u.atk)/Math.max(.45,u.rate||1),durability=1+Math.max(0,u.def||0)/180,reach=1+Math.min(18,u.range||1)*.025,weight=u.minion?.42:1;return dps*durability*reach*hp*weight}
function legendRangeWorld(legend){let map=window.SL_MOBA_SQUARE_V2,scale=(map?.routeLengths?.[1]||1)/Math.max(1,BASE_X[-1]-BASE_X[1]);return Math.max(70,(legend.range||1)*PX*scale)}
function legendCombatSnapshot(legend){
 let here=legendWorld(legend),allies=[],enemies=[];
 for(const u of units){if(u.dead||u===legend)continue;let p=legendWorld(u),d=Math.hypot(p.x-here.x,p.y-here.y);if(d>900)continue;(u.side===legend.side?allies:enemies).push({u,d,p})}
 allies.sort((a,b)=>a.d-b.d);enemies.sort((a,b)=>a.d-b.d);
 let enemyLegend=enemies.find(x=>x.u.special?.legend)||null,backAllies=allies.filter(x=>BACK.has(x.u.role)),peelThreat=null;
 for(const e of enemies.filter(x=>DIVE.has(x.u.role))){let threatened=backAllies.some(a=>Math.hypot(e.p.x-a.p.x,e.p.y-a.p.y)<=430);if(threatened&&(!peelThreat||e.d<peelThreat.d))peelThreat=e}
 let ownPower=combatValue(legend)+allies.reduce((n,x)=>n+combatValue(x.u),0),enemyPower=enemies.reduce((n,x)=>n+combatValue(x.u),0);
 return{here,allies,enemies,enemyLegend:enemyLegend?.u||null,enemyLegendDistance:enemyLegend?.d??Infinity,nearest:enemies[0]?.u||null,nearestDistance:enemies[0]?.d??Infinity,peelThreat:peelThreat?.u||null,ownPower,enemyPower,localRatio:enemyPower>0?ownPower/enemyPower:3}
}
function sampleLegendTrade(ep,legend,snap,t){
 let ownHp=healthRatio(legend),enemy=snap.enemyLegend,enemyHp=enemy?healthRatio(enemy):null,prev=ep.legendTrade,out={losing:false,winning:false,ownLoss:0,enemyLoss:0};
 if(prev&&enemy&&prev.enemyId===enemy.id&&t-prev.t<=5){out.ownLoss=Math.max(0,prev.ownHp-ownHp);out.enemyLoss=Math.max(0,prev.enemyHp-enemyHp);out.losing=out.ownLoss>.035&&out.ownLoss-out.enemyLoss>.035;out.winning=out.enemyLoss>.035&&out.enemyLoss-out.ownLoss>.035}
 if(!prev||t-prev.t>=.75||prev.enemyId!==(enemy?.id??null))ep.legendTrade={t,ownHp,enemyId:enemy?.id??null,enemyHp};
 return out
}
function underEnemyTower(side,target){if(!target||!Number.isInteger(target.lane))return false;return structures.some(s=>!s.dead&&s.side===-side&&s.lane===target.lane&&Math.abs(s.x-target.x)<=Math.max(180,(s.range||5)*PX*.9))}
function markLegend(ep,term,t,extra={}){ep.legendState=term;ep.lastDecision={type:'legend-'+term.toLowerCase().replaceAll('_','-'),term,t,...extra}}
function buffStrategicScore(side,zone,legend,t){
 const api=window.SL_BUFF_SYSTEM,state=api?.zoneState?.(zone.id,t);if(!api||!api.canCapture?.(zone,t)||state?.owner===side)return-Infinity;let profile=roleProfile(side),enemy=roleProfile(-side),hp=healthRatio(legend),score=.2+(api.defs?.[zone.id]?.index||0)*.002;
 if(zone.id==='buff1')score+=.18+(enemy.back>enemy.front?.08:0)+(legend.special?.legendKind==='vesper'?.08:0);
 if(zone.id==='buff2')score+=.22+(enemy.front>0?.08:0)+(matchOutcome(side)>0?.06:0);
 if(zone.id==='buff3')score+=hp<.60?.36:hp<.80?.16:.02;
 if(zone.id==='buff4')score+=profile.total>=5?.30:.12+(matchOutcome(side)>-.15?.08:0);
 if(state?.capturingSide===-side)score+=.24;if(state?.contested)score+=.12;
 const a=legendWorld(legend),d=Math.hypot(a.x-zone.x,a.y-zone.y);score-=Math.min(.30,d/9000);return score+(episodeFor(side).policy.buffQ[zone.id]||0)*.25
}
function settleLegendDecision(side,t,terminalReward=null){let ep=episodeFor(side),p=ep.pendingLegend;if(!p)return;if(terminalReward===null&&t-p.t<14)return;let reward=terminalReward===null?matchOutcome(side)-p.before:terminalReward,r=clampAI(reward,-1,1);if(p.buff){let q=ep.policy.buffQ[p.buff]||0;ep.policy.buffQ[p.buff]=clampAI(q*.9+r*.1,-1,1)}ep.pendingLegend=null;ep.policy.adjustments++;memory.totalAdjustments++}
function chooseLegend(side,t){
 let ep=episodeFor(side);settleLegendDecision(side,t);if(t<ep.nextLegend)return;ep.nextLegend=t+.85;let legend=livingLegend(side);if(!legend)return;
 let snap=legendCombatSnapshot(legend),trade=sampleLegendTrade(ep,legend,snap,t),hp=healthRatio(legend),baseDanger=1-baseHp(side)/BASE_HP,recentDamage=t-legend.lastDamaged<3.5,enemyClose=snap.nearestDistance<700;
 let losingNumbers=snap.enemyPower>0&&snap.localRatio<.68&&enemyClose,losingHpTrade=snap.enemyLegend&&snap.enemyLegendDistance<650&&hp+0.16<healthRatio(snap.enemyLegend)&&recentDamage,losing=trade.losing||losingNumbers||losingHpTrade;
 if(hp<.26||baseDanger>.68||losing){
   let lane=Number.isInteger(legend.lane)?legend.lane:bestLaneForLegend(side).lane,deep=hp<.26||baseDanger>.68,ok=deep?sendLegendLane(legend,lane,false):sendLegendRatio(legend,lane,.10);
   if(ok){markLegend(ep,'RETREAT',t,{reason:hp<.26?'critical-hp':baseDanger>.68?'base-danger':trade.losing?'losing-trade':losingNumbers?'outnumbered':'bad-hp-trade',lane,ownLoss:trade.ownLoss,enemyLoss:trade.enemyLoss});ep.pendingLegend={before:matchOutcome(side),t}}return
 }
 if((legend.manualBuff||legend.tacticalDestination?.kind==='buff')&&!enemyClose){markLegend(ep,'CONTEST',t,{buff:legend.manualBuff||legend.tacticalDestination?.buff?.id});return}
 if(snap.peelThreat&&hp>.36&&snap.localRatio>.72){if(sendLegendTarget(legend,snap.peelThreat)){markLegend(ep,'PEEL',t,{target:snap.peelThreat.id,lane:snap.peelThreat.lane});return}}
 let ranged=KITE_ROLES.has(legend.role)||(legend.range||0)>=7,kiteDistance=Math.max(105,legendRangeWorld(legend)*.86);
 if(ranged&&snap.nearest&&snap.nearestDistance<kiteDistance&&(hp<.72||snap.localRatio<1.02)){if(sendLegendRatio(legend,legend.lane,.055)){markLegend(ep,'KITE',t,{target:snap.nearest.id,lane:legend.lane});return}}
 let allInTarget=snap.enemyLegend||null;
 if(allInTarget){let targetHp=healthRatio(allInTarget),towerRisk=underEnemyTower(side,allInTarget),killWindow=targetHp<.34&&hp>.48&&snap.localRatio>.92&&(!towerRisk||(targetHp<.17&&hp>.74));if(killWindow&&sendLegendTarget(legend,allInTarget)){markLegend(ep,'ALL_IN',t,{target:allInTarget.id,lane:allInTarget.lane,towerDive:towerRisk});return}}
 if(legend.tacticalDestination?.kind==='unit'&&(ep.legendState==='ALL_IN'||ep.legendState==='PEEL'))return;
 if(ranged&&snap.enemyLegend&&snap.enemyLegendDistance<=legendRangeWorld(legend)*1.08&&snap.localRatio>.86&&hp>.45){markLegend(ep,'POKE',t,{target:snap.enemyLegend.id,lane:legend.lane});return}
 if(hp<.52&&!recentDamage&&snap.nearestDistance>700){let lane=Number.isInteger(legend.lane)?legend.lane:bestLaneForLegend(side).lane;if(sendLegendLane(legend,lane,false)){markLegend(ep,'RESET',t,{lane});ep.pendingLegend={before:matchOutcome(side),t}}return}
 let zones=window.SL_BUFF_SYSTEM?.zones||[],buffChoices=zones.map(zone=>({zone,score:buffStrategicScore(side,zone,legend,t)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
 if(hp>.50&&!recentDamage&&buffChoices[0]?.score>.28&&Math.random()<.74){let pick=buffChoices[0];if(window.SL_BUFF_SYSTEM.travelToZone(legend,pick.zone)){markLegend(ep,'CONTEST',t,{buff:pick.zone.id});ep.pendingLegend={buff:pick.zone.id,before:matchOutcome(side),t};return}}
 let target=bestLaneForLegend(side);
 if(target.lane!==legend.lane||legend.tacticalWorld){if(sendLegendLane(legend,target.lane,target.aggressive)){markLegend(ep,'ROAM',t,{lane:target.lane,aggressive:target.aggressive});ep.pendingLegend={before:matchOutcome(side),t}}return}
 if(target.aggressive){if(sendLegendLane(legend,target.lane,true)){markLegend(ep,'PUSH',t,{lane:target.lane});ep.pendingLegend={before:matchOutcome(side),t}}return}
 markLegend(ep,'HOLD',t,{lane:legend.lane})
}
function updateStatus(){let el=document.querySelector('#modeStatus');if(!el)return;if(!el.dataset.adaptive){el.dataset.adaptive='3';el.textContent+=(el.textContent?' • ':'')+'IA adaptativa v3'}else if(el.dataset.adaptive!=='3'){el.dataset.adaptive='3';el.textContent=el.textContent.replace(/IA adaptativa(?: v\d+)?/,'IA adaptativa v3')}}
runSideAI=function(side,t){observeOpponent(side,t);chooseOrders(side,t);buyUnit(side,t);chooseLegend(side,t);updateStatus();saveMemory()};

const baseReset=reset;
reset=function(){episodes={};ended=false;lastSavedAt=0;baseReset()};
const baseSimulationStep=simulationStep;
simulationStep=function(dt){baseSimulationStep(dt);if(!ended&&(playerBase<=0||enemyBase<=0)){ended=true;for(const side of[1,-1])if(side===-1||gameMode==='robot'){let ep=episodeFor(side),won=baseHp(side)>0&&baseHp(-side)<=0,reward=won?1:-1;settleOrders(side,reward);settleBuys(side,simTime,reward);settleLegendDecision(side,simTime,reward);ep.policy.games++;if(won)ep.policy.wins++;memory.totalGames++}saveMemory(true)}};

window.SL_LIVE_STRATEGY_AI={version:3,actions:ACTIONS,features:FEATURES,legendTerms:LEGEND_TERMS,getMemory:()=>memory,getEpisode:side=>episodes[side]||null,getLegendState:side=>episodes[side]?.legendState||null,resetLearning(){memory={version:2,policies:{},totalAdjustments:0,totalGames:0};try{localStorage.removeItem(STORE_KEY)}catch(_){}},coverage:'orders + composition + economy + lanes + legend micro (trade/retreat/kite/peel/all-in/poke/reset/contest/hold/push/roam) + neutral buffs; same rules, no hidden stat bonuses'};
})();