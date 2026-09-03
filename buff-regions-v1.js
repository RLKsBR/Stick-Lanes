/* Stick Lanes — jungles grandes, quatro buffs independentes e respawn das Lendas v5.
   As duas áreas entre Top/Mid e Mid/Bot são as jungles inteiras. Cada uma é
   dividida no meio do trajeto, formando quatro regiões grandes e independentes.
   Se duas Lendas disputarem a mesma região, elas lutam até uma sair ou morrer. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map)return;

const CAPTURE_SECONDS=15;
const ACTIVE_SECONDS=60;
const RECHARGE_SECONDS=60;
const AURA_RADIUS=340;
const REGION_START=.08,REGION_SPLIT=.50,REGION_END=.92;
const REGION_INNER_A=.16,REGION_INNER_B=.84,REGION_STEPS=18;

const JUNGLES=[
  {id:'upper',label:'JUNGLE SUPERIOR',laneA:0,laneB:1,t0:REGION_START,t1:REGION_END},
  {id:'lower',label:'JUNGLE INFERIOR',laneA:1,laneB:2,t0:REGION_START,t1:REGION_END}
];
const BUFF_DEFS={
  buff1:{index:1,name:'Buff 1 — Ímpeto',short:'MOV + ATQ',move:.12,attackSpeed:.10,color:'#65d6ff'},
  buff2:{index:2,name:'Buff 2 — Assalto',short:'ATQ + DANO',attackSpeed:.12,damage:.12,color:'#ffb45e'},
  buff3:{index:3,name:'Buff 3 — Regeneração',short:'REGEN',regen:.006,color:'#77e59b'},
  buff4:{index:4,name:'Buff 4 — Comando',short:'DANO + AURA',damage:.08,auraDamage:.10,color:'#d98cff'}
};

function mixPoint(a,b,q){return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q}}
function buildRegionPolygon(jungle,t0,t1){
  const points=[];
  for(let i=0;i<=REGION_STEPS;i++){
    const t=t0+(t1-t0)*i/REGION_STEPS,a=map.routePoint(jungle.laneA,t),b=map.routePoint(jungle.laneB,t);
    points.push(mixPoint(a,b,REGION_INNER_A))
  }
  for(let i=REGION_STEPS;i>=0;i--){
    const t=t0+(t1-t0)*i/REGION_STEPS,a=map.routePoint(jungle.laneA,t),b=map.routePoint(jungle.laneB,t);
    points.push(mixPoint(a,b,REGION_INNER_B))
  }
  return points
}
function polygonCenter(points){
  let x=0,y=0;for(const p of points){x+=p.x;y+=p.y}
  return{x:x/points.length,y:y/points.length}
}
function makeZone(id,jungleId,t0,t1){
  const jungle=JUNGLES.find(j=>j.id===jungleId),polygon=buildRegionPolygon(jungle,t0,t1),center=polygonCenter(polygon),def=BUFF_DEFS[id];
  return{id,jungleId,t0,t1,polygon,x:center.x,y:center.y,r:0,name:def.name,effect:id,index:def.index}
}
/* Cada jungle inteira é dividida em duas metades grandes. Os quatro estados são independentes. */
const ZONES=[
  makeZone('buff1','upper',REGION_START,REGION_SPLIT),
  makeZone('buff4','upper',REGION_SPLIT,REGION_END),
  makeZone('buff3','lower',REGION_START,REGION_SPLIT),
  makeZone('buff2','lower',REGION_SPLIT,REGION_END)
];
function pointInPolygon(point,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j],cross=((a.y>point.y)!==(b.y>point.y))&&point.x<(b.x-a.x)*(point.y-a.y)/((b.y-a.y)||1e-9)+a.x;
    if(cross)inside=!inside
  }
  return inside
}
function containsBuff(zone,w){return!!zone&&!!w&&pointInPolygon(w,zone.polygon)}
function insideJungle(jungleId,w){return ZONES.some(zone=>zone.jungleId===jungleId&&containsBuff(zone,w))}

/* O renderer antigo tinha duas arenas pequenas. Esvaziamos as referências dele
   e publicamos as quatro regiões grandes como os únicos alvos de buff. */
if(Array.isArray(map.buffArenas))map.buffArenas.splice(0);
if(Array.isArray(map.buffZones))map.buffZones.splice(0,map.buffZones.length,...ZONES);
map.containsBuff=containsBuff;
map.insideBuffArena=insideJungle;

const states=new Map(ZONES.map(zone=>[zone.id,{progress:0,capturingSide:0,owner:0,activeUntil:0,readyAt:0,contested:false}]));
let nextAiThink={1:28,'-1':28};
const blindedUntil={1:0,'-1':0};
function stateFor(id){return states.get(id)}
function worldOf(unit){return map.unitPos(unit)}
function livingLegend(side){return units.find(unit=>!unit.dead&&unit.side===side&&unit.special?.legend)||null}
function isBlinded(){return false}
function hideEnemy(){return false}
function hasBuff(side,id,t=simTime){const s=stateFor(id);return!!s&&s.owner===side&&t<s.activeUntil}
function canCapture(zone,t=simTime){const s=zone&&stateFor(zone.id);return!!s&&t>=s.readyAt}
function sideName(side){return side===1?'LARANJA':'VERMELHO'}
function sideColor(side){return side===1?'#f08a24':side===-1?'#c93645':'#9aa6aa'}
function returnLegendToLane(legend){
  if(!legend||legend.dead)return;
  const lane=Number.isInteger(legend.legendHomeLane)?legend.legendHomeLane:legend.lane,t=legend.side===1?.24:.76,p=map.routePoint(lane,t),x=BASE_X[1]+t*(BASE_X[-1]-BASE_X[1]);
  if(!legend.tacticalWorld){const start=worldOf(legend);legend.tacticalWorld={x:start.x,y:start.y,a:start.a||0}}
  legend.tacticalDestination={kind:'point',lane,x,t,world:{x:p.x,y:p.y}};delete legend.manualBuff;delete legend.manualTargetId;delete legend.manualHold
}
function assignedToZone(legend,zone){
  if(!legend)return false;if(legend.manualBuff===zone.id)return true;
  return legend.tacticalDestination?.kind==='buff'&&legend.tacticalDestination?.buff?.id===zone.id
}
function clearUnavailableAssignments(zone){for(const side of [1,-1]){const legend=livingLegend(side);if(assignedToZone(legend,zone))returnLegendToLane(legend)}}
function activate(zone,t,legend){
  const s=stateFor(zone.id);s.owner=legend.side;s.progress=0;s.capturingSide=0;s.contested=false;s.activeUntil=t+ACTIVE_SECONDS;s.readyAt=s.activeUntil+RECHARGE_SECONDS;
  legend.powerFlash=t;effects.push({type:'buff',x:legend.x,y:yOf(legend),t,color:sideColor(legend.side)});returnLegendToLane(legend);clearUnavailableAssignments(zone)
}
function legendsInside(zone){return[1,-1].map(side=>livingLegend(side)).filter(Boolean).filter(legend=>containsBuff(zone,worldOf(legend)))}
function updateCapture(zone,dt,t){
  const s=stateFor(zone.id);
  if(s.owner&&t>=s.activeUntil)s.owner=0;
  if(!canCapture(zone,t)){s.progress=0;s.capturingSide=0;s.contested=false;clearUnavailableAssignments(zone);return}
  const inside=legendsInside(zone),capturers=inside.filter(l=>l.manualBuff===zone.id);
  if(inside.length>1){
    s.contested=true;s.progress=0;s.capturingSide=0;return
  }
  if(capturers.length!==1){s.contested=false;s.progress=0;s.capturingSide=0;return}
  const legend=capturers[0];s.contested=false;
  if(s.capturingSide!==legend.side){s.capturingSide=legend.side;s.progress=0}
  s.progress=Math.min(CAPTURE_SECONDS,s.progress+dt);
  if(s.progress>=CAPTURE_SECONDS)activate(zone,t,legend)
}
function travelToZone(legend,zone){
  if(!legend||!zone||!canCapture(zone,simTime))return false;
  const start=worldOf(legend);legend.tacticalWorld={x:start.x,y:start.y,a:start.a||0};legend.tacticalDestination={kind:'buff',buff:zone,world:{x:zone.x,y:zone.y}};delete legend.manualTargetId;delete legend.manualHold;return true
}
function runBuffAI(side,t){
  if(side===1&&gameMode!=='robot'||t<nextAiThink[side])return;nextAiThink[side]=t+4;
  const legend=livingLegend(side);if(!legend||legend.tacticalDestination||legend.manualBuff||legend.hp/legend.maxHp<.48)return;
  const available=ZONES.filter(zone=>canCapture(zone,t));if(!available.length)return;
  const here=worldOf(legend),zone=available.slice().sort((a,b)=>Math.hypot(here.x-a.x,here.y-a.y)-Math.hypot(here.x-b.x,here.y-b.y))[0];travelToZone(legend,zone)
}
function updateBuffs(dt,t){for(const zone of ZONES)updateCapture(zone,dt,t);runBuffAI(1,t);runBuffAI(-1,t)}
function resetBuffs(){for(const s of states.values()){s.progress=0;s.capturingSide=0;s.owner=0;s.activeUntil=0;s.readyAt=0;s.contested=false}nextAiThink={1:28,'-1':28}}
function zoneState(id,t=simTime){
  const s=stateFor(id);if(!s)return null;let label='DISPONÍVEL';
  if(s.contested)label='EM COMBATE';
  else if(s.capturingSide)label=`${sideName(s.capturingSide)} ${Math.max(0,CAPTURE_SECONDS-s.progress).toFixed(1)}s`;
  else if(s.owner&&t<s.activeUntil)label=`${sideName(s.owner)} ${Math.ceil(s.activeUntil-t)}s`;
  else if(t<s.readyAt)label=`RECARGA ${Math.ceil(s.readyAt-t)}s`;
  return{...s,label,def:BUFF_DEFS[id]}
}
function attackSpeedBonus(side,t=simTime){return(hasBuff(side,'buff1',t)?BUFF_DEFS.buff1.attackSpeed:0)+(hasBuff(side,'buff2',t)?BUFF_DEFS.buff2.attackSpeed:0)}
function moveBonus(side,t=simTime){return hasBuff(side,'buff1',t)?BUFF_DEFS.buff1.move:0}
function damageBonus(side,t=simTime){return(hasBuff(side,'buff2',t)?BUFF_DEFS.buff2.damage:0)+(hasBuff(side,'buff4',t)?BUFF_DEFS.buff4.damage:0)}
function regenRate(side,t=simTime){return hasBuff(side,'buff3',t)?BUFF_DEFS.buff3.regen:0}
function troopNearLegend(attacker,t=simTime){
  if(!hasBuff(attacker.side,'buff4',t)||attacker.minion||attacker.special?.legend)return false;
  const legend=livingLegend(attacker.side);if(!legend)return false;const a=worldOf(attacker),b=worldOf(legend);return Math.hypot(a.x-b.x,a.y-b.y)<=AURA_RADIUS
}
function totalDamageMultiplier(attacker,t=simTime){return(1+damageBonus(attacker.side,t))*(troopNearLegend(attacker,t)?1+BUFF_DEFS.buff4.auraDamage:1)}

/* Aplicação dos buffs sem alterar permanentemente os atributos-base. */
const previousAttackRate=attackRate;
attackRate=function(unit){return Math.max(.35,previousAttackRate(unit)/(1+attackSpeedBonus(unit.side)))};
const previousMove=move;
move=function(unit,x,dt){return previousMove(unit,x,dt*(1+moveBonus(unit.side)))};
const previousFactionDamageBonus=factionDamageBonus;
factionDamageBonus=function(attacker,target){return previousFactionDamageBonus(attacker,target)*totalDamageMultiplier(attacker)};
const previousAttackStructure=attackStructure;
attackStructure=function(attacker,structure,t){
  const mult=totalDamageMultiplier(attacker,t);if(mult===1)return previousAttackStructure(attacker,structure,t);
  const base=attacker.atk;attacker.atk=base*mult;try{return previousAttackStructure(attacker,structure,t)}finally{attacker.atk=base}
};

/* Lenda estacionada numa região de jungle continua em coordenadas do mundo.
   Se a Lenda inimiga entrar na mesma região, ambas se aproximam e atacam
   usando o ataque real do jogo — incluindo as habilidades/passivas das Lendas. */
function jungleLegendControl(unit,dt,t){
  if(!unit?.special?.legend||!unit.tacticalWorld||unit.tacticalDestination||!unit.manualBuff)return false;
  const zone=ZONES.find(z=>z.id===unit.manualBuff);
  if(!zone||!containsBuff(zone,worldOf(unit))){returnLegendToLane(unit);return true}
  const enemy=livingLegend(-unit.side);
  if(!enemy||!containsBuff(zone,worldOf(enemy)))return true;
  const a=worldOf(unit),b=worldOf(enemy),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),routeScale=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),range=Math.max(32,unit.range*PX*routeScale);
  if(d>range){
    const speed=Math.max(55,unit.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*routeScale)*(1+moveBonus(unit.side,t)),step=Math.min(Math.max(0,d-range*.82),speed*dt);
    if(step>0){unit.tacticalWorld.x+=dx/d*step;unit.tacticalWorld.y+=dy/d*step;unit.tacticalWorld.a=Math.atan2(dy,dx);unit.lastMoved=t}
    return true
  }
  if(t-unit.lastAttack>=attackRate(unit)){attack(unit,enemy,t);unit.lastAttack=t;unit.attackCount++}
  return true
}
if(window.SL_TACTICAL_TARGETING?.handleUnit){
  const previousHandleUnit=window.SL_TACTICAL_TARGETING.handleUnit;
  window.SL_TACTICAL_TARGETING.handleUnit=function(unit,dt,t){
    if(jungleLegendControl(unit,dt,t))return true;
    const mult=unit.tacticalWorld?1+moveBonus(unit.side,t):1;if(mult===1)return previousHandleUnit(unit,dt,t);
    const base=unit.speed;unit.speed=base*mult;try{return previousHandleUnit(unit,dt,t)}finally{unit.speed=base}
  }
}
function applyRegeneration(dt,t){for(const unit of units){if(unit.dead)continue;const rate=regenRate(unit.side,t);if(rate>0&&unit.hp<unit.maxHp)unit.hp=Math.min(unit.maxHp,unit.hp+unit.maxHp*rate*dt)}}

/* Quatro regiões grandes: nada de círculo minúsculo no centro da jungle. */
function polygonPath(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}
function drawWorldBarrier(t){
  for(const zone of ZONES){
    const def=BUFF_DEFS[zone.id],s=zoneState(zone.id,t),owner=s.owner&&t<s.activeUntil?s.owner:0,pulse=.075+Math.sin(t*1.25+def.index)*.012;
    ctx.save();polygonPath(zone.polygon);ctx.fillStyle=def.color;ctx.globalAlpha=pulse;ctx.fill();ctx.globalAlpha=owner?.34:.28;ctx.strokeStyle=owner?sideColor(owner):def.color;ctx.lineWidth=8;ctx.stroke();ctx.globalAlpha=1;
    ctx.save();ctx.translate(zone.x,zone.y);ctx.textAlign='center';
    ctx.fillStyle='rgba(4,8,12,.78)';ctx.beginPath();ctx.roundRect(-145,-56,290,112,22);ctx.fill();ctx.strokeStyle=owner?sideColor(owner):def.color;ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle=def.color;ctx.font='1000 38px system-ui';ctx.fillText(`B${def.index}`,0,-14);ctx.fillStyle='#f4f0e7';ctx.font='800 17px system-ui';ctx.fillText(def.short,0,13);
    ctx.fillStyle=owner?sideColor(owner):'#c8d1d3';ctx.font='800 14px system-ui';ctx.fillText(s.label,0,38);
    if(s.capturingSide){ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(-108,48,216,8);ctx.fillStyle=sideColor(s.capturingSide);ctx.fillRect(-108,48,216*Math.min(1,s.progress/CAPTURE_SECONDS),8)}
    ctx.restore();ctx.restore()
  }
}
function drawScreenBarrier(){}

/* Respawn das Lendas. L1 = 16s; cada nível acrescenta 2s; L12 = 38s. */
const RESPAWN_BASE=14,RESPAWN_PER_LEVEL=2;
const pending={1:null,'-1':null};
function respawnSeconds(level=1){return RESPAWN_BASE+RESPAWN_PER_LEVEL*Math.max(1,level)}
function snapshotLegend(u){return{level:u.legendLevel||1,xp:u.legendXp||0,nextXp:u.legendNextXp||0,atk:u.atk,def:u.def,speed:u.speed,maxHp:u.maxHp,homeLane:Number.isInteger(u.legendHomeLane)?u.legendHomeLane:u.lane,skillCasts:u.legendSkillCasts||0,bodyMax:u.karkinosBodyMaxHp||0,shellMax:u.karkinosShellMax||0,vesperMaxSpeedApplied:!!u.vesperMaxSpeedApplied}}
function restoreLegend(u,s,t){
  window.SL_LEGEND_PROGRESSION?.ensureProgress?.(u);u.legendLevel=s.level;u.legendXp=s.xp;u.legendNextXp=s.nextXp;u.legendSkillCasts=s.skillCasts;u.atk=s.atk;u.def=s.def;u.speed=s.speed;u.legendHomeLane=s.homeLane;u.lane=s.homeLane;u.sub=0;u.subTarget=0;
  delete u.tacticalWorld;delete u.tacticalDestination;delete u.manualBuff;delete u.manualTargetId;delete u.manualHold;
  if(u.special?.legendKind==='karkinos'){u.karkinosBodyMaxHp=s.bodyMax||u.karkinosBodyMaxHp;u.karkinosShellMax=s.shellMax||u.karkinosShellMax;u.maxHp=s.maxHp;u.karkinosPinchReadyAt=t+6}else u.maxHp=s.maxHp;
  if(u.special?.legendKind==='vesper'){u.vesperAttackCount=0;u.vesperPoisonReadyAt=t+(u.special.poisonCooldown||20);u.vesperMaxSpeedApplied=s.vesperMaxSpeedApplied}
  u.hp=u.maxHp;u.lastAttack=t;u.lastSkill=t;u.lastDamaged=-999;u.stunUntil=0;u.slowUntil=0;u.powerFlash=t
}
const previousKill=killUnit;
killUnit=function(target,killer,t){const shouldRespawn=!!target&&!target.dead&&target.special?.legend,state=shouldRespawn?snapshotLegend(target):null;previousKill(target,killer,t);if(shouldRespawn&&target.dead)pending[target.side]={at:t+respawnSeconds(state.level),state}};
function updateRespawns(t){for(const side of [1,-1]){const job=pending[side];if(!job||t<job.at)continue;if(units.some(u=>!u.dead&&u.side===side&&u.special?.legend)){pending[side]=null;continue}const legend=spawnLegend(side);if(!legend)continue;restoreLegend(legend,job.state,t);pending[side]=null}}

const previousStep=simulationStep;
simulationStep=function(dt){previousStep(dt);updateBuffs(dt,simTime);applyRegeneration(dt,simTime);updateRespawns(simTime)};
const previousReset=reset;
reset=function(){pending[1]=pending[-1]=null;resetBuffs();return previousReset()};

window.SL_BUFF_SYSTEM={
  captureSeconds:CAPTURE_SECONDS,activeSeconds:ACTIVE_SECONDS,rechargeAfterActive:RECHARGE_SECONDS,
  zones:ZONES,jungles:JUNGLES,defs:BUFF_DEFS,isBlinded,hideEnemy,hasBuff,canCapture,zoneState,updateBuffs,reset:resetBuffs,
  travelToZone,containsBuff,attackSpeedBonus,moveBonus,damageBonus,regenRate,troopNearLegend,jungleLegendControl,
  drawWorldBarrier,drawScreenBarrier,get blindedUntil(){return{...blindedUntil}}
};
window.SL_LEGEND_RESPAWN={base:RESPAWN_BASE,perLevel:RESPAWN_PER_LEVEL,respawnSeconds,getPending:side=>pending[side]?{...pending[side]}:null};
})();