const UNIT_BALANCE_KEY='stickLanesUnitBalance.v2';

function readUnitBalance(){
  try{
    const v=JSON.parse(localStorage.getItem(UNIT_BALANCE_KEY)||'null');
    if(v&&v.version===2&&v.units)return v;
  }catch{}
  return{version:2,batches:0,matches:0,updatedAt:0,units:{}};
}
function writeUnitBalance(v){localStorage.setItem(UNIT_BALANCE_KEY,JSON.stringify(v))}
function unitPct(n,d){return d?((n/d)*100).toFixed(1)+'%':'0.0%'}
function unitEsc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

// Instrumenta a simulação existente para sabermos se cada aparição foi vitória, derrota ou empate.
const __baseSimMatch=simMatch;
simMatch=function(c1,c2){
  const r=__baseSimMatch(c1,c2);
  window.__bulkWinner=r.winner;
  window.__bulkMergeIndex=0;
  return r;
};

// Substitui a coleta antiga: agora cada unidade carrega W/L/D explicitamente.
mergeMetrics=function(global,side){
  const sideSign=(window.__bulkMergeIndex++===0)?1:-1;
  const winner=window.__bulkWinner;
  for(const u of side.comp.units){
    const g=global[u.key]||(global[u.key]={u,appear:0,wins:0,losses:0,draws:0,spawns:0,damage:0,structure:0,kills:0,deaths:0});
    g.appear++;
    if(winner===0)g.draws++;
    else if(winner===sideSign)g.wins++;
    else g.losses++;
    const m=side.metrics[u.key];
    if(m){g.spawns+=m.spawns;g.damage+=m.damage;g.structure+=m.structure;g.kills+=m.kills;g.deaths+=m.deaths}
  }
};

// Faz os snapshots novos também preservarem derrotas e empates por unidade.
makeLabSnapshot=function(cands,stats){
  const ranked=[...cands].filter(c=>c.games).sort((a,b)=>b.score-a.score).slice(0,8);
  const units=Object.values(stats).filter(x=>x.appear>=4).map(x=>({
    key:x.u.key,name:x.u.name,fac:x.u.fac,appear:x.appear,wins:x.wins||0,losses:x.losses||0,draws:x.draws||0,
    spawns:x.spawns,damage:x.damage,structure:x.structure,kills:x.kills,deaths:x.deaths,
    wr:(x.wins||0)/Math.max(1,x.appear),lr:(x.losses||0)/Math.max(1,x.appear),dr:(x.draws||0)/Math.max(1,x.appear),
    dmgPerSpawn:x.damage/Math.max(1,x.spawns),structPerSpawn:x.structure/Math.max(1,x.spawns)
  })).sort((a,b)=>b.wr-a.wr);
  return{
    schema:'bulk-v2',id:String(Date.now())+'-'+Math.random().toString(36).slice(2,7),savedAt:Date.now(),
    matches:Number(document.querySelector('#matchCount')?.value||0),candidates:Number(document.querySelector('#candidateCount')?.value||0),
    top:ranked.map(c=>({pair:[...c.pair],games:c.games,wins:c.wins,draws:c.draws,score:c.score,baseDiff:c.baseDiff,units:c.units.map(u=>({key:u.key,name:u.name,fac:u.fac}))})),units
  };
};

function accumulateUnitBalance(stats,matches){
  const db=readUnitBalance();
  db.batches++;
  db.matches+=Number(matches)||0;
  db.updatedAt=Date.now();
  for(const x of Object.values(stats)){
    const k=x.u.key;
    const g=db.units[k]||(db.units[k]={key:k,name:x.u.name,fac:x.u.fac,appear:0,wins:0,losses:0,draws:0,spawns:0,damage:0,structure:0,kills:0,deaths:0});
    for(const p of ['appear','wins','losses','draws','spawns','damage','structure','kills','deaths'])g[p]+=Number(x[p]||0);
  }
  writeUnitBalance(db);
}

function renderBatchUnitTable(stats){
  const el=document.querySelector('#unitTable');if(!el)return;
  const arr=Object.values(stats).filter(x=>x.appear>=4).map(x=>({...x,wr:(x.wins||0)/x.appear,lr:(x.losses||0)/x.appear,dr:(x.draws||0)/x.appear,dmgPerSpawn:x.damage/Math.max(1,x.spawns),structPerSpawn:x.structure/Math.max(1,x.spawns)})).sort((a,b)=>b.wr-a.wr);
  el.innerHTML=`<table><thead><tr><th>Unidade</th><th>Facção</th><th>Jogos</th><th>Vitórias</th><th>Derrotas</th><th>Empates</th><th>Win rate</th><th>Loss rate</th><th>Spawns</th><th>Dano/spawn</th><th>Estrutura/spawn</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${unitEsc(x.u.name)}</td><td>${unitEsc(x.u.fac)}</td><td>${x.appear}</td><td>${x.wins||0}</td><td>${x.losses||0}</td><td>${x.draws||0}</td><td>${unitPct(x.wins||0,x.appear)}</td><td>${unitPct(x.losses||0,x.appear)}</td><td>${x.spawns}</td><td>${Math.round(x.dmgPerSpawn)}</td><td>${Math.round(x.structPerSpawn)}</td></tr>`).join('')}</tbody></table>`;
}

function renderUnitBalance(){
  const db=readUnitBalance(),summary=document.querySelector('#bulkSummary'),el=document.querySelector('#unitLifetime');
  if(!summary||!el)return;
  summary.innerHTML=`<span class="badge">${db.batches} baterias</span><span class="badge">${db.matches.toLocaleString('pt-BR')} simulações</span><span class="badge">${Object.keys(db.units).length} unidades medidas</span>${db.updatedAt?`<span class="badge">atualizado ${new Date(db.updatedAt).toLocaleString()}</span>`:''}`;
  const arr=Object.values(db.units).filter(x=>x.appear>0).map(x=>({...x,wr:x.wins/x.appear,lr:x.losses/x.appear,dr:x.draws/x.appear,dmgPerSpawn:x.damage/Math.max(1,x.spawns),structPerSpawn:x.structure/Math.max(1,x.spawns)})).sort((a,b)=>b.wr-a.wr);
  if(!arr.length){el.className='muted';el.textContent='Nenhuma bateria acumulada ainda.';return}
  el.className='';
  el.innerHTML=`<table><thead><tr><th>Unidade</th><th>Facção</th><th>Jogos</th><th>V</th><th>D</th><th>E</th><th>Vitória</th><th>Derrota</th><th>Empate</th><th>Spawns</th><th>Dano/spawn</th><th>Estrutura/spawn</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${unitEsc(x.name)}</td><td>${unitEsc(x.fac)}</td><td>${x.appear.toLocaleString('pt-BR')}</td><td>${x.wins.toLocaleString('pt-BR')}</td><td>${x.losses.toLocaleString('pt-BR')}</td><td>${x.draws.toLocaleString('pt-BR')}</td><td>${unitPct(x.wins,x.appear)}</td><td>${unitPct(x.losses,x.appear)}</td><td>${unitPct(x.draws,x.appear)}</td><td>${x.spawns.toLocaleString('pt-BR')}</td><td>${Math.round(x.dmgPerSpawn)}</td><td>${Math.round(x.structPerSpawn)}</td></tr>`).join('')}</tbody></table>`;
}

function exportUnitBalance(){
  const db=readUnitBalance(),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`stick-lanes-balance-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

const clearUnit=document.querySelector('#clearUnitBalance');
if(clearUnit){
  const exportBtn=document.createElement('button');exportBtn.className='secondary';exportBtn.textContent='Exportar JSON';exportBtn.onclick=exportUnitBalance;clearUnit.parentElement.insertBefore(exportBtn,clearUnit);
  clearUnit.onclick=()=>{if(confirm('Zerar TODO o banco acumulado por unidade? Os snapshots individuais do histórico continuarão salvos.')){localStorage.removeItem(UNIT_BALANCE_KEY);renderUnitBalance()}};
}

// Mantém o render/salvamento anterior e, ao final, acumula a bateria no banco de longo prazo.
const __historyRender=render;
render=function(cands,stats){
  __historyRender(cands,stats);
  renderBatchUnitTable(stats);
  accumulateUnitBalance(stats,Number(document.querySelector('#matchCount')?.value||0));
  renderUnitBalance();
};

// Versão em lotes maiores para 5.000/10.000 partidas sem travar a interface por muito tempo.
async function bulkRun(){
  const total=Number(document.querySelector('#matchCount').value),n=Number(document.querySelector('#candidateCount').value),cands=generateCandidates(n),stats={},status=document.querySelector('#labStatus'),bar=document.querySelector('#progressBar'),button=document.querySelector('#runLab');
  button.disabled=true;document.querySelector('#bestComps').innerHTML='';document.querySelector('#unitTable').textContent='Simulando...';document.querySelector('#diagnostics').textContent='Analisando...';bar.style.width='0%';
  const prelim=Math.floor(total*.75);let done=0;
  for(let m=0;m<prelim;m++){
    let i=Math.floor(Math.random()*cands.length),j=Math.floor(Math.random()*(cands.length-1));if(j>=i)j++;
    const c1=cands[i],c2=cands[j],r=simMatch(c1,c2);updateComp(c1,r,1);updateComp(c2,r,-1);mergeMetrics(stats,r.A);mergeMetrics(stats,r.B);done++;
    if(m%50===0){bar.style.width=(done/total*100).toFixed(1)+'%';status.textContent=`Qualificatória: ${done.toLocaleString('pt-BR')}/${total.toLocaleString('pt-BR')} partidas • 10×`;await new Promise(requestAnimationFrame)}
  }
  const finalists=[...cands].sort((a,b)=>b.score-a.score).slice(0,Math.min(8,cands.length)),remain=total-prelim;
  for(let m=0;m<remain;m++){
    let i=Math.floor(Math.random()*finalists.length),j=Math.floor(Math.random()*(finalists.length-1));if(j>=i)j++;
    const c1=finalists[i],c2=finalists[j],r=simMatch(c1,c2);updateComp(c1,r,1);updateComp(c2,r,-1);mergeMetrics(stats,r.A);mergeMetrics(stats,r.B);done++;
    if(m%40===0){bar.style.width=(done/total*100).toFixed(1)+'%';status.textContent=`Finais: ${done.toLocaleString('pt-BR')}/${total.toLocaleString('pt-BR')} partidas • 10×`;await new Promise(requestAnimationFrame)}
  }
  bar.style.width='100%';status.textContent=`Concluído: ${total.toLocaleString('pt-BR')} partidas. Bateria salva e incorporada ao banco acumulado por unidade.`;render(cands,stats);button.disabled=false;
}

const matchSelect=document.querySelector('#matchCount'),runButton=document.querySelector('#runLab');
function refreshRunLabel(){if(runButton&&matchSelect)runButton.textContent=`Rodar ${Number(matchSelect.value).toLocaleString('pt-BR')} simulações`}
if(matchSelect)matchSelect.onchange=refreshRunLabel;
if(runButton)runButton.onclick=bulkRun;
refreshRunLabel();
renderUnitBalance();
