/* Stick Lanes — respawn das Lendas v1.
   Lendas renascem na base preservando nível, XP e atributos conquistados. */
'use strict';
(function(){
const BASE_RESPAWN=14;
const PER_LEVEL=2;
const pending={1:null,'-1':null};

function respawnSeconds(level=1){return BASE_RESPAWN+PER_LEVEL*Math.max(1,level)}
function snapshotLegend(u){
  return{
    level:u.legendLevel||1,
    xp:u.legendXp||0,
    nextXp:u.legendNextXp||0,
    atk:u.atk,
    def:u.def,
    speed:u.speed,
    maxHp:u.maxHp,
    homeLane:Number.isInteger(u.legendHomeLane)?u.legendHomeLane:u.lane,
    skillCasts:u.legendSkillCasts||0,
    bodyMax:u.karkinosBodyMaxHp||0,
    shellMax:u.karkinosShellMax||0,
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
reset=function(){pending[1]=pending[-1]=null;return previousReset()};

window.SL_LEGEND_RESPAWN={base:BASE_RESPAWN,perLevel:PER_LEVEL,respawnSeconds,getPending:side=>pending[side]?{...pending[side]}:null};
})();
