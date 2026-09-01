/* Stick Lanes — minions com velocidade uniforme */
'use strict';
(function(){
const MINION_SPEED=5.4;
if(window.SL_MINION_PROFILES){
  for(const profile of Object.values(window.SL_MINION_PROFILES))profile.speed=MINION_SPEED;
}
window.SL_MINION_SPEED={value:MINION_SPEED};
})();
