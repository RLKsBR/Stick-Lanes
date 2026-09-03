/* Stick Lanes — comandos contextuais de alvo v1
   Tropas permanecem na lane; Lendas podem atravessar o mapa e ocupar buffs. */
'use strict';
(function(){
const PLAYER=1,LANE_HIT_RADIUS=285,STRUCTURE_HIT_RADIUS=125;
const map=window.SL_MOBA_SQUARE_V2;
if(!map)return;
let activeMarker=null,menu=null,quickBar=null;

function playerLegends(){return units.filter(u=>!u.dead&&u.side===PLAYER&&!u.minion&&u.special?.legend)}
function playerTroops(lane){return units.filter(u=>!u.dead&&u.side===PLAYER&&u.lane===lane&&!u.minion&&!u.special?.legend&&!u.tacticalWorld)}
function targetWorld(target){
 if(target.structure){const s=structures.find(x=>x.id===target.structure.id);if(s)return map.structurePos(s)}
 return target.world
}
function targetLabel(target){
 if(target.kind==='buff')return`Buff ${target.buff.id}`;
 if(target.structure)return target.structure.label||'Estrutura';
 return['Top','Mid','Bot'][target.lane]+' — posição'
}
function clearManual(u){delete u.manualTargetId;delete u.manualHold;delete u.tacticalDestination;delete u.manualBuff}
function assignLaneTarget(u,target){
 clearManual(u);u.lane=target.lane;
 if(target.structure&&target.structure.side!==u.side)u.manualTargetId=target.structure.id;
 else u.manualHold={lane:target.lane,x:target.x,world:target.world}
}
function beginLegendTravel(u,target){
 let start=map.unitPos(u);clearManual(u);u.tacticalWorld={x:start.x,y:start.y,a:start.a||0};u.tacticalDestination={...target,world:{...target.world}}
}
function commandLegend(target){
 let legend=playerLegends()[0];if(!legend)return false;
 if(target.kind==='buff'||legend.lane!==target.lane||legend.tacticalWorld)beginLegendTravel(legend,target);else assignLaneTarget(legend,target);
 activeMarker={group:'LENDA',target,color:'#8fd9c0'};return true
}
function commandTroops(target){
 if(target.kind==='buff')return false;let troop=playerTroops(target.lane);if(!troop.length)return false;
 troop.forEach(u=>assignLaneTarget(u,target));activeMarker={group:'TROPAS',target,color:'#f1d18a'};return true
}
function closeMenu(){if(menu)menu.hidden=true}
function ensureMenu(){
 if(menu)return menu;menu=document.createElement('div');menu.id='tacticalCommandMenu';menu.className='tacticalCommandMenu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Escolher quem recebe o comando');document.body.appendChild(menu);return menu
}
function openMenu(target,client){
 const el=ensureMenu(),hasLegend=playerLegends().length>0,hasTroop=target.kind!=='buff'&&playerTroops(target.lane).length>0;
 el.innerHTML=`<strong>${targetLabel(target)}</strong><small>${target.structure&&target.structure.side!==PLAYER?'Focar alvo':'Mover para o local'}</small><div class="tacticalChoices"><button data-group="legend" ${hasLegend?'':'disabled'}>Lenda</button>${target.kind==='buff'?'':`<button data-group="troops" ${hasTroop?'':'disabled'}>Tropas</button>`}</div>${hasLegend?'':'<em>Nenhuma Lenda em campo</em>'}`;
 el.style.left=Math.min(innerWidth-176,Math.max(8,client.x+10))+'px';el.style.top=Math.min(innerHeight-130,Math.max(8,client.y-24))+'px';el.hidden=false;
 el.querySelectorAll('button').forEach(button=>button.onclick=()=>{let ok=button.dataset.group==='legend'?commandLegend(target):commandTroops(target);if(ok)closeMenu()});
}
function closestStructure(world){
 let best=null,distance=Infinity;for(const s of structures){if(s.dead)continue;let p=map.structurePos(s),d=Math.hypot(p.x-world.x,p.y-world.y);if(d<distance){best=s;distance=d}}
 return distance<=STRUCTURE_HIT_RADIUS?{structure:best,distance}:null
}
function clickedTarget(world){
 let buff=map.buffZones.find(z=>Math.hypot(z.x-world.x,z.y-world.y)<=z.r);if(buff)return{kind:'buff',buff,world:{x:buff.x,y:buff.y},lane:null,x:null};
 let hit=closestStructure(world);if(hit){let s=hit.structure,t=(s.x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]);return{kind:'structure',structure:s,lane:s.lane,x:s.x,t,world:map.structurePos(s)}}
 let route=map.nearestRoutePoint(world);if(route.distance<=LANE_HIT_RADIUS){let x=BASE_X[1]+route.t*(BASE_X[-1]-BASE_X[1]);return{kind:'point',lane:route.lane,x,t:route.t,world:route.point}}
 return null
}
function handleMapTap(tap){
 if(gameMode==='robot')return false;let target=clickedTarget(tap.world);if(!target){closeMenu();return false}openMenu(target,tap.client);return true
}
function fightWhileHolding(u,t){
 let foe=nearestEnemy(u,u.range);if(foe&&t-u.lastAttack>=attackRate(u)){attack(u,foe,t);u.lastAttack=t;u.attackCount++}
}
function handleUnit(u,dt,t){
 if(u.tacticalWorld){
   let target=u.tacticalDestination;if(!target)return true;let w=target.world,dx=w.x-u.tacticalWorld.x,dy=w.y-u.tacticalWorld.y,d=Math.hypot(dx,dy),routeScale=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),speed=Math.max(55,u.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*routeScale);
   if(d>14){let step=Math.min(d,speed*dt);u.tacticalWorld.x+=dx/d*step;u.tacticalWorld.y+=dy/d*step;u.tacticalWorld.a=Math.atan2(dy,dx);u.lastMoved=t;return true}
   u.tacticalWorld.x=w.x;u.tacticalWorld.y=w.y;
   if(target.kind==='buff'){u.tacticalDestination=null;u.manualBuff=target.buff.id;return true}
   delete u.tacticalWorld;u.x=target.x;u.sub=0;u.subTarget=0;assignLaneTarget(u,target);return true
 }
 if(u.manualTargetId){
   let s=structures.find(x=>!x.dead&&x.id===u.manualTargetId);if(!s){delete u.manualTargetId;return false}
   let sy=structureY(s),inRange=Math.hypot(s.x-u.x,sy-yOf(u))<=u.range*PX;
   if(inRange){if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}}else move(u,s.x,dt);return true
 }
 if(u.manualHold){
   if(Math.abs(u.x-u.manualHold.x)>12)move(u,u.manualHold.x,dt);else fightWhileHolding(u,t);return true
 }
 return false
}
function clearTroopTargets(lane){
 units.filter(u=>u.side===PLAYER&&!u.minion&&!u.special?.legend&&(lane===undefined||u.lane===lane)).forEach(clearManual)
}
function ensureQuickBar(){
 if(quickBar)return;quickBar=document.createElement('div');quickBar.id='quickCameraBar';quickBar.className='quickCameraBar panel';quickBar.innerHTML='<span>Câmera</span><button data-view="legend">Lenda</button><button data-view="0">Top</button><button data-view="1">Mid</button><button data-view="2">Bot</button>';document.querySelector('#gameUI')?.appendChild(quickBar);
 quickBar.querySelectorAll('button').forEach(button=>button.onclick=()=>jumpCamera(button.dataset.view))
}
function mostAdvancedTroop(lane){return playerTroops(lane).sort((a,b)=>b.x-a.x)[0]||null}
function jumpCamera(view){
 let p;if(view==='legend'){let legend=playerLegends()[0];if(!legend)return;p=map.unitPos(legend)}else{let lane=Number(view),troop=mostAdvancedTroop(lane);p=troop?map.unitPos(troop):map.routePoint(lane,.1)}map.centerAt(p.x,p.y,map.zoom)
}
function drawMarker(){
 if(!activeMarker)return;let w=targetWorld(activeMarker.target);if(!w)return;let x=(w.x-map.cameraX)*map.zoom,y=(w.y-map.cameraY)*map.zoom;if(x<-80||y<-80||x>VIEW_W+80||y>VIEW_H+80)return;
 ctx.save();ctx.translate(x,y);ctx.strokeStyle=activeMarker.color;ctx.fillStyle=activeMarker.color;ctx.lineWidth=4;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(0,0,24+Math.sin(simTime*5)*4,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-18,0);ctx.moveTo(34,0);ctx.lineTo(18,0);ctx.moveTo(0,-34);ctx.lineTo(0,-18);ctx.moveTo(0,34);ctx.lineTo(0,18);ctx.stroke();ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(activeMarker.group,0,-42);ctx.restore()
}
const baseDraw=draw;draw=function(t){baseDraw(t);ensureQuickBar();if(quickBar){let legend=playerLegends()[0],button=quickBar.querySelector('[data-view="legend"]');if(button)button.disabled=!legend}drawMarker()};
document.addEventListener('pointerdown',e=>{if(menu&&!menu.hidden&&!menu.contains(e.target)&&e.target!==canvas)closeMenu()},true);

window.SL_TACTICAL_TARGETING={handleMapTap,handleUnit,clearTroopTargets,commandLegend,commandTroops,clickedTarget,jumpCamera,get activeMarker(){return activeMarker}};
})();
