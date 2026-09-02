/* Stick Lanes — mapa MOBA quadrado v2
   Projeção visual 2D: gameplay continua usando progresso por lane; o mapa deixa de ser uma faixa horizontal.
   Bases diagonais, top/mid/bot de MOBA, piso tecnológico e minimapa quadrado real. */
(function(){
'use strict';

const MAP_W=6800, MAP_H=6800, MAP_SCALE=1.65, SUB_LANE_GAP=72;
const ORANGE='#F08A24', RED='#C93645', NEUTRAL='#9aa6aa';
const ROUTES={
  0:[[620,6180],[520,5520],[500,4550],[560,3400],[760,2150],[1250,1200],[2200,720],[3450,520],[4550,500],[5520,520],[6180,620]],
  1:[[620,6180],[1300,5500],[2000,4800],[2700,4100],[3400,3400],[4100,2700],[4800,2000],[5500,1300],[6180,620]],
  2:[[620,6180],[1280,6280],[2250,6300],[3400,6240],[4650,6040],[5600,5550],[6080,4600],[6280,3350],[6300,2250],[6280,1280],[6180,620]]
};

function clampV(v,a,b){return Math.max(a,Math.min(b,v))}
function routeMeta(points){
  const seg=[],cum=[0];let total=0;
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push(len);total+=len;cum.push(total)}
  return{points,seg,cum,total};
}
const RM={0:routeMeta(ROUTES[0]),1:routeMeta(ROUTES[1]),2:routeMeta(ROUTES[2])};
function logicalT(x){return clampV((x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),0,1)}
function routePoint(lane,t,offset=0){
  const m=RM[lane]||RM[1],d=clampV(t,0,1)*m.total;let i=0;while(i<m.seg.length-1&&d>m.cum[i+1])i++;
  const a=m.points[i],b=m.points[i+1],q=(d-m.cum[i])/Math.max(1,m.seg[i]);
  let x=a[0]+(b[0]-a[0])*q,y=a[1]+(b[1]-a[1])*q,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
  dx/=len;dy/=len;const nx=-dy,ny=dx;return{x:x+nx*offset,y:y+ny*offset,a:Math.atan2(dy,dx),nx,ny,tx:dx,ty:dy};
}
function unitPos(u){return routePoint(u.lane,logicalT(u.x),(u.sub||0)*SUB_LANE_GAP)}
function structurePos(s){return routePoint(s.lane,logicalT(s.x),(s.subOffset||0)*SUB_LANE_GAP)}
function projectedTowerRange(s){
  const route=RM[s.lane]||RM[1],worldLength=BASE_X[-1]-BASE_X[1];
  return (s.range||4)*PX*route.total/worldLength
}

let vZoom=.62,vCamX=0,vCamY=0;
const MIN_Z=.24,MAX_Z=1.35;
function visibleW(){return VIEW_W/vZoom}function visibleH(){return VIEW_H/vZoom}
function clampCam(){vCamX=clampV(vCamX,0,Math.max(0,MAP_W-visibleW()));vCamY=clampV(vCamY,0,Math.max(0,MAP_H-visibleH()));cameraX=vCamX}
function updateBadge(){let b=document.querySelector('#zoomBadge');if(b)b.textContent=Math.round(vZoom*100)+'%'}
function centerAt(x,y,z=vZoom){vZoom=clampV(z,MIN_Z,MAX_Z);vCamX=x-visibleW()/2;vCamY=y-visibleH()/2;clampCam();updateBadge()}
function screenToWorld(x,y){return{x:vCamX+x/vZoom,y:vCamY+y/vZoom}}
centerAt(1500,5550,.64);

function pathRoute(lane,t1=0,t2=1,offset=0,step=.012){
  ctx.beginPath();let first=true;
  for(let t=t1;t<=t2+1e-6;t+=step){const p=routePoint(lane,Math.min(t,t2),offset);if(first){ctx.moveTo(p.x,p.y);first=false}else ctx.lineTo(p.x,p.y)}
  const p=routePoint(lane,t2,offset);ctx.lineTo(p.x,p.y);
}
function strokeRoute(lane,t1,t2,offset,width,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;pathRoute(lane,t1,t2,offset);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.restore()}
function lineWorld(a,b,width,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}

function drawPanelField(){
  ctx.fillStyle='#0a1115';ctx.fillRect(0,0,MAP_W,MAP_H);
  const x0=Math.max(0,Math.floor((vCamX-300)/300)*300),x1=Math.min(MAP_W,vCamX+visibleW()+300);
  const y0=Math.max(0,Math.floor((vCamY-300)/260)*260),y1=Math.min(MAP_H,vCamY+visibleH()+300);
  for(let y=y0;y<y1;y+=260)for(let x=x0;x<x1;x+=300){
    const alt=((x/300+y/260)|0)&1;ctx.fillStyle=alt?'#10191e':'#0d161b';ctx.fillRect(x+3,y+3,294,254);
    ctx.strokeStyle='rgba(160,178,184,.055)';ctx.lineWidth=2;ctx.strokeRect(x+7,y+7,286,246);
    ctx.strokeStyle='rgba(0,0,0,.36)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+22,y+34);ctx.lineTo(x+92,y+34);ctx.lineTo(x+110,y+52);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+278,y+226);ctx.lineTo(x+210,y+226);ctx.lineTo(x+192,y+208);ctx.stroke();
  }
  let g=ctx.createRadialGradient(620,6180,100,620,6180,1800);g.addColorStop(0,'rgba(240,138,36,.10)');g.addColorStop(1,'rgba(240,138,36,0)');ctx.fillStyle=g;ctx.fillRect(0,3600,3400,3200);
  g=ctx.createRadialGradient(6180,620,100,6180,620,1800);g.addColorStop(0,'rgba(201,54,69,.10)');g.addColorStop(1,'rgba(201,54,69,0)');ctx.fillStyle=g;ctx.fillRect(3400,0,3400,3200);
}

function drawTechCorridors(){
  /* Junção central das três lanes + ligação top/mid entre as torres de 30% e 40%. */
  const links=[[0,.50,1,.50],[1,.50,2,.50],[0,.35,1,.35]];
  for(const [la,ta,lb,tb] of links){const a=routePoint(la,ta),b=routePoint(lb,tb);lineWorld(a,b,132,'#0a0f13');lineWorld(a,b,112,'#1c282e');lineWorld(a,b,88,'#222f35');lineWorld(a,b,2,'rgba(180,196,201,.14)')}
  const pads=[[1700,2500,210],[5100,4300,220],[3400,3400,250],[1800,4400,180],[5000,1600,180]];
  for(const [x,y,r] of pads){ctx.fillStyle='#0a0f13';ctx.beginPath();ctx.arc(x,y,r+18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172228';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(173,191,197,.12)';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='rgba(173,191,197,.08)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*.62,0,Math.PI*2);ctx.stroke()}
}

function drawLane(lane){
  const w=500;
  strokeRoute(lane,0,1,0,w+54,'rgba(0,0,0,.72)');
  strokeRoute(lane,0,1,0,w+38,'#080d11');
  strokeRoute(lane,0,1,0,w+24,'#152127');
  strokeRoute(lane,0,1,0,w,'#354148');
  strokeRoute(lane,0,1,0,w-26,'#273239');
  for(const off of [-1.5,-.5,.5,1.5].map(v=>v*SUB_LANE_GAP))strokeRoute(lane,0,1,off,2,'rgba(205,216,220,.13)');
  strokeRoute(lane,0,1,-w*.43,8,'#080d10');strokeRoute(lane,0,1,w*.43,8,'#080d10');
  for(const off of [-w*.39,w*.39]){
    strokeRoute(lane,.01,.485,off,3,ORANGE,.84);strokeRoute(lane,.515,.99,off,3,RED,.84);
    strokeRoute(lane,.485,.515,off,3,'rgba(205,215,218,.22)',1);
  }
  if(vZoom>.46){
    for(let t=.035;t<.98;t+=.045){const p=routePoint(lane,t),half=w*.43,c=t<.49?ORANGE:t>.51?RED:NEUTRAL;
      ctx.strokeStyle='rgba(4,8,10,.74)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.x-p.nx*half,p.y-p.ny*half);ctx.lineTo(p.x+p.nx*half,p.y+p.ny*half);ctx.stroke();
      ctx.strokeStyle='rgba(205,216,220,.09)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-p.nx*(half-6)+p.tx*3,p.y-p.ny*(half-6)+p.ty*3);ctx.lineTo(p.x+p.nx*(half-6)+p.tx*3,p.y+p.ny*(half-6)+p.ty*3);ctx.stroke();
      ctx.fillStyle=c;ctx.globalAlpha=.58;for(const s of [-1,1]){ctx.beginPath();ctx.arc(p.x+p.nx*s*(half-15),p.y+p.ny*s*(half-15),2.5,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    }
  }
}

function drawBasePlatform(side){
  const p=routePoint(1,side===1?0:1),c=side===1?ORANGE:RED;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(1.25,1.25);ctx.fillStyle='#070c0f';ctx.beginPath();ctx.arc(0,0,205,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1c292f';ctx.beginPath();ctx.arc(0,0,178,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c;ctx.globalAlpha=.55;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,145,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle='#313d42';ctx.beginPath();ctx.moveTo(-72,58);ctx.lineTo(-92,-35);ctx.lineTo(-38,-104);ctx.lineTo(50,-104);ctx.lineTo(94,-32);ctx.lineTo(72,58);ctx.closePath();ctx.fill();
  ctx.fillStyle=c;ctx.globalAlpha=.75;ctx.beginPath();if(side===1)ctx.arc(0,-20,25,0,Math.PI*2);else{ctx.moveTo(0,-48);ctx.lineTo(28,-20);ctx.lineTo(0,8);ctx.lineTo(-28,-20);ctx.closePath()}ctx.fill();ctx.globalAlpha=1;
  const hp=baseHp(side)/BASE_HP;ctx.fillStyle='#080b0d';ctx.fillRect(-86,-138,172,10);ctx.fillStyle=c;ctx.fillRect(-86,-138,172*Math.max(0,hp),10);ctx.restore();
}

function drawStructure(s,t){
  if(s.dead)return;const p=structurePos(s),c=s.side===1?ORANGE:RED,aux=!!s.auxiliary,tier=s.visualTier||1;
  if(p.x<vCamX-360||p.x>vCamX+visibleW()+360||p.y<vCamY-360||p.y>vCamY+visibleH()+360)return;
  if(showTowerRanges){
    const rr=projectedTowerRange(s);ctx.save();ctx.fillStyle=c;ctx.globalAlpha=aux?.035:.055;ctx.beginPath();ctx.arc(p.x,p.y,rr,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=aux?.22:.42;ctx.strokeStyle=c;ctx.lineWidth=aux?2:3;ctx.setLineDash(aux?[7,7]:[14,9]);ctx.beginPath();ctx.arc(p.x,p.y,rr,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    if(!aux&&vZoom>.5){ctx.globalAlpha=.86;ctx.fillStyle=c;ctx.font='700 16px system-ui';ctx.textAlign='center';ctx.fillText(s.range+'u',p.x,p.y-rr+20)}ctx.restore()
  }
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='#0a1013';ctx.beginPath();ctx.arc(0,10,aux?58:86+tier*6,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c;ctx.globalAlpha=.35;ctx.lineWidth=4;ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle='#2b3438';if(aux){ctx.fillRect(-27,-20,54,50);ctx.fillStyle='#4b565a';ctx.fillRect(-19,-44,38,27)}else{ctx.beginPath();ctx.moveTo(-34,-8);ctx.lineTo(34,-8);ctx.lineTo(43,46);ctx.lineTo(-43,46);ctx.closePath();ctx.fill();ctx.fillStyle='#4b565a';ctx.fillRect(-28,-64,56,58)}
  const aim=p.a+(s.side===1?0:Math.PI);ctx.save();ctx.translate(0,aux?-39:-58);ctx.rotate(aim);ctx.strokeStyle='#111719';ctx.lineWidth=aux?10:14;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(aux?46:63,0);ctx.stroke();ctx.strokeStyle=c;ctx.globalAlpha=.6;ctx.lineWidth=3;ctx.stroke();ctx.restore();ctx.globalAlpha=1;
  ctx.fillStyle=c;ctx.beginPath();if(s.side===1)ctx.arc(0,aux?-27:-42,aux?8:11,0,Math.PI*2);else{const r=aux?9:12,y=aux?-27:-42;ctx.moveTo(0,y-r);ctx.lineTo(r,y);ctx.lineTo(0,y+r);ctx.lineTo(-r,y);ctx.closePath()}ctx.fill();
  const hp=Math.max(0,s.hp/s.maxHp),bw=aux?62:88;ctx.fillStyle='#06090b';ctx.fillRect(-bw/2,aux?-60:-92,bw,7);ctx.fillStyle=c;ctx.fillRect(-bw/2,aux?-60:-92,bw*hp,7);ctx.restore();
}

function drawProjectedUnit(u,t){
  if(u.dead)return;const p=unitPos(u);if(p.x<vCamX-170||p.x>vCamX+visibleW()+170||p.y<vCamY-170||p.y>vCamY+visibleH()+170)return;
  const oy=yOf(u);ctx.save();ctx.translate(p.x-u.x,p.y-oy);drawUnit(u,t);ctx.restore();
}

function drawMini(){
  const size=220,x0=VIEW_W-size-18,y0=18,pad=12;
  ctx.save();ctx.fillStyle='rgba(3,7,9,.96)';ctx.beginPath();ctx.roundRect(x0,y0,size,size,14);ctx.fill();ctx.strokeStyle='#68777b';ctx.lineWidth=3;ctx.stroke();
  const sx=x=>x0+pad+x/MAP_W*(size-pad*2),sy=y=>y0+pad+y/MAP_H*(size-pad*2);
  for(let l=0;l<3;l++){ctx.beginPath();for(let t=0;t<=1.001;t+=.025){const p=routePoint(l,Math.min(1,t));if(t===0)ctx.moveTo(sx(p.x),sy(p.y));else ctx.lineTo(sx(p.x),sy(p.y))}ctx.strokeStyle='#69777b';ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();for(let t=0;t<=.485;t+=.025){const p=routePoint(l,t);if(t===0)ctx.moveTo(sx(p.x),sy(p.y));else ctx.lineTo(sx(p.x),sy(p.y))}ctx.strokeStyle=ORANGE;ctx.lineWidth=1.7;ctx.stroke();
    ctx.beginPath();let first=true;for(let t=.515;t<=1.001;t+=.025){const p=routePoint(l,Math.min(1,t));if(first){ctx.moveTo(sx(p.x),sy(p.y));first=false}else ctx.lineTo(sx(p.x),sy(p.y))}ctx.strokeStyle=RED;ctx.lineWidth=1.7;ctx.stroke();}
  structures.forEach(s=>{if(s.dead)return;const p=structurePos(s),x=sx(p.x),y=sy(p.y),c=s.side===1?ORANGE:RED;ctx.fillStyle=c;ctx.beginPath();if(s.side===1)ctx.arc(x,y,s.auxiliary?2.2:3.8,0,Math.PI*2);else{const r=s.auxiliary?2.8:4.5;ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath()}ctx.fill()});
  for(const side of [1,-1])for(let lane=0;lane<3;lane++){const front=waveFrontIndex[side][lane];if(!front)continue;const p=unitPos(front);ctx.fillStyle=side===1?ORANGE:RED;ctx.beginPath();ctx.arc(sx(p.x),sy(p.y),3.5,0,Math.PI*2);ctx.fill()}
  const vx=sx(vCamX),vy=sy(vCamY),vw=visibleW()/MAP_W*(size-pad*2),vh=visibleH()/MAP_H*(size-pad*2);ctx.strokeStyle='#fff1aa';ctx.lineWidth=2;ctx.strokeRect(vx,vy,vw,vh);ctx.fillStyle='#edf2ef';ctx.font='800 10px system-ui';ctx.fillText('MAPA',x0+12,y0+15);ctx.restore();
  return{x0,y0,size,pad};
}

function drawMap(t){
  ctx.fillStyle='#05090c';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();ctx.scale(vZoom,vZoom);ctx.translate(-vCamX,-vCamY);drawPanelField();drawTechCorridors();drawLane(0);drawLane(1);drawLane(2);drawBasePlatform(1);drawBasePlatform(-1);structures.forEach(s=>drawStructure(s,t));units.slice().sort((a,b)=>unitPos(a).y-unitPos(b).y).forEach(u=>drawProjectedUnit(u,t));ctx.restore();drawMini();
}
draw=drawMap;

const home=document.querySelector('#camHome'),mid=document.querySelector('#camMid'),enemy=document.querySelector('#camEnemy'),left=document.querySelector('#camLeft'),right=document.querySelector('#camRight');
if(home)home.onclick=()=>centerAt(900,3300,.72);if(mid)mid.onclick=()=>centerAt(2100,2100,.58);if(enemy)enemy.onclick=()=>centerAt(3300,900,.72);if(left)left.onclick=()=>{vCamX-=visibleW()*.52;clampCam()};if(right)right.onclick=()=>{vCamX+=visibleW()*.52;clampCam()};

const pointers=new Map();let gesture=null;
function canvasPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*VIEW_W/r.width,y:(e.clientY-r.top)*VIEW_H/r.height}}
function isMiniPoint(p){return p.x>=VIEW_W-238&&p.x<=VIEW_W-18&&p.y>=18&&p.y<=238}
function nearestLaneAt(w){let best=0,bd=Infinity;for(let l=0;l<3;l++)for(let t=0;t<=1;t+=.015){const p=routePoint(l,t),d=Math.hypot(p.x-w.x,p.y-w.y);if(d<bd){bd=d;best=l}}return best}
function captureDown(e){if(e.target!==canvas)return;e.preventDefault();e.stopPropagation();const p=canvasPos(e);pointers.set(e.pointerId,p);canvas.setPointerCapture?.(e.pointerId);if(pointers.size===1)gesture={type:'pan',id:e.pointerId,start:p,last:p,moved:false};else if(pointers.size===2){const a=[...pointers.values()],dx=a[1].x-a[0].x,dy=a[1].y-a[0].y,m={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};gesture={type:'pinch',dist:Math.hypot(dx,dy),zoom:vZoom,anchor:screenToWorld(m.x,m.y)}}}
function captureMove(e){if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopPropagation();const p=canvasPos(e);pointers.set(e.pointerId,p);if(pointers.size>=2){const a=[...pointers.values()].slice(0,2),dx=a[1].x-a[0].x,dy=a[1].y-a[0].y,m={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};if(gesture?.type!=='pinch')gesture={type:'pinch',dist:Math.hypot(dx,dy),zoom:vZoom,anchor:screenToWorld(m.x,m.y)};vZoom=clampV(gesture.zoom*Math.hypot(dx,dy)/Math.max(20,gesture.dist),MIN_Z,MAX_Z);vCamX=gesture.anchor.x-m.x/vZoom;vCamY=gesture.anchor.y-m.y/vZoom;clampCam();updateBadge();return}if(gesture?.type==='pan'&&gesture.id===e.pointerId){const dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>7)gesture.moved=true;vCamX-=dx/vZoom;vCamY-=dy/vZoom;gesture.last=p;clampCam()}}
function captureUp(e){if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopPropagation();const p=canvasPos(e),g=gesture;pointers.delete(e.pointerId);if(g?.type==='pan'&&!g.moved){if(isMiniPoint(p)){const x0=VIEW_W-238,y0=18,pad=12,size=220,w={x:clampV((p.x-x0-pad)/(size-pad*2),0,1)*MAP_W,y:clampV((p.y-y0-pad)/(size-pad*2),0,1)*MAP_H};centerAt(w.x,w.y,vZoom)}else selectedLane=nearestLaneAt(screenToWorld(p.x,p.y))}if(pointers.size===1){const q=[...pointers.entries()][0];gesture={type:'pan',id:q[0],start:q[1],last:q[1],moved:true}}else gesture=null}
document.addEventListener('pointerdown',captureDown,true);document.addEventListener('pointermove',captureMove,true);document.addEventListener('pointerup',captureUp,true);document.addEventListener('pointercancel',captureUp,true);
document.addEventListener('wheel',e=>{if(e.target!==canvas)return;e.preventDefault();e.stopPropagation();const p=canvasPos(e),a=screenToWorld(p.x,p.y);vZoom=clampV(vZoom*Math.exp(-e.deltaY*.0015),MIN_Z,MAX_Z);vCamX=a.x-p.x/vZoom;vCamY=a.y-p.y/vZoom;clampCam();updateBadge()},{capture:true,passive:false});

updateBadge();
window.SL_MOBA_SQUARE_V2={routePoint,unitPos,structurePos,centerAt,get zoom(){return vZoom},get cameraY(){return vCamY},mapWidth:MAP_W,mapHeight:MAP_H,mapScale:MAP_SCALE,subLaneGap:SUB_LANE_GAP,routeLengths:Object.fromEntries(Object.entries(RM).map(([k,v])=>[k,v.total]))};
})();
