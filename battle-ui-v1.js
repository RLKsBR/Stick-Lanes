/* Stick Lanes — painel de comando da Lenda + inspeção contextual v1
   Um botão geral controla Automático/Top/Mid/Bot e expande os quatro buffs.
   Toques em torres, Lendas, tropas e minions exibem atributos atuais sem
   remover o comando contextual já existente para alvos inimigos. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2, tactical=window.SL_TACTICAL_TARGETING;
if(!map||!tactical)return;
const PLAYER=1,UNIT_RADIUS=105,LEGEND_RADIUS=145,STRUCTURE_RADIUS=125,STRUCTURE_CORE=72,LEGEND_OVERRIDE=55;
let dock=null,menu=null,buffMenu=null,inspector=null,selected=null;

const clampUI=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(v,d=0)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
const sideLabel=side=>side===PLAYER?'ALIADO':'INIMIGO';
function livingLegend(){return units.find(u=>!u.dead&&u.side===PLAYER&&u.special?.legend)||null}
function clearManual(u){
 delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.manualBuff;delete u.tacticalDestination
}
function currentProgress(u){
 const p=map.unitPos(u),near=map.nearestRoutePoint(p);return clampUI(near?.t??.5,.04,.96)
}
function laneTarget(lane){
 const legend=livingLegend();if(!legend)return null;const t=currentProgress(legend),world=map.routePoint(lane,t),x=BASE_X[1]+t*(BASE_X[-1]-BASE_X[1]);
 return{kind:'point',lane,x,t,world:{x:world.x,y:world.y}}
}
function sendLane(lane){const target=laneTarget(lane);if(target)tactical.commandLegend(target);closeMenus()}
function setAutomatic(){
 const legend=livingLegend();if(!legend)return;
 clearManual(legend);
 if(legend.tacticalWorld){
   const near=map.nearestRoutePoint(map.unitPos(legend)),lane=near.lane,t=clampUI(near.t,.04,.96),p=map.routePoint(lane,t),x=BASE_X[1]+t*(BASE_X[-1]-BASE_X[1]);
   legend.slAutoReturn={lane,t,x,world:{x:p.x,y:p.y}};
 }else delete legend.slAutoReturn;
 closeMenus()
}
function sendBuff(id){
 const zone=window.SL_BUFF_SYSTEM?.zones?.find(z=>z.id===id)||map.buffZones?.find(z=>z.id===id);if(!zone)return;
 tactical.commandLegend({kind:'buff',buff:zone,lane:null,x:null,world:{x:zone.x,y:zone.y}});closeMenus()
}
function closeMenus(){if(menu)menu.hidden=true;if(buffMenu)buffMenu.hidden=true}

function ensureDock(){
 if(dock)return;
 dock=document.createElement('div');dock.id='legendCommandDock';dock.className='legendCommandDock panel';
 dock.innerHTML='<button class="legendMaster" type="button">LENDA <span>▾</span></button><div class="legendCommandMenu" hidden><button type="button" data-legend-auto>Automático</button><div class="legendLaneRow"><button type="button" data-legend-lane="0">Top</button><button type="button" data-legend-lane="1">Mid</button><button type="button" data-legend-lane="2">Bot</button></div><button class="legendBuffToggle" type="button" data-buff-toggle>Buffs <span>▸</span></button><div class="legendBuffMenu" hidden><button type="button" data-buff="buff1">B1</button><button type="button" data-buff="buff2">B2</button><button type="button" data-buff="buff3">B3</button><button type="button" data-buff="buff4">B4</button></div></div>';
 document.querySelector('#gameUI')?.appendChild(dock);menu=dock.querySelector('.legendCommandMenu');buffMenu=dock.querySelector('.legendBuffMenu');
 dock.querySelector('.legendMaster').onclick=()=>{menu.hidden=!menu.hidden;if(menu.hidden)buffMenu.hidden=true};
 dock.querySelector('[data-legend-auto]').onclick=setAutomatic;
 dock.querySelectorAll('[data-legend-lane]').forEach(b=>b.onclick=()=>sendLane(Number(b.dataset.legendLane)));
 dock.querySelector('[data-buff-toggle]').onclick=()=>{buffMenu.hidden=!buffMenu.hidden};
 dock.querySelectorAll('[data-buff]').forEach(b=>b.onclick=()=>sendBuff(b.dataset.buff));
}
function refreshDock(){
 ensureDock();if(!dock)return;dock.hidden=gameMode==='robot';const legend=livingLegend();dock.querySelectorAll('button').forEach(b=>{if(!b.matches('[data-buff]'))b.disabled=!legend});
 const api=window.SL_BUFF_SYSTEM;dock.querySelectorAll('[data-buff]').forEach(b=>{const zone=api?.zones?.find(z=>z.id===b.dataset.buff),state=zone&&api?.zoneState?.(zone.id,simTime),ready=!!legend&&!!zone&&(!api.canCapture||api.canCapture(zone,simTime));b.disabled=!ready;b.title=state?.def?.name?`${state.def.name} • ${state.label||''}`:(state?.label||b.dataset.buff.toUpperCase())})
}

/* Automático saindo da jungle: volta fisicamente à lane mais próxima e então
   libera a unidade para o comportamento padrão da lane, sem teleporte. */
const previousHandleUnit=tactical.handleUnit;
tactical.handleUnit=function(u,dt,t){
 if(u?.side===PLAYER&&u.special?.legend&&u.slAutoReturn&&u.tacticalWorld){
   const target=u.slAutoReturn,w=target.world,a=u.tacticalWorld,dx=w.x-a.x,dy=w.y-a.y,d=Math.hypot(dx,dy),routeScale=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),speed=Math.max(55,u.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*routeScale),step=Math.min(d,speed*dt);
   if(d>14){a.x+=dx/d*step;a.y+=dy/d*step;a.a=Math.atan2(dy,dx);u.lastMoved=t;return true}
   delete u.tacticalWorld;delete u.tacticalDestination;delete u.slAutoReturn;clearManual(u);u.lane=target.lane;u.x=target.x;u.sub=0;u.subTarget=0;return false
 }
 return previousHandleUnit(u,dt,t)
};

function unitHit(world){
 let best=null,bestDistance=Infinity,bestScore=Infinity;
 for(const u of units){if(u.dead)continue;const p=map.unitPos(u),d=Math.hypot(p.x-world.x,p.y-world.y),legend=!!u.special?.legend,limit=legend?LEGEND_RADIUS:UNIT_RADIUS;if(d>limit)continue;const score=d-(legend&&d<=90?34:0);if(score<bestScore){best=u;bestDistance=d;bestScore=score}}
 return best?{kind:'unit',object:best,distance:bestDistance}:null
}
function structureHit(world){
 let best=null,distance=Infinity;for(const s of structures){if(s.dead)continue;const p=map.structurePos(s),d=Math.hypot(p.x-world.x,p.y-world.y);if(d<distance){best=s;distance=d}}
 return best&&distance<=STRUCTURE_RADIUS?{kind:'structure',object:best,distance}:null
}
function inspectableAt(world){
 const u=unitHit(world),s=structureHit(world),preciseLegend=u?.object?.special?.legend&&u.distance<=LEGEND_OVERRIDE;
 if(preciseLegend)return u;if(s&&s.distance<=STRUCTURE_CORE)return s;if(u)return u;if(s)return s;return null
}
function unitType(u){if(u.special?.legend)return'LENDA';if(u.minion)return`MINION • ${(u.minionType||u.role||'').toUpperCase()}`;return`TROPA • ${(u.role||'').toUpperCase()}`}
function movementValue(u){let m=1,api=window.SL_BUFF_SYSTEM;if(api?.hasBuff?.(u.side,'buff1',simTime))m+=Number(api.defs?.buff1?.move)||.12;return u.speed*m}
function attackSpeedValue(u){try{return 1/attackRate(u)}catch(_){return 1/Math.max(.01,u.rate||1)}}
function unitStats(u){
 const rows=[['VIDA',`${Math.max(0,Math.ceil(u.hp))} / ${Math.ceil(u.maxHp)}`],['DEFESA',fmt(u.def,0)],['DANO',fmt(u.atk,0)],['ALCANCE',fmt(u.range,1)],['MOVIMENTO',fmt(movementValue(u),2)],['VEL. ATAQUE',`${fmt(attackSpeedValue(u),2)}/s`]];
 if(u.special?.legend){rows.unshift(['NÍVEL',String(u.legendLevel||1)]);const xp=Number(u.legendXp??u.legendXP??u.xp);if(Number.isFinite(xp))rows.splice(1,0,['XP',fmt(xp,0)]);if(Number.isFinite(u.shellHp)||Number.isFinite(u.carapaceHp))rows.push(['CARAPAÇA',fmt(u.shellHp??u.carapaceHp,0)])}
 return rows
}
function structureDefense(s){
 if(Number.isFinite(s.def))return fmt(s.def,0);if(s.fortified&&COMBAT?.siege?.fortifiedDamageTaken!=null)return`${Math.round((1-COMBAT.siege.fortifiedDamageTaken)*100)}% redução`;return'0% redução'
}
function structureStats(s){return[['VIDA',`${Math.max(0,Math.ceil(s.hp))} / ${Math.ceil(s.maxHp)}`],['DEFESA',structureDefense(s)],['DANO',fmt(s.atk,0)],['ALCANCE',fmt(s.range,1)],['VEL. ATAQUE',`${fmt(1/Math.max(.01,s.rate||1),2)}/s`]]}
function titleFor(sel){const o=sel.object;if(sel.kind==='structure')return o.label|| (o.auxiliary?'Torreta':'Torre');return o.name||'Unidade'}
function subtitleFor(sel){const o=sel.object;if(sel.kind==='structure')return`${sideLabel(o.side)} • ${o.auxiliary?'TORRETA':'TORRE'}`;return`${sideLabel(o.side)} • ${unitType(o)}`}
function ensureInspector(){
 if(inspector)return;inspector=document.createElement('section');inspector.id='battleInspector';inspector.className='battleInspector panel';inspector.hidden=true;inspector.innerHTML='<button class="inspectorClose" type="button" aria-label="Fechar">×</button><strong class="inspectorTitle"></strong><small class="inspectorSubtitle"></small><div class="inspectorStats"></div>';document.querySelector('#gameUI')?.appendChild(inspector);inspector.querySelector('.inspectorClose').onclick=()=>{selected=null;inspector.hidden=true}
}
function renderInspector(){
 ensureInspector();if(!selected||!inspector)return;if(selected.object?.dead){selected=null;inspector.hidden=true;return}inspector.hidden=false;inspector.querySelector('.inspectorTitle').textContent=titleFor(selected);inspector.querySelector('.inspectorSubtitle').textContent=subtitleFor(selected);const rows=selected.kind==='structure'?structureStats(selected.object):unitStats(selected.object);inspector.querySelector('.inspectorStats').innerHTML=rows.map(([k,v])=>`<span><small>${k}</small><b>${v}</b></span>`).join('')
}
function inspectTap(tap){const hit=inspectableAt(tap.world);if(hit){selected=hit;renderInspector();return hit}selected=null;if(inspector)inspector.hidden=true;return null}

const previousMapTap=tactical.handleMapTap;
tactical.handleMapTap=function(tap){
 if(gameMode==='robot')return previousMapTap(tap);const hit=inspectTap(tap);
 /* Aliados são apenas inspecionados. Inimigos continuam passando pelo comando
    contextual normal: selecionar também significa focar o alvo. */
 if(hit&&hit.object?.side===PLAYER)return true;
 return previousMapTap(tap)
};

ensureDock();ensureInspector();
setInterval(()=>{refreshDock();if(selected)renderInspector()},250);
window.SL_BATTLE_UI={inspectAt:inspectableAt,inspectTap,setAutomatic,sendLane,sendBuff,get selected(){return selected},health(){return{dock:!!dock,inspector:!!inspector,buffs:dock?.querySelectorAll('[data-buff]').length||0}}};
})();