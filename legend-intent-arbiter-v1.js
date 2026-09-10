/* Stick Lanes — compatibility arbiter v4
   O antigo árbitro não toma mais decisões nem move Lendas.
   Research Director decide; Legend Authority é o único executor físico.
   Este arquivo preserva apenas durabilidade estrutural + API compatível. */
'use strict';
(function(){
if(typeof runSideAI!=='function')return;

const BASE_MULT=1,BASE_MAX=BASE_HP,TOWER_MULT=1.75,TURRET_MULT=2;
if(!window.SL_STRUCTURE_DURABILITY_V4){
  for(const t of Object.values(COMBAT.tower||{})){
    if(!t._slDurabilityV4){t.hp=Math.round(t.hp*TOWER_MULT);t._slDurabilityV4=true}
  }
  if(!AUX_TURRET._slDurabilityV4){AUX_TURRET.hp=Math.round(AUX_TURRET.hp*TURRET_MULT);AUX_TURRET._slDurabilityV4=true}
  window.SL_STRUCTURE_DURABILITY_V4={baseMaxHp:BASE_MAX,baseMultiplier:BASE_MULT,towerMultiplier:TOWER_MULT,turretMultiplier:TURRET_MULT};
}

const state={1:{intent:null,last:null},'-1':{intent:null,last:null}};
window.SL_LEGEND_INTENT_ARBITER={
  version:4,
  passive:true,
  get:side=>state[side]?.intent||null,
  set(side,intent){if(state[side]){state[side].intent=intent;state[side].last=simTime}return intent},
  clear(side){if(state[side])state[side].intent=null},
  reconsider:side=>state[side]?.intent||null,
  getState:side=>state[side]||null,
  health(){return{loaded:true,passive:true,singleDecisionOwner:'SL_AI_FUNCTIONAL_CONTROLLER',baseMax:BASE_MAX}}
};
window.SL_GAME_GOAL_AI={
  version:4,
  passive:true,
  baseEffectiveMax:BASE_MAX,
  effectiveBaseHp:side=>baseHp(side)*BASE_MULT,
  getGoal:side=>window.SL_AI_FUNCTIONAL_CONTROLLER?.get?.(side)?.plan||null,
  health(){return{loaded:true,passive:true,delegate:'SL_AI_FUNCTIONAL_CONTROLLER',baseMax:BASE_MAX}}
};
})();