/* Stick Lanes — importação/validação de bancos de balanceamento */
'use strict';
(()=>{
const CURRENT_KEY='stickLanesBalanceFrontlineV3.v2';
const BACKUP_KEY='stickLanesBalanceFrontlineV3.importBackup.v2';
const LEGACY_KEY='stickLanesBalanceLegacyArchive.v2';
const btn=document.querySelector('#importUnitBalance');
const input=document.querySelector('#importBalanceFile');
const status=document.querySelector('#jsonStatus');
if(!btn||!input)return;

const FIELDS=['appear','wins','losses','draws','active','activeWins','activeLosses','activeDraws','spawns','impact','structure'];
const num=v=>{v=Number(v);return Number.isFinite(v)&&v>=0?v:0};
const say=(text,kind='muted')=>{if(!status)return;status.className=kind;status.textContent=text};
function blankDuration(){return{totalSeconds:0,completedSeconds:0,completedMatches:0,timedOutMatches:0,histogram:[0]}}
function normalizeDuration(src){
 const out=blankDuration();if(!src||typeof src!=='object')return out;
 out.totalSeconds=num(src.totalSeconds);out.completedSeconds=num(src.completedSeconds);
 out.completedMatches=Math.floor(num(src.completedMatches));out.timedOutMatches=Math.floor(num(src.timedOutMatches));
 if(Array.isArray(src.histogram)&&src.histogram.length){out.histogram=src.histogram.map(num)}
 return out
}
function currentLike(raw){
 if(!raw||typeof raw!=='object'||!raw.units||typeof raw.units!=='object')return false;
 if(String(raw.ruleset||'').startsWith('frontline-v3'))return true;
 return Object.values(raw.units).some(u=>u&&('active' in u||'impact' in u))
}
function legacyLike(raw){
 return !!(raw&&typeof raw==='object'&&raw.units&&typeof raw.units==='object'&&Object.values(raw.units).some(u=>u&&('damage' in u||'kills' in u||'deaths' in u)))
}
function normalizeProfiles(v){
 if(!Array.isArray(v))return[];
 return v.slice(0,500).map(p=>({
  pair:Array.isArray(p?.pair)?p.pair.map(String).slice(0,2):[],games:Math.floor(num(p?.games)),wins:Math.floor(num(p?.wins)),losses:Math.floor(num(p?.losses)),draws:Math.floor(num(p?.draws)),
  behavior:String(p?.behavior||'').slice(0,1000),policy:p?.policy&&typeof p.policy==='object'?Object.fromEntries(Object.entries(p.policy).filter(([,x])=>Number.isFinite(Number(x))).map(([k,x])=>[String(k),Number(x)])):{}
 }))
}
function normalizeCurrent(raw){
 const units={};
 for(const [key,src] of Object.entries(raw.units||{})){
   if(!src||typeof src!=='object')continue;
   const row={key:String(src.key||key),name:String(src.name||key.split('|').pop()||key),fac:String(src.fac||key.split('|')[0]||'')};
   for(const f of FIELDS)row[f]=num(src[f]);
   units[row.key]=row;
 }
 const matches=Math.floor(num(raw.matches));
 const duration=normalizeDuration(raw.duration);
 const counted=duration.completedMatches+duration.timedOutMatches;
 if(counted&&matches&&counted!==matches)throw new Error(`Duração inconsistente: ${counted} partidas medidas para ${matches} partidas no banco.`);
 const histTotal=duration.histogram.reduce((a,b)=>a+b,0);
 if(histTotal&&counted&&histTotal!==counted)throw new Error(`Histograma inconsistente: ${histTotal} registros para ${counted} partidas medidas.`);
 return{
   version:2,
   ruleset:String(raw.ruleset||'frontline-v3-import'),
   batches:Math.floor(num(raw.batches)),
   matches,
   duration,
   units,
   updatedAt:Math.floor(num(raw.updatedAt))||Date.now(),
   simulationMode:String(raw.simulationMode||''),
   noFixedTimeLimit:!!raw.noFixedTimeLimit,
   strategyProfiles:normalizeProfiles(raw.strategyProfiles)
 }
}
function archiveLegacy(raw,fileName){
 const archive={importedAt:Date.now(),fileName,reason:'schema legado não possui active/impact compatíveis com Frontline v3',data:raw};
 localStorage.setItem(LEGACY_KEY,JSON.stringify(archive));
 say('JSON antigo reconhecido e arquivado separadamente. Ele não foi somado ao banco atual porque as métricas não são equivalentes.','warning')
}
function archiveIncompatible(raw,fileName,currentRuleset){
 const source=String(raw.ruleset||'unknown'),safeRule=source.replace(/[^a-z0-9._-]+/gi,'_');
 const key=`stickLanesBalanceArchive.${safeRule}.${Date.now()}`;
 localStorage.setItem(key,JSON.stringify({importedAt:Date.now(),fileName,reason:`ruleset incompatível com ${currentRuleset}`,data:raw}));
 say(`JSON ${source} arquivado separadamente. Ele não substituiu o banco ${currentRuleset}, porque as regras das simulações não são comparáveis.`,'warning')
}
async function importFile(file){
 let raw;
 try{raw=JSON.parse(await file.text())}catch{say('Arquivo inválido: não é um JSON válido.','warning');return}
 if(legacyLike(raw)&&!currentLike(raw)){archiveLegacy(raw,file.name);return}
 if(!currentLike(raw)){say('JSON não reconhecido como banco de balanceamento do Stick Lanes.','warning');return}
 let normalized;
 try{normalized=normalizeCurrent(raw)}catch(err){say('JSON recusado: '+err.message,'warning');return}
 const currentRuleset=typeof SL_RULESET_VERSION!=='undefined'?String(SL_RULESET_VERSION):'';
 if(currentRuleset&&normalized.ruleset!==currentRuleset){archiveIncompatible(raw,file.name,currentRuleset);return}
 const current=localStorage.getItem(CURRENT_KEY);
 const strategyNote=normalized.strategyProfiles.length?`\n\nPerfis estratégicos: ${normalized.strategyProfiles.length}.`:'';
 const ok=confirm(`Importar ${normalized.matches.toLocaleString('pt-BR')} simulações e ${Object.keys(normalized.units).length} unidades?${current?'\n\nO banco local atual será salvo em backup antes da substituição.':''}${strategyNote}`);
 if(!ok){say('Importação cancelada.');return}
 if(current)localStorage.setItem(BACKUP_KEY,current);
 localStorage.setItem(CURRENT_KEY,JSON.stringify(normalized));
 if(typeof renderDatabase==='function')renderDatabase();
 say(`Importado: ${normalized.matches.toLocaleString('pt-BR')} simulações • ${Object.keys(normalized.units).length} unidades • ${normalized.strategyProfiles.length} perfis estratégicos • ${normalized.ruleset}.`,'good')
}
btn.onclick=()=>input.click();
input.onchange=()=>{const file=input.files&&input.files[0];if(file)importFile(file);input.value=''};
})();
