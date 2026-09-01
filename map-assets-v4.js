/* Stick Lanes — assets visuais v4 + velocidade de deslocamento */
'use strict';
(function(){
const MOVE_BOOST=1.70;
const SIDE_FACTOR=.76;
const paths={
 baseBlue:'assets/map/base-blue.svg',baseRed:'assets/map/base-red.svg',
 towerBlue:'assets/map/tower-blue.svg',towerRed:'assets/map/tower-red.svg',
 heavyBlue:'assets/map/tower-heavy-blue.svg',heavyRed:'assets/map/tower-heavy-red.svg',
 road:'assets/map/road-tech.svg'
};
const imgs={};
let ready=0;
for(const [k,src] of Object.entries(paths)){
 const im=new Image();imgs[k]=im;im.decoding='async';im.onload=()=>{ready++};im.src=src;
}
const loaded=k=>imgs[k]&&imgs[k].complete&&imgs[k].naturalWidth>0;

move=function(u,x,dt){
 let d=x-u.x;if(Math.abs(d)<7){u.runTime=0;return}
 let now=simTime,slow=now<u.slowUntil?.92:1,routeFactor=u.lane===1?1:SIDE_FACTOR;
 u.x+=Math.sign(d)*u.speed*MOVE_SCALE*MOVE_BOOST*slow*routeFactor*dt;
 u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70);
 u.lastMoved=now;u.runTime+=dt;
 if(u.fac==='Dinossauros'&&u.runTime>=1.5)u.chargeReady=true
};

function tileRoad(lane){
 if(!loaded('road'))return;
 let start=Math.floor((cameraX-350)/250)*250,end=cameraX+VIEW_W+350;
 for(let x=Math.max(BASE_X[1],start);x<=Math.min(BASE_X[-1],end);x+=250){
   let y=laneYAt(lane,x),y1=laneYAt(lane,Math.max(BASE_X[1],x-30)),y2=laneYAt(lane,Math.min(BASE_X[-1],x+30));
   let a=Math.atan2(y2-y1,60),h=lane===1?152:137,w=286;
   ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=lane===selectedLane?.95:.82;ctx.drawImage(imgs.road,-w/2,-h/2,w,h);ctx.restore()
 }
}
const proceduralRoads=drawRoads;
drawRoads=function(){
 proceduralRoads();
 if(loaded('road'))for(let lane=0;lane<3;lane++)tileRoad(lane)
};

function baseImg(side){return side===1?imgs.baseBlue:imgs.baseRed}
drawBases=function(t){
 for(const side of [1,-1]){
   let im=baseImg(side),x=BASE_X[side],y=BASE_Y,hp=baseHp(side);
   if(loaded(side===1?'baseBlue':'baseRed')){
     let w=360,h=292;ctx.save();ctx.translate(x,y);if(side===-1)ctx.scale(-1,1);ctx.drawImage(im,-w/2,-h*.68,w,h);ctx.restore();
   }
   else if(typeof drawBaseSpire==='function')drawBaseSpire(side,t);
   let barW=180,barY=y-205;ctx.fillStyle='rgba(4,7,10,.92)';ctx.beginPath();ctx.roundRect(x-barW/2,barY,barW,12,6);ctx.fill();ctx.fillStyle=hp/BASE_HP>.35?'#46bd72':'#e15e66';ctx.beginPath();ctx.roundRect(x-barW/2,barY,barW*Math.max(0,hp/BASE_HP),9,5);ctx.fill();
   ctx.fillStyle=side===1?'#8de4ff':'#ff949a';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.fillText(side===1?'BASE ALIADA':'BASE INIMIGA',x,barY-12)
 }
};

function towerKey(s){return s.centerHeavy?(s.side===1?'heavyBlue':'heavyRed'):(s.side===1?'towerBlue':'towerRed')}
drawTower=function(s,t){
 if(s.dead)return;let key=towerKey(s),x=s.x,y=laneYAt(s.lane,s.x),im=imgs[key];drawTowerRange(s);
 if(!loaded(key))return;
 let tier=s.visualTier||1,heavy=!!s.centerHeavy,w=heavy?285:190+tier*9,h=heavy?318:230+tier*12;
 ctx.save();ctx.translate(x,y);if(s.side===-1)ctx.scale(-1,1);
 if(s.fortified){ctx.save();ctx.scale(s.side===-1?-1:1,1);let pulse=.22+.08*Math.sin(t*3+s.lane);ctx.globalAlpha=pulse;ctx.fillStyle=s.side===1?'#61ceff':'#ff6d78';ctx.beginPath();ctx.ellipse(0,-15,heavy?105:72,heavy?58:42,0,0,Math.PI*2);ctx.fill();ctx.restore()}
 ctx.drawImage(im,-w/2,-h*.73,w,h);ctx.restore();
 let hp=Math.max(0,s.hp/s.maxHp),barW=heavy?134:104,barY=y-(heavy?180:145+tier*4);
 ctx.fillStyle='rgba(4,7,10,.92)';ctx.beginPath();ctx.roundRect(x-barW/2,barY,barW,10,5);ctx.fill();ctx.fillStyle=hp>.45?'#47bd70':hp>.2?'#e4ae48':'#df5962';ctx.beginPath();ctx.roundRect(x-barW/2,barY,barW*hp,7,4);ctx.fill();
 ctx.fillStyle='rgba(5,9,13,.88)';ctx.beginPath();ctx.roundRect(x-(heavy?78:62),y+(heavy?78:61),(heavy?156:124),24,7);ctx.fill();ctx.fillStyle=heavy?'#ffcec9':'#dff4ff';ctx.font=heavy?'800 10px system-ui':'700 9px system-ui';ctx.textAlign='center';ctx.fillText(heavy?'BASTIÃO CENTRAL • '+Math.round(s.maxHp)+' HP':s.label+' • '+s.range+'u',x,y+(heavy?94:77))
};

window.SL_ASSET_V4={moveBoost:MOVE_BOOST,assets:paths,loaded:()=>ready};
})();
