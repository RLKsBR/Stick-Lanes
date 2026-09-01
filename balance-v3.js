/* Stick Lanes — motor base do laboratório Frontline v3
   A interface atual usa uma camada estratégica posterior sobre esta simulação agregada.
   Métrica principal por unidade usa apenas partidas em que a unidade realmente spawnou. */
'use strict';
const DB_KEY='stickLanesBalanceFrontlineV3.v2',HISTORY_KEY='stickLanesBalanceFrontlineV3.history.v2';
const COMP_KEY='stickLanesCompositions.v1';
const MATCH_HARD_LIMIT_SECONDS=5400,DURATION_BIN_SECONDS=60;
const $=s=>document.querySelector(s);
const ALL=Object.entries(SL_FACTIONS).flatMap(([fac,m])=>m.units.map(u=>({...u,fac,key:fac+'|'+u.name})));
const UNIT_BY_KEY=Object.fromEntries(ALL.map(u=>[u.key,u]));
const FAC=SL_FACTION_ORDER;
const MINION_BASE=Object.values(SL_MINION_PROFILES).reduce((s,u)=>s+rawPower0(u),0);
const FACTION_SIM_MULT={
 'Alienígenas':1.04,'Mentalistas':1.02,'Robôs':1.06,'Lobos':1.07,'Zumbis':1.05,'Samurais':1.04,
 'Celestiais':1.04,'Mutantes':1.04,'Necromantes':1.05,'Nômades do Deserto':1.02,'Titãs':1.08,
 'Orcs':1.04,'Cultistas':1.05,'Músicos':1.05,'Cristalinos':1.04,'Medievais':1.02,'Físicos':1.04
};
function rawPower0(u){let d=u.atk/Math.max(.4,u.rate),e=u.hp*(1+u.def/125),r=1+(u.range||1)*.022,v=1+(u.speed||4)*.018;return Math.sqrt(d*e)*r*v}
function unitPower(u){
 let m=FACTION_SIM_MULT[u.fac]||1,s=u.special||{};
 if(s.block)m+=s.block*.5;if(s.dodge)m+=s.dodge*.5;if(s.splash)m+=.07;if(s.siege)m+=.04;
 if(s.heal)m+=.20;if(s.support&&!s.heal)m+=.14;if(s.stun)m+=.1;if(s.lifesteal)m+=s.lifesteal*.5;if(s.armorPierce)m+=.1;
 if(s.charge)m+=s.charge*.25;if(s.acid)m+=.06;if(s.slow)m+=.04;if(s.radiation)m+=.07;
 return rawPower0(u)*m
}
function structureFactor(u){let s=u?.special||{};return Math.min(2.5,(s.siege||1)*(u?.role==='siege'?1.25:1))}
function laneStructureFactor(lane){
 let sum=0,weighted=0;for(let [k,p] of Object.entries(lane.unitShare)){sum+=p;weighted+=p*structureFactor(UNIT_BY_KEY[k])}
 return sum?weighted/sum:1
}
function value(u){let strategic=1+(structureFactor(u)-1)*.35;return unitPower(u)*strategic/(Math.pow(Math.max(50,u.cost),.68)*(1+u.gen/150))}
function pct(n,d=1){return d?(100*n/d).toFixed(1)+'%':'0.0%'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function randomPair(){let a=Math.floor(Math.random()*FAC.length),b=Math.floor(Math.random()*(FAC.length-1));if(b>=a)b++;return[FAC[a],FAC[b]]}
function choosePair(){
 if($('#simFactionMode')?.value==='fixed'){
   let a=$('#simF1').value,b=$('#simF2').value;if(a&&b&&a!==b)return[a,b]
 }
 return randomPair()
}
function pickWeighted(pool,n){
 let w=[...pool],out=[];while(out.length<n&&w.length){let weights=w.map(u=>Math.pow(value(u),1.18)*(.45+Math.random()*1.1)),sum=weights.reduce((a,b)=>a+b,0),r=Math.random()*sum,i=0;for(;i<weights.length-1;i++){r-=weights[i];if(r<=0)break}out.push(w.splice(i,1)[0])}return out
}
function repair(units,pool){
 let out=[...units];const ensure=pred=>{if(out.some(pred))return;let c=pool.filter(pred).sort((a,b)=>value(b)-value(a))[0];if(!c||out.includes(c))return;let i=out.map((u,i)=>[value(u),i]).sort((a,b)=>a[0]-b[0])[0][1];out[i]=c};
 ensure(u=>u.role==='tank');ensure(u=>u.role==='ranged');ensure(u=>u.role==='support');ensure(u=>u.role==='siege');ensure(u=>u.cost<=150);
 return [...new Map(out.map(u=>[u.key,u])).values()].slice(0,8)
}
function ensureCoverage(cands,pool){
 let counts={};for(let c of cands)for(let u of c.units)counts[u.key]=(counts[u.key]||0)+1;
 let target=Math.max(2,Math.floor(cands.length*8/Math.max(1,pool.length)*.72));
 let protectedRole=(c,u,pred)=>pred(u)&&c.units.filter(pred).length<=1;
 for(let pass=0;pass<target;pass++)for(let u of pool){
  if((counts[u.key]||0)>=target)continue;
  let options=cands.filter(c=>c.pair.includes(u.fac)&&!c.units.some(x=>x.key===u.key)),placed=false;
  options.sort((a,b)=>Math.max(...b.units.map(x=>counts[x.key]||0))-Math.max(...a.units.map(x=>counts[x.key]||0)));
  for(let c of options){
   let choices=c.units.map((x,i)=>({x,i,n:counts[x.key]||0})).filter(o=>o.n>target&&!protectedRole(c,o.x,x=>x.role==='tank')&&!protectedRole(c,o.x,x=>x.role==='ranged')&&!protectedRole(c,o.x,x=>x.role==='support')&&!protectedRole(c,o.x,x=>x.role==='siege')&&!protectedRole(c,o.x,x=>x.cost<=150)).sort((a,b)=>b.n-a.n);
   if(!choices.length)continue;let old=choices[0];counts[old.x.key]--;c.units[old.i]=u;counts[u.key]=(counts[u.key]||0)+1;placed=true;break
  }
  if(!placed)continue
 }
 return cands
}
function makeCandidate(pair=choosePair(),greedy=false){
 let pool=pair.flatMap(f=>SL_FACTIONS[f].units.map(u=>({...u,fac:f,key:f+'|'+u.name}))),units=greedy?[...pool].sort((a,b)=>value(b)-value(a)).slice(0,8):pickWeighted(pool,8);
 units=repair(units,pool);while(units.length<8){let left=pool.filter(u=>!units.includes(u));units.push(pickWeighted(left,1)[0])}
 return{id:Math.random().toString(36).slice(2),pair,units,games:0,wins:0,losses:0,draws:0,score:0,duration:0}
}
function generateCandidates(n){
 let out=[],seen=new Set(),fixed=$('#simFactionMode')?.value==='fixed'?choosePair():null;
 if(!fixed)for(let i=0;i<FAC.length&&out.length<n;i++){let pair=[FAC[i],FAC[(i+7)%FAC.length]],c=makeCandidate(pair,true),sig=c.units.map(u=>u.key).sort().join(';');if(!seen.has(sig)){seen.add(sig);out.push(c)}}
 else{let c=makeCandidate(fixed,true),sig=c.units.map(u=>u.key).sort().join(';');seen.add(sig);out.push(c)}
 let guard=0;while(out.length<n&&guard++<6000){let c=makeCandidate(fixed||choosePair()),sig=c.units.map(u=>u.key).sort().join(';');if(!seen.has(sig)){seen.add(sig);out.push(c)}}
 return ensureCoverage(out,fixed?fixed.flatMap(f=>SL_FACTIONS[f].units.map(u=>({...u,fac:f,key:f+'|'+u.name}))):ALL)
}
function newSide(comp){
 return{comp,gold:500,base:6000,towers:[[2200,3000,4000,5400],[2200,3000,4000,5400],[2200,3000,4000,5400]],
 lanes:[newLane(),newLane(),newLane()],ready:{},usage:{},metrics:{},wave:0}
}
function newLane(){return{army:0,minion:0,minionFac:null,unitShare:{}}}
function towerIndex(s,l){let a=s.towers[l];for(let i=0;i<a.length;i++)if(a[i]>0)return i;return-1}
function addUnit(side,lane,u){
 let p=unitPower(u)*1.15;side.lanes[lane].army+=p;side.lanes[lane].unitShare[u.key]=(side.lanes[lane].unitShare[u.key]||0)+p;
 let m=side.metrics[u.key]||(side.metrics[u.key]={spawns:0,impact:0,structure:0});m.spawns++
}
function chooseSpawn(side,t){
 let unusedAll=side.comp.units.filter(u=>(side.usage[u.key]||0)===0);
 let source=unusedAll.length?unusedAll:side.comp.units;
 let avail=source.filter(u=>side.gold>=u.cost&&t>=(side.ready[u.key]||0));if(!avail.length)return null;
 avail.sort((a,b)=>value(b)*(.86+Math.random()*.28)-value(a)*(.86+Math.random()*.28));return avail[0]
}
function spawnStep(me,foe,t){
 let limit=0;while(limit++<2){let u=chooseSpawn(me,t);if(!u)return;me.gold-=u.cost;me.ready[u.key]=t+u.gen;
 let scores=[0,1,2].map(i=>foe.lanes[i].army+foe.lanes[i].minion-me.lanes[i].army-me.lanes[i].minion+Math.random()*18),lane=scores.indexOf(Math.max(...scores));me.usage[u.key]=(me.usage[u.key]||0)+1;addUnit(me,lane,u)}
}
function spawnWave(side){
 let fac=side.comp.pair[side.wave%2];side.wave++;
 for(let lane of side.lanes){lane.minion+=MINION_BASE*.92;lane.minionFac=fac}
}
function reduceLane(lane,loss){
 let total=lane.army+lane.minion;if(total<=0)return;loss=Math.min(total,loss);
 let aShare=lane.army/total,mShare=lane.minion/total;lane.army=Math.max(0,lane.army-loss*aShare);lane.minion=Math.max(0,lane.minion-loss*mShare);
 if(lane.army<.01){lane.army=0;lane.unitShare={}}else{
   let sum=Object.values(lane.unitShare).reduce((a,b)=>a+b,0),factor=sum?lane.army/sum:0;
   for(let k in lane.unitShare)lane.unitShare[k]*=factor
 }
}
function counterMult(att,def){return att.minionFac&&def.minionFac&&SL_COUNTERS[att.minionFac]===def.minionFac?1.20:1}
function applyStructureDamage(attacker,defender,lane,amount){
 if(amount<=0)return;let ti=towerIndex(defender,lane),target=ti>=0?defender.towers[lane]:null;
 amount*=laneStructureFactor(attacker.lanes[lane]);
 if(ti>=0){if(attacker.lanes[lane].minion<=.01)amount*=SL_COMBAT_RULES.siege.fortifiedDamageTaken;let d=Math.min(target[ti],amount);target[ti]-=d;allocateStructure(attacker.lanes[lane],attacker,d)}
 else{let d=Math.min(defender.base,amount);defender.base-=d;allocateStructure(attacker.lanes[lane],attacker,d)}
}
function allocateStructure(lane,side,dmg){
 let sum=Object.entries(lane.unitShare).reduce((a,[k,p])=>a+p*structureFactor(UNIT_BY_KEY[k]),0);if(!sum)return;
 for(let [k,p] of Object.entries(lane.unitShare)){let m=side.metrics[k]||(side.metrics[k]={spawns:0,impact:0,structure:0});m.structure+=dmg*(p*structureFactor(UNIT_BY_KEY[k])/sum)}
}
function towerRetaliation(defender,lane,attLane,dt){
 let ti=towerIndex(defender,lane);if(ti<0)return;let dps=[20/1.6,25/1.5,30/1.4,36/1.3][ti];reduceLane(attLane,dps*dt*.13)
}
function fightLane(A,B,sideA,sideB,lane,dt,t){
 let aEff=A.army+A.minion*counterMult(A,B),bEff=B.army+B.minion*counterMult(B,A);
 let lossA=bEff*dt*.0105,lossB=aEff*dt*.0105;reduceLane(A,lossA);reduceLane(B,lossB);
 for(let [k,p] of Object.entries(A.unitShare)){let m=sideA.metrics[k]||(sideA.metrics[k]={spawns:0,impact:0,structure:0});m.impact+=bEff?lossB*(p/Math.max(1,A.army)):0}
 for(let [k,p] of Object.entries(B.unitShare)){let m=sideB.metrics[k]||(sideB.metrics[k]={spawns:0,impact:0,structure:0});m.impact+=aEff?lossA*(p/Math.max(1,B.army)):0}
 aEff=A.army+A.minion*counterMult(A,B);bEff=B.army+B.minion*counterMult(B,A);
 let pace=t<480?.60:t<720?.78:1;
 if(aEff>bEff*1.15){let siegeA=A.army+A.minion*SL_COMBAT_RULES.siege.minionStructureDamage,pressure=Math.max(0,siegeA-bEff*.8)*dt*.0065*pace;applyStructureDamage(sideA,sideB,lane,pressure);towerRetaliation(sideB,lane,A,dt)}
 else if(bEff>aEff*1.15){let siegeB=B.army+B.minion*SL_COMBAT_RULES.siege.minionStructureDamage,pressure=Math.max(0,siegeB-aEff*.8)*dt*.0065*pace;applyStructureDamage(sideB,sideA,lane,pressure);towerRetaliation(sideA,lane,B,dt)}
}
function scoreSide(A,B){
 let s=A.base-B.base;for(let l=0;l<3;l++){s+=(A.towers[l].reduce((a,b)=>a+b,0)-B.towers[l].reduce((a,b)=>a+b,0))*.45;s+=(A.lanes[l].army+A.lanes[l].minion-B.lanes[l].army-B.lanes[l].minion)*.25}return s
}
function simMatch(c1,c2){
 let A=newSide(c1),B=newSide(c2),dt=15,maxT=MATCH_HARD_LIMIT_SECONDS,t=0,nextWave=0;
 for(t=0;t<=maxT&&A.base>0&&B.base>0;t+=dt){
   A.gold+=15*dt;B.gold+=15*dt;spawnStep(A,B,t);spawnStep(B,A,t);
   if(t>=nextWave){spawnWave(A);spawnWave(B);nextWave+=22}
   for(let lane=0;lane<3;lane++)fightLane(A.lanes[lane],B.lanes[lane],A,B,lane,dt,t)
 }
 let completed=A.base<=0||B.base<=0,sc=scoreSide(A,B),winner=completed?(A.base>B.base?1:A.base<B.base?-1:0):0;
 return{winner,A,B,duration:Math.min(t,maxT),score:sc,completed,timedOut:!completed}
}
function updateCandidate(c,r,side){c.games++;c.duration+=r.duration;if(r.winner===0)c.draws++;else if(r.winner===side)c.wins++;else c.losses++;c.score=(c.wins+c.draws*.5)/c.games+(side===1?r.score:-r.score)/c.games/20000}
function blankUnit(u){return{key:u.key,name:u.name,fac:u.fac,appear:0,wins:0,losses:0,draws:0,active:0,activeWins:0,activeLosses:0,activeDraws:0,spawns:0,impact:0,structure:0}}
function mergeStats(global,side,winner,sideSign){
 for(let u of side.comp.units){
   let g=global[u.key]||(global[u.key]=blankUnit(u));g.appear++;if(winner===0)g.draws++;else if(winner===sideSign)g.wins++;else g.losses++;
   let m=side.metrics[u.key];if(m&&m.spawns){g.active++;if(winner===0)g.activeDraws++;else if(winner===sideSign)g.activeWins++;else g.activeLosses++;g.spawns+=m.spawns;g.impact+=m.impact;g.structure+=m.structure}
 }
}
function readJSON(key,def){try{let v=JSON.parse(localStorage.getItem(key)||'null');return v||def}catch{return def}}
function blankDurations(){return{totalSeconds:0,completedSeconds:0,completedMatches:0,timedOutMatches:0,histogram:Array(Math.ceil(MATCH_HARD_LIMIT_SECONDS/DURATION_BIN_SECONDS)+1).fill(0)}}
function addDuration(d,r){
 d.totalSeconds+=r.duration;if(r.completed){d.completedSeconds+=r.duration;d.completedMatches++}else d.timedOutMatches++;
 let bin=Math.min(d.histogram.length-1,Math.floor(r.duration/DURATION_BIN_SECONDS));d.histogram[bin]++
}
function mergeDurations(a,b){
 a.totalSeconds+=b.totalSeconds;a.completedSeconds+=b.completedSeconds;a.completedMatches+=b.completedMatches;a.timedOutMatches+=b.timedOutMatches;
 for(let i=0;i<b.histogram.length;i++)a.histogram[i]=(a.histogram[i]||0)+b.histogram[i];return a
}
function durationQuantile(d,q){
 let total=d.completedMatches+d.timedOutMatches,target=Math.max(1,Math.ceil(total*q)),seen=0;
 for(let i=0;i<d.histogram.length;i++){seen+=d.histogram[i]||0;if(seen>=target)return Math.min(MATCH_HARD_LIMIT_SECONDS,(i+.5)*DURATION_BIN_SECONDS)}return 0
}
function clock(sec){sec=Math.max(0,Math.round(sec));return Math.floor(sec/60)+'m '+String(sec%60).padStart(2,'0')+'s'}
function quantileClock(d,q){let v=durationQuantile(d,q);return v>=MATCH_HARD_LIMIT_SECONDS&&d.timedOutMatches?'≥ '+clock(v):clock(v)}
function durationHTML(d){
 let n=d.completedMatches+d.timedOutMatches;if(!n)return '<span class="muted">Sem tempos registrados.</span>';
 let completedMean=d.completedMatches?d.completedSeconds/d.completedMatches:0,observed=d.totalSeconds/n,timeoutRate=d.timedOutMatches/n;
 let truth=d.timedOutMatches?`<span class="warning">média total ≥ ${clock(observed)} (há partidas truncadas)</span>`:`<span class="good">média real ${clock(observed)}</span>`;
 return `${truth} <span class="badge">concluídas ${pct(d.completedMatches,n)}</span> <span class="badge">média das concluídas ${clock(completedMean)}</span> <span class="badge">P50 ${quantileClock(d,.5)}</span> <span class="badge">P90 ${quantileClock(d,.9)}</span> <span class="badge ${timeoutRate?'warning':''}">limite de 90 min ${pct(d.timedOutMatches,n)}</span>`
}
function saveDatabase(stats,matches,durations){
 let db=readJSON(DB_KEY,{version:2,ruleset:SL_RULESET_VERSION,batches:0,matches:0,duration:blankDurations(),units:{},updatedAt:0});db.batches++;db.matches+=matches;db.updatedAt=Date.now();
 db.duration=mergeDurations(db.duration||blankDurations(),durations);
 for(let x of Object.values(stats)){let g=db.units[x.key]||(db.units[x.key]={...blankUnit(x),name:x.name,fac:x.fac});for(let k of ['appear','wins','losses','draws','active','activeWins','activeLosses','activeDraws','spawns','impact','structure'])g[k]+=x[k]||0}
 localStorage.setItem(DB_KEY,JSON.stringify(db));return db
}
function snapshot(cands,stats,total,durations){
 let top=[...cands].filter(c=>c.games).sort((a,b)=>b.score-a.score).slice(0,10);
 let snap={id:String(Date.now()),savedAt:Date.now(),ruleset:SL_RULESET_VERSION,matches:total,candidates:cands.length,duration:durations,
 top:top.map(c=>({pair:c.pair,units:c.units.map(u=>({key:u.key,name:u.name,fac:u.fac})),games:c.games,wins:c.wins,losses:c.losses,draws:c.draws,avgDuration:c.duration/Math.max(1,c.games)})),
 units:Object.values(stats)};
 let h=readJSON(HISTORY_KEY,[]);h.unshift(snap);localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,12)));return snap
}
function saveComp(c){
 let list=readJSON(COMP_KEY,[]),name='LAB V3 '+c.pair.join('+')+' '+new Date().toLocaleTimeString().slice(0,5);
 list.push({id:String(Date.now()),name,f1:c.pair[0],f2:c.pair[1],keys:c.units.map(u=>u.key),savedAt:Date.now()});localStorage.setItem(COMP_KEY,JSON.stringify(list.slice(-50)));alert('Composição salva no jogo.')
}
window.saveV3Comp=i=>saveComp(window.__topV3[i]);
function renderTop(cands){
 let top=[...cands].filter(c=>c.games).sort((a,b)=>b.score-a.score).slice(0,10);window.__topV3=top;
 $('#bestComps').innerHTML=top.map((c,i)=>`<div class="compCard"><strong>#${i+1} ${esc(c.pair.join(' + '))}</strong> <span class="badge">${pct(c.wins+c.draws*.5,c.games)}</span><div class="compUnits">${c.units.map(u=>esc(u.name)).join(' • ')}</div><small class="muted">média ${Math.round(c.duration/Math.max(1,c.games)/60)} min</small> <button class="secondary" onclick="saveV3Comp(${i})">Salvar no jogo</button></div>`).join('')
}
function unitRows(stats){
 return Object.values(stats).filter(x=>x.active>=8).map(x=>({...x,awr:(x.activeWins+x.activeDraws*.5)/x.active,alr:x.activeLosses/x.active,spawnPerActive:x.spawns/x.active,impactPerSpawn:x.impact/Math.max(1,x.spawns),structPerSpawn:x.structure/Math.max(1,x.spawns)})).sort((a,b)=>b.awr-a.awr)
}
function renderUnits(stats,selector='#unitTable'){
 let arr=unitRows(stats),el=$(selector);if(!el)return;
 el.innerHTML=`<table><thead><tr><th>Unidade</th><th>Facção</th><th>Partidas ativas</th><th>Resultado</th><th>Derrota</th><th>Empate</th><th>Spawns/partida</th><th>Impacto/spawn</th><th>Estrutura/spawn</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.fac)}</td><td>${x.active}</td><td>${pct(x.activeWins+x.activeDraws*.5,x.active)}</td><td>${pct(x.activeLosses,x.active)}</td><td>${pct(x.activeDraws,x.active)}</td><td>${x.spawnPerActive.toFixed(2)}</td><td>${Math.round(x.impactPerSpawn)}</td><td>${Math.round(x.structPerSpawn)}</td></tr>`).join('')}</tbody></table>`
 let hot=arr.filter(x=>x.active>=30&&x.awr>.57).slice(0,6),cold=[...arr].reverse().filter(x=>x.active>=30&&x.awr<.43).slice(0,6);
 $('#diagnostics').innerHTML=`<p><b class="warning">Fortes?</b> ${hot.length?hot.map(x=>`${esc(x.name)} ${pct(x.activeWins+x.activeDraws*.5,x.active)}`).join(', '):'nenhuma anomalia forte'}</p><p><b class="good">Fracos?</b> ${cold.length?cold.map(x=>`${esc(x.name)} ${pct(x.activeWins+x.activeDraws*.5,x.active)}`).join(', '):'nenhuma anomalia forte'}</p><p class="muted">Resultado = vitória + metade dos empates, contando apenas partidas em que a unidade realmente entrou em campo.</p>`
}
function renderDatabase(){
 let db=readJSON(DB_KEY,null),sum=$('#bulkSummary'),el=$('#unitLifetime'),duration=$('#durationLifetime');if(!db){sum.textContent='Banco novo ainda vazio.';el.textContent='Rode uma bateria.';if(duration)duration.textContent='Sem tempos registrados.';return}
 sum.innerHTML=`<span class="badge">${db.batches} baterias</span> <span class="badge">${db.matches.toLocaleString('pt-BR')} simulações</span> <span class="badge">regras ${esc(db.ruleset)}</span>`;
 if(duration)duration.innerHTML=durationHTML(db.duration||blankDurations());
 let fake={};for(let x of Object.values(db.units))fake[x.key]=x;renderUnits(fake,'#unitLifetime')
}
function renderHistory(){
 let h=readJSON(HISTORY_KEY,[]),el=$('#labHistory');if(!h.length){el.textContent='Nenhuma bateria v3 salva.';return}
 el.innerHTML=h.map(x=>`<div class="compCard"><strong>${x.matches.toLocaleString('pt-BR')} partidas</strong><div class="historyMeta">${new Date(x.savedAt).toLocaleString()} • ${x.candidates} candidatas • ${x.ruleset}</div></div>`).join('')
}
async function run(){
 let total=Number($('#matchCount').value),n=Number($('#candidateCount').value),cands=generateCandidates(n),stats={},durations=blankDurations(),bar=$('#progressBar'),st=$('#labStatus'),btn=$('#runLab');
 btn.disabled=true;bar.style.width='0';st.textContent='Preparando robôs...';$('#bestComps').innerHTML='';$('#unitTable').textContent='Simulando...';
 for(let m=0;m<total;m++){
   let i=Math.floor(Math.random()*cands.length),j=Math.floor(Math.random()*(cands.length-1));if(j>=i)j++;
   let a=cands[i],b=cands[j],r=simMatch(a,b);addDuration(durations,r);updateCandidate(a,r,1);updateCandidate(b,r,-1);mergeStats(stats,r.A,r.winner,1);mergeStats(stats,r.B,r.winner,-1);
   if(m%250===0){bar.style.width=(m/total*100).toFixed(1)+'%';st.textContent=`${m.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')} simulações`;await new Promise(requestAnimationFrame)}
 }
 bar.style.width='100%';renderTop(cands);renderUnits(stats);$('#durationCurrent').innerHTML=durationHTML(durations);saveDatabase(stats,total,durations);snapshot(cands,stats,total,durations);renderDatabase();renderHistory();
 st.textContent=`Concluído: ${total.toLocaleString('pt-BR')} simulações Frontline v3.`;btn.disabled=false
}
function fillSimulationFactions(){
 let a=$('#simF1'),b=$('#simF2');for(const f of FAC){a.add(new Option(f,f));b.add(new Option(f,f))}
 a.value=FAC[0];b.value=FAC[1]
}
function syncSimulationFactionMode(){
 let fixed=$('#simFactionMode').value==='fixed';$('#fixedFactionControls').hidden=!fixed;
 $('#labStatus').textContent=fixed?`Pronto para simular com ${$('#simF1').value} + ${$('#simF2').value}.`:'Pronto para simular com facções aleatórias e tropas escolhidas pelos robôs.'
}
function ensureDifferentSimulationFactions(changed){
 let a=$('#simF1'),b=$('#simF2');if(a.value!==b.value)return;
 let other=FAC.find(f=>f!==changed.value);if(changed===a)b.value=other;else a.value=other
}
fillSimulationFactions();
$('#simFactionMode').onchange=syncSimulationFactionMode;
$('#simF1').onchange=()=>{ensureDifferentSimulationFactions($('#simF1'));syncSimulationFactionMode()};
$('#simF2').onchange=()=>{ensureDifferentSimulationFactions($('#simF2'));syncSimulationFactionMode()};
$('#randomizeSimFactions').onclick=()=>{let pair=randomPair();$('#simF1').value=pair[0];$('#simF2').value=pair[1];syncSimulationFactionMode()};
syncSimulationFactionMode();
$('#runLab').onclick=run;
$('#clearUnitBalance').onclick=()=>{if(confirm('Zerar somente o banco acumulado Frontline v3? O baseline antigo exportado não é afetado.')){localStorage.removeItem(DB_KEY);renderDatabase()}};
$('#exportUnitBalance').onclick=()=>{let db=readJSON(DB_KEY,null);if(!db)return;let a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download=`stick-lanes-frontline-v3-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
renderDatabase();renderHistory();
