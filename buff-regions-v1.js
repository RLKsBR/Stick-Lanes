/* Stick Lanes — objetivos de território desativados v2.
   A antiga Cegueira foi removida: nenhuma mecânica de objetivo pode ocultar
   unidades, Lendas, estruturas ou bases inimigas. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;

/* As arenas/zonas são referências expostas pelo mapa. Esvaziá-las também
   remove o desenho e os alvos táticos sem criar uma segunda implementação. */
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
  captureSeconds:0,
  activeSeconds:0,
  rechargeAfterActive:0,
  isBlinded,
  hideEnemy,
  zoneState,
  updateBuffs,
  reset:resetBuffs,
  drawWorldBarrier,
  drawScreenBarrier,
  travelToZone,
  get blindedUntil(){return{...blindedUntil}}
};
})();
