/* Stick Lanes — movimento v6: deslocamento global 13,2x e desvio de estruturas */
'use strict';
(function(){
/* O jogo já operava em 6x. O pedido de +2,2x é multiplicativo sobre o estado
   atual: 6 * 2,2 = 13,2 vezes a velocidade-base original. */
const MOVE_MULT=13.2;
const SIDE_ROUTE=.77;
const ALL_SUBS=[-2,-1,0,1,2];
function nearestOpenSub(u,open){
  return [...open].sort((a,b)=>Math.abs(a-u.sub)-Math.abs(b-u.sub)||(u.id%2?a-b:b-a))[0]
}
function routeAroundStructures(u,direction){
  const near=structures.filter(s=>!s.dead&&s.lane===u.lane&&s.blockedSubs?.length&&
    (direction>0?s.x>=u.x-80:s.x<=u.x+80)&&Math.abs(s.x-u.x)<430)
    .sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0];
  if(!near)return;
  const current=Math.max(-2,Math.min(2,Math.round(u.subTarget??u.sub)));
  if(!near.blockedSubs.includes(current))return;
  const open=near.openSubs?.length?near.openSubs:ALL_SUBS.filter(v=>!near.blockedSubs.includes(v));
  u.subTarget=nearestOpenSub(u,open)
}
move=function(u,x,dt){
  let d=x-u.x;if(Math.abs(d)<7){u.runTime=0;return}
  let now=simTime,slow=now<u.slowUntil?.92:1;
  routeAroundStructures(u,Math.sign(d));
  let lateral=(u.subTarget??u.sub)-u.sub,maxLateral=7.04*dt;
  if(Math.abs(lateral)>.001)u.sub+=Math.sign(lateral)*Math.min(Math.abs(lateral),maxLateral);
  /* top e bot têm o mesmo comprimento; mid continua sendo a rota curta. */
  let route=u.lane===1?1:SIDE_ROUTE;
  u.x+=Math.sign(d)*u.speed*MOVE_SCALE*MOVE_MULT*slow*route*dt;
  u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70);
  u.lastMoved=now;u.runTime+=dt;
  if(u.fac==='Dinossauros'&&u.runTime>=1.5)u.chargeReady=true;
};
window.SL_MOVEMENT_V6={multiplier:MOVE_MULT,sideRoute:SIDE_ROUTE,subLanes:5,collisionAvoidance:true};
})();