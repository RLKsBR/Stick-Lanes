/* Stick Lanes — aplicação visual lote 01
   Robôs, Lobos, Zumbis, Samurais e Artrópodes.
   Camada visual: não altera stats, IA ou balanceamento. */
(function(){
'use strict';

const LOT01=new Set(['Robôs','Lobos','Zumbis','Samurais','Artrópodes']);
const TEAM_VISUAL={
  1:{primary:'#ff9a2f',dark:'#6a3514',soft:'rgba(255,154,47,.20)',label:'TIME LARANJA',shape:'round'},
  '-1':{primary:'#d9363e',dark:'#651a20',soft:'rgba(217,54,62,.20)',label:'TIME VERMELHO',shape:'sharp'}
};

/* O time é uma camada separada da paleta da facção. */
teamTheme=function(side){return TEAM_VISUAL[side]||TEAM_VISUAL[1]};

const oldDrawUnit=drawUnit;
const oldDrawTower=drawTower;
const oldDrawAuxTurret=drawAuxTurret;

function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function limb(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly(points,fill,stroke=null,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function eye(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function footCycle(t,u,m=1){return Math.sin(t*7*m+u.anim)}
function facing(u){return u.side===1?1:-1}

/* Marcadores redundantes: cor + forma. Nunca recolorem a unidade. */
drawTeamMarker=function(u,t){
  const team=teamTheme(u.side),pulse=.92+Math.sin(t*4+u.anim)*.05;
  ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle=team.primary;ctx.fillStyle=team.soft;ctx.lineWidth=u.minion?4:3;
  if(team.shape==='sharp'){
    ctx.beginPath();ctx.moveTo(0,46);ctx.lineTo(34,36);ctx.lineTo(0,29);ctx.lineTo(-34,36);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-28,31);ctx.lineTo(-19,38);ctx.lineTo(-10,31);ctx.moveTo(10,31);ctx.lineTo(19,38);ctx.lineTo(28,31);ctx.stroke();
  }else{
    ctx.beginPath();ctx.ellipse(0,37,u.minion?26:34,u.minion?8:10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,37,u.minion?18:24,Math.PI*.12,Math.PI*.88);ctx.stroke();
  }
  ctx.globalAlpha=1;ctx.fillStyle=team.dark;ctx.strokeStyle=team.primary;ctx.lineWidth=2;
  if(team.shape==='sharp')poly([[0,-80],[10,-70],[0,-62],[-10,-70]],team.dark,team.primary,2);
  else{ctx.beginPath();ctx.arc(0,-70,7,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.restore();
};

function drawRobot(u,t,p){
  const ph=footCycle(t,u),f=facing(u),heavy=u.role==='tank'||u.role==='elite'||u.role==='unique',drone=/Drone|Pulso EMP|Núcleo/.test(u.name),spider=/Aranha Mecânica/.test(u.name);
  ctx.save();ctx.scale(f,1);
  if(drone){
    ctx.fillStyle=p[0];rr(-25,-35,50,27,9);ctx.fill();ctx.fillStyle=p[2];rr(-15,-29,30,8,4);ctx.fill();
    limb(-34,-18,-18,-18,5,p[1]);limb(18,-18,34,-18,5,p[1]);eye(0,-24,5,'#d9ffff');
    if(/Míssil/.test(u.name)){poly([[-24,-8],[-34,4],[-18,1]],p[2]);poly([[24,-8],[34,4],[18,1]],p[2])}
  }else if(spider){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-18,25,18,0,0,Math.PI*2);ctx.fill();eye(12,-23,4,p[1]);
    for(let i=0;i<4;i++){let sy=-24+i*8,dy=(i<2?-1:1)*(18+i*3);limb(-15,sy,-38,sy+dy*.25,5,p[2]);limb(-38,sy+dy*.25,-48,18+ph*(i%2?4:-4),4,p[1]);limb(15,sy,38,sy+dy*.25,5,p[2]);limb(38,sy+dy*.25,48,18-ph*(i%2?4:-4),4,p[1])}
  }else{
    const bw=heavy?34:27,bh=heavy?38:32;
    ctx.fillStyle=p[0];rr(-bw,-42,bw*2,bh,heavy?8:5);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#19252c';rr(-18,-34,36,13,4);ctx.fill();eye(9,-28,4,p[1]);
    if(u.role==='tank'){ctx.fillStyle=p[2];rr(-42,-30,12,40,5);ctx.fill();rr(30,-30,12,40,5);ctx.fill()}
    limb(-18,-5,-22,25+ph*4,heavy?9:6,p[2]);limb(18,-5,22,25-ph*4,heavy?9:6,p[2]);
    limb(-22,25+ph*4,-30,36,heavy?10:7,p[0]);limb(22,25-ph*4,30,36,heavy?10:7,p[0]);
    if(u.role==='ranged'||u.role==='siege'){limb(20,-24,49,-25,heavy?10:7,'#172028');limb(22,-26,52,-27,3,p[1])}
    else{limb(-bw+4,-25,-45,-2+ph*4,heavy?9:6,p[2]);limb(bw-4,-25,45,-4-ph*4,heavy?9:6,p[2])}
  }
  ctx.restore();
}

function drawWolf(u,t,p){
  const ph=footCycle(t,u,1.15),f=facing(u),heavy=u.role==='tank'||u.role==='elite'||u.role==='unique',runner=u.role==='assassin'||u.role==='skirmisher';
  ctx.save();ctx.scale(f,1);
  const bodyW=heavy?43:runner?36:39,bodyH=heavy?25:20;
  ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-3,-10,bodyW,bodyH,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(19,-30);ctx.lineTo(32,-47);ctx.lineTo(45,-31);ctx.lineTo(43,-7);ctx.lineTo(24,-4);ctx.closePath();ctx.fill();
  poly([[29,-43],[34,-57],[39,-43]],p[0]);poly([[41,-42],[48,-54],[49,-37]],p[0]);
  eye(39,-30,3,'#f4e5b4');ctx.fillStyle='#171818';ctx.beginPath();ctx.arc(48,-24,3,0,Math.PI*2);ctx.fill();
  limb(-33,-14,-54,-30-ph*5,heavy?9:6,p[0]);
  const stride=runner?11:7;
  limb(-24,4,-27,34+ph*stride,heavy?9:6,p[0]);limb(-3,6,-7,35-ph*stride,heavy?9:6,p[0]);limb(16,5,20,34+ph*stride,heavy?9:6,p[0]);limb(30,1,34,32-ph*stride,heavy?9:6,p[0]);
  if(u.name.includes('Couraçado')||u.name.includes('Guerra')){ctx.fillStyle='#4b4d50';rr(-30,-28,48,16,6);ctx.fill();ctx.strokeStyle=p[1];ctx.lineWidth=3;ctx.stroke()}
  if(u.name.includes('Xamã')){ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.beginPath();ctx.arc(24,-14,20,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++)eye(9+i*9,-2,2,'#d9d1bc')}
  if(u.name.includes('Arremessador')){ctx.fillStyle='#5c4c3d';rr(-24,-44,44,18,5);ctx.fill();limb(3,-40,34,-54,7,'#d8d0bd')}
  if(u.role==='unique'){ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(-25,-30);ctx.quadraticCurveTo(0,-50,27,-34);ctx.lineTo(15,-21);ctx.lineTo(-22,-18);ctx.closePath();ctx.fill()}
  ctx.restore();
}

function drawZombie(u,t,p){
  const ph=footCycle(t,u,.72),f=facing(u),heavy=u.role==='tank'||u.role==='elite'||u.role==='unique',crawl=/Rastejante/.test(u.name);
  ctx.save();ctx.scale(f,1);ctx.rotate(-.08+Math.sin(t*2+u.anim)*.025);
  if(crawl){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,2,35,15,0,0,Math.PI*2);ctx.fill();limb(-18,2,-43,25+ph*5,6,p[1]);limb(12,2,39,24-ph*5,6,p[1]);eye(23,-2,3,'#c9d0a0');
  }else{
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-38,heavy?16:13,15,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p[1];poly([[-20,-25],[heavy?-29:-23,10],[22,14],[18,-28]],p[1]);
    limb(-13,8,-20,37+ph*5,heavy?11:7,p[0]);limb(12,10,20,36-ph*4,heavy?11:7,p[0]);
    limb(-17,-20,-38,-5+ph*6,heavy?10:6,p[0]);limb(17,-18,38,-1-ph*5,heavy?10:6,p[0]);
    eye(5,-41,3,'#dbe0b0');ctx.strokeStyle='#342a24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,-31);ctx.lineTo(8,-28);ctx.stroke();
    if(u.role==='ranged'){ctx.fillStyle='#69794f';ctx.beginPath();ctx.ellipse(21,-15,10,15,.4,0,Math.PI*2);ctx.fill()}
    if(u.name.includes('Gritador')){ctx.fillStyle='#1a1413';ctx.beginPath();ctx.ellipse(2,-33,7,10,0,0,Math.PI*2);ctx.fill()}
    if(u.name.includes('Catapulta')){ctx.fillStyle='#4e3d32';rr(-37,-8,74,22,5);ctx.fill();limb(0,-10,42,-43,8,'#6e5948')}
  }
  ctx.restore();
}

function drawSamurai(u,t,p){
  const ph=footCycle(t,u,.9),f=facing(u),heavy=u.role==='tank'||u.role==='elite'||u.role==='unique',bow=/Yumi|Yabusame/.test(u.name),gun=/Tanegashima|Mosqueteiro/.test(u.name);
  ctx.save();ctx.scale(f,1);
  /* pernas e saia lamelar */
  limb(-10,5,-13,34+ph*4,heavy?8:6,'#181b20');limb(10,5,13,34-ph*4,heavy?8:6,'#181b20');
  ctx.fillStyle=p[1];poly([[-22,-18],[22,-18],[28,15],[-28,15]],p[1],p[0],2);for(let y=-13;y<12;y+=8){ctx.strokeStyle=p[0];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-24,y);ctx.lineTo(24,y);ctx.stroke()}
  ctx.fillStyle='#d4b899';ctx.beginPath();ctx.arc(0,-43,11,0,Math.PI*2);ctx.fill();
  /* kabuto */ctx.fillStyle=p[0];ctx.beginPath();ctx.arc(0,-48,17,Math.PI,Math.PI*2);ctx.fill();poly([[-18,-48],[18,-48],[13,-38],[-14,-38]],p[0]);
  if(heavy){poly([[-4,-62],[0,-75],[5,-62]],p[2]);}
  if(bow){ctx.strokeStyle='#b28b52';ctx.lineWidth=4;ctx.beginPath();ctx.arc(22,-20,30,-Math.PI*.55,Math.PI*.55);ctx.stroke();limb(13,-25,37,-27,2,'#e3d4b3')}
  else if(gun){limb(12,-25,53,-31,6,'#4a3428');limb(18,-28,55,-34,2,p[2])}
  else if(u.name.includes('Naginata')){limb(14,-20,56,-40,5,'#6f553b');poly([[52,-44],[66,-51],[58,-34]],'#cbd0d2')}
  else{limb(15,-18,48,-36,5,'#3b2b22');ctx.strokeStyle='#d7d9da';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(43,-36);ctx.lineTo(58,-47);ctx.stroke()}
  limb(-18,-16,-30,-2+ph*3,6,p[0]);
  ctx.restore();
}

function drawArthropod(u,t,p){
  const ph=footCycle(t,u,1.2),f=facing(u),name=u.name;
  ctx.save();ctx.scale(f,1);
  if(/Aranha|Aracnídeo/.test(name)){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-8,-10,25,18,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(19,-13,18,15,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<4;i++){let y=-19+i*7;limb(-5,y,-36,y-13+i*8,5,p[1]);limb(-36,y-13+i*8,-48,24+(i%2?ph:-ph)*5,4,p[2]);limb(9,y,38,y-13+i*8,5,p[1]);limb(38,y-13+i*8,49,24+(i%2?-ph:ph)*5,4,p[2])}eye(25,-17,3,'#efe7b0');
  }else if(/Centopeia/.test(name)){
    ctx.strokeStyle=p[0];ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-42,-8);for(let i=0;i<8;i++)ctx.lineTo(-32+i*10,-8+Math.sin(t*5+u.anim+i*.7)*4);ctx.stroke();for(let i=0;i<8;i++){let x=-34+i*10,yy=-4+Math.sin(t*5+u.anim+i*.7)*4;limb(x,yy,x-3,24+(i%2?ph:-ph)*4,3,p[1])}
  }else if(/Vespa/.test(name)){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-20,25,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p[2];ctx.fillRect(-8,-31,7,22);ctx.fillRect(7,-30,6,20);ctx.globalAlpha=.45;ctx.fillStyle='#e9eadb';ctx.beginPath();ctx.ellipse(-7,-39,21,8,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(8,-39,21,8,.35,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;poly([[24,-20],[41,-14],[25,-8]],p[1]);
  }else if(/Escorpião/.test(name)){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-4,-7,30,17,0,0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){limb(-14+i*12,3,-31+i*9,29+(i%2?ph:-ph)*4,5,p[1]);limb(9+i*9,1,31+i*7,27+(i%2?-ph:ph)*4,5,p[1])}limb(19,-11,41,-25,6,p[2]);ctx.strokeStyle=p[2];ctx.lineWidth=8;ctx.beginPath();ctx.arc(28,-23,24,.2,-1.8,true);ctx.stroke();poly([[15,-46],[20,-60],[27,-46]],p[1]);
  }else if(/Louva-a-Deus/.test(name)){
    limb(-4,-9,-7,32+ph*4,5,p[1]);limb(8,-8,13,32-ph*4,5,p[1]);ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-18,15,28,0,0,Math.PI*2);ctx.fill();poly([[0,-52],[18,-41],[0,-32],[-17,-41]],p[2]);limb(9,-34,34,-16,6,p[1]);limb(34,-16,22,5,6,p[2]);limb(-9,-34,-34,-16,6,p[1]);limb(-34,-16,-22,5,6,p[2]);
  }else{
    const tank=/Besouro|Massa|Rainha/.test(name);ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-4,-13,tank?34:27,tank?25:19,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-36);ctx.lineTo(-4,10);ctx.stroke();for(let i=0;i<3;i++){let x=-19+i*18;limb(x,-2,x-12,29+(i%2?ph:-ph)*5,5,p[1]);limb(x+10,-1,x+19,28+(i%2?-ph:ph)*5,5,p[1])}if(/Ácido|Artilheiro/.test(name)){ctx.fillStyle='#6d8a3f';ctx.beginPath();ctx.ellipse(-25,-15,17,13,0,0,Math.PI*2);ctx.fill()}if(/Rainha/.test(name)){ctx.beginPath();ctx.ellipse(-27,-12,30,22,0,0,Math.PI*2);ctx.fill()}
  }
  ctx.restore();
}

function customSprite(u,t,p){
  if(u.fac==='Robôs')drawRobot(u,t,p);
  else if(u.fac==='Lobos')drawWolf(u,t,p);
  else if(u.fac==='Zumbis')drawZombie(u,t,p);
  else if(u.fac==='Samurais')drawSamurai(u,t,p);
  else if(u.fac==='Artrópodes')drawArthropod(u,t,p);
}

drawUnit=function(u,t){
  if(!LOT01.has(u.fac))return oldDrawUnit(u,t);
  const y=yOf(u),meta=facMeta(u.fac),p=meta.palette,team=teamTheme(u.side),bob=Math.sin(t*5+u.anim)*(u.role==='tank'?1:2);
  const roleScale=u.role==='tank'?[1.13,.96]:u.role==='assassin'?[.9,1.04]:u.role==='siege'?[1.13,.93]:[1,1];
  const sc=(.9+y/VIEW_H*.18)*(u.role==='unique'?1.34:u.role==='elite'?1.18:u.minion?.76:1);
  ctx.save();ctx.translate(u.x,y+bob);ctx.scale(sc*roleScale[0],sc*roleScale[1]);
  ctx.fillStyle='rgba(0,0,0,.27)';ctx.beginPath();ctx.ellipse(0,39,u.minion?24:32,u.minion?7:10,0,0,Math.PI*2);ctx.fill();
  drawTeamMarker(u,t);customSprite(u,t,p);
  if(u.role==='elite'||u.role==='unique'){
    ctx.globalAlpha=.75;ctx.strokeStyle=p[2];ctx.lineWidth=u.role==='unique'?4:2;ctx.beginPath();ctx.arc(0,-10,u.role==='unique'?42:35,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  ctx.fillStyle='rgba(10,11,13,.88)';rr(-31,-68,62,8,4);ctx.fill();ctx.fillStyle=team.primary;rr(-31,-68,62*Math.max(0,u.hp/u.maxHp),8,4);ctx.fill();
  if(!u.minion){ctx.fillStyle='rgba(10,12,14,.88)';rr(-53,51,106,21,6);ctx.fill();ctx.strokeStyle=team.primary;ctx.lineWidth=1.5;rr(-53,51,106,21,6);ctx.stroke();ctx.fillStyle='#f2ecdf';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(u.name,0,65)}
  ctx.restore();
};

/* Estruturas ficam neutras; o ownership é mostrado por detalhes de time. */
function structureAccent(s){
  const team=teamTheme(s.side);ctx.strokeStyle=team.primary;ctx.fillStyle=team.primary;ctx.lineWidth=4;
  if(team.shape==='sharp'){poly([[-22,-72],[0,-84],[22,-72],[0,-62]],team.dark,team.primary,3)}
  else{ctx.beginPath();ctx.arc(0,-73,11,0,Math.PI*2);ctx.fill();ctx.stroke()}
}
drawTower=function(s,t){oldDrawTower(s,t);if(s.dead)return;const x=s.x,y=structureY(s);ctx.save();ctx.translate(x,y);structureAccent(s);ctx.restore()};
drawAuxTurret=function(s,t){oldDrawAuxTurret(s,t);if(s.dead)return;const x=s.x,y=structureY(s);ctx.save();ctx.translate(x,y+3);ctx.scale(.72,.72);structureAccent(s);ctx.restore()};

/* Minimapa quadrado: visão estratégica e identificação por forma+cor. */
drawMiniMap=function(){
  const size=205,pad=18,x0=VIEW_W-size-pad,y0=18;
  ctx.save();ctx.fillStyle='rgba(8,11,12,.91)';rr(x0-7,y0-7,size+14,size+14,12);ctx.fill();ctx.strokeStyle='rgba(235,229,210,.28)';ctx.lineWidth=2;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.rect(x0,y0,size,size);ctx.clip();
  ctx.fillStyle='#273126';ctx.fillRect(x0,y0,size,size);
  for(let lane=0;lane<3;lane++){
    ctx.strokeStyle=lane===selectedLane?'#b9aa7d':'#756d55';ctx.lineWidth=lane===selectedLane?7:5;ctx.lineCap='round';ctx.beginPath();
    for(let x=BASE_X[1];x<=BASE_X[-1];x+=450){let mx=x0+(x/WORLD_W)*size,my=y0+(laneYAt(lane,x)/VIEW_H)*size;if(x===BASE_X[1])ctx.moveTo(mx,my);else ctx.lineTo(mx,my)}ctx.stroke();
  }
  structures.forEach(s=>{if(s.dead)return;let team=teamTheme(s.side),mx=x0+(s.x/WORLD_W)*size,my=y0+(structureY(s)/VIEW_H)*size;ctx.fillStyle=team.primary;if(team.shape==='sharp')poly([[mx,my-3],[mx+3,my],[mx,my+3],[mx-3,my]],team.primary);else{ctx.beginPath();ctx.arc(mx,my,3,0,Math.PI*2);ctx.fill()}});
  units.filter(u=>!u.dead).forEach(u=>{let team=teamTheme(u.side),mx=x0+(u.x/WORLD_W)*size,my=y0+(yOf(u)/VIEW_H)*size;ctx.fillStyle=team.primary;if(team.shape==='sharp'){ctx.fillRect(mx-2,my-2,4,4)}else{ctx.beginPath();ctx.arc(mx,my,2,0,Math.PI*2);ctx.fill()}});
  const t1=teamTheme(1),t2=teamTheme(-1);ctx.fillStyle=t1.primary;ctx.beginPath();ctx.arc(x0+5,y0+size/2,7,0,Math.PI*2);ctx.fill();poly([[x0+size-5,y0+size/2-7],[x0+size+2,y0+size/2],[x0+size-5,y0+size/2+7],[x0+size-12,y0+size/2]],t2.primary);
  ctx.restore();ctx.fillStyle='#e9e2d3';ctx.font='700 11px system-ui';ctx.textAlign='left';ctx.fillText('MAPA TÁTICO',x0,y0+size+4);ctx.restore();
};

window.SL_VISUAL_LOTE_01='2026-09-01';
})();
