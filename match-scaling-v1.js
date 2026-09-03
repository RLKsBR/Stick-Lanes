/* Stick Lanes — escalada global por tempo v1.
   Tropas compráveis e minions escalam juntos pelo relógio da partida.
   Lendas usam progressão própria por XP e estruturas não recebem esta escala. */
'use strict';
(function(){
const INTERVAL=120;
const HP_PER_STACK=.07;
const ATK_PER_STACK=.05;
const DEF_PER_STACK=.03;
const MAX_STACKS=15;
let appliedStack=0;

function stackAt(t=simTime){return Math.min(MAX_STACKS,Math.max(0,Math.floor(t/INTERVAL)))}
function factor(per,stack){return 1+per*stack}
function eligible(unit){return unit&&!unit.dead&&!unit.special?.legend}
function applyStack(unit,targetStack){
  if(!eligible(unit))return;
  const oldStack=unit.matchScaleStack||0;
  if(targetStack<=oldStack)return;
  const hpRatio=factor(HP_PER_STACK,targetStack)/factor(HP_PER_STACK,oldStack);
  const atkRatio=factor(ATK_PER_STACK,targetStack)/factor(ATK_PER_STACK,oldStack);
  const defRatio=factor(DEF_PER_STACK,targetStack)/factor(DEF_PER_STACK,oldStack);
  const oldMax=unit.maxHp;
  unit.maxHp=Math.max(1,Math.round(unit.maxHp*hpRatio));
  unit.hp=Math.max(1,Math.min(unit.maxHp,unit.hp*(unit.maxHp/oldMax)));
  unit.atk=Math.max(1,Math.round(unit.atk*atkRatio));
  unit.def=Math.max(0,Math.round(unit.def*defRatio));
  unit.matchScaleStack=targetStack
}
function applyGlobal(targetStack){for(const unit of units)applyStack(unit,targetStack);appliedStack=targetStack}

const previousSpawn=spawnUnit;
spawnUnit=function(...args){const unit=previousSpawn(...args);applyStack(unit,stackAt());return unit};

const previousStep=simulationStep;
simulationStep=function(dt){
  previousStep(dt);
  const target=stackAt();
  if(target>appliedStack)applyGlobal(target)
};

const previousReset=reset;
reset=function(){appliedStack=0;const out=previousReset();const target=stackAt();if(target>0)applyGlobal(target);return out};

window.SL_MATCH_SCALING={interval:INTERVAL,hpPerStack:HP_PER_STACK,atkPerStack:ATK_PER_STACK,defPerStack:DEF_PER_STACK,maxStacks:MAX_STACKS,stackAt,applyStack};
})();
