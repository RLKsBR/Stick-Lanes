/* Stick Lanes — comandos contextuais diretos v3
   Jungle: somente a Lenda recebe ordens. Lane: tropas compradas da lane + Lenda
   recebem a mesma ordem. Cliques em inimigos focam o alvo; chão move o grupo. */
'use strict';
(function(){
const PLAYER=1,LANE_HIT_RADIUS=285,STRUCTURE_HIT_RADIUS=125,STRUCTURE_CORE_RADIUS=72,UNIT_HIT_RADIUS=105,LEGEND_HIT_RADIUS=145;
const map=window.SL_MOBA_SQUARE_V2;
if(!map)return;
let activeMarker=null,quickBar=null;

function playerLegends(){return units.filter(u=>!u.dead&&u.side===PLAYER&&!u.minion&&u.special?.legend)}
function playerTroops(lane){return units.filter(u=>!u.dead&&u.side===PLAYER&&u.lane===lane&&!u.minion&&!u.special?.legend&&!u.tacticalWorld)}
function enemyUnit(id){return units.find(u=>!u.dead&&u.side!==PLAYER&&u.id===id)||null}
function targetUnit(target){return target?.kind==='unit'?enemyUnit(target.unitId):null}
function zoneAt(world){return map.buffZones?.find(z=>map.containsBuff?map.containsBuff(z,world):Math.hypot(z.x-world.x,z.y-world.y)<=z.r)||null}
function targetWorld(target){
 if(target?.kind==='unit'){const u=targetUnit(target);if(u)return map.unitPos(u)}
 if(target?.structure){const s=structures.find(x=>!x.dead&&x.id===target.structure.id);if(s)return map.structurePos(s)}
 return target?.world||null
}
function targetInJungle(target){
 if(target?.kind==='buff')return true;
 if(target?.kind!=='unit')return false;
 const w=targetWorld(target);return!!(w&&zoneAt(w))
}
function buffReady(target){return target.kind!=='buff'||!window.SL_BUFF_SYSTEM?.canCapture||window.SL_BUFF_SYSTEM.canCapture(target.buff,simTime)}
function clearManual(u){delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;delete u.tacticalDestination;delete u.manualBuff}
function liveTargetSnapshot(target){
 if(target.kind!=='unit')return target;
 const v=targetUnit(target);if(!v)return null;const w=map.unitPos(v);return{...target,lane:v.lane,x:v.x,world:{x:w.x,y:w.y}}
}
function assignLaneTarget(u,target){
 target=liveTargetSnapshot(target);if(!target)return false;clearManual(u);u.lane=target.lane;
 if(target.kind==='structure'&&target.structure?.side!==u.side)u.manualTargetId=target.structure.id;
 else if(target.kind==='unit'){
   const v=targetUnit(target);if(!v)return false;u.manualUnitTargetId=v.id;u.subTarget=Math.max(-2,Math.min(2,Math.round(v.sub||0)))
 }else u.manualHold={lane:target.lane,x:target.x,world:target.world};
 return true
}
function beginLegendTravel(u,target){
 target=liveTargetSnapshot(target);if(!target)return false;const start=map.unitPos(u);clearManual(u);u.tacticalWorld={x:start.x,y:start.y,a:start.a||0};u.tacticalDestination={...target,world:{...target.world}};return true
}
function commandLegend(target){
 const legend=playerLegends()[0];if(!legend||!buffReady(target))return false;
 if(target.kind==='buff'||target.kind==='unit'||legend.lane!==target.lane||legend.tacticalWorld)return beginLegendTravel(legend,target);
 return assignLaneTarget(legend,target)
}
function commandTroops(target){
 if(targetInJungle(target)||!Number.isInteger(target.lane))return false;
 const troop=playerTroops(target.lane);if(!troop.length)return false;let ok=false;troop.forEach(u=>{if(assignLaneTarget(u,target))ok=true});return ok
}
function commandTarget(target){
 if(!target)return false;
 if(targetInJungle(target)){
   const ok=commandLegend(target);if(ok)activeMarker={group:'LENDA',target,color:'#8fd9c0'};return true
 }
 const troops=commandTroops(target),legend=commandLegend(target);
 if(troops||legend)activeMarker={group:'TODOS',target,color:'#f1d18a'};
 return true
}
function closestStructure(world){
 let best=null,distance=Infinity;for(const s of structures){if(s.dead)continue;const p=map.structurePos(s),d=Math.hypot(p.x-world.x,p.y-world.y);if(d<distance){best=s;distance=d}}
 return distance<=STRUCTURE_HIT_RADIUS?{structure:best,distance}:null
}
function closestEnemyUnit(world){
 let best=null,distance=Infinity;
 for(const u of units){if(u.dead||u.side===PLAYER)continue;const p=map.unitPos(u),d=Math.hypot(p.x-world.x,p.y-world.y),limit=u.special?.legend?LEGEND_HIT_RADIUS:UNIT_HIT_RADIUS;if(d<=limit&&d<distance){best=u;distance=d}}
 return best?{unit:best,distance}:null
}
function structureTarget(hit){const s=hit.structure,t=(s.x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]);return{kind:'structure',structure:s,lane:s.lane,x:s.x,t,world:map.structurePos(s)}}
function clickedTarget(world){
 const structureHit=closestStructure(world),unitHit=closestEnemyUnit(world);
 /* O miolo da torre ganha prioridade. Fora dele, uma unidade visivelmente clicada
    pode ser focada mesmo estando próxima à estrutura. */
 if(structureHit&&structureHit.distance<=STRUCTURE_CORE_RADIUS)return structureTarget(structureHit);
 if(unitHit){const u=unitHit.unit,p=map.unitPos(u);return{kind:'unit',unitId:u.id,lane:u.lane,x:u.x,world:{x:p.x,y:p.y}}}
 if(structureHit)return structureTarget(structureHit);
 const buff=zoneAt(world);if(buff)return{kind:'buff',buff,world:{x:buff.x,y:buff.y},lane:null,x:null};
 const route=map.nearestRoutePoint(world);if(route.distance<=LANE_HIT_RADIUS){const x=BASE_X[1]+route.t*(BASE_X[-1]-BASE_X[1]);return{kind:'point',lane:route.lane,x,t:route.t,world:route.point}}
 return null
}
function handleMapTap(tap){if(gameMode==='robot')return false;const target=clickedTarget(tap.world);if(!target)return false;commandTarget(target);return true}
function fightWhileHolding(u,t){const foe=nearestEnemy(u,u.range);if(foe&&t-u.lastAttack>=attackRate(u)){attack(u,foe,t);u.lastAttack=t;u.attackCount++}}
function releaseWorldToLane(u){
 if(!u.tacticalWorld)return;const route=map.nearestRoutePoint(u.tacticalWorld),lane=route.lane,x=BASE_X[1]+route.t*(BASE_X[-1]-BASE_X[1]);delete u.tacticalWorld;delete u.tacticalDestination;delete u.manualUnitTargetId;u.lane=lane;u.x=x;u.sub=0;u.subTarget=0
}
function fightWorldTarget(u,target,dt,t){
 const v=targetUnit(target);if(!v){releaseWorldToLane(u);return true}
 const b=map.unitPos(v),a=u.tacticalWorld,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),routeScale=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),range=Math.max(30,u.range*PX*routeScale);
 target.world={x:b.x,y:b.y};target.lane=v.lane;target.x=v.x;
 if(d>range){const speed=Math.max(55,u.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*routeScale),step=Math.min(Math.max(0,d-range*.82),speed*dt);if(step>0){a.x+=dx/d*step;a.y+=dy/d*step;a.a=Math.atan2(dy,dx);u.lastMoved=t}return true}
 if(t-u.lastAttack>=attackRate(u)){attack(u,v,t);u.lastAttack=t;u.attackCount++}return true
}
function handleUnit(u,dt,t){
 if(u.tacticalWorld){
   const target=u.tacticalDestination;if(!target)return true;
   if(target.kind==='unit')return fightWorldTarget(u,target,dt,t);
   const w=target.world,dx=w.x-u.tacticalWorld.x,dy=w.y-u.tacticalWorld.y,d=Math.hypot(dx,dy),routeScale=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),speed=Math.max(55,u.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*routeScale);
   if(d>14){const step=Math.min(d,speed*dt);u.tacticalWorld.x+=dx/d*step;u.tacticalWorld.y+=dy/d*step;u.tacticalWorld.a=Math.atan2(dy,dx);u.lastMoved=t;return true}
   u.tacticalWorld.x=w.x;u.tacticalWorld.y=w.y;
   if(target.kind==='buff'){u.tacticalDestination=null;u.manualBuff=target.buff.id;return true}
   delete u.tacticalWorld;u.x=target.x;u.sub=0;u.subTarget=0;assignLaneTarget(u,target);return true
 }
 if(u.manualUnitTargetId){
   const v=enemyUnit(u.manualUnitTargetId);if(!v||v.tacticalWorld||v.lane!==u.lane){delete u.manualUnitTargetId;return false}
   u.subTarget=Math.max(-2,Math.min(2,Math.round(v.sub||0)));const inRange=dist(u,v)<=u.range*PX;
   if(inRange){if(t-u.lastAttack>=attackRate(u)){attack(u,v,t);u.lastAttack=t;u.attackCount++}}else move(u,v.x,dt);return true
 }
 if(u.manualTargetId){
   const s=structures.find(x=>!x.dead&&x.id===u.manualTargetId);if(!s){delete u.manualTargetId;return false}
   const sy=structureY(s),inRange=Math.hypot(s.x-u.x,sy-yOf(u))<=u.range*PX;
   if(inRange){if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}}else move(u,s.x,dt);return true
 }
 if(u.manualHold){if(Math.abs(u.x-u.manualHold.x)>12)move(u,u.manualHold.x,dt);else fightWhileHolding(u,t);return true}
 return false
}
function clearTroopTargets(lane){units.filter(u=>u.side===PLAYER&&!u.minion&&!u.special?.legend&&(lane===undefined||u.lane===lane)).forEach(clearManual)}
function ensureQuickBar(){
 if(quickBar)return;quickBar=document.createElement('div');quickBar.id='quickCameraBar';quickBar.className='quickCameraBar panel';quickBar.innerHTML='<span>Câmera</span><button data-view="legend">Lenda</button><button data-view="0">Top</button><button data-view="1">Mid</button><button data-view="2">Bot</button>';document.querySelector('#gameUI')?.appendChild(quickBar);
 quickBar.querySelectorAll('button').forEach(button=>button.onclick=()=>jumpCamera(button.dataset.view))
}
function mostAdvancedTroop(lane){return playerTroops(lane).sort((a,b)=>b.x-a.x)[0]||null}
function jumpCamera(view){let p;if(view==='legend'){const legend=playerLegends()[0];if(!legend)return;p=map.unitPos(legend)}else{const lane=Number(view),troop=mostAdvancedTroop(lane);p=troop?map.unitPos(troop):map.routePoint(lane,.1)}map.centerAt(p.x,p.y,map.zoom)}
function drawMarker(){
 if(!activeMarker)return;const w=targetWorld(activeMarker.target);if(!w)return;const x=(w.x-map.cameraX)*map.zoom,y=(w.y-map.cameraY)*map.zoom;if(x<-80||y<-80||x>VIEW_W+80||y>VIEW_H+80)return;
 ctx.save();ctx.translate(x,y);ctx.strokeStyle=activeMarker.color;ctx.fillStyle=activeMarker.color;ctx.lineWidth=4;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(0,0,24+Math.sin(simTime*5)*4,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-18,0);ctx.moveTo(34,0);ctx.lineTo(18,0);ctx.moveTo(0,-34);ctx.lineTo(0,-18);ctx.moveTo(0,34);ctx.lineTo(0,18);ctx.stroke();ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(activeMarker.group,0,-42);ctx.restore()
}
const baseDraw=draw;draw=function(t){baseDraw(t);ensureQuickBar();if(quickBar){const legend=playerLegends()[0],button=quickBar.querySelector('[data-view="legend"]');if(button)button.disabled=!legend}drawMarker()};

window.SL_TACTICAL_TARGETING={handleMapTap,handleUnit,clearTroopTargets,commandLegend,commandTroops,commandTarget,clickedTarget,jumpCamera,buffReady,get activeMarker(){return activeMarker},health(){return{map:!!map,buffTargets:map.buffZones?.length||0,legendInField:playerLegends().length,directCommands:true,jungleLegendOnly:true}}};
})();