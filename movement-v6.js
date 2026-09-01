/* Stick Lanes — movimento v6: deslocamento global 3x */
'use strict';
(function(){
const MOVE_MULT=3.0;
move=function(u,x,dt){
  let d=x-u.x;if(Math.abs(d)<7){u.runTime=0;return}
  let now=simTime,slow=now<u.slowUntil?.92:1;
  /* central = referência; superior e inferior preservam o custo estratégico da rota */
  let route=u.lane===1?1:(u.lane===0?.82:.72);
  u.x+=Math.sign(d)*u.speed*MOVE_SCALE*MOVE_MULT*slow*route*dt;
  u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70);
  u.lastMoved=now;u.runTime+=dt;
  if(u.fac==='Dinossauros'&&u.runTime>=1.5)u.chargeReady=true;
};
window.SL_MOVEMENT_V6={multiplier:MOVE_MULT};
})();
