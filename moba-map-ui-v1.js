/* Stick Lanes — acabamento MOBA sobre map-2_5d-v5: minimapa quadrado e leitura top/mid/bot. */
(function(){
'use strict';
if(!window.SL_CAMERA_V5)return;
function z(){return SL_CAMERA_V5.zoom}function cy(){return SL_CAMERA_V5.cameraY}function worldH(){return SL_CAMERA_V5.worldHeight}
function visibleW(){return VIEW_W/z()}function visibleH(){return VIEW_H/z()}
function road(lane,width,color){
  ctx.beginPath();let first=true;for(let x=BASE_X[1];x<=BASE_X[-1];x+=80){let y=laneYAt(lane,x);if(first){ctx.moveTo(x,y);first=false}else ctx.lineTo(x,y)}
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function terrain(){
  ctx.fillStyle='#07131a';ctx.fillRect(0,0,WORLD_W,worldH());
  const blocks=[[.16,650,1250,260],[.33,360,1100,300],[.51,760,1300,270],[.68,390,1050,300],[.82,760,1200,250]];
  for(const [tx,y,w,h] of blocks){let x=WORLD_W*tx;ctx.fillStyle='rgba(30,65,54,.42)';ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,80);ctx.fill();ctx.strokeStyle='rgba(105,145,116,.15)';ctx.lineWidth=8;ctx.stroke()}
  for(let i=0;i<20;i++){let x=WORLD_W*(.08+i*.045),y=870+Math.sin(i*1.7)*270;ctx.fillStyle='rgba(70,86,74,.28)';ctx.beginPath();ctx.arc(x,y,35+(i%4)*8,0,Math.PI*2);ctx.fill()}
}
function drawRoads(){
  for(let lane=0;lane<3;lane++){
    const w=lane===1?170:156;
    ctx.save();ctx.translate(0,25);road(lane,w+38,'rgba(0,0,0,.68)');ctx.restore();
    road(lane,w+24,'#111b22');road(lane,w,lane===1?'#4a403e':'#35424a');
    road(lane,w-18,lane===1?'rgba(235,118,91,.10)':'rgba(101,174,192,.10)');
    if(z()>.34){for(const sub of [-1,0,1]){ctx.beginPath();let first=true;for(let x=BASE_X[1];x<=BASE_X[-1];x+=95){let y=pathY(lane,sub,x,1);if(first){ctx.moveTo(x,y);first=false}else ctx.lineTo(x,y)}ctx.setLineDash(sub===0?[24,30]:[10,32]);ctx.strokeStyle=sub===0?'rgba(235,235,218,.25)':'rgba(125,177,199,.15)';ctx.lineWidth=sub===0?3:2;ctx.stroke();ctx.setLineDash([])}}
  }
}
function laneLabels(){
  if(z()>.44)return;const names=[['TOP','ROTA SUPERIOR'],['MID','ROTA CENTRAL'],['BOT','ROTA INFERIOR']];
  for(let l=0;l<3;l++){const x=WORLD_W*.50,y=laneYAt(l,x);ctx.fillStyle='rgba(4,9,12,.82)';ctx.beginPath();ctx.roundRect(x-95,y-27,190,54,12);ctx.fill();ctx.strokeStyle=l===1?'#f2a36c':'#73c6d8';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#eef4f0';ctx.textAlign='center';ctx.font='900 18px system-ui';ctx.fillText(names[l][0],x,y-3);ctx.font='11px system-ui';ctx.fillText(names[l][1],x,y+16)}
}
function drawSquareMini(){
  const size=214,x0=VIEW_W-size-18,y0=18,pad=12;
  ctx.fillStyle='rgba(3,7,9,.94)';ctx.beginPath();ctx.roundRect(x0,y0,size,size,14);ctx.fill();ctx.strokeStyle='#4d5d58';ctx.lineWidth=3;ctx.stroke();
  const sx=x=>x0+pad+(x/WORLD_W)*(size-pad*2),sy=y=>y0+pad+(y/worldH())*(size-pad*2);
  for(let l=0;l<3;l++){ctx.beginPath();for(let x=BASE_X[1];x<=BASE_X[-1];x+=250){let xx=sx(x),yy=sy(laneYAt(l,x));if(x===BASE_X[1])ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.strokeStyle='#7c8a83';ctx.lineWidth=3;ctx.stroke()}
  structures.forEach(s=>{if(s.dead)return;let x=sx(s.x),y=sy(laneYAt(s.lane,s.x));ctx.fillStyle=s.side===1?'#F08A24':'#C93645';ctx.beginPath();if(s.side===1)ctx.arc(x,y,s.auxiliary?2.7:4.2,0,Math.PI*2);else{let r=s.auxiliary?3.2:5;ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath()}ctx.fill()});
  for(const side of [1,-1])for(let l=0;l<3;l++){const front=waveFrontIndex[side][l]||unitIndex[side][l]?.reduce((a,u)=>!a||(side===1?u.x>a.x:u.x<a.x)?u:a,null);if(!front)continue;let x=sx(front.x),y=sy(yOf(front));ctx.fillStyle=side===1?'#F08A24':'#C93645';ctx.beginPath();if(side===1)ctx.arc(x,y,4.5,0,Math.PI*2);else{ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.closePath()}ctx.fill()}
  let vx=sx(cameraX),vy=sy(cy()),vw=visibleW()/WORLD_W*(size-pad*2),vh=visibleH()/worldH()*(size-pad*2);ctx.strokeStyle='#fff2b0';ctx.lineWidth=2;ctx.strokeRect(vx,vy,vw,vh);
  ctx.fillStyle='#e9eee9';ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.fillText('MAPA',x0+12,y0+16);
}

draw=function(t){
  ctx.fillStyle='#050b0f';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();ctx.scale(z(),z());ctx.translate(-cameraX,-cy());terrain();drawRoads();laneLabels();drawBases(t);
  const x1=cameraX-320/z(),x2=cameraX+visibleW()+320/z();
  structures.forEach(s=>{if(!s.dead&&s.x>x1&&s.x<x2)drawTower(s,t)});
  units.filter(u=>u.x>x1&&u.x<x2&&yOf(u)>cy()-190/z()&&yOf(u)<cy()+visibleH()+190/z()).sort((a,b)=>yOf(a)-yOf(b)).forEach(u=>drawUnit(u,t));
  if(z()>.30)drawEffects(t);ctx.restore();drawSquareMini();
};
})();
