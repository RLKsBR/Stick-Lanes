/* Stick Lanes — mapa/câmera v5: 2D e meio, zoom/pan 2D e LOD */
'use strict';
(function(){
const WORLD_H=1800, MIN_Z=.14, MAX_Z=1.85;
let zoom=.62,cameraY=220;
let pointers=new Map(),gesture=null,lastTap=null;
const roadImg=new Image();roadImg.src='assets/map/road-tech.svg';roadImg.decoding='async';
const oldDrawUnit=drawUnit,oldDrawTower=drawTower,oldLimb=typeof limb==='function'?limb:null;
let walkCtx=null;

/* A rota inferior cai para uma avenida baixa e percorre quase o mapa inteiro
   antes de subir para a base inimiga: leitura de "L deitado"/bottom lane de MOBA. */
const ROUTES={
  0:[[0,500],[.055,390],[.12,240],[.20,155],[.31,210],[.40,125],[.52,235],[.63,160],[.73,245],[.82,165],[.91,300],[.965,430],[1,500]],
  1:[[0,500],[.08,520],[.18,545],[.31,525],[.44,565],[.57,530],[.70,550],[.83,520],[.93,505],[1,500]],
  2:[[0,500],[.035,650],[.075,980],[.11,1325],[.20,1450],[.36,1470],[.52,1450],[.68,1470],[.80,1435],[.88,1280],[.93,960],[.965,650],[1,500]]
};
function rY(lane,x){
  const t=clamp((x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),0,1),p=ROUTES[lane]||ROUTES[1];
  for(let i=0;i<p.length-1;i++)if(t<=p[i+1][0]){let a=p[i],b=p[i+1],q=clamp((t-a[0])/(b[0]-a[0]),0,1);return lerp(a[1],b[1],smooth(q))}
  return p[p.length-1][1]
}
laneYAt=function(lane,x){return rY(lane,x)};
pathY=function(lane,sub,x,originSide=1){return rY(lane,x)+(sub||0)*SUB_GAP*subFactorForSide(originSide,x)};

/* A top lane segue longa; a inferior em L é a mais demorada. */
move=function(u,x,dt){
  let d=x-u.x;if(Math.abs(d)<7){u.runTime=0;return}
  let now=simTime,slow=now<u.slowUntil?.92:1,route=u.lane===1?1:(u.lane===0?.82:.72);
  u.x+=Math.sign(d)*u.speed*MOVE_SCALE*1.70*slow*route*dt;
  u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70);u.lastMoved=now;u.runTime+=dt;
  if(u.fac==='Dinossauros'&&u.runTime>=1.5)u.chargeReady=true
};

function visibleW(){return VIEW_W/zoom}function visibleH(){return VIEW_H/zoom}
function clampCam(){cameraX=clamp(cameraX,0,Math.max(0,WORLD_W-visibleW()));cameraY=clamp(cameraY,0,Math.max(0,WORLD_H-visibleH()))}
setCamera=function(v){cameraX=v;clampCam()};
function centerAt(x,y,z=zoom){zoom=clamp(z,MIN_Z,MAX_Z);cameraX=x-visibleW()/2;cameraY=y-visibleH()/2;clampCam();updateZoomBadge()}
function screenToWorld(sx,sy){return{x:cameraX+sx/zoom,y:cameraY+sy/zoom}}
function updateZoomBadge(){let b=document.querySelector('#zoomBadge');if(!b){b=document.createElement('span');b.id='zoomBadge';b.className='badge';document.querySelector('.cameraButtons')?.appendChild(b)}if(b)b.textContent=Math.round(zoom*100)+'%'}
updateZoomBadge();

/* Botões de navegação passam a apontar para regiões do mapa, não só posições X. */
const home=document.querySelector('#camHome'),mid=document.querySelector('#camMid'),enemy=document.querySelector('#camEnemy'),left=document.querySelector('#camLeft'),right=document.querySelector('#camRight');
if(home)home.onclick=()=>centerAt(900,620,.82);
if(mid)mid.onclick=()=>centerAt(WORLD_W*.5,760,.55);
if(enemy)enemy.onclick=()=>centerAt(WORLD_W-900,620,.82);
if(left)left.onclick=()=>{cameraX-=visibleW()*.62;clampCam()};
if(right)right.onclick=()=>{cameraX+=visibleW()*.62;clampCam()};

/* Pinça + pan bidimensional. O listener em capture bloqueia o arrasto horizontal antigo. */
canvas.style.touchAction='none';
function pos(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*VIEW_W/r.width,y:(e.clientY-r.top)*VIEW_H/r.height}}
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopImmediatePropagation();canvas.setPointerCapture?.(e.pointerId);let p=pos(e);pointers.set(e.pointerId,p);
  if(pointers.size===1)gesture={type:'pan',id:e.pointerId,start:p,last:p,moved:false,startCamX:cameraX,startCamY:cameraY};
  else if(pointers.size===2){let a=[...pointers.values()],dx=a[1].x-a[0].x,dy=a[1].y-a[0].y,mid={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};gesture={type:'pinch',dist:Math.hypot(dx,dy),zoom,anchor:screenToWorld(mid.x,mid.y),mid}}
},{capture:true});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopImmediatePropagation();let p=pos(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){let a=[...pointers.values()].slice(0,2),dx=a[1].x-a[0].x,dy=a[1].y-a[0].y,mid={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
    if(!gesture||gesture.type!=='pinch')gesture={type:'pinch',dist:Math.hypot(dx,dy),zoom,anchor:screenToWorld(mid.x,mid.y),mid};
    let nz=clamp(gesture.zoom*Math.hypot(dx,dy)/Math.max(20,gesture.dist),MIN_Z,MAX_Z);zoom=nz;cameraX=gesture.anchor.x-mid.x/zoom;cameraY=gesture.anchor.y-mid.y/zoom;clampCam();updateZoomBadge();return
  }
  if(gesture?.type==='pan'&&gesture.id===e.pointerId){let dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>7)gesture.moved=true;cameraX-=dx/zoom;cameraY-=dy/zoom;gesture.last=p;clampCam()}
},{capture:true});
function finishPointer(e){
  if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopImmediatePropagation();let p=pos(e),was=gesture;pointers.delete(e.pointerId);
  if(was?.type==='pan'&&!was.moved){
    if(p.y<76){let wx=clamp((p.x-20)/(VIEW_W-40),0,1)*WORLD_W;centerAt(wx,900,zoom)}
    else{let w=screenToWorld(p.x,p.y),ds=[0,1,2].map(i=>Math.abs(rY(i,w.x)-w.y));selectedLane=ds.indexOf(Math.min(...ds))}
  }
  if(pointers.size===1){let q=[...pointers.entries()][0];gesture={type:'pan',id:q[0],start:q[1],last:q[1],moved:true}}else gesture=null
}
canvas.addEventListener('pointerup',finishPointer,{capture:true});canvas.addEventListener('pointercancel',finishPointer,{capture:true});
canvas.addEventListener('wheel',e=>{e.preventDefault();let p=pos(e),a=screenToWorld(p.x,p.y),nz=clamp(zoom*Math.exp(-e.deltaY*.0015),MIN_Z,MAX_Z);zoom=nz;cameraX=a.x-p.x/zoom;cameraY=a.y-p.y/zoom;clampCam();updateZoomBadge()},{passive:false,capture:true});

/* Passada de verdade para os humanoides/ETs: braços e pernas oscilam em oposição. */
if(oldLimb){
  limb=function(x1,y1,x2,y2,p,w=6){
    if(walkCtx&&walkCtx.moving){let ph=Math.sin(walkCtx.t*10+walkCtx.u.anim),leg=y2>20,arm=y2>-12&&y2<20;
      if(leg)x2+=ph*(x2<0?10:-10);else if(arm)x2+=ph*(x2<0?-7:7)
    }
    return oldLimb(x1,y1,x2,y2,p,w)
  }
}
drawUnit=function(u,t){
  const moving=simTime-u.lastMoved<.16&&!u.dead;walkCtx={u,t,moving};
  if(zoom<.30){let y=yOf(u),meta=facMeta(u.fac),p=meta?.palette||['#ddd'];ctx.fillStyle=u.side===1?p[2]||p[0]:p[1]||p[0];ctx.beginPath();ctx.arc(u.x,y,u.minion?8:11,0,Math.PI*2);ctx.fill();walkCtx=null;return}
  ctx.save();if(moving){let y=yOf(u),lean=(u.side===1?1:-1)*.025;ctx.translate(u.x,y);ctx.rotate(lean);ctx.translate(-u.x,-y)}oldDrawUnit(u,t);ctx.restore();walkCtx=null
};

function tangent(lane,x,side){let d=90*side,y1=rY(lane,clamp(x-d,BASE_X[1],BASE_X[-1])),y2=rY(lane,clamp(x+d,BASE_X[1],BASE_X[-1]));return Math.atan2(y2-y1,2*d)}
drawTower=function(s,t){
  if(s.dead)return;
  if(zoom<.26){let y=rY(s.lane,s.x);ctx.fillStyle=s.side===1?'#63cfff':'#ff6771';ctx.beginPath();ctx.arc(s.x,y,s.centerHeavy?17:11,0,Math.PI*2);ctx.fill();return}
  oldDrawTower(s,t);
  /* Cabeça do canhão aponta na tangente da rota, na direção da base inimiga. */
  let x=s.x,y=rY(s.lane,s.x),a=tangent(s.lane,x,s.side),len=s.centerHeavy?78:58,c=s.side===1?'#82ddff':'#ff9298';
  ctx.save();ctx.translate(x,y-(s.centerHeavy?72:54));ctx.rotate(a);ctx.fillStyle='#111820';ctx.strokeStyle='#020508';ctx.lineWidth=s.centerHeavy?17:13;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len*s.side,0);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=s.centerHeavy?5:4;ctx.beginPath();ctx.moveTo(4*s.side,-2);ctx.lineTo(len*s.side,-2);ctx.stroke();ctx.fillStyle='#202a31';ctx.beginPath();ctx.arc(0,0,s.centerHeavy?18:14,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();ctx.restore()
};

function beginPathLane(lane,sub=0){ctx.beginPath();let first=true;for(let x=BASE_X[1];x<=BASE_X[-1];x+=90){let y=pathY(lane,sub,x,1);if(first){ctx.moveTo(x,y);first=false}else ctx.lineTo(x,y)}}
function roadTile(lane){
  if(!roadImg.complete||!roadImg.naturalWidth||zoom<.48)return;let step=300,start=Math.max(BASE_X[1],Math.floor((cameraX-400)/step)*step),end=Math.min(BASE_X[-1],cameraX+visibleW()+400);
  for(let x=start;x<=end;x+=step){let y=rY(lane,x),a=Math.atan2(rY(lane,Math.min(BASE_X[-1],x+45))-rY(lane,Math.max(BASE_X[1],x-45)),90);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=.70;ctx.drawImage(roadImg,-160,-74,320,148);ctx.restore()}
}
function drawRoadsV5(){
  for(let lane=0;lane<3;lane++){
    let heavy=lane===1,w=heavy?176:158;
    /* face lateral cria a profundidade 2D e meio */
    ctx.save();ctx.translate(0,28);beginPathLane(lane);ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=w+42;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.restore();
    beginPathLane(lane);ctx.strokeStyle='#111b24';ctx.lineWidth=w+30;ctx.stroke();beginPathLane(lane);ctx.strokeStyle=heavy?'#4c4140':'#343f48';ctx.lineWidth=w;ctx.stroke();
    beginPathLane(lane);ctx.strokeStyle=heavy?'rgba(255,93,98,.20)':'rgba(86,196,255,.16)';ctx.lineWidth=w-18;ctx.stroke();
    if(zoom>.34){[-1,0,1].forEach(sub=>{beginPathLane(lane,sub);ctx.strokeStyle=sub===0?'rgba(221,225,218,.28)':'rgba(125,177,199,.18)';ctx.lineWidth=sub===0?3:2;ctx.setLineDash(sub===0?[25,32]:[12,30]);ctx.stroke();ctx.setLineDash([])})}
    roadTile(lane)
  }
}
function drawWorldGrid(){
  if(zoom<.22)return;ctx.save();ctx.strokeStyle='rgba(69,138,169,.06)';ctx.lineWidth=1;let step=400;for(let x=Math.floor(cameraX/step)*step;x<cameraX+visibleW()+step;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke()}for(let y=Math.floor(cameraY/step)*step;y<cameraY+visibleH()+step;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke()}ctx.restore()
}
function overviewLabels(){
  if(zoom>.48)return;let data=[[0,'ROTA SUPERIOR','FLANCO'],[1,'ROTA CENTRAL','FORTALEZA'],[2,'ROTA INFERIOR','L • FLANCO']];for(let [l,a,b] of data){let x=WORLD_W*.52,y=rY(l,x);ctx.fillStyle='rgba(4,9,14,.88)';ctx.beginPath();ctx.roundRect(x-130,y-26,260,52,9);ctx.fill();ctx.strokeStyle=l===1?'#ff6d75':'#63cfff';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#eef7fa';ctx.font='800 18px system-ui';ctx.textAlign='center';ctx.fillText(a,x,y-3);ctx.font='12px system-ui';ctx.fillText(b,x,y+17)}
}
function drawMiniV5(){
  let x0=20,y0=14,w=VIEW_W-40,h=66;ctx.fillStyle='rgba(3,7,11,.91)';ctx.beginPath();ctx.roundRect(x0,y0,w,h,10);ctx.fill();ctx.strokeStyle='#314854';ctx.lineWidth=2;ctx.stroke();
  const sx=x=>x0+(x/WORLD_W)*w,sy=y=>y0+5+(y/WORLD_H)*(h-10);
  for(let l=0;l<3;l++){ctx.beginPath();for(let x=BASE_X[1];x<=BASE_X[-1];x+=280){let xx=sx(x),yy=sy(rY(l,x));if(x===BASE_X[1])ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.strokeStyle=l===1?'#ff7379':'#67ccff';ctx.lineWidth=l===1?3:2;ctx.stroke()}
  let vx=sx(cameraX),vy=sy(cameraY),vw=visibleW()/WORLD_W*w,vh=visibleH()/WORLD_H*(h-10);ctx.strokeStyle='#fff0a5';ctx.lineWidth=2;ctx.strokeRect(vx,vy,vw,vh)
}

/* O mapa muda conforme o zoom: overview = rotas/objetivos; close = assets, unidades e sub-lanes. */
draw=function(t){
  let bg=ctx.createLinearGradient(0,0,0,VIEW_H);bg.addColorStop(0,'#07111a');bg.addColorStop(.6,'#09131c');bg.addColorStop(1,'#04080d');ctx.fillStyle=bg;ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();ctx.scale(zoom,zoom);ctx.translate(-cameraX,-cameraY);drawWorldGrid();drawRoadsV5();overviewLabels();drawBases(t);
  let x1=cameraX-300/zoom,x2=cameraX+visibleW()+300/zoom;structures.forEach(s=>{if(!s.dead&&s.x>x1&&s.x<x2)drawTower(s,t)});
  units.filter(u=>u.x>x1&&u.x<x2&&yOf(u)>cameraY-180/zoom&&yOf(u)<cameraY+visibleH()+180/zoom).sort((a,b)=>yOf(a)-yOf(b)).forEach(u=>drawUnit(u,t));
  if(zoom>.30)drawEffects(t);ctx.restore();drawMiniV5()
};

/* enquadramento inicial mostra as três rotas; depois o usuário entra com a pinça. */
centerAt(1500,850,.56);
window.SL_CAMERA_V5={get zoom(){return zoom},get cameraY(){return cameraY},centerAt,worldHeight:WORLD_H,minZoom:MIN_Z,maxZoom:MAX_Z};
})();
