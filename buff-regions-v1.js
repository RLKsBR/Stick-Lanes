/* Stick Lanes — objetivos antigos removidos + respawn das Lendas v2.
   Cegueira desativada: nada neste sistema oculta inimigos.
   Lendas renascem na base preservando nível, XP e atributos conquistados. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;

/* BUFF_ARENAS/BUFF_ZONES são expostos por referência pelo mapa.
   Esvaziar aqui remove também o desenho e os alvos táticos antigos. */
if(map){
  if(Array.isArray(map.buffZones))map.buffZones.splice(0);
  if(Array.isArray(map.buffArenas))map.buffArenas.splice(0);
}

const blindedUntil={1:0,'-1':0};
function isBlinded(){return false}
function hideEnemy(){return false}
function zoneState(){return null}
function updateBuffs(){}
function resetBuffs(){}
function drawWorldBarrier(){}
function drawScreenBarrier(){}
function travelToZone(){return false}

window.SL_BUFF_SYSTEM={
  captureSeconds:0,activeSeconds:0,rechargeAfterActive:0,
  isBlinded,hideEnemy,zoneState,updateBuffs,reset:resetBuffs,
  drawWorldBarrier,drawScreenBarrier,travelToZone,
  get blindedUntil(){return{...blindedUntil}}
};

/* Respawn das Lendas. L1 = 16s; cada nível acrescenta 2s; L12 = 38s. */
const RESPAWN_BASE=14,RESPAWN_PER_LEVEL=2;
const pending={1:null,'-1':null};
function respawnSeconds(level=1){return RESPAWN_BASE+RESPAWN_PER_LEVEL*Math.max(1,level)}
function snapshotLegend(u){
  return{
    level:u.legendLevel||1,xp:u.legendXp||0,nextXp:u.legendNextXp||0,
    atk:u.atk,def:u.def,speed:u.speed,maxHp:u.maxHp,
    homeLane:Number.isInteger(u.legendHomeLane)?u.legendHomeLane:u.lane,
    skillCasts:u.legendSkillCasts||0,
    bodyMax:u.karkinosBodyMaxHp||0,shellMax:u.karkinosShellMax||0,
    vesperMaxSpeedApplied:!!u.vesperMaxSpeedApplied
  }
}
function restoreLegend(u,s,t){
  window.SL_LEGEND_PROGRESSION?.ensureProgress?.(u);
  u.legendLevel=s.level;u.legendXp=s.xp;u.legendNextXp=s.nextXp;u.legendSkillCasts=s.skillCasts;
  u.atk=s.atk;u.def=s.def;u.speed=s.speed;u.legendHomeLane=s.homeLane;u.lane=s.homeLane;u.sub=0;u.subTarget=0;
  delete u.tacticalWorld;delete u.tacticalDestination;delete u.manualBuff;delete u.manualTargetId;delete u.manualHold;
  if(u.special?.legendKind==='karkinos'){
    u.karkinosBodyMaxHp=s.bodyMax||u.karkinosBodyMaxHp;
    u.karkinosShellMax=s.shellMax||u.karkinosShellMax;
    u.maxHp=s.maxHp;u.karkinosPinchReadyAt=t+6
  }else u.maxHp=s.maxHp;
  if(u.special?.legendKind==='vesper'){
    u.vesperAttackCount=0;u.vesperPoisonReadyAt=t+(u.special.poisonCooldown||20);u.vesperMaxSpeedApplied=s.vesperMaxSpeedApplied
  }
  u.hp=u.maxHp;u.lastAttack=t;u.lastSkill=t;u.lastDamaged=-999;u.stunUntil=0;u.slowUntil=0;u.powerFlash=t
}

const previousKill=killUnit;
killUnit=function(target,killer,t){
  const shouldRespawn=!!target&&!target.dead&&target.special?.legend;
  const state=shouldRespawn?snapshotLegend(target):null;
  previousKill(target,killer,t);
  if(shouldRespawn&&target.dead)pending[target.side]={at:t+respawnSeconds(state.level),state}
};
function updateRespawns(t){
  for(const side of [1,-1]){
    const job=pending[side];if(!job||t<job.at)continue;
    if(units.some(u=>!u.dead&&u.side===side&&u.special?.legend)){pending[side]=null;continue}
    const legend=spawnLegend(side);if(!legend)continue;
    restoreLegend(legend,job.state,t);pending[side]=null
  }
}
const previousStep=simulationStep;
simulationStep=function(dt){previousStep(dt);updateRespawns(simTime)};
const previousReset=reset;
reset=function(){pending[1]=pending[-1]=null;resetBuffs();return previousReset()};

window.SL_LEGEND_RESPAWN={
  base:RESPAWN_BASE,perLevel:RESPAWN_PER_LEVEL,respawnSeconds,
  getPending:side=>pending[side]?{...pending[side]}:null
};
})();
