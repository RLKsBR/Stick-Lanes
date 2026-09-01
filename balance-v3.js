/* Stick Lanes — laboratório Frontline v3
   Simulação headless agregada: 10k partidas em poucos segundos na maioria dos aparelhos.
   Métrica principal por unidade usa apenas partidas em que a unidade realmente spawnou. */
'use strict';
const DB_KEY='stickLanesBalanceFrontlineV3.v1',HISTORY_KEY='stickLanesBalanceFrontlineV3.history';
const COMP_KEY='stickLanesCompositions.v1';
const $=s=>document.querySelector(s);
const ALL=Object.entries(SL_FACTIONS).flatMap(([fac,m])=>m.units.map(u=>({...u,fac,key:fac+'|'+u.name})));
const FAC=SL_FACTION_ORDER;
const MINION_BASE=Object.values(SL_MINION_PROFILES).reduce((s,u)=>s+rawPower0(u),0);
function rawPower0(u){let d=u.atk/Math.max(.4,u.rate),e=u.hp*(1+u.def/125),r=1+(u.range||1)*.022,v=1+(u.speed||4)*.018;return Math.sqrt(d*e)*r*v}
function unitPower(u){let m=1,s=u.special||{};if(s.block)m+=.08;if(s.dodge)m+=s.dodge*.25;if(s.splash)m+=.12;if(s.siege)m+=.08;if(s.heal)m+=.13;if(s.stun)m+=.1;if(s.lifesteal)m+=.08;if(s.armorPierce)m+=.1;return rawPower0(u)*m}
function value(u){return unitPower(u)/(Math.pow(Math.max(50,u.cost),.68)*(1+u.gen/150))}
function pct(n,d=1){return d?(100*n/d).toFixed(1)+'%':'0.0%'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function choosePair(){let a=Math.floor(Math.random()*FAC.length),b=Math.floor(Math.random()*(FAC.length-1));if(b>=a)b++;return[FAC[a],FAC[b]]}
function pickWeighted(pool,n){
 let w=[...pool],out=[];while(out.length<n&&w.length){let weights=w.map(u=>Math.pow(value(u),1.18)*(.45+Math.random()*1.1)),sum=weights.reduce((a,b)=>a+b,0),r=Math.random()*sum,i=0;for(;i<weights.length-1;i++){r-=weights[i];if(r<=0)break}out.push(w.splice(i,1)[0])}return out
}
function repair(units,pool){
 let out=[...units];const ensure=pred=>{if(out.some(pred))return;let c=pool.filter(pred).sort((a,b)=>value(b)-value(a))[0];if(!c||out.includes(c))return;let i=out.map((u,i)=>[value(u),i]).sort((a,b)=>a[0]-b[0])[0][1];out[i]=c};
 ensure(u=>u.role==='tank');ensure(u=>u.role==='ranged');ensure(u=>u.role==='support');ensure(u=>u.cost<=150);
 return [...new Map(out.map(u=>[u.key,u])).values()].slice(0,8)
}
function makeCandidate(pair=choosePair(),greedy=false){
 let pool=pair.flatMap(f=>SL_FACTIONS[f].units.map(u=>({...u,fac:f,key:f+'|'+u.name}))),units=greedy?[...pool].sort((a,b)=>value(b)-value(a)).slice(0,8):pickWeighted(pool,8);
 units=repair(units,pool);while(units.length<8){let left=pool.filter(u=>!units.includes(u));units.push(pickWeighted(left,1)[0])}
 return{id:Math.random().toString(36).slice(2),pair,units,games:0,wins:0,losses:0,draws:0,score:0,duration:0}
}
function generateCandidates(n){
 let out=[],seen=new Set();
 for(let i=0;i<FAC.length&&out.length<n;i++){let pair=[FAC[i],FAC[(i+7)%FAC.length]],c=makeCandidate(pair,true),sig=c.units.map(u=>u.key).sort().join(';');if(!seen.has(sig)){seen.add(sig);out.push(c)}}
 let guard=0;while(out.length<n&&guard++<4000){let c=makeCandidate(),sig=c.units.map(u=>u.key).sort().join(';');if(!seen.has(sig)){seen.add(sig);out.push(c)}}return out
}
function newSide(comp){
 return{comp,gold:500,base:6000,towers:[[600,800,1000,1200],[600,800,1000,1200],[600,800,1000,1200]],
 lanes:[newLane(),newLane(),newLane()],ready:{},metrics:{},wave:0}
}
function newLane(){return{army:0,minion:0,minionFac:null,unitShare:{}}}
function towerIndex(s,l){let a=s.towers[l];for(let i=0;i<a.length;i++)if(a[i]>0)return i;return-1}
function addUnit(side,lane,u){
 let p=unitPower(u)*1.15;side.lanes[lane].army+=p;side.lanes[lane].unitShare[u.key]=(side.lanes[lane].unitShare[u.key]||0)+p;
 let m=side.metrics[u.key]||(side.metrics[u.key]={spawns:0,impact:0,structure:0});m.spawns++
}
function chooseSpawn(side,t){
 let avail=side.comp.units.filter(u=>side.gold>=u.cost&&t>=(side.ready[u.key]||0));if(!avail.length)return null;
 avail.sort((a,b)=>value(b)*(.86+Math.random()*.28)-value(a)*(.86+Math.random()*.28));return avail[0]
}
function spawnStep(me,foe,t){
 let limit=0;while(limit++<2){let u=chooseSpawn(me,t);if(!u)return;me.gold-=u.cost;me.ready[u.key]=t+u.gen;
 let scores=[0,1,2].map(i=>foe.lanes[i].army+foe.lanes[i].minion-me.lanes[i].army-me.lanes[i].minion+Math.random()*18),lane=scores.indexOf(Math.max(...scores));addUnit(me,lane,u)}
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
 if(ti>=0){let d=Math.min(target[ti],amount);target[ti]-=d;allocateStructure(attacker.lanes[lane],attacker,d)}
 else{let d=Math.min(defender.base,amount);defender.base-=d;allocateStructure(attacker.lanes[lane],attacker,d)}
}
function allocateStructure(lane,side,dmg){
 let sum=Object.values(lane.unitShare).reduce((a,b)=>a+b,0);if(!sum)return;
 for(let [k,p] of Object.entries(lane.unitShare)){let m=side.metrics[k]||(side.metrics[k]={spawns:0,impact:0,structure:0});m.structure+=dmg*(p/sum)}
}
function towerRetaliation(defender,lane,attLane,dt){
 let ti=towerIndex(defender,lane);if(ti<0)return;let dps=[24/1.6,30/1.5,36/1.4,42/1.3][ti];reduceLane(attLane,dps*dt*.13)
}
function fightLane(A,B,sideA,sideB,lane,dt,t){
 let aEff=A.army+A.minion*counterMult(A,B),bEff=B.army+B.minion*counterMult(B,A);
 let lossA=bEff*dt*.0105,lossB=aEff*dt*.0105;reduceLane(A,lossA);reduceLane(B,lossB);
 for(let [k,p] of Object.entries(A.unitShare)){let m=sideA.metrics[k]||(sideA.metrics[k]={spawns:0,impact:0,structure:0});m.impact+=bEff?lossB*(p/Math.max(1,A.army)):0}
 for(let [k,p] of Object.entries(B.unitShare)){let m=sideB.metrics[k]||(sideB.metrics[k]={spawns:0,impact:0,structure:0});m.impact+=aEff?lossA*(p/Math.max(1,B.army)):0}
 aEff=A.army+A.minion*counterMult(A,B);bEff=B.army+B.minion*counterMult(B,A);
 let pace=t<480?.60:t<720?.78:1;
 if(aEff>bEff*1.15){let pressure=(aEff-bEff*.8)*dt*.0065*pace;applyStructureDamage(sideA,sideB,lane,pressure);towerRetaliation(sideB,lane,A,dt)}
 else if(bEff>aEff*1.15){let pressure=(bEff-aEff*.8)*dt*.0065*pace;applyStructureDamage(sideB,sideA,lane,pressure);towerRetaliation(sideA,lane,B,dt)}
}
function scoreSide(A,B){
 let s=A.base-B.base;for(let l=0;l<3;l++){s+=(A.towers[l].reduce((a,b)=>a+b,0)-B.towers[l].reduce((a,b)=>a+b,0))*.45;s+=(A.lanes[l].army+A.lanes[l].minion-B.lanes[l].army-B.lanes[l].minion)*.25}return s
}
function simMatch(c1,c2){
 let A=newSide(c1),B=newSide(c2),dt=15,maxT=1200,t=0,nextWave=0;
 for(t=0;t<=maxT&&A.base>0&&B.base>0;t+=dt){
   A.gold+=15*dt;B.gold+=15*dt;spawnStep(A,B,t);spawnStep(B,A,t);
   if(t>=nextWave){spawnWave(A);spawnWave(B);nextWave+=22}
   for(let lane=0;lane<3;lane++)fightLane(A.lanes[lane],B.lanes[lane],A,B,lane,dt,t)
 }
 let sc=scoreSide(A,B),winner=Math.abs(sc)<45?0:(sc>0?1:-1);return{winner,A,B,duration:Math.min(t,maxT),score:sc}
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
function saveDatabase(stats,matches){
 let db=readJSON(DB_KEY,{version:1,ruleset:SL_RULESET_VERSION,batches:0,matches:0,units:{},updatedAt:0});db.batches++;db.matches+=matches;db.updatedAt=Date.now();
 for(let x of Object.values(stats)){let g=db.units[x.key]||(db.units[x.key]={...blankUnit(x),name:x.name,fac:x.fac});for(let k of ['appear','wins','losses','draws','active','activeWins','activeLosses','activeDraws','spawns','impact','structure'])g[k]+=x[k]||0}
 localStorage.setItem(DB_KEY,JSON.stringify(db));return db
}
function snapshot(cands,stats,total){
 let top=[...cands].filter(c=>c.games).sort((a,b)=>b.score-a.score).slice(0,10);
 let snap={id:String(Date.now()),savedAt:Date.now(),ruleset:SL_RULESET_VERSION,matches:total,candidates:cands.length,
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
 return Object.values(stats).filter(x=>x.active>=8).map(x=>({...x,awr:x.activeWins/x.active,alr:x.activeLosses/x.active,spawnPerActive:x.spawns/x.active,impactPerSpawn:x.impact/Math.max(1,x.spawns),structPerSpawn:x.structure/Math.max(1,x.spawns)})).sort((a,b)=>b.awr-a.awr)
}
function renderUnits(stats,selector='#unitTable'){
 let arr=unitRows(stats),el=$(selector);if(!el)return;
 el.innerHTML=`<table><thead><tr><th>Unidade</th><th>Facção</th><th>Partidas ativas</th><th>Vitória</th><th>Derrota</th><th>Empate</th><th>Spawns/partida</th><th>Impacto/spawn</th><th>Estrutura/spawn</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.fac)}</td><td>${x.active}</td><td>${pct(x.activeWins,x.active)}</td><td>${pct(x.activeLosses,x.active)}</td><td>${pct(x.activeDraws,x.active)}</td><td>${x.spawnPerActive.toFixed(2)}</td><td>${Math.round(x.impactPerSpawn)}</td><td>${Math.round(x.structPerSpawn)}</td></tr>`).join('')}</tbody></table>`
 let hot=arr.filter(x=>x.active>=30&&x.awr>.57).slice(0,6),cold=[...arr].reverse().filter(x=>x.active>=30&&x.awr<.43).slice(0,6);
 $('#diagnostics').innerHTML=`<p><b class="warning">Fortes?</b> ${hot.length?hot.map(x=>`${esc(x.name)} ${pct(x.activeWins,x.active)}`).join(', '):'nenhuma anomalia forte'}</p><p><b class="good">Fracos?</b> ${cold.length?cold.map(x=>`${esc(x.name)} ${pct(x.activeWins,x.active)}`).join(', '):'nenhuma anomalia forte'}</p><p class="muted">Agora a taxa só conta partidas em que a unidade realmente entrou em campo.</p>`
}
function renderDatabase(){
 let db=readJSON(DB_KEY,null),sum=$('#bulkSummary'),el=$('#unitLifetime');if(!db){sum.textContent='Banco novo ainda vazio.';el.textContent='Rode uma bateria.';return}
 sum.innerHTML=`<span class="badge">${db.batches} baterias</span> <span class="badge">${db.matches.toLocaleString('pt-BR')} simulações</span> <span class="badge">regras ${esc(db.ruleset)}</span>`;
 let fake={};for(let x of Object.values(db.units))fake[x.key]=x;renderUnits(fake,'#unitLifetime')
}
function renderHistory(){
 let h=readJSON(HISTORY_KEY,[]),el=$('#labHistory');if(!h.length){el.textContent='Nenhuma bateria v3 salva.';return}
 el.innerHTML=h.map(x=>`<div class="compCard"><strong>${x.matches.toLocaleString('pt-BR')} partidas</strong><div class="historyMeta">${new Date(x.savedAt).toLocaleString()} • ${x.candidates} candidatas • ${x.ruleset}</div></div>`).join('')
}
async function run(){
 let total=Number($('#matchCount').value),n=Number($('#candidateCount').value),cands=generateCandidates(n),stats={},bar=$('#progressBar'),st=$('#labStatus'),btn=$('#runLab');
 btn.disabled=true;bar.style.width='0';st.textContent='Preparando robôs...';$('#bestComps').innerHTML='';$('#unitTable').textContent='Simulando...';
 for(let m=0;m<total;m++){
   let i=Math.floor(Math.random()*cands.length),j=Math.floor(Math.random()*(cands.length-1));if(j>=i)j++;
   let a=cands[i],b=cands[j],r=simMatch(a,b);updateCandidate(a,r,1);updateCandidate(b,r,-1);mergeStats(stats,r.A,r.winner,1);mergeStats(stats,r.B,r.winner,-1);
   if(m%250===0){bar.style.width=(m/total*100).toFixed(1)+'%';st.textContent=`${m.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')} simulações`;await new Promise(requestAnimationFrame)}
 }
 bar.style.width='100%';renderTop(cands);renderUnits(stats);saveDatabase(stats,total);snapshot(cands,stats,total);renderDatabase();renderHistory();
 st.textContent=`Concluído: ${total.toLocaleString('pt-BR')} simulações Frontline v3.`;btn.disabled=false
}
$('#runLab').onclick=run;
$('#clearUnitBalance').onclick=()=>{if(confirm('Zerar somente o banco acumulado Frontline v3? O baseline antigo exportado não é afetado.')){localStorage.removeItem(DB_KEY);renderDatabase()}};
$('#exportUnitBalance').onclick=()=>{let db=readJSON(DB_KEY,null);if(!db)return;let a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download=`stick-lanes-frontline-v3-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
renderDatabase();renderHistory();
