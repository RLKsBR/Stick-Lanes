/* Stick Lanes — aproximação headless do mapa sci-fi v4 */
'use strict';
(function(){
const SIDE_PRESSURE=.76;
const CENTER_DIRECT=1.18;
const CENTER_ARMOR=.78;
const CENTER_HP=1.65;
const CENTER_RETALIATION=1.38;

const baseNewSide=newSide;
newSide=function(comp){
  let s=baseNewSide(comp);
  s.towers[1]=s.towers[1].map(v=>Math.round(v*CENTER_HP));
  return s
};

const baseApplyStructureDamage=applyStructureDamage;
applyStructureDamage=function(attacker,defender,lane,amount){
  amount*=lane===1?(CENTER_DIRECT*CENTER_ARMOR):SIDE_PRESSURE;
  return baseApplyStructureDamage(attacker,defender,lane,amount)
};

towerRetaliation=function(defender,lane,attLane,dt){
  let ti=towerIndex(defender,lane);if(ti<0)return;
  let dps=[20/1.6,25/1.5,30/1.4,36/1.3][ti];
  if(lane===1)dps*=CENTER_RETALIATION;
  reduceLane(attLane,dps*dt*.13)
};

window.SL_BALANCE_MAP_V4={sidePressure:SIDE_PRESSURE,centerDirect:CENTER_DIRECT,centerArmor:CENTER_ARMOR,centerHp:CENTER_HP,centerRetaliation:CENTER_RETALIATION};
})();
