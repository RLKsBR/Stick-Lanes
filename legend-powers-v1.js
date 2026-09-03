/* Stick Lanes — progressão e poder inicial de Néfal.
   O teto de 12 níveis é provisório e centralizado para futuras simulações. */
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
const legendFx=[];

function isNefal(unit){return unit?.special?.legendKind==='nefal'}
function ensureProgress(unit){
  if(!unit.special?.legend)return unit;
  if(!unit.legendLevel){unit.legendLevel=1;unit.legendXp=0;unit.legendNextXp=120;unit.legendSkillCasts=0;unit.lastLegendProc='';unit.lastLegendProcAt=-999}
  return unit
}
function levelUp(unit){
  const data=SL_LEGENDS_API.get(unit.special.legendKind),growth=data.progression||{maxLevel:12,hpPerLevel:.055,atkPerLevel:.04,defPerLevel:.025};
  if(unit.legendLevel>=growth.maxLevel)return false;
  unit.legendLevel++;const oldMax=unit.maxHp;unit.maxHp=Math.round(unit.maxHp*(1+growth.hpPerLevel));unit.hp=Math.min(unit.maxHp,unit.hp+(unit.maxHp-oldMax)+unit.maxHp*.08);unit.atk=Math.round(unit.atk*(1+growth.atkPerLevel));unit.def=Math.round(unit.def*(1+growth.defPerLevel));unit.legendXp-=unit.legendNextXp;unit.legendNextXp=Math.round(120+unit.legendLevel*55);unit.powerFlash=simTime;
  return true
}
function grantXp(unit,amount){ensureProgress(unit);if(!unit.special?.legend)return;const data=SL_LEGENDS_API.get(unit.special.legendKind),max=data.progression?.maxLevel||12;if(unit.legendLevel>=max)return;unit.legendXp+=amount;while(unit.legendLevel<max&&unit.legendXp>=unit.legendNextXp)if(!levelUp(unit))break}
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
  if(target.special?.legend)return.10;if(!target.minion)return.28;
  return target.minionType==='ranged'?1.05:target.minionType==='fighter'?.62:.42
}
function queueLances(attacker,target,t,count,damage){
  const map=window.SL_MOBA_SQUARE_V2;if(!map)return;const a=map.unitPos(attacker),b=map.unitPos(target);
  for(let i=0;i<count;i++)legendFx.push({type:'lance',x1:a.x,y1:a.y-80,x2:b.x,y2:b.y-12,t:t+i*.035,duration:.55,index:i,count,damage,color:i===count-1?'#f1d8ff':'#6fffe0'})
}
function castConvergence(attacker,target,t){
  ensureProgress(attacker);const data=SL_LEGENDS_API.get('nefal'),growth=data.progression,level=attacker.legendLevel||1,boltChance=Math.min(.48,growth.thirdBoltBase+(level-1)*growth.thirdBoltPerLevel),bolts=Math.random()<boltChance?3:2;
  const raw=growth.baseSkillDamage+growth.skillPerLevel*(level-1),def=effectiveDefense(target),reduced=raw*(1-Math.min(.68,def/(def+175))),damage=Math.max(1,Math.min(reduced,target.maxHp*targetCap(target)));
  target.hp-=damage;target.lastDamaged=t;if(target.combatSince===null)target.combatSince=t;attacker.lastSkill=t;attacker.legendSkillCasts++;grantXp(attacker,target.minion?5:target.special?.legend?18:11);queueLances(attacker,target,t,bolts,damage);applyProc(attacker,target,damage,t);
  if(target.hp<=0)killUnit(target,attacker,t);return{damage,bolts}
}

const previousSpawn=spawnUnit;spawnUnit=function(...args){const unit=previousSpawn(...args);if(unit.special?.legend)ensureProgress(unit);return unit};
const previousDefense=effectiveDefense;effectiveDefense=function(unit){let value=previousDefense(unit);if(simTime<(unit.psychicBreakUntil||0))value*=.82;return value};
const previousFactionBonus=factionDamageBonus;factionDamageBonus=function(attacker,target){let value=previousFactionBonus(attacker,target);if(simTime<(attacker.psychicWeakUntil||0))value*=.82;return value};
const previousKill=killUnit;killUnit=function(target,killer,t){const valid=!target.dead&&killer?.special?.legend;previousKill(target,killer,t);if(valid)grantXp(killer,target.special?.legend?125:target.minion?target.minionType==='tank'?28:18:62)};
const previousAttack=attack;attack=function(attacker,target,t){
  const before=target.hp;previousAttack(attacker,target,t);const dealt=Math.max(0,before-target.hp);if(!isNefal(attacker)||dealt<=0)return;
  ensureProgress(attacker);grantXp(attacker,target.minion?2:target.special?.legend?7:4);applyProc(attacker,target,dealt,t);
  const cooldown=SL_LEGENDS_API.get('nefal').progression.skillCooldown;if(!target.dead&&t-attacker.lastSkill>=cooldown)castConvergence(attacker,target,t)
};

window.SL_NEFAL_SYSTEM={procChance:.40,procTable:PROC_TABLE,castConvergence,applyProc,grantXp,ensureProgress,targetCap,fx:legendFx};
})();
