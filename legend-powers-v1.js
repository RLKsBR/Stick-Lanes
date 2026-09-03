/* Stick Lanes — progressão das Lendas, poderes iniciais e escalada da partida.
   Lendas sobem por participação em combate; tropas e minions escalam pelo relógio. */
'use strict';
(function(){
const PROC_TABLE=[
  {limit:.05,id:'siphon',label:'ROUBO VITAL'},
  {limit:.12,id:'stun',label:'RUPTURA NEURAL'},
  {limit:.17,id:'fracture',label:'FRATURA PSÍQUICA'},
  {limit:.22,id:'slow',label:'PESO DO VAZIO'},
  {limit:.27,id:'echo',label:'ECO DE DANO'},
  {limit:.32,id:'suppress',label:'SUPRESSÃO'},
  {limit:.36,id:'surge',label:'SURTO MÁGICO'},
  {limit:.40,id:'displace',label:'DOBRA ESPACIAL'}
];
const LEVEL_XP=[350,450,500,550,600,650,700,750,800,900,1000];
const MATCH_SCALE={interval:120,hp:.07,atk:.05,def:.03,maxStacks:15};
const legendFx=[];
let appliedMatchStack=0;

function isLegend(unit,id=null){return!!unit?.special?.legend&&(!id||unit.special.legendKind===id)}
function isNefal(unit){return isLegend(unit,'nefal')}
function isKarkinos(unit){return isLegend(unit,'karkinos')}
function isVesper(unit){return isLegend(unit,'vesper')}
function levelXp(level){return level>=12?0:LEVEL_XP[level-1]||LEVEL_XP.at(-1)}

function setupKarkinos(unit){
  if(!isKarkinos(unit)||unit.karkinosBodyMaxHp)return;
  unit.karkinosBodyMaxHp=unit.maxHp;
  unit.karkinosShellMax=Math.round(unit.karkinosBodyMaxHp*(unit.special.shellPct||.30));
  unit.maxHp=unit.karkinosBodyMaxHp+unit.karkinosShellMax;
  unit.hp=unit.maxHp;
  unit.karkinosPinchReadyAt=unit.born+6
}
function setupVesper(unit){
  if(!isVesper(unit)||unit.vesperPoisonReadyAt)return;
  unit.vesperAttackCount=0;unit.vesperPoisonReadyAt=unit.born+(unit.special.poisonCooldown||20);unit.vesperMaxSpeedApplied=false
}
function ensureProgress(unit){
  if(!unit?.special?.legend)return unit;
  if(!unit.legendLevel){unit.legendLevel=1;unit.legendXp=0;unit.legendNextXp=levelXp(1);unit.legendSkillCasts=0;unit.lastLegendProc='';unit.lastLegendProcAt=-999}
  setupKarkinos(unit);setupVesper(unit);return unit
}
function levelUp(unit){
  ensureProgress(unit);const data=SL_LEGENDS_API.get(unit.special.legendKind),growth=data.progression||{maxLevel:12,hpPerLevel:.04,atkPerLevel:.03,defPerLevel:.02};
  if(unit.legendLevel>=growth.maxLevel)return false;
  const required=unit.legendNextXp||levelXp(unit.legendLevel);unit.legendXp=Math.max(0,unit.legendXp-required);unit.legendLevel++;
  const oldMax=unit.maxHp;
  if(isKarkinos(unit)){
    unit.karkinosBodyMaxHp=Math.round(unit.karkinosBodyMaxHp*(1+growth.hpPerLevel));
    unit.karkinosShellMax=Math.round(unit.karkinosBodyMaxHp*(growth.shellPct||unit.special.shellPct||.30));
    unit.maxHp=unit.karkinosBodyMaxHp+unit.karkinosShellMax
  }else unit.maxHp=Math.round(unit.maxHp*(1+growth.hpPerLevel));
  unit.hp=Math.min(unit.maxHp,unit.hp+(unit.maxHp-oldMax)+unit.maxHp*.08);
  unit.atk=Math.round(unit.atk*(1+growth.atkPerLevel));unit.def=Math.round(unit.def*(1+growth.defPerLevel));
  if(unit.legendLevel===growth.maxLevel&&isVesper(unit)&&!unit.vesperMaxSpeedApplied){unit.speed*=1+(growth.maxLevelMoveBonus||.20);unit.vesperMaxSpeedApplied=true}
  unit.legendNextXp=levelXp(unit.legendLevel);unit.powerFlash=simTime;return true
}
function grantXp(unit,amount){
  ensureProgress(unit);if(!unit?.special?.legend||unit.legendLevel>=12||amount<=0)return;
  unit.legendXp+=amount;while(unit.legendLevel<12&&unit.legendXp>=unit.legendNextXp)if(!levelUp(unit))break
}
function damageXpWeight(target){return target.special?.legend?100:target.minion?12:40}
function grantDamageXp(attacker,target,damage){
  if(!attacker?.special?.legend||!target||damage<=0)return;
  grantXp(attacker,Math.max(.25,damage/Math.max(1,target.maxHp)*damageXpWeight(target)))
}
function killXp(target){if(target.special?.legend)return 50;if(target.minion)return target.minionType==='tank'?5:3;return 12}

function procFeedback(attacker,target,id,label,t){
  attacker.lastLegendProc=label;attacker.lastLegendProcAt=t;target.lastPsychicEffect=id;target.lastPsychicEffectAt=t;
  const map=window.SL_MOBA_SQUARE_V2;if(!map)return;const p=map.unitPos(target);legendFx.push({type:'proc',id,label,x:p.x,y:p.y,t,duration:.85,color:'#e9b1ff'})
}
function applyProc(attacker,target,damage,t){
  if(!isNefal(attacker)||damage<=0)return null;const roll=Math.random(),proc=PROC_TABLE.find(item=>roll<item.limit);if(!proc)return null;
  switch(proc.id){
    case'siphon':attacker.hp=Math.min(attacker.maxHp,attacker.hp+damage*.60);break;
    case'stun':target.stunUntil=Math.max(target.stunUntil,t+controlDuration(target,1,t));break;
    case'fracture':target.psychicBreakUntil=Math.max(target.psychicBreakUntil||0,t+4);break;
    case'slow':target.slowUntil=Math.max(target.slowUntil,t+3);break;
    case'echo':target.hp-=damage*.25;if(target.hp<=0)killUnit(target,attacker,t);break;
    case'suppress':target.psychicWeakUntil=Math.max(target.psychicWeakUntil||0,t+4);break;
    case'surge':attacker.lastSkill-=1.5;attacker.hp=Math.min(attacker.maxHp,attacker.hp+attacker.maxHp*.025);break;
    case'displace':target.x=clamp(target.x+Math.sign(target.x-attacker.x||attacker.side)*120,BASE_X[1]+70,BASE_X[-1]-70);break
  }
  procFeedback(attacker,target,proc.id,proc.label,t);return proc.id
}
function targetCap(target){
  if(target.special?.legend)return.10;if(!target.minion)return.24;
  return target.minionType==='ranged'?.65:target.minionType==='fighter'?.45:.35
}
function queueLances(attacker,target,t,count,damage){
  const map=window.SL_MOBA_SQUARE_V2;if(!map)return;const a=map.unitPos(attacker),b=map.unitPos(target);
  for(let i=0;i<count;i++)legendFx.push({type:'lance',x1:a.x,y1:a.y-80,x2:b.x,y2:b.y-12,t:t+i*.035,duration:.55,index:i,count,damage,color:i===count-1?'#f1d8ff':'#6fffe0'})
}
function castConvergence(attacker,target,t){
  ensureProgress(attacker);const data=SL_LEGENDS_API.get('nefal'),growth=data.progression,level=attacker.legendLevel||1,boltChance=Math.min(.48,growth.thirdBoltBase+(level-1)*growth.thirdBoltPerLevel),bolts=Math.random()<boltChance?3:2;
  const raw=growth.baseSkillDamage+growth.skillPerLevel*(level-1),def=effectiveDefense(target),reduced=raw*(1-Math.min(.68,def/(def+175))),damage=Math.max(1,Math.min(reduced,target.maxHp*targetCap(target)));
  target.hp-=damage;target.lastDamaged=t;if(target.combatSince===null)target.combatSince=t;attacker.lastSkill=t;attacker.legendSkillCasts++;grantDamageXp(attacker,target,Math.min(damage,target.maxHp));queueLances(attacker,target,t,bolts,damage);applyProc(attacker,target,damage,t);
  if(target.hp<=0)killUnit(target,attacker,t);return{damage,bolts}
}

function karkinosPinch(attacker,target,t){
  if(!isKarkinos(attacker)||t<(attacker.karkinosPinchReadyAt||0)||target.dead)return;
  const duration=target.special?.legend?1:2;target.stunUntil=Math.max(target.stunUntil,t+controlDuration(target,duration,t));
  const pull=Math.min(90,Math.max(0,Math.abs(target.x-attacker.x)-28));target.x-=Math.sign(target.x-attacker.x)*pull;attacker.karkinosPinchReadyAt=t+12;
  procFeedback(attacker,target,'pinch','PINÇA DE MARÉ',t)
}
function vesperHit(attacker,target,dealt,t){
  if(!isVesper(attacker)||dealt<=0)return;
  ensureProgress(attacker);let extra=0;
  attacker.vesperAttackCount=(attacker.vesperAttackCount||0)+1;
  if(attacker.vesperAttackCount>=4){
    attacker.vesperAttackCount=0;extra=dealt*(attacker.special.dashDamageBonus||.15);target.hp-=extra;
    const gap=Math.abs(target.x-attacker.x),dash=Math.min(95,Math.max(0,gap-34));attacker.x+=Math.sign(target.x-attacker.x)*dash;attacker.powerFlash=t;
    if(target.hp<=0)killUnit(target,attacker,t)
  }
  if(t>=(attacker.vesperPoisonReadyAt||Infinity)&&!target.dead){target.slowUntil=Math.max(target.slowUntil,t+3);attacker.vesperPoisonReadyAt=t+(attacker.special.poisonCooldown||20);procFeedback(attacker,target,'venom','VENENO DO ECLIPSE',t)}
  if(extra>0)grantDamageXp(attacker,target,Math.min(extra,target.maxHp))
}

function matchStack(t=simTime){return Math.min(MATCH_SCALE.maxStacks,Math.max(0,Math.floor(t/MATCH_SCALE.interval)))}
function scaleFactor(per,stack){return 1+per*stack}
function applyMatchScale(unit,targetStack){
  if(!unit||unit.dead||unit.special?.legend)return;const old=unit.matchScaleStack||0;if(targetStack<=old)return;
  const hpRatio=scaleFactor(MATCH_SCALE.hp,targetStack)/scaleFactor(MATCH_SCALE.hp,old),atkRatio=scaleFactor(MATCH_SCALE.atk,targetStack)/scaleFactor(MATCH_SCALE.atk,old),defRatio=scaleFactor(MATCH_SCALE.def,targetStack)/scaleFactor(MATCH_SCALE.def,old),oldMax=unit.maxHp;
  unit.maxHp=Math.max(1,Math.round(unit.maxHp*hpRatio));unit.hp=Math.max(1,Math.min(unit.maxHp,unit.hp*(unit.maxHp/oldMax)));unit.atk=Math.max(1,Math.round(unit.atk*atkRatio));unit.def=Math.max(0,Math.round(unit.def*defRatio));unit.matchScaleStack=targetStack
}
function updateMatchScale(){const target=matchStack();if(target<=appliedMatchStack)return;for(const unit of units)applyMatchScale(unit,target);appliedMatchStack=target}
function updateKarkinosShell(dt,t){
  for(const unit of units){if(!isKarkinos(unit)||unit.dead)continue;ensureProgress(unit);if(t-unit.lastDamaged<8||unit.hp<unit.karkinosBodyMaxHp||unit.hp>=unit.maxHp)continue;unit.hp=Math.min(unit.maxHp,unit.hp+unit.karkinosShellMax*.08*dt)}
}
function nefalAuraFor(attacker){
  if(attacker.special?.legend)return false;return units.some(unit=>isNefal(unit)&&!unit.dead&&unit.side===attacker.side&&unit.legendLevel>=12&&dist(unit,attacker)<300)
}

const previousSpawn=spawnUnit;spawnUnit=function(...args){const unit=previousSpawn(...args);if(unit.special?.legend)ensureProgress(unit);else applyMatchScale(unit,matchStack());return unit};
const previousDefense=effectiveDefense;effectiveDefense=function(unit){
  let value=previousDefense(unit);if(simTime<(unit.psychicBreakUntil||0))value*=.82;
  if(isKarkinos(unit)){ensureProgress(unit);const thousands=Math.floor((unit.karkinosBodyMaxHp||unit.maxHp)/1000);value*=1+thousands*(unit.special.defensePer1000Hp||.07)}
  return value
};
const previousFactionBonus=factionDamageBonus;factionDamageBonus=function(attacker,target){let value=previousFactionBonus(attacker,target);if(simTime<(attacker.psychicWeakUntil||0))value*=.82;if(nefalAuraFor(attacker))value*=1.12;return value};
const previousKill=killUnit;killUnit=function(target,killer,t){const valid=!target.dead&&killer?.special?.legend;previousKill(target,killer,t);if(valid)grantXp(killer,killXp(target))};
const previousAttack=attack;attack=function(attacker,target,t){
  const before=Math.max(0,target.hp);previousAttack(attacker,target,t);let dealt=Math.max(0,Math.min(before,before-target.hp));
  if(attacker?.special?.legend&&dealt>0)grantDamageXp(attacker,target,dealt);
  if(dealt>0)karkinosPinch(attacker,target,t);
  if(dealt>0)vesperHit(attacker,target,dealt,t);
  if(isKarkinos(target)&&target.legendLevel>=12&&dealt>0&&!attacker.dead){const reflected=dealt*(target.special.maxLevelReflect||.10);attacker.hp-=reflected;attacker.lastDamaged=t;if(attacker.hp<=0)killUnit(attacker,target,t)}
  if(!isNefal(attacker)||dealt<=0)return;
  ensureProgress(attacker);applyProc(attacker,target,dealt,t);const cooldown=SL_LEGENDS_API.get('nefal').progression.skillCooldown;if(!target.dead&&t-attacker.lastSkill>=cooldown)castConvergence(attacker,target,t)
};
const previousStep=simulationStep;simulationStep=function(dt){previousStep(dt);updateMatchScale();updateKarkinosShell(dt,simTime)};
const previousReset=reset;reset=function(){appliedMatchStack=0;return previousReset()};

window.SL_NEFAL_SYSTEM={procChance:.40,procTable:PROC_TABLE,castConvergence,applyProc,grantXp,grantDamageXp,ensureProgress,targetCap,fx:legendFx};
window.SL_LEGEND_PROGRESSION={levelXp:LEVEL_XP.slice(),matchScale:{...MATCH_SCALE},grantXp,ensureProgress};
})();
