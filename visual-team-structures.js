/* Stick Lanes — ownership visual de estruturas
   Estrutura neutra + acento do time. Sem azul legado. */
(function(){
'use strict';
function team(side){return teamTheme(side)}
function rr2(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function badge(side,y){
  const tm=team(side);ctx.save();ctx.translate(0,y);ctx.fillStyle=tm.dark;ctx.strokeStyle=tm.primary;ctx.lineWidth=3;
  if(tm.shape==='sharp'){
    ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(13,0);ctx.lineTo(0,12);ctx.lineTo(-13,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-18,8);ctx.lineTo(-9,16);ctx.lineTo(0,8);ctx.lineTo(9,16);ctx.lineTo(18,8);ctx.stroke();
  }else{
    ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,17,Math.PI*.12,Math.PI*.88);ctx.stroke();
  }
  ctx.restore();
}

drawBases=function(){
  for(const side of [1,-1]){
    const x=BASE_X[side],y=BASE_Y,hp=baseHp(side),tm=team(side);
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(0,53,142,40,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#343936';ctx.fillRect(-84,-113,168,94);
    ctx.fillStyle='#555c57';ctx.beginPath();ctx.moveTo(-84,-113);ctx.lineTo(-55,-145);ctx.lineTo(106,-145);ctx.lineTo(84,-113);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1a1d1b';ctx.fillRect(-25,-80,50,61);
    ctx.strokeStyle='#737b75';ctx.lineWidth=5;ctx.strokeRect(-84,-113,168,94);
    ctx.fillStyle='#111';ctx.fillRect(-84,-171,168,12);ctx.fillStyle=tm.primary;ctx.fillRect(-84,-171,168*Math.max(0,hp/BASE_HP),12);
    badge(side,-132);
    ctx.fillStyle=tm.primary;ctx.font='800 16px system-ui';ctx.textAlign='center';ctx.fillText(side===1?'SUA BASE • LARANJA':'BASE INIMIGA • VERMELHO',0,-185);
    ctx.restore();
  }
};

function neutralTowerBody(s,t,aux){
  const tm=team(s.side),tier=s.visualTier||1;
  ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(0,aux?34:48,aux?43:50+tier*6,aux?12:14+tier*2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#282e2b';
  if(aux){rr2(-34,-4,68,39,8);ctx.fill();ctx.fillStyle='#49514c';rr2(-25,-30,50,32,9);ctx.fill()}
  else{
    ctx.beginPath();ctx.moveTo(-31-tier*3,-8);ctx.lineTo(31+tier*3,-8);ctx.lineTo(39+tier*4,42);ctx.lineTo(-39-tier*4,42);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4a514d';ctx.fillRect(-28-tier*4,-57-tier*7,56+tier*8,51+tier*7);
  }
  if(s.fortified){ctx.strokeStyle=tm.primary;ctx.globalAlpha=.46+.08*Math.sin(t*3+s.x);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,aux?-8:-18,aux?39:54+tier*4,Math.PI,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  const gunY=aux?-30:-52-tier*7;ctx.save();ctx.scale(s.side,1);ctx.strokeStyle='#141917';ctx.lineWidth=aux?11:15;ctx.beginPath();ctx.moveTo(4,gunY);ctx.lineTo(aux?45:50+tier*5,gunY-3);ctx.stroke();ctx.strokeStyle='#717a73';ctx.lineWidth=aux?4:6;ctx.beginPath();ctx.moveTo(5,gunY-2);ctx.lineTo(aux?45:50+tier*5,gunY-5);ctx.stroke();ctx.restore();
  const hp=Math.max(0,s.hp/s.maxHp),bw=aux?68:96,hy=aux?-56:-118-tier*7;
  ctx.fillStyle='#0b0d0c';rr2(-bw/2,hy,bw,9,4);ctx.fill();ctx.fillStyle=tm.primary;rr2(-bw/2,hy,bw*hp,9,4);ctx.fill();
  badge(s.side,aux?-33:-79-tier*7);
}

drawTower=function(s,t){
  if(s.auxiliary)return drawAuxTurret(s,t);if(s.dead)return;
  const x=s.x,y=laneYAt(s.lane,s.x),tier=s.visualTier||1;drawTowerRange(s);ctx.save();ctx.translate(x,y);ctx.scale(.88+tier*.08,.88+tier*.08);neutralTowerBody(s,t,false);
  ctx.fillStyle='rgba(10,12,11,.82)';rr2(-58,54,116,21,6);ctx.fill();ctx.fillStyle='#ece8dc';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(s.label+' • '+s.range+'u',0,68);ctx.restore();
};

drawAuxTurret=function(s,t){
  if(s.dead)return;const x=s.x,y=laneYAt(s.lane,s.x);drawTowerRange(s);ctx.save();ctx.translate(x,y);neutralTowerBody(s,t,true);ctx.fillStyle='rgba(10,12,11,.82)';rr2(-39,45,78,18,5);ctx.fill();ctx.fillStyle='#ece8dc';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText('TORRETA • '+s.range+'u',0,57);ctx.restore();
};
})();
