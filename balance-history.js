const LAB_HISTORY_KEY='stickLanesLabResults.v1';
const LAB_HISTORY_LIMIT=20;

function readLabHistory(){try{let v=JSON.parse(localStorage.getItem(LAB_HISTORY_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function writeLabHistory(v){localStorage.setItem(LAB_HISTORY_KEY,JSON.stringify(v.slice(0,LAB_HISTORY_LIMIT)))}
function hEsc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function hPct(n){return (Number(n||0)*100).toFixed(1)+'%'}

function makeLabSnapshot(cands,stats){
  let ranked=[...cands].filter(c=>c.games).sort((a,b)=>b.score-a.score).slice(0,8);
  let units=Object.values(stats).filter(x=>x.appear>=4).map(x=>({
    key:x.u.key,name:x.u.name,fac:x.u.fac,appear:x.appear,wins:x.wins,spawns:x.spawns,
    damage:x.damage,structure:x.structure,kills:x.kills,deaths:x.deaths,
    wr:x.wins/Math.max(1,x.appear),dmgPerSpawn:x.damage/Math.max(1,x.spawns),structPerSpawn:x.structure/Math.max(1,x.spawns)
  })).sort((a,b)=>b.wr-a.wr);
  return{
    id:String(Date.now())+'-'+Math.random().toString(36).slice(2,7),
    savedAt:Date.now(),
    matches:Number(document.querySelector('#matchCount')?.value||0),
    candidates:Number(document.querySelector('#candidateCount')?.value||0),
    top:ranked.map(c=>({pair:[...c.pair],games:c.games,wins:c.wins,draws:c.draws,score:c.score,baseDiff:c.baseDiff,units:c.units.map(u=>({key:u.key,name:u.name,fac:u.fac}))})),
    units
  };
}

function saveLabSnapshot(cands,stats){
  let snap=makeLabSnapshot(cands,stats),history=readLabHistory();
  history.unshift(snap);writeLabHistory(history);renderLabHistory();
  let st=document.querySelector('#labStatus');if(st&&!st.textContent.includes('salvo localmente'))st.textContent+=' • salvo localmente';
}

function diagnosticHtml(arr){
  let op=arr.filter(x=>x.appear>=8&&x.wr>=.60).slice(0,5),weak=[...arr].reverse().filter(x=>x.appear>=8&&x.wr<=.40).slice(0,5);
  return `<p><strong class="warning">Suspeitos de fortes:</strong> ${op.length?op.map(x=>`${hEsc(x.name)} (${hPct(x.wr)})`).join(', '):'nenhum sinal forte ainda'}</p><p><strong class="good">Suspeitos de fracos:</strong> ${weak.length?weak.map(x=>`${hEsc(x.name)} (${hPct(x.wr)})`).join(', '):'nenhum sinal forte ainda'}</p><p class="muted">Win rate aqui significa: taxa de vitória das composições que continham a unidade. Composição e pareamento influenciam.</p>`;
}

function showLabSnapshot(id){
  let snap=readLabHistory().find(x=>x.id===id);if(!snap)return;
  window.__labComps=snap.top.map(c=>({pair:c.pair,units:c.units.map(u=>({key:u.key,name:u.name,fac:u.fac}))}));
  document.querySelector('#bestComps').innerHTML=snap.top.map((c,i)=>{let wr=(c.wins+c.draws*.5)/Math.max(1,c.games);return `<div class="compCard"><strong>#${i+1} ${hEsc(c.pair.join(' + '))}</strong> <span class="badge">${hPct(wr)}</span><div class="compUnits">${c.units.map(u=>hEsc(u.name)).join(' • ')}</div><button class="secondary" onclick="saveLabComp(${i})">Salvar no jogo</button></div>`}).join('');
  document.querySelector('#diagnostics').innerHTML=diagnosticHtml(snap.units);
  document.querySelector('#unitTable').innerHTML=`<table><thead><tr><th>Unidade</th><th>Facção</th><th>Presenças</th><th>Win rate</th><th>Spawns</th><th>Dano/spawn</th><th>Estrutura/spawn</th><th>Leitura</th></tr></thead><tbody>${snap.units.map(x=>{let label=x.wr>=.60?'forte?':x.wr<=.40?'fraca?':'ok',w=Math.max(0,Math.min(100,x.wr*100));return `<tr><td>${hEsc(x.name)}</td><td>${hEsc(x.fac)}</td><td>${x.appear}</td><td><div class="meter"><i style="width:${w}%"></i></div>${hPct(x.wr)}</td><td>${x.spawns}</td><td>${Math.round(x.dmgPerSpawn)}</td><td>${Math.round(x.structPerSpawn)}</td><td>${label}</td></tr>`}).join('')}</tbody></table>`;
  let d=new Date(snap.savedAt);document.querySelector('#labStatus').textContent=`Resultado salvo carregado: ${snap.matches} partidas • ${d.toLocaleString()}`;
  window.scrollTo({top:0,behavior:'smooth'});
}
window.showLabSnapshot=showLabSnapshot;

function deleteLabSnapshot(id){writeLabHistory(readLabHistory().filter(x=>x.id!==id));renderLabHistory()}
window.deleteLabSnapshot=deleteLabSnapshot;

function renderLabHistory(){
  let el=document.querySelector('#labHistory');if(!el)return;let history=readLabHistory();
  if(!history.length){el.className='muted';el.textContent='Nenhum resultado salvo ainda.';return}
  el.className='';el.innerHTML=history.map((x,i)=>{let d=new Date(x.savedAt),best=x.top?.[0],wr=best?(best.wins+best.draws*.5)/Math.max(1,best.games):0;return `<div class="compCard"><strong>#${history.length-i} • ${x.matches} partidas</strong>${best?` <span class="badge">melhor ${hPct(wr)}</span>`:''}<div class="historyMeta">${hEsc(d.toLocaleString())} • ${x.candidates} candidatas${best?' • '+hEsc(best.pair.join(' + ')):''}</div>${best?`<div class="compUnits">${best.units.map(u=>hEsc(u.name)).join(' • ')}</div>`:''}<div class="historyActions"><button class="secondary" onclick="showLabSnapshot('${x.id}')">Abrir resultado</button><button class="secondary" onclick="deleteLabSnapshot('${x.id}')">Excluir</button></div></div>`}).join('');
}

let clear=document.querySelector('#clearLabHistory');if(clear)clear.onclick=()=>{if(confirm('Apagar todos os resultados salvos do laboratório neste navegador?')){localStorage.removeItem(LAB_HISTORY_KEY);renderLabHistory()}};

const originalLabRender=render;
render=function(cands,stats){originalLabRender(cands,stats);saveLabSnapshot(cands,stats)};
renderLabHistory();
