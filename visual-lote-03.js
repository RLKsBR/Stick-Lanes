/* Stick Lanes — aplicação visual lote 03
   Mutantes, Necromantes, Bestas Marinhas, Ninjas e Nômades do Deserto.
   Camada de render somente: não altera stats, IA ou balanceamento. */
(function(){
'use strict';

const LOT03=new Set(['Mutantes','Necromantes','Bestas Marinhas','Ninjas','Nômades do Deserto']);
const previousDrawUnit=drawUnit;

function rr3(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function line3(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly3(points,fill,stroke=null,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function dot3(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function phase3(u,t,s=1){return Math.sin(t*7*s+u.anim)}
function dir3(u){return u.side===1?1:-1}
function kick3(u,t){return Math.max(0,1-(t-u.lastAttack)*7)}
function has3(name,parts){return parts.some(x=>name.includes(x))}

function drawMutant(u,t,p){
  const f=dir3(u),ph=phase3(u,t,.92),atk=kick3(u,t),n=u.name;
  ctx.save();ctx.scale(f,1);
  if(has3(n,['Massa Óssea'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(0,-4,42,27,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d5d0b4';ctx.lineWidth=7;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(i*12,-8,18,Math.PI*.9,Math.PI*1.85);ctx.stroke()}
    line3(-26,11,-31,35+ph*3,10,p[2]);line3(24,11,29,35-ph*3,10,p[2]);
  }else if(has3(n,['Espinho Vivo'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-4,-8,28,22,0,0,Math.PI*2);ctx.fill();
    for(let i=-2;i<=2;i++)poly3([[i*10-5,-25],[i*10,-45],[i*10+6,-24]],'#d2cfb0');
    line3(-15,6,-20,35+ph*4,7,p[2]);line3(13,5,18,35-ph*4,7,p[2]);dot3(39+atk*10,-16,4+atk*2,'#d7d1ae');
  }else if(has3(n,['Garras'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-3,-5,24,28,0,0,Math.PI*2);ctx.fill();
    line3(-12,-22,-41,-4+ph*4,7,p[0]);line3(13,-21,43,-7-ph*4,7,p[0]);
    poly3([[-44,-8],[-58,-2],[-43,4]],'#d5d1b9');poly3([[46,-11],[60,-5],[44,1]],'#d5d1b9');
    line3(-12,12,-20,36+ph*6,7,p[2]);line3(12,12,20,35-ph*6,7,p[2]);
  }else if(has3(n,['Carne Rastejante','Quatro-Pernas'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-3,-5,38,19,0,0,Math.PI*2);ctx.fill();
    [[-24,-2,-35,32+ph*6],[-7,5,-12,34-ph*6],[12,5,18,34+ph*6],[27,-2,34,31-ph*6]].forEach(a=>line3(a[0],a[1],a[2],a[3],7,p[2]));
    poly3([[24,-18],[45,-12],[29,-2]],p[0]);
  }else if(has3(n,['Bíceps Duplo'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(0,-9,29,33,0,0,Math.PI*2);ctx.fill();
    for(let y of [-26,-8]){line3(-17,y,-44,y+13+ph*3,10,p[0]);line3(17,y,44,y+11-ph*3,10,p[0])}
    line3(-12,15,-18,37+ph*4,9,p[2]);line3(12,15,18,37-ph*4,9,p[2]);dot3(6,-37,9,'#73646d');
  }else if(has3(n,['Olho Hipnótico'])){
    ctx.fillStyle=p[2];ctx.beginPath();ctx.ellipse(0,-20,27,22,0,0,Math.PI*2);ctx.fill();dot3(4,-21,12,p[0]);dot3(7,-21,5,'#18151e');
    for(let i=0;i<4;i++)line3(-18+i*12,-2,-24+i*15,30+(i%2?ph:-ph)*4,4,p[1]);
  }else if(has3(n,['Canhão Orgânico'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-8,-5,40,27,0,0,Math.PI*2);ctx.fill();rr3(5,-31,45,22,10);ctx.fillStyle=p[2];ctx.fill();
    line3(36,-20,61,-20,12,p[0]);dot3(65+atk*8,-20,5+atk*2,'#a6df4a');line3(-25,10,-31,35+ph*3,10,p[2]);line3(11,12,17,35-ph*3,10,p[2]);
  }else if(has3(n,['Cuspidor Mutante'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-11,29,25,0,0,Math.PI*2);ctx.fill();poly3([[17,-25],[47,-17],[21,-5]],p[1]);dot3(51+atk*8,-17,4+atk*2,'#9bdd45');line3(-12,7,-18,35+ph*4,7,p[2]);line3(12,7,18,35-ph*4,7,p[2]);
  }else if(has3(n,['Quimera','Mutação Alfa'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-5,-8,43,30,0,0,Math.PI*2);ctx.fill();
    poly3([[19,-29],[49,-22],[24,-5]],p[0]);poly3([[-22,-26],[-43,-45],[-33,-12]],p[2]);
    line3(-24,10,-32,36+ph*4,10,p[0]);line3(-3,14,-7,38-ph*4,9,p[2]);line3(20,10,28,35+ph*4,10,p[0]);
    line3(-35,-7,-57,-19-ph*3,8,p[1]);if(n.includes('Mutação Alfa')){line3(12,-16,44,-44,8,p[2]);poly3([[42,-49],[61,-54],[48,-36]],'#d2cfb8')}
  }else{
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-4,-10,27,31,-.12,0,Math.PI*2);ctx.fill();dot3(10,-38,10,p[2]);
    line3(-13,10,-19,36+ph*5,7,p[2]);line3(11,11,21,34-ph*5,9,p[0]);line3(-18,-21,-40,-4+ph*3,6,p[0]);line3(16,-18,44,-12-ph*3,9,p[0]);
    if(has3(n,['Tecelão'])){for(let i=0;i<3;i++)line3(-35+i*10,-2,-46+i*14,17+Math.sin(t*3+i)*4,2,'#c8d7b1')}
  }
  ctx.restore();
}

function boneBody(u,t,p,hooded=false){
  const ph=phase3(u,t,.82),f=dir3(u);ctx.save();ctx.scale(f,1);
  if(hooded){
    poly3([[-20,-50],[0,-66],[21,-49],[17,8],[-18,8]],p[2]);dot3(0,-45,9,'#bbb9a5');dot3(4,-46,3,p[1]);
    line3(-10,7,-13,35+ph*3,5,'#d2cfbd');line3(10,7,13,35-ph*3,5,'#d2cfbd');line3(16,-20,43,-8,5,'#d2cfbd');
  }else{
    dot3(0,-46,11,'#d5d1bd');dot3(4,-48,3,p[1]);
    line3(-10,-33,10,-33,5,'#d5d1bd');for(let y=-29;y<0;y+=7)line3(-13,y,13,y,3,'#d5d1bd');line3(0,-33,0,7,4,'#d5d1bd');
    line3(-8,5,-12,35+ph*4,5,'#d5d1bd');line3(8,5,12,35-ph*4,5,'#d5d1bd');line3(-8,-27,-34,-8+ph*2,4,'#d5d1bd');line3(8,-27,34,-12-ph*2,4,'#d5d1bd');
  }
  ctx.restore();
}

function drawNecromancer(u,t,p){
  const f=dir3(u),ph=phase3(u,t,.78),atk=kick3(u,t),n=u.name;
  if(has3(n,['Ossário'])){
    ctx.save();ctx.scale(f,1);ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-3,44,27,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d3cfbb';ctx.lineWidth=6;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(i*12,-8,17,Math.PI*.9,Math.PI*1.85);ctx.stroke()}for(let i=-2;i<=2;i++)dot3(i*13,3,5,'#c9c4ae');line3(-25,11,-31,35+ph*3,8,p[2]);line3(24,11,30,35-ph*3,8,p[2]);ctx.restore();return;
  }
  if(has3(n,['Espectro Lâmina'])){
    ctx.save();ctx.scale(f,1);ctx.globalAlpha=.75;poly3([[-18,-50],[14,-47],[24,-8],[7,32],[-25,22]],p[1]);ctx.globalAlpha=1;dot3(0,-43,8,'#233137');line3(14,-20,51,-42-atk*8,5,p[1]);ctx.restore();return;
  }
  if(has3(n,['Lançador de Crânios'])){
    ctx.save();ctx.scale(f,1);ctx.fillStyle='#40362f';rr3(-39,-19,78,39,7);ctx.fill();dot3(-25,25,11,'#191a1c');dot3(25,25,11,'#191a1c');line3(-4,-20,30,-58,7,'#5a4a3c');dot3(35,-63,9,'#d2cfbd');ctx.restore();return;
  }
  if(has3(n,['Carniçal'])){
    ctx.save();ctx.scale(f,1);ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(-3,-5,31,18,0,0,Math.PI*2);ctx.fill();dot3(24,-17,10,'#aaa891');line3(-20,3,-29,35+ph*6,6,'#aaa891');line3(5,4,10,35-ph*6,6,'#aaa891');line3(19,-3,39,18+ph*3,5,'#aaa891');ctx.restore();return;
  }
  if(has3(n,['Cavaleiro Morto'])){
    ctx.save();ctx.scale(f,1);line3(-10,6,-13,35+ph*3,8,p[2]);line3(10,6,13,35-ph*3,8,p[2]);ctx.fillStyle=p[0];rr3(-24,-35,48,45,6);ctx.fill();dot3(0,-49,13,'#c5c0ad');poly3([[-17,-52],[0,-66],[18,-52]],p[2]);line3(18,-18,52,-40-atk*5,7,'#34383b');ctx.restore();return;
  }
  if(has3(n,['Necromante','Lich','Rei Sepulcral','Mago Ósseo','Acólito Sombrio'])){
    ctx.save();ctx.scale(f,1);const elite=has3(n,['Lich','Rei Sepulcral']);poly3([[elite?-27:-20,-50],[0,-68],[elite?27:20,-50],[20,12],[-21,12]],p[2]);dot3(0,-45,elite?12:9,'#c5c1ad');dot3(4,-46,3,p[1]);line3(-9,10,-12,35+ph*3,5,'#c5c1ad');line3(9,10,12,35-ph*3,5,'#c5c1ad');line3(17,-18,45,-48,5,'#443a31');dot3(48,-52,5+atk*3,p[1]);if(elite){ctx.strokeStyle=p[1];ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-43,23,0,Math.PI*2);ctx.stroke()}ctx.restore();return;
  }
  boneBody(u,t,p,false);
  ctx.save();ctx.scale(f,1);if(has3(n,['Arqueiro'])){ctx.strokeStyle='#80623f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(26,-16,27,-1.35,1.35);ctx.stroke();line3(14,-17,47,-18,2,'#d8cfad')}else line3(13,-20,47,-38-atk*6,5,'#544438');ctx.restore();
}

function drawMarine(u,t,p){
  const f=dir3(u),ph=phase3(u,t,.9),atk=kick3(u,t),n=u.name;ctx.save();ctx.scale(f,1);
  if(has3(n,['Caranguejo'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-8,37,22,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<3;i++){line3(-19-i*5,-1+i*5,-45,14+i*8+(i%2?ph:-ph)*4,4,p[1]);line3(19+i*5,-1+i*5,45,14+i*8+(i%2?-ph:ph)*4,4,p[1])}
    line3(-26,-17,-51,-28+atk*5,8,p[2]);line3(26,-17,52,-28-atk*5,8,p[2]);dot3(-55,-28+atk*5,10,p[0]);dot3(56,-28-atk*5,10,p[0]);
  }else if(has3(n,['Tartaruga'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-5,-7,43,27,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=4;ctx.beginPath();ctx.arc(-5,-7,30,0,Math.PI*2);ctx.stroke();dot3(35,-13,12,p[0]);line3(-27,8,-31,34+ph*3,8,p[0]);line3(17,10,22,34-ph*3,8,p[0]);
  }else if(has3(n,['Moreia'])){
    ctx.strokeStyle=p[1];ctx.lineWidth=n.includes('Andante')?18:16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-45,-8);for(let i=0;i<9;i++)ctx.lineTo(-35+i*10,-8+Math.sin(t*5+u.anim+i*.65)*6);ctx.stroke();poly3([[38,-18],[59,-9],[40,1]],p[0]);dot3(46,-10,3,'#e8f2d9');for(let i=-2;i<=2;i++)line3(i*12,-1,i*12+3,24+(i%2?ph:-ph)*4,3,p[2]);
  }else if(has3(n,['Peixe-Arqueiro'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-13,35,20,0,0,Math.PI*2);ctx.fill();poly3([[-29,-14],[-49,-27],[-48,-2]],p[1]);poly3([[-4,-30],[8,-45],[15,-27]],p[2]);dot3(20,-18,3,'#e6f3ef');line3(29,-13,58+atk*9,-13,3,'#a9e9ef');
  }else if(has3(n,['Tubarão'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-3,-8,43,25,0,0,Math.PI*2);ctx.fill();poly3([[-32,-8],[-60,-28],[-58,13]],p[0]);poly3([[-8,-31],[3,-50],[12,-28]],p[2]);poly3([[23,-23],[53,-14],[28,0]],p[0]);dot3(30,-16,3,'#e6f4f1');line3(-18,7,-24,35+ph*4,8,p[0]);line3(17,7,23,35-ph*4,8,p[0]);
  }else if(has3(n,['Água-Viva'])){
    ctx.globalAlpha=.78;ctx.fillStyle=p[2];ctx.beginPath();ctx.arc(0,-26,28,Math.PI,0);ctx.lineTo(28,-15);ctx.quadraticCurveTo(0,2,-28,-15);ctx.closePath();ctx.fill();ctx.globalAlpha=1;for(let i=-2;i<=2;i++)line3(i*9,-10,i*11,27+Math.sin(t*3+i)*6,3,p[1]);
  }else if(has3(n,['Polvo','Kraken'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-26,n.includes('Kraken')?32:24,n.includes('Kraken')?27:21,0,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){let a=(i/8)*Math.PI*2,ex=Math.cos(a)*43,ey=18+Math.sin(a)*12+Math.sin(t*3+i)*4;line3(Math.cos(a)*15,-10+Math.sin(a)*8,ex,ey,n.includes('Kraken')?6:4,p[1])}dot3(8,-30,4,'#d9eeee');
  }else if(has3(n,['Baleia'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-4,-5,55,27,0,0,Math.PI*2);ctx.fill();poly3([[-51,-5],[-76,-27],[-73,18]],p[0]);dot3(34,-13,3,'#e8f5f4');line3(-25,13,-31,35+ph*2,9,p[2]);line3(18,13,24,35-ph*2,9,p[2]);
  }else if(has3(n,['Arraia'])){
    poly3([[-48,-10],[0,-38],[48,-9],[13,13],[0,35],[-13,13]],p[0]);dot3(20,-13,3,'#e5f7f5');line3(0,20,-18,42+ph*3,3,p[1]);
  }else if(has3(n,['Cavalo-Marinho'])){
    ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(3,-15,16,28,.15,0,Math.PI*2);ctx.fill();poly3([[3,-42],[31,-29],[12,-19]],p[2]);ctx.strokeStyle=p[1];ctx.lineWidth=7;ctx.beginPath();ctx.arc(-4,9,22,-.5,2.2);ctx.stroke();line3(-5,9,-18,35+ph*6,5,p[1]);
  }else{
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-3,-7,48,25,0,0,Math.PI*2);ctx.fill();poly3([[-43,-8],[-68,-30],[-66,18]],p[0]);poly3([[24,-22],[59,-12],[31,3]],p[0]);dot3(36,-15,3,'#e8f7f4');line3(-20,11,-26,35+ph*3,9,p[2]);line3(16,11,22,35-ph*3,9,p[2]);
  }
  ctx.restore();
}

function drawNinja(u,t,p){
  const f=dir3(u),ph=phase3(u,t,1.15),atk=kick3(u,t),n=u.name,heavy=u.role==='tank';ctx.save();ctx.scale(f,1);
  if(u.role==='siege'){
    ctx.fillStyle=p[0];rr3(-30,-31,60,48,8);ctx.fill();for(let i=-1;i<=1;i++){ctx.fillStyle=p[2];ctx.beginPath();ctx.arc(-6+i*16,-37,8,0,Math.PI*2);ctx.fill()}line3(15,-20,50,-37,6,'#322a2a');ctx.globalAlpha=.55;dot3(55+atk*8,-39,8+atk*4,'#77757f');ctx.globalAlpha=1;ctx.restore();return;
  }
  const lean=has3(n,['Assassino','Corredor'])?.12:0;ctx.rotate(lean);
  line3(-9,6,-15,35+ph*(heavy?3:7),heavy?8:6,'#242434');line3(9,6,15,35-ph*(heavy?3:7),heavy?8:6,'#242434');
  ctx.fillStyle=p[0];poly3([[heavy?-25:-19,-26],[heavy?25:19,-26],[22,12],[-22,12]],p[0]);
  ctx.fillStyle='#2a2836';ctx.beginPath();ctx.arc(0,-46,13,0,Math.PI*2);ctx.fill();poly3([[-14,-47],[14,-47],[10,-38],[-10,-38]],p[1]);
  line3(-16,-18,-37,-2+ph*3,heavy?8:5,p[0]);line3(16,-18,40+atk*8,-12-ph*3,heavy?8:5,p[0]);
  if(has3(n,['Kunai']))poly3([[39+atk*8,-16],[53+atk*8,-12],[41+atk*8,-8]],'#afb1b6');
  else if(has3(n,['Shuriken'])){ctx.strokeStyle='#afb1b6';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<8;i++){let a=i*Math.PI/4,r=i%2?5:11,px=49+atk*8+Math.cos(a)*r,py=-13+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke()}
  else{line3(34+atk*6,-12,50+atk*7,-31,4,'#b7bbc0')}
  if(has3(n,['Mestre de Genjutsu','Monge Oculto'])){ctx.strokeStyle=p[1];ctx.lineWidth=2;ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(0,-22,29,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  if(has3(n,['Jōnin','Kage']))poly3([[-10,-61],[0,-71],[11,-61]],p[2]);
  ctx.restore();
}

function drawNomad(u,t,p){
  const f=dir3(u),ph=phase3(u,t,1.0),atk=kick3(u,t),n=u.name;ctx.save();ctx.scale(f,1);
  if(has3(n,['Cavaleiro de Dromedário'])){
    ctx.fillStyle='#a9784f';ctx.beginPath();ctx.ellipse(-7,-2,43,20,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(20,-31,13,28,.12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(30,-51,10,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(-8,-20,18,14,0,0,Math.PI*2);ctx.fill();line3(-25,9,-29,37+ph*5,7,'#8c603e');line3(11,8,17,37-ph*5,7,'#8c603e');
    ctx.fillStyle=p[0];rr3(-13,-48,20,28,5);ctx.fill();dot3(-3,-56,8,'#c69f7b');line3(6,-38,43,-51-atk*4,5,'#725235');ctx.restore();return;
  }
  if(has3(n,['Escorpião de Cerco'])){
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(0,-7,38,20,0,0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){line3(-18-i*5,-2,-44,16+i*7+(i%2?ph:-ph)*3,4,p[0]);line3(18+i*5,-2,44,16+i*7+(i%2?-ph:ph)*3,4,p[0])}ctx.strokeStyle=p[2];ctx.lineWidth=9;ctx.beginPath();ctx.arc(-17,-23,37,-.2,-2.3,true);ctx.stroke();poly3([[-48,-41],[-64,-48],[-54,-33]],'#34291f');ctx.restore();return;
  }
  if(has3(n,['Djinn'])){
    ctx.globalAlpha=.82;ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(0,-27,28,34,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(-19,-3);ctx.quadraticCurveTo(0,21+ph*6,15,35);ctx.quadraticCurveTo(-9,25,-4,9);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-28,36,0,Math.PI*2);ctx.stroke();ctx.restore();return;
  }
  line3(-9,6,-14,35+ph*(u.role==='assassin'||u.role==='skirmisher'?7:4),7,'#5b4534');line3(9,6,14,35-ph*(u.role==='assassin'||u.role==='skirmisher'?7:4),7,'#5b4534');
  ctx.fillStyle=p[0];poly3([[-21,-26],[20,-26],[24,12],[-23,12]],p[0]);ctx.fillStyle='#b98d63';dot3(0,-45,10,'#b98d63');
  poly3([[-15,-49],[0,-59],[16,-49],[12,-39],[-12,-39]],p[2]);ctx.strokeStyle=p[1];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-15,-42);ctx.quadraticCurveTo(-34,-30-ph*3,-40,-5);ctx.stroke();
  if(has3(n,['Escudo do Oásis'])){ctx.fillStyle='#89663f';ctx.beginPath();ctx.ellipse(-31,-8,15,30,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.stroke()}
  if(has3(n,['Atirador','Batedor'])){ctx.strokeStyle='#775635';ctx.lineWidth=4;ctx.beginPath();ctx.arc(26,-17,28,-1.35,1.35);ctx.stroke();line3(13,-18,48,-18,2,'#dec696')}
  else if(has3(n,['Dançarino'])){line3(15,-18,46,-36-atk*6,4,'#c2c5c6');line3(-15,-18,-41,-33+atk*5,4,'#c2c5c6')}
  else if(has3(n,['Mago da Miragem'])){line3(16,-20,43,-43,5,'#6c5136');ctx.globalAlpha=.35;ctx.strokeStyle=p[2];ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(20+i*9,-20-i*5,10+i*4,5+i*2,0,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1}
  else{line3(15,-18,49,-38-atk*6,5,'#715035')}
  if(has3(n,['Curandeiro'])){ctx.fillStyle='#d2b879';rr3(-31,-5,12,20,3);ctx.fill();dot3(-25,-11,4,'#6d8d58')}
  if(has3(n,['Príncipe']))poly3([[-10,-60],[0,-70],[11,-60]],p[2]);
  ctx.restore();
}

function renderLot03Unit(u,t){
  const y=yOf(u),meta=facMeta(u.fac),p=meta.palette,team=teamTheme(u.side),bob=Math.sin(t*6+u.anim)*(u.role==='ranged'?1.1:1.9);
  const roleScale=u.role==='tank'?[1.12,.96]:u.role==='assassin'?[.88,1.06]:u.role==='siege'?[1.13,.92]:[1,1];
  const sc=(.88+y/VIEW_H*.2)*(u.role==='unique'?1.35:u.role==='elite'?1.18:u.minion?.78:1);
  ctx.save();ctx.translate(u.x,y+bob);ctx.scale(sc*roleScale[0],sc*roleScale[1]);
  ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,38,u.minion?21:30,u.minion?6:9,0,0,Math.PI*2);ctx.fill();
  drawTeamMarker(u,t);drawFactionAura(u,t,meta);
  if(u.fac==='Mutantes')drawMutant(u,t,p);
  else if(u.fac==='Necromantes')drawNecromancer(u,t,p);
  else if(u.fac==='Bestas Marinhas')drawMarine(u,t,p);
  else if(u.fac==='Ninjas')drawNinja(u,t,p);
  else drawNomad(u,t,p);
  if(u.role==='elite'||u.role==='unique'){ctx.strokeStyle=p[2];ctx.lineWidth=u.role==='unique'?4:2;ctx.globalAlpha=.62;ctx.beginPath();ctx.arc(0,-7,u.role==='unique'?40:34,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  ctx.fillStyle='rgba(10,11,13,.82)';rr3(-29,-67,58,7,4);ctx.fill();ctx.fillStyle=team.primary;rr3(-29,-67,58*Math.max(0,u.hp/u.maxHp),7,4);ctx.fill();
  if(!u.minion){ctx.fillStyle='rgba(12,13,16,.82)';rr3(-50,52,100,20,6);ctx.fill();ctx.strokeStyle=team.primary;ctx.lineWidth=1.5;rr3(-50,52,100,20,6);ctx.stroke();ctx.fillStyle='#f0eadb';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(u.name,0,66)}
  else{ctx.fillStyle=team.primary;ctx.strokeStyle='#f4f7fb';ctx.lineWidth=1.5;ctx.beginPath();if(u.minionType==='tank')ctx.rect(-8,44,16,11);else if(u.minionType==='ranged'){ctx.moveTo(0,43);ctx.lineTo(9,55);ctx.lineTo(-9,55);ctx.closePath()}else ctx.arc(0,49,7,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.restore();
}

drawUnit=function(u,t){
  if(!LOT03.has(u.fac))return previousDrawUnit(u,t);
  renderLot03Unit(u,t);
};

})();