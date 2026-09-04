/* Stick Lanes — draft visível da Simulação Assistida v1
   Sequência: 1ª facção -> 2 bans de tropas -> bans globais de facção ->
   2ª facção -> mais 2 bans -> decks -> sorteio de posição -> fluxo inicial.
   A matemática fina das decisões de draft fica deliberadamente simples por ora;
   o objetivo desta versão é tornar o processo real, visível e reproduzível. */
'use strict';
(function boot(){
 if(typeof launchBattle!=='function'||typeof buildAIDeck!=='function'||!window.SL_FACTIONS||!window.SL_FACTION_ORDER){setTimeout(boot,40);return}
 if(window.SL_ASSISTED_DRAFT?.version>=1)return;

 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const pick=a=>a[Math.floor(Math.random()*a.length)];
 const names={orange:'Laranja',red:'Vermelho'};
 let activeDraft=null,draftSeq=0;

 function cloneUnit(x){return{fac:x.fac,u:x.u}}
 function unitKey(x){return x.fac+'|'+x.u.name}
 function value(x){try{return unitValue(x.u)}catch{return (x.u.atk||1)*(x.u.hp||1)/(Math.max(1,x.u.cost||1)*100)}}
 function factionPool(f){return (FACTIONS[f]||[]).map(u=>({fac:f,u}))}
 function availableFactions(exclude=[]){return SL_FACTION_ORDER.filter(f=>!exclude.includes(f))}
 function drawFaction(exclude=[]){const a=availableFactions(exclude);return a.length?pick(a):pick(SL_FACTION_ORDER)}
 function topUnits(factions,banned=new Set(),n=2){
   return factions.flatMap(factionPool).filter(x=>!banned.has(unitKey(x))).sort((a,b)=>value(b)-value(a)).slice(0,n)
 }
 function factionStrength(f){const a=factionPool(f).sort((x,y)=>value(y)-value(x)).slice(0,5);return a.reduce((s,x)=>s+value(x),0)/Math.max(1,a.length)}
 function chooseFactionBan(exclude){
   return availableFactions(exclude).sort((a,b)=>factionStrength(b)-factionStrength(a))[0]||drawFaction(exclude)
 }
 function buildFilteredDeck(team){
   const pool=team.factions.flatMap(factionPool).filter(x=>!team.bannedUnits.has(unitKey(x))),picked=[];
   for(const role of ['tank','ranged','support','controller','siege']){
     const x=pool.filter(v=>v.u.role===role&&!picked.includes(v)).sort((a,b)=>value(b)-value(a))[0];if(x)picked.push(x)
   }
   for(const x of [...pool].sort((a,b)=>value(b)-value(a)))if(picked.length<8&&!picked.includes(x))picked.push(x);
   return picked.slice(0,8).map(cloneUnit)
 }
 function chooseFlow(deck){
   const front=deck.filter(x=>['tank','fighter','bruiser'].includes(x.u.role)).length;
   const back=deck.filter(x=>['ranged','siege','support','controller'].includes(x.u.role)).length;
   const dive=deck.filter(x=>['assassin','skirmisher'].includes(x.u.role)).length;
   if(back>=5)return{weights:[1,3,1],reason:'muita retaguarda: concentração central provisória'};
   if(front>=5)return{weights:[2,1,2],reason:'muita linha de frente: pressão pelas duas laterais'};
   if(dive>=2)return{weights:[2,1,2],reason:'duas ameaças móveis: laterais abertas'};
   const variants=[[2,2,1],[1,2,2],[2,1,2],[1,3,1]];return{weights:pick(variants).slice(),reason:'composição híbrida: distribuição provisória'}
 }
 function team(color){return{color,name:names[color],factions:[],bannedUnits:new Set(),bansMade:[],factionBan:null,deck:[],flow:null,seat:null}}
 function makeDraft(){return{id:++draftSeq,globalFactionBans:new Set(),orange:team('orange'),red:team('red'),completed:false,startedAt:Date.now()}}

 function ensureUI(){
   let el=document.querySelector('#assistedDraftOverlay');if(el)return el;
   const style=document.createElement('style');style.textContent=`
   #assistedDraftOverlay{position:fixed;inset:0;z-index:10000;background:rgba(5,8,12,.96);display:flex;align-items:center;justify-content:center;padding:14px;color:#eef4f6;font-family:system-ui,sans-serif}
   #assistedDraftOverlay[hidden]{display:none}.slDraftBox{width:min(980px,100%);max-height:94vh;overflow:auto;background:#111820;border:1px solid #42505a;border-radius:18px;padding:16px;box-shadow:0 24px 80px #000}
   .slDraftHead{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:12px}.slDraftHead h2{margin:0;font-size:clamp(20px,4vw,30px)}.slDraftHead small{color:#aebac1}
   .slDraftTeams{display:grid;grid-template-columns:1fr 1fr;gap:10px}.slDraftTeam{background:#182129;border-radius:14px;padding:12px;min-height:150px;border:1px solid #33414a}.slDraftTeam.orange{border-color:#b06a32}.slDraftTeam.red{border-color:#a94343}
   .slDraftTeam h3{margin:0 0 8px}.slDraftLine{font-size:13px;line-height:1.4;margin:5px 0}.slDraftLog{margin-top:12px;display:grid;gap:6px}.slDraftStep{background:#0d1318;border-left:3px solid #6d7d86;padding:8px 10px;border-radius:7px;font-size:13px}.slDraftStep strong{color:#fff}.slDraftFooter{margin-top:12px;color:#aebac1;font-size:12px}
   @media(max-width:620px){.slDraftTeams{grid-template-columns:1fr}.slDraftBox{padding:12px}.slDraftTeam{min-height:0}}
   `;document.head.appendChild(style);
   el=document.createElement('div');el.id='assistedDraftOverlay';el.hidden=true;el.innerHTML=`<div class="slDraftBox"><div class="slDraftHead"><div><small>SIMULAÇÃO ASSISTIDA</small><h2>Draft das IAs</h2></div><small id="slDraftPhase">Preparando…</small></div><div class="slDraftTeams"><section class="slDraftTeam red" data-team="red"></section><section class="slDraftTeam orange" data-team="orange"></section></div><div class="slDraftLog" id="slDraftLog"></div><div class="slDraftFooter">Os bans e escolhas abaixo são aplicados à partida real. A heurística matemática do draft ainda é provisória.</div></div>`;document.body.appendChild(el);return el
 }
 function teamHTML(t){
   const bans=t.bansMade.length?t.bansMade.map(x=>x.u.name).join(', '):'—';
   const fac=t.factions.length?t.factions.join(' + '):'—';
   const deck=t.deck.length?t.deck.map(x=>x.u.name).join(', '):'—';
   return `<h3>IA ${t.name}</h3><div class="slDraftLine"><b>Facções:</b> ${fac}</div><div class="slDraftLine"><b>Bans de tropas feitos:</b> ${bans}</div><div class="slDraftLine"><b>Facção banida:</b> ${t.factionBan||'—'}</div><div class="slDraftLine"><b>Posição:</b> ${t.seat? (t.seat==='upper'?'Cima':'Baixo'):'—'}</div><div class="slDraftLine"><b>Fluxo:</b> ${t.flow?t.flow.weights.join('-'):'—'}</div>${t.deck.length?`<div class="slDraftLine"><b>8 tropas:</b> ${deck}</div>`:''}`
 }
 function render(d,phase){const el=ensureUI();el.hidden=false;el.querySelector('#slDraftPhase').textContent=phase;for(const c of['red','orange'])el.querySelector(`[data-team="${c}"]`).innerHTML=teamHTML(d[c])}
 function log(text){const el=ensureUI().querySelector('#slDraftLog'),d=document.createElement('div');d.className='slDraftStep';d.innerHTML=text;el.appendChild(d);el.scrollIntoView({block:'nearest'});return d}
 function banTroops(actor,target,phase){
   const source=phase===1?[target.factions[0]]:target.factions;
   const picked=topUnits(source,target.bannedUnits,2);
   for(const x of picked){target.bannedUnits.add(unitKey(x));actor.bansMade.push(x)}return picked
 }

 async function runDraft(){
   const d=makeDraft();activeDraft=d;window.SL_ASSISTED_DRAFT_STATE=d;
   const ui=ensureUI();ui.querySelector('#slDraftLog').innerHTML='';render(d,'1ª facção');
   d.red.factions=[drawFaction()];log(`<strong>Vermelho</strong> sorteou ${d.red.factions[0]}.`);render(d,'1ª facção');await sleep(140);
   d.orange.factions=[drawFaction(d.red.factions)];log(`<strong>Laranja</strong> sorteou ${d.orange.factions[0]}.`);render(d,'Primeiros bans');await sleep(140);

   let b=banTroops(d.red,d.orange,1);log(`<strong>Vermelho</strong> baniu de Laranja: ${b.map(x=>x.u.name).join(' e ')}.`);render(d,'Primeiros bans');await sleep(140);
   b=banTroops(d.orange,d.red,1);log(`<strong>Laranja</strong> baniu de Vermelho: ${b.map(x=>x.u.name).join(' e ')}.`);render(d,'Ban de facções');await sleep(140);

   const occupied=[...d.red.factions,...d.orange.factions];
   d.red.factionBan=chooseFactionBan([...occupied,...d.globalFactionBans]);d.globalFactionBans.add(d.red.factionBan);log(`<strong>Vermelho</strong> baniu a facção ${d.red.factionBan} para os dois lados.`);render(d,'Ban de facções');await sleep(140);
   d.orange.factionBan=chooseFactionBan([...occupied,...d.globalFactionBans]);d.globalFactionBans.add(d.orange.factionBan);log(`<strong>Laranja</strong> baniu a facção ${d.orange.factionBan} para os dois lados.`);render(d,'2ª facção');await sleep(140);

   let excluded=[...d.globalFactionBans,...d.red.factions,...d.orange.factions];
   d.red.factions.push(drawFaction(excluded));log(`<strong>Vermelho</strong> sorteou a 2ª facção: ${d.red.factions[1]}.`);render(d,'2ª facção');await sleep(140);
   excluded=[...d.globalFactionBans,...d.red.factions,...d.orange.factions];
   d.orange.factions.push(drawFaction(excluded));log(`<strong>Laranja</strong> sorteou a 2ª facção: ${d.orange.factions[1]}.`);render(d,'Segundos bans');await sleep(140);

   b=banTroops(d.red,d.orange,2);log(`<strong>Vermelho</strong> fez os 2 bans finais: ${b.map(x=>x.u.name).join(' e ')}.`);render(d,'Segundos bans');await sleep(140);
   b=banTroops(d.orange,d.red,2);log(`<strong>Laranja</strong> fez os 2 bans finais: ${b.map(x=>x.u.name).join(' e ')}.`);render(d,'Montando exércitos');await sleep(140);

   d.red.deck=buildFilteredDeck(d.red);d.orange.deck=buildFilteredDeck(d.orange);
   log(`<strong>Exércitos fechados:</strong> cada IA selecionou 8 tropas respeitando os quatro bans recebidos.`);render(d,'Sorteio de posição');await sleep(140);

   const orangeUpper=Math.random()<.5;d.orange.seat=orangeUpper?'upper':'lower';d.red.seat=orangeUpper?'lower':'upper';
   log(`<strong>Sorteio final:</strong> Laranja joga ${orangeUpper?'em cima':'embaixo'}; Vermelho joga ${orangeUpper?'embaixo':'em cima'}.`);render(d,'Escolha do fluxo');await sleep(140);

   d.red.flow=chooseFlow(d.red.deck);d.orange.flow=chooseFlow(d.orange.deck);
   log(`<strong>Fluxo Vermelho:</strong> ${d.red.flow.weights.join('-')} — ${d.red.flow.reason}.`);await sleep(100);
   log(`<strong>Fluxo Laranja:</strong> ${d.orange.flow.weights.join('-')} — ${d.orange.flow.reason}.`);render(d,'Draft concluído');await sleep(220);
   d.completed=true;window.SL_ASSISTED_DRAFT_FINAL=d;return d
 }

 const rawConfigure=configureBattlePlan;
 configureBattlePlan=function(mode){
   rawConfigure(mode);const d=window.SL_ASSISTED_DRAFT_FINAL;if(mode!=='robot'||!d?.completed)return;
   sideSpawnWeights[1]=d.orange.flow.weights.slice();sideSpawnWeights[-1]=d.red.flow.weights.slice();
   sideLegendFocus[1]=d.orange.seat==='upper'?0:2;sideLegendFocus[-1]=d.red.seat==='upper'?0:2
 };
 const rawReset=reset;
 reset=function(){
   const r=rawReset();const d=window.SL_ASSISTED_DRAFT_FINAL;if(gameMode==='robot'&&d?.completed){
     enemyFactions=d.red.factions.slice();enemyLoadout=d.red.deck.map(cloneUnit);sideFactions={1:d.orange.factions.slice(),'-1':d.red.factions.slice()};
     sideSpawnWeights[1]=d.orange.flow.weights.slice();sideSpawnWeights[-1]=d.red.flow.weights.slice();
     sideLegendFocus[1]=d.orange.seat==='upper'?0:2;sideLegendFocus[-1]=d.red.seat==='upper'?0:2
   }return r
 };

 const button=document.querySelector('#menuRobots');
 if(button)button.onclick=async()=>{
   if(button.disabled)return;button.disabled=true;
   try{
     const d=await runDraft();ensureUI().hidden=true;
     f1.value=d.orange.factions[0];f2.value=d.orange.factions[1];
     launchBattle('robot',d.orange.factions.slice(),d.orange.deck.map(cloneUnit));
     // Re-render para o HUD mostrar o fluxo que saiu do draft, não um valor antigo.
     sideSpawnWeights[1]=d.orange.flow.weights.slice();sideSpawnWeights[-1]=d.red.flow.weights.slice();buildUI();
   }finally{button.disabled=false}
 };

 function health(){const d=window.SL_ASSISTED_DRAFT_FINAL;return{loaded:true,version:1,active:!!activeDraft,completed:!!d?.completed,globalFactionBans:d?[...d.globalFactionBans]:[],orange:d?{factions:d.orange.factions,bannedReceived:[...d.orange.bannedUnits],flow:d.orange.flow?.weights,seat:d.orange.seat,deck:d.orange.deck.map(unitKey)}:null,red:d?{factions:d.red.factions,bannedReceived:[...d.red.bannedUnits],flow:d.red.flow?.weights,seat:d.red.seat,deck:d.red.deck.map(unitKey)}:null}}
 window.SL_ASSISTED_DRAFT={version:1,runDraft,health,get:()=>window.SL_ASSISTED_DRAFT_FINAL};
})();
