/* Stick Lanes — simulador: onda 1 tanque, 2 lutadores, 3 ranged por lane */
'use strict';
(function(){
const P=SL_MINION_PROFILES;
const WAVE_POWER=(rawPower0(P.tank)+rawPower0(P.fighter)*2+rawPower0(P.ranged)*3)*.92;
spawnWave=function(side){
  const fac=side.comp.pair[side.wave%2];side.wave++;
  for(const lane of side.lanes){lane.minion+=WAVE_POWER;lane.minionFac=fac}
};
window.SL_BALANCE_MINION_WAVE_V2={power:WAVE_POWER,composition:{tank:1,fighter:2,ranged:3}};
})();
