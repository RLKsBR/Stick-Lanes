/* Stick Lanes — regiões de buff v1.
   Dois territórios grandes, quatro metades por ownership, captura contínua
   de 15 segundos e Cegueira espelhada entre Laranja e Vermelho. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map)return;

const CAPTURE_SECONDS=15;
const ACTIVE_SECONDS=60;
const RECHARGE_AFTER_ACTIVE=60;
const states=new Map(map.buffZones.map(zone=>[zone.id,{progress:0,activeUntil:0,readyAt:0,capturing:false,contested:false}]));
const blindedUntil={1:0,'-1':0};
const sideLockUntil={1:0,'-1':0};
let nextAiThink={1:28,'-1':28};

function stateFor(id){return states.get(id)}
function worldOf(unit){return map.unitPos(unit)}
function livingLegend(side){return units.find(unit=>!unit.dead&&unit.side===side&&unit.special?.legend)||null}
function isBlinded(side,t=simTime){return t<(blindedUntil[side]||0)}
function canCapture(zone,t){const state=stateFor(zone.id);return t>=state.readyAt&&t>=sideLockUntil[zone.side]}
function opponentContesting(zone){
  const opponent=livingLegend(-zone.side);return!!opponent&&map.containsBuff(zone,worldOf(opponent))
}
function returnLegendToLane(legend){
  const lane=Number.isInteger(legend.legendHomeLane)?legend.legendHomeLane:legend.lane,t=legend.side===1?.24:.76,p=map.routePoint(lane,t),x=BASE_X[1]+t*(BASE_X[-1]-BASE_X[1]);
  legend.tacticalDestination={kind:'point',lane,x,t,world:{x:p.x,y:p.y}};delete legend.manualBuff
}
function activate(zone,t,legend){
  const effectEnds=t+ACTIVE_SECONDS,rechargeEnds=effectEnds+RECHARGE_AFTER_ACTIVE;
  blindedUntil[-zone.side]=Math.max(blindedUntil[-zone.side],effectEnds);sideLockUntil[zone.side]=rechargeEnds;
  for(const teammateZone of map.buffZones.filter(item=>item.side===zone.side)){
    const state=stateFor(teammateZone.id);state.progress=0;state.capturing=false;state.contested=false;state.activeUntil=effectEnds;state.readyAt=rechargeEnds
  }
  legend.powerFlash=t;effects.push({type:'buff',x:legend.x,y:yOf(legend),t,color:zone.side===1?'#f08a24':'#c93645'});returnLegendToLane(legend)
}
function updateCapture(zone,dt,t){
  const state=stateFor(zone.id),legend=livingLegend(zone.side),inside=!!legend&&legend.manualBuff===zone.id&&map.containsBuff(zone,worldOf(legend));
  state.activeUntil=Math.max(0,state.activeUntil);state.capturing=inside&&canCapture(zone,t);state.contested=state.capturing&&opponentContesting(zone);
  if(!state.capturing||state.contested){state.progress=0;return}
  state.progress=Math.min(CAPTURE_SECONDS,state.progress+dt);
  if(state.progress>=CAPTURE_SECONDS)activate(zone,t,legend)
}
function travelToZone(legend,zone){
  const start=worldOf(legend);legend.tacticalWorld={x:start.x,y:start.y,a:start.a||0};legend.tacticalDestination={kind:'buff',buff:zone,world:{x:zone.x,y:zone.y}};delete legend.manualTargetId;delete legend.manualHold
}
function runBuffAI(side,t){
  if(side===1&&gameMode!=='robot'||t<nextAiThink[side])return;nextAiThink[side]=t+4;
  const legend=livingLegend(side);if(!legend||legend.tacticalDestination||legend.manualBuff||legend.hp/legend.maxHp<.55||isBlinded(-side,t))return;
  const zones=map.buffZones.filter(zone=>zone.side===side&&canCapture(zone,t));if(!zones.length)return;
  const zone=zones.sort((a,b)=>Math.hypot(worldOf(legend).x-a.x,worldOf(legend).y-a.y)-Math.hypot(worldOf(legend).x-b.x,worldOf(legend).y-b.y))[0];
  travelToZone(legend,zone)
}
function updateBuffs(dt,t){for(const zone of map.buffZones)updateCapture(zone,dt,t);runBuffAI(1,t);runBuffAI(-1,t)}
function resetBuffs(){
  for(const state of states.values()){state.progress=0;state.activeUntil=0;state.readyAt=0;state.capturing=false;state.contested=false}
  blindedUntil[1]=blindedUntil[-1]=0;sideLockUntil[1]=sideLockUntil[-1]=0;nextAiThink={1:28,'-1':28}
}
function zoneState(id,t=simTime){
  const state=stateFor(id);if(!state)return null;
  let label='LENDA';if(state.contested)label='CONTESTADO';else if(state.capturing)label=`${Math.max(0,CAPTURE_SECONDS-state.progress).toFixed(1)}s`;else if(t<state.activeUntil)label=`ATIVO ${Math.ceil(state.activeUntil-t)}s`;else if(t<state.readyAt)label=`RECARGA ${Math.ceil(state.readyAt-t)}s`;
  return{...state,label}
}
function hideEnemy(side){return gameMode!=='robot'&&isBlinded(1)&&side!==1}
function drawWorldBarrier(t){
  if(!isBlinded(1,t))return;const left=map.cameraX,top=map.cameraY,w=VIEW_W/map.zoom,h=VIEW_H/map.zoom;
  ctx.save();ctx.fillStyle='rgba(2,4,10,.28)';ctx.fillRect(left,top,w,h);ctx.strokeStyle='rgba(118,82,180,.16)';ctx.lineWidth=85/map.zoom;
  for(let i=0;i<5;i++){const x=left+w*(.08+i*.23)+Math.sin(t*.7+i)*75;ctx.beginPath();ctx.moveTo(x,top-80);ctx.quadraticCurveTo(x+110,top+h*.48,x-35,top+h+80);ctx.stroke()}
  ctx.restore()
}
function drawScreenBarrier(t){
  if(!isBlinded(1,t))return;const remain=Math.ceil(blindedUntil[1]-t),g=ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,VIEW_H*.2,VIEW_W/2,VIEW_H/2,VIEW_H*.82);
  g.addColorStop(0,'rgba(9,8,18,.02)');g.addColorStop(.68,'rgba(7,5,16,.24)');g.addColorStop(1,'rgba(2,1,8,.82)');ctx.fillStyle=g;ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.fillStyle='rgba(10,7,21,.92)';ctx.strokeStyle='rgba(174,126,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(VIEW_W/2-190,84,380,48,14);ctx.fill();ctx.stroke();ctx.fillStyle='#e8d9ff';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText(`CEGUEIRA • INIMIGOS OCULTOS • ${remain}s`,VIEW_W/2,114)
}

const previousStep=simulationStep;simulationStep=function(dt){previousStep(dt);updateBuffs(dt,simTime)};
const previousReset=reset;reset=function(){resetBuffs();return previousReset()};

window.SL_BUFF_SYSTEM={captureSeconds:CAPTURE_SECONDS,activeSeconds:ACTIVE_SECONDS,rechargeAfterActive:RECHARGE_AFTER_ACTIVE,isBlinded,hideEnemy,zoneState,updateBuffs,reset:resetBuffs,drawWorldBarrier,drawScreenBarrier,travelToZone,get blindedUntil(){return{...blindedUntil}}};
})();
