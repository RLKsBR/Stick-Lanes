/* Stick Lanes — laboratório estratégico v4
   Headless, mas com decisões durante a partida. Não existem estratégias nomeadas:
   cada agente aprende pesos de utilidade a partir do estado e o comportamento
   observado é descrito somente depois da partida. Sem limite fixo de duração. */
'use strict';
(function(){
const DB_KEY_LOCAL='stickLanesBalanceFrontlineV3.v2';
const HISTORY_KEY_LOCAL='stickLanesBalanceFrontlineV3.history.v2';
const PREV_RULESET=window.SL_RULESET_VERSION||'frontline';
const STRATEGY_RULESET=PREV_RULESET+'-strategy-v4';
const STRATEGY_HISTORY_KEY='stickLanesStrategyHistory.v4';
const DT=8;
const ADAPT_EVERY=64;
const TACTIC_EVERY=64;
const NO_STRUCTURE_PROGRESS_SECONDS=7200;
const SPAWN_POLICY_KEYS=['threat','opportunity','enemyStructure','ownStructure','minion','center','top','bottom','unitValue','unitPower','siege','tank','ranged','support','cheap','cost','reserve'];
const TACTIC_FEATURE_KEYS=['threat','opportunity','enemyStructure','ownStructure','minion','center','top','bottom'];
const TACTICAL_ORDERS=['base','behind','ahead','advance','attack'];
const TACTIC_POLICY_KEYS=TACTICAL_ORDERS.flatMap(order=>[`${order}:bias`,...TACTIC_FEATURE_KEYS.map(key=>`${order}:${key}`)]);
const POLICY_KEYS=[...SPAWN_POLICY_KEYS,...TACTIC_POLICY_KEYS];
const clampS=(v,a,b)=>Math.max(a,Math.min(b,v));
const randn=()=>{let u=Math.max(1e-9,Math.random()),v=Math.max(1e-9,Math.random());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
function safeJSON(s){try{return JSON.parse(s)}catch{return null}}
function seededRandom(seed){
 let state=seed>>>0;return()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
}

/* O modelo mudou o suficiente para merecer banco separado. */
const old=safeJSON(localStorage.getItem(DB_KEY_LOCAL));
if(old&&old.ruleset!==STRATEGY_RULESET){
 const k='stickLanesBalanceArchive.'+String(old.ruleset||'unknown').replace(/[^a-z0-9._-]+/gi,'_');
 localStorage.setItem(k,JSON.stringify({archivedAt:Date.now(),reason:'laboratório estratégico sem limite fixo',data:old}));
 localStorage.removeItem(DB_KEY_LOCAL);localStorage.removeItem(HISTORY_KEY_LOCAL)
}
window.SL_RULESET_VERSION=STRATEGY_RULESET;

/* Registra os limites depois que mapa e torretas terminaram de montar o lado.
   Assim a IA não precisa adivinhar o HP máximo por índice. */
const baseStrategicNewSide=newSide;
newSide=function(comp){
 const side=baseStrategicNewSide(comp);
 side.baseMax=side.base;
 side.towerMax=side.towers.map(row=>row.slice());
 for(const lane of side.lanes)lane.order='advance';
 return side
};

function newPolicy(){
 const w={};for(const k of POLICY_KEYS)w[k]=randn()*.55;
 /* só define o espaço de busca, não uma estratégia pronta */
 w.unitValue+=.85;w.unitPower+=.20;w.threat+=.20;w.enemyStructure+=.15;
 w['advance:bias']+=.20;
 return{w,lr:.055+Math.random()*.035,temperature:.42+Math.random()*.34,explore:.08+Math.random()*.14}
}
function policyFor(c){return c.strategyPolicy||(c.strategyPolicy=newPolicy())}
function blendLoser(loser,winner){
 if(!loser||!winner)return;for(const k of POLICY_KEYS)loser.w[k]=clampS(loser.w[k]*.90+winner.w[k]*.10+randn()*.035,-3,3);
 loser.temperature=clampS(loser.temperature+randn()*.018,.18,1.1);loser.explore=clampS(loser.explore+randn()*.012,.03,.32)
}
function mutateWinner(p){if(Math.random()<.28){let k=POLICY_KEYS[Math.floor(Math.random()*POLICY_KEYS.length)];p.w[k]=clampS(p.w[k]+randn()*.018,-3,3)}}

function towerHealthRatio(side,lane,index){
 if(index<0)return clampS(side.base/Math.max(1,side.baseMax||6000),0,1);
 let max=side.towerMax?.[lane]?.[index]||side.towers[lane][index]||1;
 return clampS(side.towers[lane][index]/Math.max(1,max),0,1)
}
function lanePower(l){return l.army+l.minion}
function normDiff(a,b){return clampS((a-b)/Math.max(100,a+b),-1,1)}
function roleFeature(u,r){return u.role===r?1:0}
function unitFeatures(u,me){
 const maxCost=Math.max(100,...me.comp.units.map(x=>x.cost||0));
 return{
  unitValue:clampS(value(u)*18,0,2),unitPower:clampS(unitPower(u)/250,0,2),siege:structureFactor(u)-1,
  tank:roleFeature(u,'tank'),ranged:roleFeature(u,'ranged'),support:roleFeature(u,'support')||roleFeature(u,'controller'),
  cheap:1-clampS((u.cost||0)/maxCost,0,1),cost:clampS((u.cost||0)/Math.max(1,me.gold),0,2)
 }
}
function laneFeatures(me,foe,lane){
 const own=lanePower(me.lanes[lane]),enemy=lanePower(foe.lanes[lane]);
 const enemyTower=towerIndex(foe,lane),ownTower=towerIndex(me,lane);
 const enemyWeak=enemyTower<0?1:1-towerHealthRatio(foe,lane,enemyTower);
 const ownWeak=ownTower<0?1:1-towerHealthRatio(me,lane,ownTower);
 return{
  threat:normDiff(enemy,own),opportunity:normDiff(own,enemy),enemyStructure:enemyWeak,ownStructure:ownWeak,
  minion:normDiff(me.lanes[lane].minion,foe.lanes[lane].minion),center:lane===1?1:0,top:lane===0?1:0,bottom:lane===2?1:0
 }
}
function dot(w,f){let s=0;for(const [k,v] of Object.entries(f))s+=(w[k]||0)*v;return s}
function softChoice(options,temp,explore){
 if(!options.length)return null;if(Math.random()<explore)return options[Math.floor(Math.random()*options.length)];
 let mx=Math.max(...options.map(o=>o.score)),weights=options.map(o=>Math.exp(clampS((o.score-mx)/Math.max(.08,temp),-18,5))),sum=weights.reduce((a,b)=>a+b,0),r=Math.random()*sum;
 for(let i=0;i<options.length;i++){r-=weights[i];if(r<=0)return options[i]}return options[options.length-1]
}
function behaviorBlank(){return{decisions:0,spawns:0,waits:0,lane:[0,0,0],roles:{},spent:0,goldSum:0,goldSamples:0,laneSwitches:0,lastLane:null,tacticalDecisions:0,orders:{},orderTransitions:0,lastOrders:['advance','advance','advance'],adaptations:0,trace:{},traceN:0}}
function addTrace(b,f){for(const [k,v] of Object.entries(f))if(POLICY_KEYS.includes(k))b.trace[k]=(b.trace[k]||0)+v;b.traceN++}
function adaptBrain(policy,b,reward){
 if(!b.traceN)return;for(const k of POLICY_KEYS){let x=(b.trace[k]||0)/b.traceN;policy.w[k]=clampS(policy.w[k]+policy.lr*reward*x,-3,3)}
 b.trace={};b.traceN=0;b.adaptations++
}
function reserveTarget(policy,me){let z=1/(1+Math.exp(-(policy.w.reserve||0)));return 80+z*760}
function availableUnits(me,t){return me.comp.units.filter(u=>me.gold>=u.cost&&t>=(me.ready[u.key]||0))}
function strategicSpawnStep(me,foe,t,policy,b){
 b.goldSum+=me.gold;b.goldSamples++;
 let avail=availableUnits(me,t);if(!avail.length){b.waits++;return}
 let reserve=reserveTarget(policy,me),options=[];
 for(const u of avail){let uf=unitFeatures(u,me);for(let lane=0;lane<3;lane++){let lf=laneFeatures(me,foe,lane),features={...lf,...uf,reserve:me.gold<reserve?1:-.3};let score=dot(policy.w,features)+randn()*.08;options.push({u,lane,features,score})}}
 let pick=softChoice(options,policy.temperature,policy.explore);if(!pick)return;
 /* Guardar ouro é uma opção emergente; não uma tática nomeada. */
 let waitScore=(policy.w.reserve||0)*(me.gold<reserve?1.15:.18)+randn()*.10;
 if(waitScore>pick.score&&me.gold<reserve*1.35){b.waits++;b.decisions++;return}
 let u=pick.u,lane=pick.lane;me.gold-=u.cost;me.ready[u.key]=t+u.gen;me.usage[u.key]=(me.usage[u.key]||0)+1;addUnit(me,lane,u);
 b.decisions++;b.spawns++;b.lane[lane]++;b.roles[u.role]=(b.roles[u.role]||0)+1;b.spent+=u.cost;
 if(b.lastLane!==null&&b.lastLane!==lane)b.laneSwitches++;b.lastLane=lane;addTrace(b,pick.features)
}
function orderFeatures(order,laneState){
 let out={[`${order}:bias`]:1};for(const key of TACTIC_FEATURE_KEYS)out[`${order}:${key}`]=laneState[key]||0;return out
}
function tacticalOrderStep(me,foe,policy,b){
 for(let lane=0;lane<3;lane++){
  let state=laneFeatures(me,foe,lane),options=TACTICAL_ORDERS.map(order=>{let features=orderFeatures(order,state);return{order,features,score:dot(policy.w,features)+randn()*.06}});
  let pick=softChoice(options,policy.temperature*.82,policy.explore*.65);if(!pick)continue;
  if(b.lastOrders[lane]!==pick.order)b.orderTransitions++;b.lastOrders[lane]=pick.order;me.lanes[lane].order=pick.order;
  b.tacticalDecisions++;b.orders[pick.order]=(b.orders[pick.order]||0)+1;addTrace(b,pick.features)
 }
}
function structureHp(side){return side.base+side.towers.reduce((sum,row)=>sum+row.reduce((a,b)=>a+b,0),0)}
function scoreReward(me,foe,last){let s=scoreSide(me,foe),d=s-last;return{score:s,reward:Math.tanh(d/1600)}}

/* Sem relógio máximo. O relógio de impasse zera sempre que qualquer estrutura
   perde vida; uma partida que progride pode durar quanto precisar. */
simMatch=function(c1,c2){
 let A=newSide(c1),B=newSide(c2),pA=policyFor(c1),pB=policyFor(c2),bA=behaviorBlank(),bB=behaviorBlank();
 let t=0,nextWave=0,nextTactic=0,nextAdapt=ADAPT_EVERY,lastScoreA=scoreSide(A,B),lastScoreB=-lastScoreA,deadlocked=false;
 let lastStructureHp=structureHp(A)+structureHp(B),lastStructureProgressAt=0;
 while(A.base>0&&B.base>0){
  A.gold+=15*DT;B.gold+=15*DT;
  strategicSpawnStep(A,B,t,pA,bA);strategicSpawnStep(B,A,t,pB,bB);
  while(t>=nextWave){spawnWave(A);spawnWave(B);nextWave+=22}
  if(t>=nextTactic){tacticalOrderStep(A,B,pA,bA);tacticalOrderStep(B,A,pB,bB);nextTactic+=TACTIC_EVERY}
  for(let lane=0;lane<3;lane++)fightLane(A.lanes[lane],B.lanes[lane],A,B,lane,DT,t);
  if(t>=nextAdapt){let ra=scoreReward(A,B,lastScoreA),rb=scoreReward(B,A,lastScoreB);adaptBrain(pA,bA,ra.reward);adaptBrain(pB,bB,rb.reward);lastScoreA=ra.score;lastScoreB=rb.score;nextAdapt+=ADAPT_EVERY}
  let currentStructureHp=structureHp(A)+structureHp(B);
  if(currentStructureHp<lastStructureHp-.01){lastStructureHp=currentStructureHp;lastStructureProgressAt=t}
  if(t-lastStructureProgressAt>=NO_STRUCTURE_PROGRESS_SECONDS){deadlocked=true;break}
  t+=DT
 }
 let completed=A.base<=0||B.base<=0,sc=scoreSide(A,B),winner=completed?(A.base>B.base?1:A.base<B.base?-1:0):0;
 if(winner===1){blendLoser(pB,pA);mutateWinner(pA)}else if(winner===-1){blendLoser(pA,pB);mutateWinner(pB)}else{for(const p of [pA,pB]){let k=POLICY_KEYS[Math.floor(Math.random()*POLICY_KEYS.length)];p.w[k]=clampS(p.w[k]+randn()*.05,-3,3)}}
 return{winner,A,B,duration:t,score:sc,completed,timedOut:false,deadlocked,deadlockReason:deadlocked?'sem dano estrutural por 2h simuladas':null,behaviorA:bA,behaviorB:bB}
};

/* Histogramas crescem conforme necessário. Não existe último bucket de 90 min. */
blankDurations=function(){return{totalSeconds:0,completedSeconds:0,completedMatches:0,timedOutMatches:0,histogram:[0]}};
addDuration=function(d,r){
 d.totalSeconds+=r.duration;if(r.completed){d.completedSeconds+=r.duration;d.completedMatches++}else d.timedOutMatches++;
 let bin=Math.max(0,Math.floor(r.duration/DURATION_BIN_SECONDS));while(d.histogram.length<=bin)d.histogram.push(0);d.histogram[bin]++
};
mergeDurations=function(a,b){
 a.totalSeconds+=b.totalSeconds;a.completedSeconds+=b.completedSeconds;a.completedMatches+=b.completedMatches;a.timedOutMatches+=b.timedOutMatches;
 for(let i=0;i<b.histogram.length;i++)a.histogram[i]=(a.histogram[i]||0)+(b.histogram[i]||0);return a
};
durationHTML=function(d){
 let n=d.completedMatches+d.timedOutMatches;if(!n)return '<span class="muted">Sem tempos registrados.</span>';
 let completedMean=d.completedMatches?d.completedSeconds/d.completedMatches:0,observed=d.totalSeconds/n,stall=d.timedOutMatches/n;
 return `<span class="good">média observada ${clock(observed)}</span> <span class="badge">concluídas ${pct(d.completedMatches,n)}</span> <span class="badge">média das concluídas ${clock(completedMean)}</span> <span class="badge">P50 ${quantileClock(d,.5)}</span> <span class="badge">P90 ${quantileClock(d,.9)}</span> <span class="badge ${stall?'warning':''}">impasses técnicos ${pct(d.timedOutMatches,n)}</span>`
};

function mergeBehavior(dst,b,winner,side){
 dst.games=(dst.games||0)+1;if(winner===0)dst.draws=(dst.draws||0)+1;else if(winner===side)dst.wins=(dst.wins||0)+1;else dst.losses=(dst.losses||0)+1;
 for(const k of ['decisions','spawns','waits','spent','goldSum','goldSamples','laneSwitches','tacticalDecisions','orderTransitions','adaptations'])dst[k]=(dst[k]||0)+(b[k]||0);
 dst.lane=dst.lane||[0,0,0];for(let i=0;i<3;i++)dst.lane[i]+=b.lane[i]||0;dst.roles=dst.roles||{};for(const [r,n] of Object.entries(b.roles||{}))dst.roles[r]=(dst.roles[r]||0)+n;
 dst.orders=dst.orders||{};for(const [order,n] of Object.entries(b.orders||{}))dst.orders[order]=(dst.orders[order]||0)+n
}
function behaviorText(s){
 let sp=Math.max(1,s.spawns||0),lane=(s.lane||[0,0,0]).map(n=>Math.round(n/sp*100)),gold=s.goldSamples?s.goldSum/s.goldSamples:0,sw=s.decisions?s.laneSwitches/s.decisions:0,wait=s.decisions?(s.waits||0)/s.decisions:0;
 let roles=Object.entries(s.roles||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([r,n])=>`${r} ${Math.round(n/sp*100)}%`).join(' • ');
 let tn=Math.max(1,s.tacticalDecisions||0),labels={base:'Base',behind:'Atrás',ahead:'Frente',advance:'Avançar',attack:'Atacar'},orders=Object.entries(s.orders||{}).sort((a,b)=>b[1]-a[1]).map(([o,n])=>`${labels[o]||o} ${Math.round(n/tn*100)}%`).join(' • ');
 return `Reforços: sup ${lane[0]}% • centro ${lane[1]}% • inf ${lane[2]}%. ${roles||'sem compras'}. Ordens: ${orders||'sem leitura'}; ${s.orderTransitions||0} trocas. Ouro médio retido ${Math.round(gold)}. Esperou em ${Math.round(wait*100)}% das decisões; mudou de frente em ${Math.round(sw*100)}%. Ajustes internos ${s.adaptations||0}.`
}
function renderStrategies(cands,strategyStats){
 let el=document.querySelector('#strategyResults');if(!el)return;
 let rows=cands.map(c=>({c,s:strategyStats[c.id]})).filter(x=>x.s&&x.s.games>=2).sort((a,b)=>((b.s.wins+(b.s.draws||0)*.5)/b.s.games)-((a.s.wins+(a.s.draws||0)*.5)/a.s.games)).slice(0,10);
 if(!rows.length){el.textContent='Poucos jogos para descrever comportamento.';return}
 el.innerHTML=rows.map(({c,s},i)=>{let wr=(s.wins+(s.draws||0)*.5)/s.games;return `<div class="compCard"><strong>#${i+1} ${esc(c.pair.join(' + '))} • ${(wr*100).toFixed(1)}%</strong><div class="historyMeta">${s.games} jogos • política aprendida durante a bateria</div><div class="compUnits">${esc(behaviorText(s))}</div></div>`}).join('')
}
function saveStrategyBatch(total,cands,stats,seeds){
 let ranked=cands.filter(c=>stats[c.id]).sort((a,b)=>{let sa=stats[a.id],sb=stats[b.id];return((sb.wins+(sb.draws||0)*.5)/Math.max(1,sb.games))-((sa.wins+(sa.draws||0)*.5)/Math.max(1,sa.games))});
 let profiles=ranked.slice(0,500).map(c=>{let s=stats[c.id];return{pair:c.pair,games:s.games,wins:s.wins||0,losses:s.losses||0,draws:s.draws||0,behavior:behaviorText(s),policy:{...policyFor(c).w}}});
 let db=readJSON(DB_KEY_LOCAL,null);if(db){db.simulationMode='strategic-headless-v4';db.noFixedTimeLimit=true;db.strategyProfiles=profiles;localStorage.setItem(DB_KEY_LOCAL,JSON.stringify(db))}
 let h=readJSON(STRATEGY_HISTORY_KEY,[]);h.unshift({savedAt:Date.now(),matches:total,seeds,ruleset:STRATEGY_RULESET,profiles:profiles.slice(0,100)});localStorage.setItem(STRATEGY_HISTORY_KEY,JSON.stringify(h.slice(0,12)))
}
function shuffleInPlace(items){for(let i=items.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]]}return items}
function balancedSchedule(cands,total){
 let out=[],roster=[...cands];if(roster.length%2)roster.push(null);
 while(out.length<total){
  shuffleInPlace(roster);let round=[...roster];
  for(let r=0;r<round.length-1&&out.length<total;r++){
   let pairs=[];for(let i=0;i<round.length/2;i++){let a=round[i],b=round[round.length-1-i];if(a&&b)pairs.push(Math.random()<.5?[a,b]:[b,a])}
   shuffleInPlace(pairs);for(const pair of pairs){if(out.length>=total)break;out.push(pair)}
   round=[round[0],round[round.length-1],...round.slice(1,-1)]
  }
 }
 return out
}

run=async function(){
 let matchesPerSeed=Number($('#matchCount').value),seedCount=Math.max(1,Math.floor(Number($('#seedCount')?.value)||1)),n=Number($('#candidateCount').value),seed=Math.max(1,Math.floor(Number($('#simSeed')?.value)||Date.now())),total=matchesPerSeed*seedCount,bar=$('#progressBar'),st=$('#labStatus'),btn=$('#runLab'),originalRandom=Math.random;
 btn.disabled=true;
 try{
  let allCands=[],stats={},strategyStats={},durations=blankDurations(),seeds=[],done=0;bar.style.width='0';$('#bestComps').innerHTML='';$('#unitTable').textContent='Simulando decisões estratégicas...';
  for(let s=0;s<seedCount;s++){
   let currentSeed=((seed+s*0x9E3779B9)>>>0)||1;seeds.push(currentSeed);Math.random=seededRandom(currentSeed);
   st.textContent=`Semente ${s+1}/${seedCount} (${currentSeed}): criando políticas e calendário...`;
   let cands=generateCandidates(n),schedule=balancedSchedule(cands,matchesPerSeed);cands.forEach(policyFor);allCands.push(...cands);
   for(let m=0;m<matchesPerSeed;m++){
    let [a,b]=schedule[m],r=simMatch(a,b);addDuration(durations,r);updateCandidate(a,r,1);updateCandidate(b,r,-1);mergeStats(stats,r.A,r.winner,1);mergeStats(stats,r.B,r.winner,-1);
    mergeBehavior(strategyStats[a.id]||(strategyStats[a.id]={}),r.behaviorA,r.winner,1);mergeBehavior(strategyStats[b.id]||(strategyStats[b.id]={}),r.behaviorB,r.winner,-1);done++;
    if(done%25===0){bar.style.width=(done/total*100).toFixed(1)+'%';st.textContent=`Semente ${s+1}/${seedCount} • ${done.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')} partidas`;await new Promise(requestAnimationFrame)}
   }
  }
  let meta={seed,seedCount,seeds,matchesPerSeed,schedule:'round-robin-v1'};bar.style.width='100%';renderTop(allCands);renderUnits(stats);$('#durationCurrent').innerHTML=durationHTML(durations);saveDatabase(stats,total,durations,meta);snapshot(allCands,stats,total,durations,meta);saveStrategyBatch(total,allCands,strategyStats,seeds);renderDatabase();renderHistory();renderStrategies(allCands,strategyStats);
  st.textContent=`Concluído: ${seedCount} sementes × ${matchesPerSeed.toLocaleString('pt-BR')} = ${total.toLocaleString('pt-BR')} partidas equilibradas.`
 }finally{Math.random=originalRandom;btn.disabled=false}
};
$('#runLab').onclick=run;
window.SL_STRATEGY_LAB_V4={ruleset:STRATEGY_RULESET,noFixedTimeLimit:true,dt:DT,tacticEvery:TACTIC_EVERY,orders:[...TACTICAL_ORDERS],schedule:'round-robin-v1',noStructureProgressSeconds:NO_STRUCTURE_PROGRESS_SECONDS};
})();
