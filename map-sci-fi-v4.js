/* Stick Lanes — mapa sci-fi v4
   Direção: megastrutura metálica 2.5D, rotas laterais longas/flanqueadoras,
   rota central curta e altamente fortificada. */
'use strict';

(function(){
const SIDE_TRAVEL_FACTOR=0.76;
const CENTER_TOWER_HP=1.65;
const CENTER_TOWER_ATK=1.24;
const CENTER_TOWER_RANGE=5;
const CENTER_TOWER_DAMAGE_TAKEN=0.78;

const ROUTE_POINTS={
  0:[[0,500],[.045,420],[.105,260],[.18,145],[.27,112],[.36,185],[.47,132],[.57,205],[.68,145],[.78,118],[.875,235],[.945,405],[1,500]],
  1:[[0,500],[.08,500],[.17,487],[.28,518],[.40,493],[.50,500],[.61,515],[.73,484],[.84,505],[.92,500],[1,500]],
  2:[[0,500],[.045,580],[.105,735],[.18,855],[.27,895],[.36,815],[.47,868],[.57,790],[.68,855],[.78,892],[.875,765],[.945,595],[1,500]]
};

function routeY(lane,x){
  let t=clamp((x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),0,1),pts=ROUTE_POINTS[lane]||ROUTE_POINTS[1];
  for(let i=0;i<pts.length-1;i++){
    let a=pts[i],b=pts[i+1];
    if(t<=b[0]){
      let q=clamp((t-a[0])/(b[0]-a[0]),0,1),e=smooth(q);
      return lerp(a[1],b[1],e)
    }
  }
  return pts[pts.length-1][1]
}

laneYAt=function(lane,x){return routeY(lane,x)};
pathY=function(lane,sub,x,originSide=1){
  let spread=(sub||0)*SUB_GAP*subFactorForSide(originSide,x);
  return routeY(lane,x)+spread
};

/* Side lanes are not just visually longer: x progression is slower, so traversal
   is roughly 30% longer than the direct central route. */
move=function(u,x,dt){
  let d=x-u.x;if(Math.abs(d)<7){u.runTime=0;return}
  let now=simTime,slow=now<u.slowUntil?.92:1,routeFactor=u.lane===1?1:SIDE_TRAVEL_FACTOR;
  u.x+=Math.sign(d)*u.speed*MOVE_SCALE*slow*routeFactor*dt;
  u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70);
  u.lastMoved=now;u.runTime+=dt;
  if(u.fac==='Dinossauros'&&u.runTime>=1.5)u.chargeReady=true
};

/* 4 torres em cada lane continuam existindo, mas a lane central recebe uma
   muralha de defesa real: +65% HP, +24% dano, +5u de alcance e armadura extra. */
makeStructures=function(){
  structures=[];
  const layouts={
    0:{1:[2750,6100,9100,11150],'-1':[19750,16400,13400,11350]},
    1:{1:[2050,4200,6450,8750],'-1':[20450,18300,16050,13750]},
    2:{1:[2750,6100,9100,11150],'-1':[19750,16400,13400,11350]}
  };
  for(const side of [1,-1])for(let lane=0;lane<3;lane++)layouts[lane][side].forEach((x,i)=>{
    let base=towerTypes[i],heavy=lane===1;
    let hp=Math.round(base.hp*(heavy?CENTER_TOWER_HP:1));
    structures.push({
      side,lane,x,kind:'tower',...base,
      hp,maxHp:hp,
      atk:Math.round(base.atk*(heavy?CENTER_TOWER_ATK:1)),
      range:base.range+(heavy?CENTER_TOWER_RANGE:0),
      rate:base.rate*(heavy?.90:1),
      lastAttack:0,dead:false,fortified:true,breachUntil:-999,
      centerHeavy:heavy
    })
  })
};

const oldTowerDamageTaken=towerDamageTaken;
towerDamageTaken=function(s,t){
  let m=oldTowerDamageTaken(s,t);
  if(s.centerHeavy)m*=CENTER_TOWER_DAMAGE_TAKEN;
  return m
};

function sciGrad(y0,y1,c0,c1,c2){
  let g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,c0);g.addColorStop(.55,c1);g.addColorStop(1,c2);return g
}
function teamColors(side){return side===1?{dark:'#102b3b',mid:'#1e6f94',light:'#74d8ff',core:'#39bfff'}:{dark:'#40171d',mid:'#92333c',light:'#ff7f86',core:'#ff4455'}}
function plate(x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
}
function poly(points,fill,stroke,lw=2){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
}
function hex(x,y,r,fill,stroke,lw=2){
  let a=[];for(let i=0;i<6;i++){let q=Math.PI/3*i-Math.PI/6;a.push([x+Math.cos(q)*r,y+Math.sin(q)*r])}poly(a,fill,stroke,lw)
}
function visibleX(x,pad=500){return x>cameraX-pad&&x<cameraX+VIEW_W+pad}

const SECTORS=[
  {x:3100,lane:0,off:-108,type:'extract',label:'SETOR DE EXTRAÇÃO'},
  {x:6100,lane:0,off:94,type:'reactor'},
  {x:9000,lane:0,off:-96,type:'relay'},
  {x:13500,lane:0,off:-112,type:'lab',label:'LABORATÓRIO ABANDONADO'},
  {x:16600,lane:0,off:102,type:'relay'},
  {x:19500,lane:0,off:-98,type:'reactor'},
  {x:3000,lane:2,off:116,type:'conduit',label:'CONDUTOS DE ENERGIA'},
  {x:6200,lane:2,off:-102,type:'relay'},
  {x:9200,lane:2,off:106,type:'reactor'},
  {x:13550,lane:2,off:118,type:'garden',label:'JARDINS BIOLUMINESCENTES'},
  {x:16700,lane:2,off:-108,type:'relay'},
  {x:19400,lane:2,off:105,type:'conduit'}
];

function drawGroundTexture(){
  let bg=sciGrad(0,VIEW_H,'#09141e','#0b1119','#05090e');ctx.fillStyle=bg;ctx.fillRect(0,0,VIEW_W,VIEW_H);
  let haze=ctx.createRadialGradient(VIEW_W*.5,VIEW_H*.52,60,VIEW_W*.5,VIEW_H*.52,VIEW_W*.7);haze.addColorStop(0,'rgba(28,64,84,.18)');haze.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=haze;ctx.fillRect(0,0,VIEW_W,VIEW_H);
  for(let i=0;i<42;i++){
    let x=seeded(i*17+Math.floor(cameraX/900))*VIEW_W,y=90+seeded(i*31+4)*(VIEW_H-120),r=1+seeded(i*7)*2;
    ctx.fillStyle=i%5===0?'rgba(89,211,255,.12)':'rgba(255,255,255,.045)';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()
  }
  for(let i=0;i<7;i++){
    let x=((i*311-cameraX*.055)%2100+2100)%2100-150;ctx.fillStyle='rgba(22,46,62,.20)';poly([[x,110],[x+180,75],[x+310,145],[x+270,245],[x+60,260]],ctx.fillStyle)
  }
}

function drawAbyssPlatform(x,y,w,h,glow){
  ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(x,y+h*.34,w*.55,h*.22,0,0,Math.PI*2);ctx.fill();
  plate(x,y,w,h,18,'#111b24','#344657');
  plate(x,y-5,w-18,h-20,14,'#1d2730','#566675');
  ctx.strokeStyle=glow;ctx.globalAlpha=.45;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-w*.38,y-h*.16);ctx.lineTo(x+w*.38,y-h*.16);ctx.stroke();ctx.globalAlpha=1
}
function drawTechNode(x,y,type,sideHint=0){
  let c=sideHint?teamColors(sideHint):{dark:'#162a2e',mid:'#225d60',light:'#72f0e0',core:'#43e4cf'};
  ctx.save();ctx.translate(x,y);
  if(type==='garden'){
    for(let i=0;i<8;i++){let a=i/8*Math.PI*2,r=22+(i%3)*8,px=Math.cos(a)*r,py=Math.sin(a)*r*.55;ctx.fillStyle=i%2?'#8c4fc5':'#4c8d69';ctx.beginPath();ctx.arc(px,py,7+(i%3)*2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b56cff';ctx.beginPath();ctx.arc(px-2,py-2,2.5,0,Math.PI*2);ctx.fill()}
    hex(0,0,31,'#17222b','#8d5bc5',3)
  }else if(type==='extract'){
    drawAbyssPlatform(0,0,100,62,c.core);for(let q=-1;q<=1;q+=2){ctx.fillStyle='#173942';ctx.beginPath();ctx.ellipse(q*28,-8,17,23,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.light;ctx.lineWidth=3;ctx.stroke()}
  }else if(type==='lab'){
    drawAbyssPlatform(0,0,122,66,'#a45cff');for(let q=-1;q<=1;q+=2){ctx.fillStyle='#302343';ctx.beginPath();ctx.arc(q*29,-10,18,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a55cff';ctx.lineWidth=3;ctx.stroke()};ctx.fillStyle='#6c3fa5';ctx.fillRect(-44,-40,88,13)
  }else if(type==='conduit'){
    for(let q=-1;q<=1;q+=2){ctx.strokeStyle='#4ce1d0';ctx.lineWidth=8;ctx.beginPath();ctx.arc(q*25,0,20,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#18383b';ctx.beginPath();ctx.arc(q*25,0,12,0,Math.PI*2);ctx.fill()};ctx.strokeStyle='#57f3df';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke()
  }else if(type==='relay'){
    hex(0,6,34,'#19252e','#4b5c68',3);ctx.fillStyle='#243b46';ctx.fillRect(-12,-44,24,52);ctx.fillStyle='#8a63d2';poly([[-10,-44],[0,-66],[10,-44],[0,-32]],'#8a63d2','#c5a7ff',2)
  }else{
    hex(0,5,39,'#15212a','#40515d',3);ctx.fillStyle='#213b48';ctx.beginPath();ctx.arc(0,-9,21,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.light;ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=c.core;ctx.beginPath();ctx.arc(0,-9,7,0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
}
function drawWorldDecor(t){
  for(const s of SECTORS){
    if(!visibleX(s.x,300))continue;let y=routeY(s.lane,s.x)+s.off;
    drawTechNode(s.x,y,s.type,s.x<WORLD_W*.5?1:-1);
    if(s.label){ctx.fillStyle='rgba(5,10,16,.82)';plate(s.x,y+(s.off<0?-64:66),190,28,7,'rgba(5,10,16,.82)','#466170');ctx.fillStyle='#d9edf6';ctx.font='700 12px system-ui';ctx.textAlign='center';ctx.fillText(s.label,s.x,y+(s.off<0?-60:70))}
  }
  for(let x=1800;x<WORLD_W;x+=2600){
    if(!visibleX(x))continue;let y=500+(seeded(x)*2-1)*170,g=ctx.createLinearGradient(0,y,0,y+190);g.addColorStop(0,'rgba(70,215,255,.30)');g.addColorStop(1,'rgba(70,215,255,0)');ctx.fillStyle=g;ctx.fillRect(x-7,y,14,190)
  }
}

function pathMainV4(lane,sub=0){
  ctx.beginPath();let first=true;for(let x=BASE_X[1];x<=BASE_X[-1];x+=75){let y=pathY(lane,sub,x,1);if(first){ctx.moveTo(x,y);first=false}else ctx.lineTo(x,y)}
}
function drawRoads(){
  for(let lane=0;lane<3;lane++){
    let heavy=lane===1,roadW=heavy?190:172;
    pathMainV4(lane,0);ctx.strokeStyle='rgba(0,0,0,.65)';ctx.lineWidth=roadW+38;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    pathMainV4(lane,0);ctx.strokeStyle='#202a33';ctx.lineWidth=roadW+18;ctx.stroke();
    pathMainV4(lane,0);ctx.strokeStyle=heavy?'#4a4341':'#343e46';ctx.lineWidth=roadW;ctx.stroke();
    pathMainV4(lane,0);ctx.strokeStyle=lane===selectedLane?(heavy?'rgba(255,92,92,.28)':'rgba(80,190,255,.24)'):'rgba(255,255,255,.035)';ctx.lineWidth=roadW-15;ctx.stroke();
    [-1,0,1].forEach(sub=>{
      pathMainV4(lane,sub);ctx.strokeStyle=sub===0?(heavy?'#6d5b55':'#59636a'):'#46515a';ctx.lineWidth=43;ctx.stroke();
      pathMainV4(lane,sub);ctx.strokeStyle=sub===0?'rgba(255,178,122,.17)':'rgba(90,206,255,.12)';ctx.lineWidth=3;ctx.setLineDash([18,25]);ctx.stroke();ctx.setLineDash([])
    });
    [-1,1].forEach(edge=>{pathMainV4(lane,edge*1.62);ctx.strokeStyle=heavy?'#8b4f4e':'#556d79';ctx.lineWidth=5;ctx.setLineDash([24,11]);ctx.stroke();ctx.setLineDash([])});
  }
  drawRoutePlaques()
}
function drawRoutePlaques(){
  let x=WORLD_W*.50;
  const rows=[
    [0,'ROTA SUPERIOR','FLANCO • +30% DE PERCURSO','#6acfff',-70],
    [1,'ROTA CENTRAL','CURTA • DEFESA PESADA','#ff7c77',-74],
    [2,'ROTA INFERIOR','FLANCO • +30% DE PERCURSO','#6acfff',70]
  ];
  for(const [lane,title,sub,color,off] of rows){if(!visibleX(x,160))continue;let y=routeY(lane,x)+off;plate(x,y,250,48,8,'rgba(5,10,16,.88)',color);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='800 14px system-ui';ctx.fillText(title,x,y-4);ctx.fillStyle='#d7e1e8';ctx.font='11px system-ui';ctx.fillText(sub,x,y+14)}
}

function drawBaseSpire(side,t){
  let x=BASE_X[side],y=BASE_Y,c=teamColors(side),dir=side;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.ellipse(0,70,176,46,0,0,Math.PI*2);ctx.fill();
  poly([[-150,-18],[-105,-83],[105,-83],[150,-18],[126,70],[-126,70]],'#18232c','#455867',4);
  poly([[-126,-20],[-84,-66],[84,-66],[126,-20],[106,48],[-106,48]],c.dark,c.mid,3);
  for(let q=-1;q<=1;q+=2){
    hex(q*104,-8,38,'#1c2b35',c.mid,3);ctx.fillStyle=c.mid;ctx.fillRect(q*104-13,-62,26,53);ctx.fillStyle=c.light;ctx.fillRect(q*104-5,-68,10,30)
  }
  hex(0,3,66,'#131d25',c.mid,5);hex(0,-4,48,c.dark,c.light,3);
  let pulse=.84+.16*Math.sin(t*2.4);ctx.globalAlpha=.35*pulse;ctx.fillStyle=c.core;ctx.beginPath();ctx.arc(0,-31,54,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=c.core;poly([[-26,-38],[0,-136],[26,-38],[13,-2],[-13,-2]],c.core,c.light,3);
  ctx.fillStyle='rgba(255,255,255,.75)';poly([[-7,-73],[0,-120],[7,-73],[2,-44],[-2,-44]],'rgba(255,255,255,.72)');
  ctx.save();ctx.scale(dir,1);plate(142,18,62,76,12,'#0b1117',c.mid);ctx.fillStyle=c.core;ctx.fillRect(164,-6,7,48);ctx.restore();
  plate(0,-173,190,13,6,'#0b0e12');plate(-95+190*(baseHp(side)/BASE_HP)/2,-173,190*(baseHp(side)/BASE_HP),9,5,'#43a768');
  ctx.fillStyle='#eaf5fb';ctx.font='800 15px system-ui';ctx.textAlign='center';ctx.fillText(side===1?'BASE ALIADA':'BASE INIMIGA',0,-194);ctx.restore()
}
drawBases=function(t){for(const side of [1,-1])drawBaseSpire(side,t)};

function towerTeam(s){return teamColors(s.side)}
function drawTower(s,t){
  if(s.dead)return;let x=s.x,y=laneYAt(s.lane,s.x),tier=s.visualTier||1,c=towerTeam(s),heavy=!!s.centerHeavy;
  drawTowerRange(s);
  ctx.save();ctx.translate(x,y);let sc=(.82+tier*.09)*(heavy?1.22:1);ctx.scale(sc,sc);
  ctx.fillStyle='rgba(0,0,0,.46)';ctx.beginPath();ctx.ellipse(0,49,heavy?70:52,heavy?18:14,0,0,Math.PI*2);ctx.fill();
  hex(0,19,heavy?54:43,'#101920','#4b5a65',3);hex(0,7,heavy?46:36,c.dark,c.mid,3);
  ctx.fillStyle='#222d35';ctx.fillRect(-(heavy?34:27),-42-(tier*5),heavy?68:54,52+tier*5);
  ctx.strokeStyle=c.mid;ctx.lineWidth=3;ctx.strokeRect(-(heavy?34:27),-42-(tier*5),heavy?68:54,52+tier*5);
  for(let q=-1;q<=1;q+=2){ctx.fillStyle=c.core;ctx.globalAlpha=.72;ctx.fillRect(q*(heavy?27:22)-3,-34-tier*5,6,30+tier*4);ctx.globalAlpha=1}
  if(tier>=2||heavy){for(let q=-1;q<=1;q+=2){hex(q*(heavy?48:38),-5,heavy?20:15,'#18242d',c.mid,2);ctx.fillStyle=c.core;ctx.beginPath();ctx.arc(q*(heavy?48:38),-8,5,0,Math.PI*2);ctx.fill()}}
  hex(0,-48-tier*6,heavy?25:19,'#17232c',c.light,3);ctx.fillStyle=c.core;poly([[-10,-52-tier*6],[0,-82-tier*9],[10,-52-tier*6],[4,-35-tier*6],[-4,-35-tier*6]],c.core,c.light,2);
  ctx.save();ctx.scale(s.side,1);let gy=-37-tier*4;
  if(heavy){for(let by of [-8,8]){ctx.strokeStyle='#090d12';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(20,gy+by);ctx.lineTo(78+tier*6,gy+by-2);ctx.stroke();ctx.strokeStyle=c.light;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(22,gy+by-2);ctx.lineTo(78+tier*6,gy+by-4);ctx.stroke()}}
  else{ctx.strokeStyle='#0a0f14';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(14,gy);ctx.lineTo(63+tier*6,gy-2);ctx.stroke();ctx.strokeStyle=c.light;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(16,gy-2);ctx.lineTo(63+tier*6,gy-4);ctx.stroke()}
  ctx.restore();
  if(s.fortified){let pulse=.52+.18*Math.sin(t*3+s.lane);ctx.globalAlpha=pulse;ctx.strokeStyle=c.light;ctx.lineWidth=heavy?5:3;ctx.beginPath();ctx.ellipse(0,-10,heavy?68:51,heavy?37:29,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  let hp=Math.max(0,s.hp/s.maxHp);plate(0,-112-tier*8,heavy?118:98,10,5,'#080b0e');plate(-(heavy?59:49)+(heavy?118:98)*hp/2,-112-tier*8,(heavy?118:98)*hp,7,4,hp>.45?'#45b96b':hp>.2?'#e5ad48':'#df5a61');
  if(heavy){plate(0,67,145,27,7,'rgba(55,20,24,.90)','#a84b52');ctx.fillStyle='#ffb0ad';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText('BASTIÃO CENTRAL • '+Math.round(s.maxHp)+' HP',0,71)}
  else{plate(0,62,120,24,6,'rgba(9,18,25,.88)',c.mid);ctx.fillStyle='#d8edf7';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText(s.label+' • '+s.range+'u',0,66)}
  ctx.restore()
};

function drawMiniMap(){
  const x0=20,y0=16,w=VIEW_W-40,h=58;
  plate(x0+w/2,y0+h/2,w,h,10,'rgba(4,9,14,.88)','#314553');
  const sx=x=>x0+(x/WORLD_W)*w,sy=y=>y0+5+(y/VIEW_H)*(h-10);
  for(let lane=0;lane<3;lane++){
    ctx.beginPath();for(let x=BASE_X[1];x<=BASE_X[-1];x+=250){let xx=sx(x),yy=sy(routeY(lane,x));if(x===BASE_X[1])ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}
    ctx.strokeStyle=lane===1?'rgba(255,109,109,.75)':'rgba(95,194,255,.65)';ctx.lineWidth=lane===1?3:2;ctx.stroke()
  }
  for(const s of structures){if(s.dead)continue;ctx.fillStyle=s.side===1?'#74d8ff':'#ff6b72';ctx.fillRect(sx(s.x)-2,sy(routeY(s.lane,s.x))-2,4,4)}
  ctx.fillStyle='#78d9ff';ctx.beginPath();ctx.arc(sx(BASE_X[1]),sy(BASE_Y),5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff606d';ctx.beginPath();ctx.arc(sx(BASE_X[-1]),sy(BASE_Y),5,0,Math.PI*2);ctx.fill();
  let vx=x0+(cameraX/WORLD_W)*w,vw=(VIEW_W/WORLD_W)*w;ctx.strokeStyle='#fff3bd';ctx.lineWidth=2;ctx.strokeRect(vx,y0+3,vw,h-6)
}

draw=function(t){
  drawGroundTexture();
  ctx.save();ctx.translate(-cameraX,0);drawWorldDecor(t);drawRoads();drawBases(t);
  structures.forEach(s=>{if(s.x>cameraX-s.range*PX-260&&s.x<cameraX+VIEW_W+s.range*PX+260)drawTower(s,t)});
  units.filter(u=>u.x>cameraX-200&&u.x<cameraX+VIEW_W+200).sort((a,b)=>yOf(a)-yOf(b)).forEach(u=>drawUnit(u,t));
  drawEffects(t);ctx.restore();drawMiniMap()
};

window.SL_MAP_V4={theme:'sci-fi-megastructure',sideTravelFactor:SIDE_TRAVEL_FACTOR,centerTowerHp:CENTER_TOWER_HP,centerTowerAtk:CENTER_TOWER_ATK,centerTowerDamageTaken:CENTER_TOWER_DAMAGE_TAKEN};
})();
