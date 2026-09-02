/* Stick Lanes — piso tecnológico v1
   Somente chão das lanes: metal escuro + detalhes de energia discretos por lado. */
(function(){
'use strict';
if(!window.SL_CAMERA_V5)return;

const ORANGE='#F08A24', RED='#C93645';
const METAL_EDGE='#0a1014', METAL_RIM='#151e24', METAL_BASE='#303a41', METAL_INNER='#252e34';
const MID=()=> (BASE_X[1]+BASE_X[-1])/2;
const z=()=>SL_CAMERA_V5.zoom, cy=()=>SL_CAMERA_V5.cameraY, worldH=()=>SL_CAMERA_V5.worldHeight;
const visibleW=()=>VIEW_W/z(), visibleH=()=>VIEW_H/z();

function tangent(lane,x){
  const d=70,a=Math.max(BASE_X[1],x-d),b=Math.min(BASE_X[-1],x+d);
  return Math.atan2(laneYAt(lane,b)-laneYAt(lane,a),b-a||1);
}
function lanePoint(lane,x,offset=0){
  const y=laneYAt(lane,x),a=tangent(lane,x),nx=-Math.sin(a),ny=Math.cos(a);
  return{x:x+nx*offset,y:y+ny*offset,a};
}
function pathSegment(lane,x1,x2,offset=0,step=80){
  ctx.beginPath();let first=true;
  for(let x=x1;x<=x2;x+=step){const p=lanePoint(lane,x,offset);if(first){ctx.moveTo(p.x,p.y);first=false}else ctx.lineTo(p.x,p.y)}
  const p=lanePoint(lane,x2,offset);ctx.lineTo(p.x,p.y);
}
function strokePath(lane,x1,x2,offset,width,color,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;pathSegment(lane,x1,x2,offset);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.restore();
}
function teamColorAt(x){return x<MID()?ORANGE:RED}

function drawLaneMetal(lane){
  const x1=BASE_X[1],x2=BASE_X[-1],width=lane===1?184:168;
  strokePath(lane,x1,x2,0,width+42,'rgba(0,0,0,.72)');
  strokePath(lane,x1,x2,0,width+30,METAL_EDGE);
  strokePath(lane,x1,x2,0,width+18,METAL_RIM);
  strokePath(lane,x1,x2,0,width,METAL_BASE);
  strokePath(lane,x1,x2,0,width-24,METAL_INNER);

  /* trilhos mecânicos laterais */
  strokePath(lane,x1,x2,-width*.39,8,'rgba(4,8,10,.9)');
  strokePath(lane,x1,x2, width*.39,8,'rgba(4,8,10,.9)');
  strokePath(lane,x1,x2,-width*.28,2,'rgba(165,181,188,.16)');
  strokePath(lane,x1,x2, width*.28,2,'rgba(165,181,188,.16)');

  /* sulco central discreto */
  ctx.save();ctx.setLineDash([36,24]);strokePath(lane,x1,x2,0,2,'rgba(190,202,207,.18)');ctx.restore();
}

function drawEnergySide(lane,x1,x2,color,width){
  if(x2<=x1)return;
  for(const off of [-width*.31,width*.31]){
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=6;ctx.globalAlpha=.82;
    pathSegment(lane,x1,x2,off,70);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();
    ctx.shadowBlur=0;ctx.globalAlpha=.34;pathSegment(lane,x1,x2,off,70);ctx.strokeStyle='#ffffff';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
  }
  /* pequenos segmentos energizados internos — sem preenchimento neon */
  for(let x=x1+260;x<x2-120;x+=720){
    const p=lanePoint(lane,x,0),a=p.a,c=Math.cos(a),s=Math.sin(a),len=76;
    ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=.72;ctx.lineWidth=3;ctx.shadowColor=color;ctx.shadowBlur=5;
    ctx.beginPath();ctx.moveTo(p.x-c*len*.5,p.y-s*len*.5);ctx.lineTo(p.x+c*len*.5,p.y+s*len*.5);ctx.stroke();ctx.restore();
  }
}

function drawPanelDetails(lane){
  if(z()<.28)return;
  const width=lane===1?184:168;
  for(let x=BASE_X[1]+360;x<BASE_X[-1]-260;x+=430){
    const p=lanePoint(lane,x,0),a=p.a,nx=-Math.sin(a),ny=Math.cos(a),tx=Math.cos(a),ty=Math.sin(a);
    const half=width*.42;
    ctx.save();ctx.strokeStyle='rgba(4,8,10,.72)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.x-nx*half,p.y-ny*half);ctx.lineTo(p.x+nx*half,p.y+ny*half);ctx.stroke();
    ctx.strokeStyle='rgba(195,207,212,.10)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-nx*(half-5)+tx*3,p.y-ny*(half-5)+ty*3);ctx.lineTo(p.x+nx*(half-5)+tx*3,p.y+ny*(half-5)+ty*3);ctx.stroke();
    const accent=teamColorAt(x);ctx.fillStyle=accent;ctx.globalAlpha=.55;
    for(const side of [-1,1]){const bx=p.x+nx*side*(half-13),by=p.y+ny*side*(half-13);ctx.beginPath();ctx.arc(bx,by,2.4,0,Math.PI*2);ctx.fill()}
    ctx.restore();
  }
}

function drawTechGround(){
  ctx.fillStyle='#071015';ctx.fillRect(0,0,WORLD_W,worldH());
  /* fundo neutro industrial, bem mais discreto que as lanes */
  if(z()>.24){
    ctx.save();ctx.strokeStyle='rgba(92,113,122,.055)';ctx.lineWidth=1;
    const step=360;for(let x=0;x<WORLD_W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,worldH());ctx.stroke()}
    for(let y=0;y<worldH();y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke()}ctx.restore();
  }
  const neutralGap=260;
  for(let lane=0;lane<3;lane++){
    const width=lane===1?184:168;drawLaneMetal(lane);drawPanelDetails(lane);
    drawEnergySide(lane,BASE_X[1]+80,MID()-neutralGap,ORANGE,width);
    drawEnergySide(lane,MID()+neutralGap,BASE_X[-1]-80,RED,width);
    /* centro metálico neutro onde os dois lados se encontram */
    strokePath(lane,MID()-neutralGap,MID()+neutralGap,-width*.31,3,'rgba(205,215,218,.22)');
    strokePath(lane,MID()-neutralGap,MID()+neutralGap, width*.31,3,'rgba(205,215,218,.22)');
  }
}

function drawMiniTech(){
  const size=214,x0=VIEW_W-size-18,y0=18,pad=12;
  ctx.fillStyle='rgba(3,7,9,.95)';ctx.beginPath();ctx.roundRect(x0,y0,size,size,14);ctx.fill();ctx.strokeStyle='#4d5d58';ctx.lineWidth=3;ctx.stroke();
  const sx=x=>x0+pad+(x/WORLD_W)*(size-pad*2),sy=y=>y0+pad+(y/worldH())*(size-pad*2);
  for(let l=0;l<3;l++){
    ctx.beginPath();for(let x=BASE_X[1];x<=BASE_X[-1];x+=250){let xx=sx(x),yy=sy(laneYAt(l,x));if(x===BASE_X[1])ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.strokeStyle='#59656b';ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();for(let x=BASE_X[1];x<=MID()-120;x+=250){let xx=sx(x),yy=sy(laneYAt(l,x));if(x===BASE_X[1])ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.strokeStyle=ORANGE;ctx.lineWidth=1.7;ctx.stroke();
    ctx.beginPath();let first=true;for(let x=MID()+120;x<=BASE_X[-1];x+=250){let xx=sx(x),yy=sy(laneYAt(l,x));if(first){ctx.moveTo(xx,yy);first=false}else ctx.lineTo(xx,yy)}ctx.strokeStyle=RED;ctx.lineWidth=1.7;ctx.stroke();
  }
  structures.forEach(s=>{if(s.dead)return;let x=sx(s.x),y=sy(laneYAt(s.lane,s.x));ctx.fillStyle=s.side===1?ORANGE:RED;ctx.beginPath();if(s.side===1)ctx.arc(x,y,s.auxiliary?2.7:4.2,0,Math.PI*2);else{let r=s.auxiliary?3.2:5;ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath()}ctx.fill()});
  let vx=sx(cameraX),vy=sy(cy()),vw=visibleW()/WORLD_W*(size-pad*2),vh=visibleH()/worldH()*(size-pad*2);ctx.strokeStyle='#fff2b0';ctx.lineWidth=2;ctx.strokeRect(vx,vy,vw,vh);
}

draw=function(t){
  ctx.fillStyle='#050a0d';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();ctx.scale(z(),z());ctx.translate(-cameraX,-cy());drawTechGround();drawBases(t);
  const x1=cameraX-340/z(),x2=cameraX+visibleW()+340/z();
  structures.forEach(s=>{if(!s.dead&&s.x>x1&&s.x<x2)drawTower(s,t)});
  units.filter(u=>u.x>x1&&u.x<x2&&yOf(u)>cy()-190/z()&&yOf(u)<cy()+visibleH()+190/z()).sort((a,b)=>yOf(a)-yOf(b)).forEach(u=>drawUnit(u,t));
  if(z()>.30)drawEffects(t);ctx.restore();drawMiniTech();
};

window.SL_TECH_LANE_GROUND_V1={version:'1.0',orange:ORANGE,red:RED};
})();