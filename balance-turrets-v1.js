/* Stick Lanes — aproximação headless das torretas auxiliares */
'use strict';
(function(){
const DB_KEY='stickLanesBalanceFrontlineV3.v2',HISTORY_KEY='stickLanesBalanceFrontlineV3.history.v2';
const TURRET_HP=900,TURRET_DPS=10/1.15,SIDE_COVER=.76,CENTER_COVER=.80;
const previousRuleset=window.SL_RULESET_VERSION||'frontline';
const NEW_RULESET=previousRuleset+'-turrets-v1';
function safe(s){try{return JSON.parse(s)}catch{return null}}
const old=safe(localStorage.getItem(DB_KEY));
if(old&&old.ruleset!==NEW_RULESET){
 const k='stickLanesBalanceArchive.'+String(old.ruleset||'unknown').replace(/[^a-z0-9._-]+/gi,'_');
 localStorage.setItem(k,JSON.stringify({archivedAt:Date.now(),reason:'adição das torretas auxiliares',data:old}));
 localStorage.removeItem(DB_KEY);localStorage.removeItem(HISTORY_KEY)
}
const baseNewSide=newSide;
newSide=function(comp){
 const s=baseNewSide(comp);
 for(let lane=0;lane<3;lane++){
  const m=s.towers[lane];
  s.towers[lane]=[m[0],TURRET_HP,TURRET_HP,m[1],TURRET_HP,TURRET_HP,m[2],TURRET_HP,TURRET_HP,m[3]]
 }
 return s
};
const mainDps=[20/1.6,25/1.5,30/1.4,36/1.3];
const profile=[mainDps[0],TURRET_DPS,TURRET_DPS,mainDps[1],TURRET_DPS,TURRET_DPS,mainDps[2],TURRET_DPS,TURRET_DPS,mainDps[3]];
towerRetaliation=function(defender,lane,attLane,dt){
 const ti=towerIndex(defender,lane);if(ti<0)return;
 let dps=profile[ti]||TURRET_DPS,coverage=lane===1?CENTER_COVER:SIDE_COVER;
 if(lane===1&&![1,2,4,5,7,8].includes(ti))dps*=1.38;
 reduceLane(attLane,dps*coverage*dt*.13)
};
window.SL_RULESET_VERSION=NEW_RULESET;
window.SL_BALANCE_TURRETS_V1={hp:TURRET_HP,dps:TURRET_DPS,sideCoverage:SIDE_COVER,centerCoverage:CENTER_COVER};
})();
