/* Stick Lanes — aplicação visual lote 02
   Mentalistas, Alienígenas, Medievais, Elementais e Dinossauros.
   Camada de render somente: não altera stats, IA ou balanceamento. */
(function(){
'use strict';

const LOT02=new Set(['Mentalistas','Alienígenas','Medievais','Elementais','Dinossauros']);
const previousDrawUnit=drawUnit;

function rr2(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function line2(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly2(points,fill,stroke=null,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function dot2(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function phase(u,t,s=1){return Math.sin(t*7*s+u.anim)}
function dir(u){return u.side===1?1:-1}
function attackKick(u,t){return Math.max(0,1-(t-u.lastAttack)*7)}
function hasAny(name,parts){return parts.some(x=>name.includes(x))}

function drawMentalist(u,t,p){
  const f=dir(u),ph=phase(u,t,.72),atk=attackKick(u,t),heavy=u.role==='tank'||u.role==='elite'||u.role==='unique';
  const support=u.role==='support'||u.role==='controller',unique=u.role==='unique';
  ctx.save();ctx.scale(f,1);
  const body=heavy?25:19,headY=heavy?-44:-47;
  const grad=ctx.createLinearGradient(-28,-60,30,26);grad.addColorStop(0,p[2]);grad.addColorStop(.42,p[0]);grad.addColorStop(1,p[1]);
  line2(-9,4,-12,34+ph*3,heavy?8:6,grad);line2(9,4,12,34-ph*3,heavy?8:6,grad);
  ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,-11,body,32,0,0,Math.PI*2);ctx.fill();
  /* cabeça absolutamente lisa e sem rosto */
  ctx.beginPath();ctx.ellipse(0,headY,heavy?15:13,19,0,0,Math.PI*2);ctx.fill();
  const armOpen=(u.role==='ranged'||support)?10:0;
  line2(-body+4,-21,-35-armOpen,-2+ph*2,heavy?8:5,grad);
  line2(body-4,-21,35+armOpen+atk*8,-4-ph*2,heavy?8:5,grad);
  if(u.name==='Escudeiro Psíquico'||u.minionType==='tank'){
    ctx.globalAlpha=.72;ctx.strokeStyle=p[1];ctx.lineWidth=5;ctx.beginPath();ctx.arc(25,-8,24,-1.35,1.35);ctx.stroke();ctx.globalAlpha=1;
  }
  if(support||hasAny(u.name,['Dominador','Anulador','Mestre Mentalista','Entidade Psíquica'])){
    ctx.strokeStyle=p[2];ctx.lineWidth=2.5;ctx.globalAlpha=.82;
    ctx.beginPath();ctx.ellipse(0,-25,34,12,0,0,Math.PI*2);ctx.stroke();
    if(u.role==='elite'||unique){ctx.beginPath();ctx.ellipse(0,-25,43,17,0,0,Math.PI*2);ctx.stroke()}
    ctx.globalAlpha=1;
  }
  if(hasAny(u.name,['Empurrador','Puxador','Telepata','Implosor','Emissor'])){
    ctx.strokeStyle=p[1];ctx.lineWidth=3;ctx.globalAlpha=.65+atk*.35;ctx.beginPath();ctx.arc(41+atk*8,-5,7+atk*4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  if(unique){
    ctx.save();ctx.globalAlpha=.48;const g=ctx.createRadialGradient(0,-15,4,0,-15,35);g.addColorStop(0,'#f0b36e');g.addColorStop(.3,'#7640c9');g.addColorStop(.65,'#4b9872');g.addColorStop(1,'rgba(30,20,55,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-12,31,44,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.restore();
}

function drawAlien(u,t,p){
  const f=dir(u),ph=phase(u,t,1.05),atk=attackKick(u,t),n=u.name;
  ctx.save();ctx.scale(f,1);
  if(hasAny(n,['Gosma'])){
    ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(-33,27);ctx.bezierCurveTo(-39,2,-24,-30+ph*4,0,-26);ctx.bezierCurveTo(26,-32,41,2,34,28);ctx.quadraticCurveTo(0,36+ph*5,-33,27);ctx.fill();
    line2(21,-2,40+atk*15,-12,7,p[2]);
  }else if(hasAny(n,['Trípode'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-33,24,16,0,0,Math.PI*2);ctx.fill();
    [[-16, -22,-33,34+ph*4],[0,-18,0,38-ph*3],[16,-22,34,34+ph*4]].forEach(a=>line2(a[0],a[1],a[2],a[3],7,p[1]));dot2(8,-36,4,p[2]);
  }else if(hasAny(n,['Olho Flutuante','Esporo Óptico'])){
    ctx.fillStyle='#d8d0b5';ctx.beginPath();ctx.ellipse(0,-22,n.includes('Olho')?27:20,n.includes('Olho')?22:18,0,0,Math.PI*2);ctx.fill();
    dot2(5,-22,n.includes('Olho')?10:7,p[1]);dot2(8,-22,n.includes('Olho')?4:3,'#151519');
    for(let i=0;i<4;i++)line2(-12+i*8,-3,-17+i*10,16+Math.sin(t*3+i)*4,3,p[0]);
    /* deliberadamente sem asas */
  }else if(hasAny(n,['Parasita'])){
    ctx.strokeStyle=p[1];ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-33,-10);for(let i=0;i<7;i++)ctx.lineTo(-23+i*10,-10+Math.sin(t*5+u.anim+i*.8)*5);ctx.stroke();
    poly2([[33,-14],[47,-7],[34,0]],p[0]);
  }else if(hasAny(n,['Cuspidor'])){
    ctx.fillStyle=p[0];rr2(-30,-34,60,49,10);ctx.fill();
    line2(-21,12,-31,36+ph*4,8,p[1]);line2(21,12,31,36-ph*4,8,p[1]);
    ctx.fillStyle='#2a1822';rr2(21,-20,18,17,6);ctx.fill();dot2(42+atk*9,-12,4+atk*3,p[2]);
  }else if(hasAny(n,['Bolha Voadora'])){
    ctx.globalAlpha=.72;ctx.fillStyle=p[0];ctx.beginPath();ctx.arc(0,-25,28+ph*2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;dot2(-5,-27,8,p[2]);for(let i=0;i<3;i++)line2(-12+i*12,0,-16+i*15,22+Math.sin(t*3+i)*5,3,p[1]);
  }else if(hasAny(n,['Tentacular','Cérebro Gigante'])){
    ctx.fillStyle=n.includes('Cérebro')?'#a47aa9':p[0];ctx.beginPath();ctx.ellipse(0,-30,n.includes('Cérebro')?32:24,n.includes('Cérebro')?22:18,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<6;i++){let x=-24+i*10;line2(x,-12,x+(i-2.5)*7,30+Math.sin(t*4+i)*5,5,p[1])}
    if(n.includes('Cérebro')){ctx.strokeStyle='#623c69';ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(i*8,-30,8,0,Math.PI);ctx.stroke()}}
  }else if(hasAny(n,['Carapaça Viva','Massa Pulsante','Casulo','Aberração'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-5,n.includes('Aberração')?46:38,n.includes('Casulo')?35:27,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=p[2];ctx.lineWidth=5;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(i*12,-9,20,Math.PI*.9,Math.PI*1.8);ctx.stroke()}
    line2(-24,12,-31,36+ph*4,8,p[1]);line2(24,12,31,36-ph*4,8,p[1]);
  }else{
    /* predatórios/rastejantes: corpo horizontal, nunca humanoide */
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-7,-10,38,20,0,0,Math.PI*2);ctx.fill();
    poly2([[18,-24],[48,-16],[23,2]],p[1]);dot2(31,-14,3,p[2]);
    line2(-24,4,-29,34+ph*6,7,p[1]);line2(-5,6,-8,35-ph*6,7,p[1]);line2(18,3,25,32+ph*5,7,p[1]);line2(-34,-11,-51,-22-ph*3,5,p[0]);
  }
  ctx.restore();
}

function drawMedieval(u,t,p){
  const f=dir(u),ph=phase(u,t,.86),atk=attackKick(u,t),n=u.name,heavy=u.role==='tank'||u.role==='elite';
  ctx.save();ctx.scale(f,1);
  if(u.role==='siege'){
    ctx.fillStyle='#69523d';rr2(-42,-22,84,43,7);ctx.fill();dot2(-27,26,12,'#302b27');dot2(27,26,12,'#302b27');
    if(n==='Catapulta'){line2(-5,-22,29,-63,8,'#80684a');ctx.fillStyle='#3d342b';ctx.beginPath();ctx.arc(34,-68,10,0,Math.PI*2);ctx.fill()}
    else if(n==='Balista'){line2(-20,-34,52,-37,7,'#362d27');ctx.strokeStyle='#b59a72';ctx.lineWidth=4;ctx.beginPath();ctx.arc(2,-36,32,-1.1,1.1);ctx.stroke()}
    else{line2(-34,-11,55,-11,14,'#73583e');poly2([[54,-20],[68,-11],[54,-2]],'#8a8e8f')}
  }else{
    const armor=heavy?'#7d858a':'#8e9496',cloth=p[0];
    line2(-9,5,-12,34+ph*4,heavy?9:6,'#4a4038');line2(9,5,12,34-ph*4,heavy?9:6,'#4a4038');
    ctx.fillStyle=cloth;poly2([[-19,-24],[19,-24],[23,13],[-23,13]],cloth);ctx.fillStyle=armor;rr2(-18,-29,36,22,4);ctx.fill();
    ctx.fillStyle='#caa989';ctx.beginPath();ctx.arc(0,-45,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6f7478';ctx.beginPath();ctx.arc(0,-50,14,Math.PI,Math.PI*2);ctx.fill();
    if(hasAny(n,['Escudeiro'])){ctx.fillStyle='#626b71';rr2(-39,-27,20,47,6);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=2;ctx.stroke()}
    if(hasAny(n,['Lanceiro'])){line2(13,-17,58,-38-atk*8,5,'#765d41');poly2([[56,-44],[70,-42],[60,-32]],'#c6cbcc')}
    else if(hasAny(n,['Arqueiro','Caçador'])){ctx.strokeStyle='#a97f4f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(27,-16,28,-1.35,1.35);ctx.stroke();line2(14,-17,44,-18,2,'#e8d3a0')}
    else if(n==='Besteiro'){ctx.strokeStyle='#9f794e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(31,-19,18,-1.25,1.25);ctx.stroke();line2(10,-19,53,-20,6,'#5c4637')}
    else if(hasAny(n,['Carrasco'])){line2(16,-18,45,-46-atk*8,8,'#624734');poly2([[38,-54],[63,-46],[49,-33]],'#777d81')}
    else{line2(14,-18,47,-35-atk*7,5,'#503c2e');line2(42,-35,57,-47,4,'#c8cccf')}
    if(hasAny(n,['Padre','Médico','Comandante'])){ctx.fillStyle='#d6cdb4';rr2(-29,-8,11,17,3);ctx.fill();}
    if(hasAny(n,['Rei','Nobre','Comandante'])){poly2([[-11,-62],[0,-73],[11,-62]],p[2]);}
  }
  ctx.restore();
}

function drawElemental(u,t,p){
  const f=dir(u),ph=phase(u,t,1.0),atk=attackKick(u,t),n=u.name;
  ctx.save();ctx.scale(f,1);
  if(hasAny(n,['Terra','Golem','Nódulo'])){
    const heavy=n.includes('Golem');ctx.fillStyle='#75634e';poly2([[-32,-18],[-17,-47],[13,-44],[34,-17],[27,20],[-28,20]],'#75634e','#9b8665',3);line2(-16,11,-21,35+ph*3,heavy?12:8,'#6c5946');line2(16,11,21,35-ph*3,heavy?12:8,'#6c5946');dot2(8,-27,4,p[2]);
  }else if(hasAny(n,['Brasa','Ígneo'])){
    ctx.fillStyle='#3c2a24';ctx.beginPath();ctx.ellipse(0,-7,25,31,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff9d45';ctx.beginPath();ctx.moveTo(-23,-14);ctx.quadraticCurveTo(-10,-54+ph*8,0,-33);ctx.quadraticCurveTo(13,-59-ph*7,24,-14);ctx.lineTo(18,17);ctx.lineTo(-18,17);ctx.closePath();ctx.fill();dot2(6,-6,7,'#ffd36a');
    if(n.includes('Monólito')){ctx.fillStyle='#3b302b';rr2(-30,-55,60,76,7);ctx.fill();ctx.strokeStyle='#ff8140';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,-45);ctx.lineTo(6,-20);ctx.lineTo(-2,5);ctx.stroke()}
  }else if(hasAny(n,['Gelo','Cristal'])){
    poly2([[-26,18],[-18,-23],[0,-55],[17,-26],[29,16]],'rgba(165,220,255,.72)','#d7f4ff',3);poly2([[4,-14],[34,-31],[23,2]],'rgba(205,245,255,.65)','#d7f4ff',2);dot2(5,-21,4,'#ffffff');
  }else if(hasAny(n,['Água','Ninfa'])){
    ctx.globalAlpha=.72;ctx.fillStyle='#58b8ff';ctx.beginPath();ctx.moveTo(0,-55);ctx.bezierCurveTo(-29,-27,-30,3,-16,32);ctx.quadraticCurveTo(0,41+ph*4,17,31);ctx.bezierCurveTo(31,2,26,-30,0,-55);ctx.fill();ctx.globalAlpha=1;line2(12,-7,39+atk*9,-17,6,'rgba(110,205,255,.75)');
  }else if(hasAny(n,['Raio'])){
    ctx.strokeStyle='#dff9ff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-13,-48);ctx.lineTo(7,-27);ctx.lineTo(-4,-6);ctx.lineTo(18,13);ctx.lineTo(5,34);ctx.stroke();ctx.strokeStyle='#65d9ff';ctx.lineWidth=2;ctx.stroke();dot2(2,-20,6,'#ffffff');
  }else if(hasAny(n,['Vendaval','Sopro Elemental'])){
    ctx.strokeStyle='rgba(215,238,235,.72)';ctx.lineWidth=6;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,-4,13+i*7,t*.9+i,t*.9+i+Math.PI*1.3);ctx.stroke()}for(let i=0;i<5;i++)dot2(-23+i*11,24+Math.sin(t*4+i)*4,2,'#c9b77f');
  }else if(hasAny(n,['Tempestade'])){
    ctx.fillStyle='#56616c';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-21+i*14,-25+Math.sin(t*2+i)*2,16,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='#9be8ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(3,-14);ctx.lineTo(-5,6);ctx.lineTo(7,2);ctx.lineTo(0,22);ctx.stroke();
  }else if(hasAny(n,['Magma'])){
    ctx.fillStyle='#302724';ctx.beginPath();ctx.ellipse(0,-5,31,38,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff713d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-14,-29);ctx.lineTo(-5,-6);ctx.lineTo(-12,19);ctx.moveTo(11,-30);ctx.lineTo(3,-10);ctx.lineTo(14,13);ctx.stroke();
  }else if(hasAny(n,['Avatar dos Quatro'])){
    ctx.fillStyle='#75634e';rr2(-25,-22,50,48,8);ctx.fill();ctx.fillStyle='#ff8847';ctx.beginPath();ctx.arc(-14,-33,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(88,184,255,.72)';ctx.beginPath();ctx.arc(15,-31,14,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d8f2f1';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-7,36,0,Math.PI*2);ctx.stroke();
  }else{
    /* Coração Elemental */
    const r=18+ph*2;const g=ctx.createRadialGradient(0,-15,2,0,-15,r);g.addColorStop(0,'#fff6c8');g.addColorStop(.35,p[0]);g.addColorStop(1,'rgba(88,184,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,-15,r,0,Math.PI*2);ctx.fill();
    [['#75634e',31],['#ff8a46',39],['rgba(190,235,255,.8)',47]].forEach((a,i)=>{ctx.save();ctx.rotate(t*(i%2?-.5:.4)+i);ctx.strokeStyle=a[0];ctx.lineWidth=i===0?7:4;ctx.beginPath();ctx.ellipse(0,-15,a[1],11+i*4,0,0,Math.PI*2);ctx.stroke();ctx.restore()});
  }
  ctx.restore();
}

function drawDino(u,t,p){
  const f=dir(u),ph=phase(u,t,1.04),atk=attackKick(u,t),n=u.name;
  ctx.save();ctx.scale(f,1);
  const green=p[0],brown=p[1],bone=p[2];
  if(hasAny(n,['Anquilinho','Anquilossauro'])){
    ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(-4,-6,n.includes('Anquilossauro')?42:34,n.includes('Anquilossauro')?23:18,0,0,Math.PI*2);ctx.fill();
    for(let i=-2;i<=2;i++)poly2([[i*13-5,-24],[i*13+2,-36],[i*13+9,-22]],bone);
    line2(-30,5,-35,34+ph*3,8,brown);line2(-5,8,-7,35-ph*3,8,brown);line2(23,7,27,33+ph*3,8,brown);line2(-40,-7,-62,-4-atk*7,9,brown);dot2(-67,-3-atk*7,10,bone);
  }else if(hasAny(n,['Pteranodonte'])){
    ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(0,-15,25,10,0,0,Math.PI*2);ctx.fill();poly2([[12,-17],[50,-9],[22,-3]],bone);poly2([[-4,-20],[-48,-45],[-17,-7]],brown);poly2([[3,-20],[43,-48],[18,-5]],brown);poly2([[-17,-22],[-30,-39],[-3,-29]],green);
  }else if(hasAny(n,['Tricerátopo'])){
    ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(-7,-7,38,22,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(27,-12,22,19,0,0,Math.PI*2);ctx.fill();poly2([[26,-29],[46,-42],[35,-17]],bone);poly2([[32,-15],[57,-24],[39,-8]],bone);poly2([[31,-8],[55,3],[37,-2]],bone);ctx.strokeStyle=bone;ctx.lineWidth=7;ctx.beginPath();ctx.arc(22,-14,28,-1.35,1.35);ctx.stroke();line2(-25,6,-29,35+ph*4,8,brown);line2(9,8,14,34-ph*4,8,brown);
  }else if(hasAny(n,['Estegossauro'])){
    ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(-7,-6,43,22,0,0,Math.PI*2);ctx.fill();for(let i=-3;i<=2;i++)poly2([[i*12,-22],[i*12+7,-43+Math.abs(i)*3],[i*12+14,-20]],bone);line2(-39,-4,-63,-19-atk*4,8,brown);for(let i=0;i<3;i++)poly2([[-60-i*3,-22-i*2],[-73-i*3,-29-i*2],[-64-i*3,-14-i*2]],bone);line2(-24,7,-28,35+ph*3,8,brown);line2(17,8,21,34-ph*3,8,brown);
  }else if(hasAny(n,['Pachy'])){
    ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(-4,-5,33,19,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(27,-22,17,0,Math.PI*2);ctx.fill();ctx.fillStyle=bone;ctx.beginPath();ctx.arc(29,-27,13,Math.PI,Math.PI*2);ctx.fill();line2(-18,6,-23,35+ph*4,7,brown);line2(10,7,15,34-ph*4,7,brown);
  }else{
    const huge=hasAny(n,['Tiranossauro','Giganotossauro','Carnotauro']);const fast=hasAny(n,['Velociraptor','Gallimimus','Compsognato','Raptor']);
    ctx.fillStyle=green;ctx.beginPath();ctx.ellipse(-8,-7,huge?42:fast?31:35,huge?24:18,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(huge?31:27,-26,huge?24:18,huge?17:13,0,0,Math.PI*2);ctx.fill();
    poly2([[huge?43:38,-31],[huge?63:52,-25],[huge?41:37,-14]],brown);dot2(huge?35:32,-30,3,'#191711');
    if(n.includes('Carnotauro')){poly2([[26,-42],[30,-55],[36,-41]],bone);poly2([[39,-41],[47,-51],[47,-36]],bone)}
    if(n.includes('Dilofossauro')){poly2([[21,-40],[28,-55],[34,-40]],p[2]);poly2([[34,-40],[42,-54],[44,-37]],p[2])}
    line2(-31,-7,-57,-21-ph*3,huge?9:6,green);
    const stride=fast?10:huge?5:7;line2(-15,7,-20,36+ph*stride,huge?11:7,brown);line2(14,7,19,35-ph*stride,huge?11:7,brown);
    line2(16,-13,28,-2+atk*5,fast?4:6,brown);
    if(hasAny(n,['Dilofossauro','Cuspidor Jurássico']))dot2(53+atk*8,-23,4+atk*2,'#b7d55d');
  }
  ctx.restore();
}

function renderLot02Unit(u,t){
  const y=yOf(u),meta=facMeta(u.fac),p=meta.palette,team=teamTheme(u.side),bob=Math.sin(t*6+u.anim)*(u.role==='ranged'?1.2:2.0);
  const roleScale=u.role==='tank'?[1.12,.96]:u.role==='assassin'?[.88,1.06]:u.role==='siege'?[1.13,.92]:[1,1];
  const sc=(.88+y/VIEW_H*.2)*(u.role==='unique'?1.35:u.role==='elite'?1.18:u.minion?.78:1);
  ctx.save();ctx.translate(u.x,y+bob);ctx.scale(sc*roleScale[0],sc*roleScale[1]);
  ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,38,u.minion?21:30,u.minion?6:9,0,0,Math.PI*2);ctx.fill();
  drawTeamMarker(u,t);
  drawFactionAura(u,t,meta);
  if(u.fac==='Mentalistas')drawMentalist(u,t,p);
  else if(u.fac==='Alienígenas')drawAlien(u,t,p);
  else if(u.fac==='Medievais')drawMedieval(u,t,p);
  else if(u.fac==='Elementais')drawElemental(u,t,p);
  else drawDino(u,t,p);
  if(u.role==='elite'||u.role==='unique'){ctx.strokeStyle=p[2];ctx.lineWidth=u.role==='unique'?4:2;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(0,-7,u.role==='unique'?40:34,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  if(u.fac==='Mentalistas'&&t>=u.mentalGuardReadyAt){ctx.strokeStyle='#7fffe1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-29,17,0,Math.PI*2);ctx.stroke()}
  if(u.fac==='Medievais'&&nearFriendlyTower(u)){ctx.strokeStyle='#d8c27c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,4,30,Math.PI*.12,Math.PI*.88);ctx.stroke()}
  ctx.fillStyle='rgba(10,11,13,.82)';rr2(-29,-67,58,7,4);ctx.fill();ctx.fillStyle=team.primary;rr2(-29,-67,58*Math.max(0,u.hp/u.maxHp),7,4);ctx.fill();
  if(!u.minion){ctx.fillStyle='rgba(12,13,16,.82)';rr2(-50,52,100,20,6);ctx.fill();ctx.strokeStyle=team.primary;ctx.lineWidth=1.5;rr2(-50,52,100,20,6);ctx.stroke();ctx.fillStyle='#f0eadb';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(u.name,0,66)}
  else{ctx.fillStyle=team.primary;ctx.strokeStyle='#f4f7fb';ctx.lineWidth=1.5;ctx.beginPath();if(u.minionType==='tank')ctx.rect(-8,44,16,11);else if(u.minionType==='ranged'){ctx.moveTo(0,43);ctx.lineTo(9,55);ctx.lineTo(-9,55);ctx.closePath()}else ctx.arc(0,49,7,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.restore();
}

drawUnit=function(u,t){
  if(!LOT02.has(u.fac))return previousDrawUnit(u,t);
  renderLot02Unit(u,t);
};

})();
