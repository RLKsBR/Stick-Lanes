/* Stick Lanes — ajuste de sobrevivência v3.4
   Aumenta a duração das linhas sem transformar todas as unidades em esponjas.
   Regra estrutural: o tanque comprável mais fraco deve continuar mais resistente
   que o tanque-minion, medido por vida efetiva contra defesa. */
(function(){
'use strict';

const VERSION='frontline-v3.4-survivability';
if(window.SL_SURVIVABILITY_PATCH_VERSION===VERSION)return;

const ROLE_TUNING={
  tank:{hp:1.42,def:1.28,atk:.82},
  fighter:{hp:1.28,def:1.15,atk:.90},
  ranged:{hp:1.18,def:1.08,atk:.92}
};
const MINION_TUNING={
  tank:{hp:1.35,def:1.15,atk:.80},
  fighter:{hp:1.28,def:1.12,atk:.85},
  ranged:{hp:1.15,def:1.05,atk:.90}
};

function scale(o,t){
  if(!o||!t)return;
  o.hp=Math.max(1,Math.round(o.hp*t.hp));
  o.def=Math.max(0,Math.round(o.def*t.def));
  o.atk=Math.max(1,Math.round(o.atk*t.atk));
  o.survivabilityPatch=VERSION;
}

for(const data of Object.values(window.SL_FACTIONS||{})){
  for(const u of data.units||[])scale(u,ROLE_TUNING[u.role]);
}
for(const [role,profile] of Object.entries(window.SL_MINION_PROFILES||{})){
  scale(profile,MINION_TUNING[role]);
}

function effectiveHp(o){
  // Mesma redução usada no combate: dano reduz por def/(def+125).
  return o.hp*(o.def+125)/125;
}
function tankRule(){
  const minion=window.SL_MINION_PROFILES?.tank;
  const tanks=Object.values(window.SL_FACTIONS||{}).flatMap(f=>(f.units||[]).filter(u=>u.role==='tank'));
  const weakest=tanks.reduce((a,b)=>!a||effectiveHp(b)<effectiveHp(a)?b:a,null);
  return {pass:!!(weakest&&minion&&effectiveHp(weakest)>effectiveHp(minion)),weakest,minion,
    weakestEffectiveHp:weakest?Math.round(effectiveHp(weakest)):0,minionEffectiveHp:minion?Math.round(effectiveHp(minion)):0};
}

window.SL_SURVIVABILITY_PATCH_VERSION=VERSION;
window.SL_BALANCE_SURVIVABILITY={version:VERSION,roleTuning:ROLE_TUNING,minionTuning:MINION_TUNING,tankRule};
})();
