/* Stick Lanes — aplicação visual lote 05
   Demônios, Celestiais, Músicos, Cristalinos, Míticos e Físicos.
   Camada de render somente: não altera stats, IA ou balanceamento. */
(function(){
'use strict';

const LOT05=new Set(['Demônios','Celestiais','Músicos','Cristalinos','Míticos','Físicos']);
const previousDrawUnit=drawUnit;

function rr5(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function line5(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly5(points,fill,stroke=null,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function dot5(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function ellipse5(x,y,rx,ry,c,rot=0){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill()}
function phase5(u,t,s=1){return Math.sin(t*7*s+(u.anim||0))}
function dir5(u){return u.side===1?1:-1}
function kick5(u,t){return Math.max(0,1-(t-(u.lastAttack||-99))*7)}
function has5(name,parts){return parts.some(x=>name.includes(x))}
function arc5(x,y,r,a1,a2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,r,a1,a2);ctx.stroke()}
function ring5(x,y,rx,ry,rot,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.stroke()}

function drawDemon(u,t,p){
  const f=dir5(u),ph=phase5(u,t,.95),atk=kick5(u,t),n=u.name,ember='#e36a32',bone='#c5aa83',black='#24181c';ctx.save();ctx.scale(f,1);
  if(n==='Aríete Infernal'){
    ctx.fillStyle=black;rr5(-47,-28,84,49,8);ctx.fill();poly5([[-43,-18],[-65,-8],[-43,3]],bone,ember,3);poly5([[-51,-15],[-70,-30],[-60,-5]],black,ember,2);
    for(const x of [-29,24])dot5(x,26,13,'#111216');line5(-30,-29,18,-55,7,'#3b2b2a');dot5(20,-56,12,ember);for(let i=0;i<3;i++)arc5(-7+i*15,-5,8,0,Math.PI,2,ember);ctx.restore();return;
  }
  if(n==='Cão do Inferno'){
    ellipse5(-4,-7,41,21,'#5d2629');poly5([[22,-22],[49,-15],[30,-1]],'#7e292b',black,2);dot5(38,-18,11,'#8e3130');poly5([[44,-11],[61,-7],[46,-2]],bone);
    [[-26,3,-34,36+ph*7],[-8,8,-12,37-ph*7],[13,7,20,37+ph*7],[29,1,36,34-ph*7]].forEach(a=>line5(a[0],a[1],a[2],a[3],7,black));
    for(let i=-2;i<=2;i++)poly5([[-20+i*12,-25],[-14+i*12,-42-Math.abs(i)*2],[-7+i*12,-22]],black,ember,1);ctx.restore();return;
  }
  const brute=has5(n,['Bruto','Carniceiro']),shadow=n==='Sombra Cornuda',elite=has5(n,['Arquidemônio','Príncipe']),prince=n==='Príncipe do Abismo';
  const skin=shadow?'#17151b':brute?'#70282a':p[0],w=brute?31:elite?28:shadow?18:22,step=shadow?ph*8:ph*4;
  line5(-10,5,-17,36+step,brute?11:7,skin);line5(10,5,17,36-step,brute?11:7,skin);poly5([[-23,31],[-12,39],[-25,41]],black);poly5([[23,31],[12,39],[25,41]],black);
  poly5([[-w,-34],[-w+5,-51],[0,-59],[w-5,-51],[w,-31],[w-6,9],[-w+6,9]],skin,black,2);dot5(0,-55,brute?15:12,skin);
  const horn=prince?25:elite?20:shadow?17:11;poly5([[-9,-64],[-17-horn,-72-horn*.3],[-15,-55]],black,ember,2);poly5([[9,-64],[17+horn,-72-horn*.3],[15,-55]],black,ember,2);
  if(prince){poly5([[-30,-47],[-48,-72],[-43,-20]],black,ember,2);poly5([[30,-47],[48,-72],[43,-20]],black,ember,2);for(let x=-16;x<=16;x+=8)line5(x,-45,x+3,-10,2,ember)}
  line5(-w+5,-30,-42,-4+ph*3,brute?11:6,skin);line5(w-5,-30,44+atk*9,-9-ph*3,brute?11:6,skin);
  if(has5(n,['Cuspichama'])){ellipse5(10,-28,14,20,'#8f302d');for(let y=-38;y<-7;y+=10)line5(4,y,18,y,3,ember);dot5(47+atk*9,-13,6+atk*3,ember)}
  else if(n==='Carniceiro'){line5(35,-9,57+atk*9,-37,8,black);poly5([[48+atk*9,-51],[72+atk*9,-40],[59+atk*9,-17],[39+atk*9,-29]],'#69605a',black,2)}
  else if(n==='Sacerdote Abissal'){line5(30,-18,51,-54,6,black);dot5(52,-59,7,bone);for(let i=0;i<3;i++)line5(-13+i*13,-69,-17+i*17,-83,3,black)}
  else if(n==='Tentador'){line5(33,-18,56+atk*6,-26,4,p[2]);arc5(58,-25,10,-.7,.7,2,ember)}
  else if(n==='Arqueiro de Enxofre'){arc5(36,-16,29,-1.35,1.35,5,bone);line5(22,-17,58,-17,2,'#e0c486');dot5(59+atk*7,-17,4,'#d8bb42')}
  else{poly5([[38+atk*8,-17],[61+atk*9,-9],[38+atk*8,-2]],bone,black,2)}
  if(elite&&!prince){poly5([[-27,-43],[-48,-67],[-40,-15]],black,ember,2);poly5([[27,-43],[48,-67],[40,-15]],black,ember,2)}ctx.restore();
}

function haloSegments5(count,r,c,rot=0){ctx.save();ctx.rotate(rot);for(let i=0;i<count;i++){const a=i*Math.PI*2/count;ctx.strokeStyle=c;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,r,a+.12,a+Math.PI*1.25/count);ctx.stroke()}ctx.restore()}
function drawCelestial(u,t,p){
  const f=dir5(u),ph=phase5(u,t,.78),atk=kick5(u,t),n=u.name,ivory=p[0],blue=p[1],gold=p[2],shade='#718596';ctx.save();ctx.scale(f,1);
  if(n==='Lança Solar'){
    for(const x of [-35,-12,18,39]){line5(x,5,x+(x<0?-5:5),37,7,shade);dot5(x+(x<0?-5:5),38,5,gold)}
    ctx.fillStyle=ivory;rr5(-48,-13,77,27,7);ctx.fill();line5(-24,-13,58+atk*7,-33,13,gold);line5(-16,-13,62+atk*7,-33,6,ivory);ring5(3,-18,18,28,-.25,4,blue);ring5(28,-25,15,24,-.25,4,blue);ctx.restore();return;
  }
  if(n==='Trono Radiante'){
    ctx.fillStyle=shade;rr5(-34,-44,68,64,13);ctx.fill();poly5([[-38,-32],[-63,-60],[-56,7],[-32,18]],ivory,gold,3);poly5([[38,-32],[63,-60],[56,7],[32,18]],ivory,gold,3);dot5(0,-40,18,ivory);dot5(0,-42,7,blue);
    ring5(0,-30,48,67,0,6,gold);for(const y of [-54,-30,-7]){dot5(-26,y,4,blue);dot5(26,y,4,blue)}line5(31,-25,63+atk*8,-25,6,blue);ctx.restore();return;
  }
  const tank=has5(n,['Guardião']),fast=has5(n,['Serafim Veloz','Querubim']),elite=n==='Serafim Maior',w=tank?28:elite?25:20,step=fast?ph*7:ph*4;
  line5(-9,6,-14,36+step,tank?10:7,shade);line5(9,6,14,36-step,tank?10:7,shade);poly5([[-w,-31],[-w+4,-48],[0,-58],[w-4,-48],[w,-30],[w-5,10],[-w+5,10]],ivory,gold,2);dot5(0,-52,11,ivory);line5(-w+3,-29,-40,-4+ph*2,tank?10:6,ivory);line5(w-3,-29,43+atk*8,-12-ph*2,tank?10:6,ivory);
  ctx.save();ctx.translate(0,-46);haloSegments5(tank?6:elite?10:fast?4:5,tank?26:elite?30:21,gold,t*.08);ctx.restore();
  const wingPairs=elite?3:fast?2:tank?1:0;for(let i=0;i<wingPairs;i++){const yy=-38+i*15,span=elite?35-i*4:30-i*3;poly5([[-17,yy],[-span-20,yy-15+ph*2],[-25,yy+8]],ivory,blue,1);poly5([[17,yy],[span+20,yy-15-ph*2],[25,yy+8]],ivory,blue,1)}
  if(n==='Arauto de Luz'){line5(29,-17,61+atk*8,-17,9,gold);line5(38,-17,65+atk*8,-17,3,blue)}
  else if(n==='Acólito Solar'||n==='Lâmina Menor')poly5([[33+atk*8,-21],[61+atk*9,-11],[34+atk*8,-2]],gold,ivory,2);
  else if(n==='Paladino Celeste'){line5(31,-12,57+atk*8,-39,8,gold);poly5([[49,-51],[70,-39],[59,-20],[42,-31]],ivory,gold,2)}
  else if(n==='Curador Astral'){for(let i=0;i<3;i++)ring5(0,-33,25+i*7,12+i*5,(i-1)*.45,2,blue);dot5(46+atk*5,-12,5,blue)}
  else if(n==='Juiz'){line5(31,-18,52,-46,5,gold);line5(38,-55,65,-55,4,gold);dot5(40,-55,7,blue);dot5(63,-55,7,blue)}
  else if(n==='Arqueiro Estelar'){arc5(36,-16,30,-1.35,1.35,5,gold);line5(23,-17,59,-17,2,blue)}
  else if(fast){poly5([[36+atk*9,-19],[56+atk*10,-10],[36+atk*9,-2]],gold)}
  else if(elite){line5(31,-17,65+atk*7,-44,7,gold);poly5([[62,-53],[76,-43],[64,-34]],ivory,gold,2)}ctx.restore();
}

function soundWave5(x,y,atk,c,strong=false){ctx.globalAlpha=.55;for(let i=0;i<(strong?3:2);i++)arc5(x,y,10+i*9+atk*5,-.75,.75,2,c);ctx.globalAlpha=1}
function drawMusician(u,t,p){
  const f=dir5(u),ph=phase5(u,t,1.05),atk=kick5(u,t),n=u.name,pink=p[0],blue=p[1],brass=p[2],wood='#71484a',dark='#34334a';ctx.save();ctx.scale(f,1);
  if(n==='Órgão de Guerra'){
    ctx.fillStyle=wood;rr5(-47,-16,83,36,6);ctx.fill();dot5(-31,26,12,dark);dot5(27,26,12,dark);for(let i=0;i<6;i++){ctx.fillStyle=i%2?brass:pink;rr5(-30+i*12,-44-(i%3)*8,8,47+(i%3)*8,3);ctx.fill()}for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#ece4d4':dark;rr5(-23+i*7,-10,6,13,1);ctx.fill()}soundWave5(44,-18,atk,blue,true);ctx.restore();return;
  }
  if(n==='Pianista'){
    ctx.fillStyle=dark;rr5(-44,-27,79,43,6);ctx.fill();poly5([[-38,-27],[16,-58],[35,-27]],wood,brass,2);for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#f1eadc':pink;rr5(-33+i*7,-15,6,14,1);ctx.fill()}dot5(-29,23,10,brass);dot5(27,23,10,brass);dot5(-4,-52,10,'#bb896a');soundWave5(43,-20,atk,pink,true);ctx.restore();return;
  }
  if(n==='Orquestra Viva'){
    ellipse5(0,-8,43,28,dark);for(let i=-2;i<=2;i++){const x=i*16;ctx.fillStyle=i%2?pink:blue;rr5(x-4,-64-Math.abs(i)*5,8,54,3);ctx.fill()}ellipse5(-37,-24,18,25,brass);ellipse5(37,-24,18,25,wood);line5(-46,-18,-67,-42+ph*3,4,brass);line5(46,-18,67,-42-ph*3,4,brass);soundWave5(4,-19,atk,brass,true);ctx.restore();return;
  }
  const tank=has5(n,['Tuba']),fast=has5(n,['Baterista','Saxofonista']),w=tank?28:21,step=fast?ph*7:ph*4;
  line5(-9,5,-15,36+step,tank?9:6,dark);line5(9,5,15,36-step,tank?9:6,dark);poly5([[-w,-30],[-w+4,-46],[0,-55],[w-4,-46],[w,-28],[w-5,10],[-w+5,10]],n.includes('Punk')?dark:pink,dark,2);dot5(0,-48,10,'#bd8969');line5(-17,-20,-38,-3+ph*3,6,blue);line5(17,-20,42+atk*7,-12-ph*3,6,blue);
  if(tank){ring5(2,-18,27,34,-.28,9,brass);line5(19,-28,48,-51,9,brass);ellipse5(51,-54,14,10,brass)}
  else if(has5(n,['Percussionista','Baterista'])){ellipse5(0,-2,25,18,wood);ring5(0,-2,25,18,0,3,brass);line5(-22,-27,10+atk*10,-2,4,brass);line5(22,-27,-10+atk*7,-2,4,brass)}
  else if(n==='Violonista'){ellipse5(27,-17,12,17,wood);line5(31,-27,53,-48,5,wood);line5(9,-37,54+atk*8,-9,3,brass);soundWave5(45,-15,atk,pink)}
  else if(n==='Guitarrista'){ellipse5(24,-12,17,22,pink,-.2);line5(31,-25,57,-48,7,dark);for(let i=-1;i<=1;i++)line5(13,-15+i*5,43,-29+i*5,1,brass);soundWave5(51,-17,atk,blue,true)}
  else if(n==='Cantor'){line5(26,-20,52,-36,4,dark);dot5(55,-39,7,brass);soundWave5(52,-40,atk,pink,true)}
  else if(n==='Maestro'){line5(28,-22,63+atk*7,-48,3,brass);ctx.globalAlpha=.45;line5(-44,-56,44,-56,2,blue);for(let i=-2;i<=2;i++)line5(i*18,-60,i*18,-52,2,pink);ctx.globalAlpha=1}
  else if(n==='Saxofonista'){ctx.strokeStyle=brass;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(18,-28);ctx.quadraticCurveTo(49,-6,34,19);ctx.quadraticCurveTo(24,30,16,16);ctx.stroke();soundWave5(44,-4,atk,blue)}
  else if(n==='Trompetista'){line5(21,-27,58+atk*7,-27,8,brass);ellipse5(63+atk*7,-27,10,14,brass);soundWave5(72,-27,atk,pink,true)}
  else{line5(22,-27,59+atk*7,-27,5,brass);soundWave5(63,-27,atk,blue)}ctx.restore();
}

function facet5(cx,cy,s,c1,c2,rot=0){ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);poly5([[0,-s],[s*.8,-s*.25],[s*.55,s*.75],[-s*.55,s*.75],[-s*.8,-s*.25]],c1,c2,2);poly5([[0,-s],[s*.8,-s*.25],[0,0]],c2);ctx.restore()}
function drawCrystal(u,t,p){
  const f=dir5(u),ph=phase5(u,t,.72),atk=kick5(u,t),n=u.name,cyan=p[0],violet=p[1],white=p[2],rock='#3d4655';ctx.save();ctx.scale(f,1);
  if(n==='Coração Prismático'){
    facet5(0,-26,29,cyan,white,t*.08);for(let i=0;i<6;i++){const a=t*.4+i*Math.PI/3,x=Math.cos(a)*45,y=-25+Math.sin(a)*27;facet5(x,y,9,i%2?violet:cyan,white,a)}ring5(0,-25,52,31,-t*.2,3,'rgba(238,248,255,.65)');ctx.restore();return;
  }
  if(n==='Monólito de Quartzo'){
    poly5([[-30,29],[-24,-50],[0,-78],[25,-50],[31,29]],cyan,white,3);poly5([[0,-78],[25,-50],[7,15]],violet);for(const x of [-23,-8,9,24])line5(x,20,x+(x<0?-8:8),39,7,rock);line5(22,-30,63+atk*9,-30,5,white);ctx.restore();return;
  }
  if(has5(n,['Geodo','Quartzo-Casco'])){
    ellipse5(0,-4,42,31,rock);for(let i=0;i<6;i++){const a=i*Math.PI/3;facet5(Math.cos(a)*24,-5+Math.sin(a)*18,10,i%2?violet:cyan,white,a)}line5(-22,15,-28,38+ph*3,9,rock);line5(22,15,28,38-ph*3,9,rock);ctx.restore();return;
  }
  const fast=has5(n,['Estilhaço','Topázio']),dense=has5(n,['Ametista','Diamante','Obsidiana']),color=n==='Ametista'?violet:n==='Obsidiana'?'#24273a':n==='Topázio'?'#d8b84d':n==='Safira'?'#315ca6':cyan;
  line5(-9,3,-15,37+ph*(fast?7:3),dense?9:6,color);line5(9,3,15,37-ph*(fast?7:3),dense?9:6,color);facet5(0,-20,dense?31:25,color,white,fast?.2:0);facet5(0,-54,dense?14:11,color,white);
  line5(-17,-24,-42,-5+ph*3,dense?9:6,color);line5(17,-24,43+atk*8,-9-ph*3,dense?9:6,color);
  if(n==='Prisma'){poly5([[28,-39],[55,-26],[28,-13]],white,cyan,2);line5(52,-26,69+atk*8,-26,4,cyan)}
  else if(n==='Cristal Curador'){for(let i=-2;i<=2;i++)facet5(-28+i*14,-48-Math.abs(i)*5,7,white,cyan);dot5(47+atk*5,-10,5,white)}
  else if(n==='Obsidiana'){poly5([[-40,-42],[-22,-62],[-16,-18]],'#151828',white,1);poly5([[40,-42],[22,-62],[16,-18]],'#151828',white,1)}
  else if(n==='Safira'){poly5([[31,-33],[57,-22],[31,-11]],'#315ca6',white,2);line5(54,-22,72+atk*7,-22,3,white)}
  else{poly5([[35+atk*8,-20],[59+atk*9,-9],[36+atk*8,1]],color,white,2)}
  if(n==='Diamante'){for(let i=0;i<4;i++){const a=i*Math.PI/2;facet5(Math.cos(a)*34,-25+Math.sin(a)*27,7,white,cyan,a)}}ctx.restore();
}

function drawMythic(u,t,p){
  const f=dir5(u),ph=phase5(u,t,.9),atk=kick5(u,t),n=u.name,purple=p[0],wine=p[1],gold=p[2],fur='#65504a',stone='#60626b';ctx.save();ctx.scale(f,1);
  if(n==='Gárgula'){
    ellipse5(0,-8,33,29,stone);dot5(0,-43,13,stone);poly5([[-23,-29],[-55,-55],[-44,-9]],stone,gold,2);poly5([[23,-29],[55,-55],[44,-9]],stone,gold,2);line5(-17,9,-24,37+ph*3,10,stone);line5(17,9,24,37-ph*3,10,stone);line5(23,-18,47+atk*8,-2,9,stone);ctx.restore();return;
  }
  if(n==='Fada Sombria'){
    dot5(0,-35,10,'#c8a58e');poly5([[-12,-25],[12,-25],[9,13],[-9,13]],purple);ctx.globalAlpha=.55;poly5([[-8,-34],[-42,-58],[-29,-12]],wine,gold,1);poly5([[8,-34],[42,-58],[29,-12]],wine,gold,1);ctx.globalAlpha=1;line5(10,-24,47+atk*8,-18,4,gold);dot5(51+atk*8,-18,4,wine);ctx.restore();return;
  }
  if(n==='Lobisomem'){
    ellipse5(-4,-7,37,22,fur);poly5([[20,-24],[51,-15],[28,-2]],fur,stone,2);dot5(38,-19,12,fur);poly5([[40,-13],[59,-7],[43,-2]],'#d7c6aa');for(const a of [[-25,4,-34,38+ph*7],[-6,8,-12,38-ph*7],[17,7,25,37+ph*7],[31,1,40,33-ph*7]])line5(a[0],a[1],a[2],a[3],7,fur);ctx.restore();return;
  }
  if(n==='Minotauro'||n==='Ciclope'){
    const cycl=n==='Ciclope';line5(-14,5,-20,38+ph*3,12,fur);line5(14,5,20,38-ph*3,12,fur);ellipse5(0,-17,36,38,cycl?'#806856':fur);dot5(0,-57,cycl?18:16,cycl?'#92745e':fur);if(cycl)dot5(4,-60,7,gold);else{poly5([[-9,-63],[-34,-76],[-21,-55]],gold);poly5([[9,-63],[34,-76],[21,-55]],gold)}line5(27,-26,54+atk*8,-5,12,fur);ellipse5(59+atk*9,-5,13,11,stone);ctx.restore();return;
  }
  if(n==='Medusa'){
    poly5([[-20,-31],[20,-31],[16,8],[3,35],[-12,17],[-16,5]],wine);dot5(0,-48,11,'#ab7e6f');for(let i=0;i<7;i++){const a=-1.2+i*.4;ctx.strokeStyle=i%2?purple:wine;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-52);ctx.quadraticCurveTo(Math.cos(a)*25,-73+Math.sin(t*2+i)*4,Math.cos(a)*35,-59+Math.sin(a)*18);ctx.stroke()}line5(18,-23,47+atk*7,-17,5,gold);ctx.restore();return;
  }
  if(n==='Dragão'||n==='Quimera Alada'){
    const dragon=n==='Dragão';ellipse5(-5,-5,dragon?45:36,dragon?25:21,purple);poly5([[21,-24],[57,-17],[31,0]],wine,gold,2);dot5(42,-21,dragon?13:10,wine);poly5([[-21,-16],[-61,-58],[-45,-4]],wine,gold,2);poly5([[5,-20],[42,-58],[30,-5]],wine,gold,2);for(const a of [[-27,9,-34,38+ph*4],[-4,12,-8,38-ph*4],[20,9,27,37+ph*4]])line5(a[0],a[1],a[2],a[3],dragon?9:7,fur);ctx.strokeStyle=purple;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-39,-1);ctx.quadraticCurveTo(-62,15+ph*4,-70,31);ctx.stroke();dot5(60+atk*8,-17,5,dragon?'#db7748':gold);ctx.restore();return;
  }
  if(n==='Hidra Ancestral'){
    ellipse5(-8,3,48,27,purple);for(let i=-2;i<=2;i++){const x=i*15;ctx.strokeStyle=i%2?wine:purple;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(x,-9);ctx.quadraticCurveTo(x*1.7,-41-Math.abs(i)*5,30+i*15,-58+Math.sin(t*2+i)*3);ctx.stroke();dot5(33+i*15,-60+Math.sin(t*2+i)*3,10,i%2?wine:purple);poly5([[41+i*15,-60],[57+i*15,-55],[43+i*15,-50]],gold)}for(let i=-2;i<=2;i++)line5(i*17,15,i*19,38+(i%2?ph:-ph)*3,8,fur);ctx.restore();return;
  }
  if(n==='Vampiro'||n==='Bruxa'){
    const witch=n==='Bruxa',cloth='#3a293d';line5(-8,6,-13,37+ph*5,6,cloth);line5(8,6,13,37-ph*5,6,cloth);poly5([[-20,-31],[20,-31],[23,12],[-23,12]],witch?purple:wine);dot5(0,-48,10,'#c29480');if(witch)poly5([[-18,-55],[0,-79],[22,-55]],purple,gold,2);else poly5([[-19,-35],[-45,-57],[-35,10]],purple,gold,2);line5(18,-20,48+atk*7,-18,5,gold);ctx.restore();return;
  }
  /* Sátiro: anatomia caprina, usada também para as duas castas homônimas. */
  line5(-10,3,-19,25+ph*5,7,fur);line5(-19,25+ph*5,-28,38+ph*7,5,fur);line5(10,3,19,25-ph*5,7,fur);line5(19,25-ph*5,28,38-ph*7,5,fur);poly5([[-20,-31],[20,-31],[17,9],[-17,9]],purple);dot5(0,-48,11,'#a87865');arc5(-4,-55,17,2.8,4.8,4,gold);arc5(4,-55,17,4.6,6.6,4,gold);line5(18,-20,49+atk*7,-9,6,fur);poly5([[47,-18],[61,-9],[48,0]],gold);ctx.restore();
}

function drawPhysics(u,t,p){
  const f=dir5(u),ph=phase5(u,t,.8),atk=kick5(u,t),n=u.name,blue=p[0],cyan=p[1],lime=p[2],dark='#172746';ctx.save();ctx.scale(f,1);
  if(n==='Massa Inercial'){
    dot5(0,-16,31,dark);dot5(0,-16,18,blue);for(let i=0;i<3;i++)ring5(0,-16,41-i*6,20+i*8,t*(i%2?.08:-.05),4,i===1?lime:cyan);line5(-19,9,-24,38+ph*2,10,dark);line5(19,9,24,38-ph*2,10,dark);ctx.restore();return;
  }
  if(n==='Vetor'){
    poly5([[-35,-12],[12,-34],[12,-49],[61+atk*9,-15],[12,19],[12,5]],blue,cyan,3);poly5([[-19,-10],[9,-25],[9,3]],lime);line5(-12,13,-18,38+ph*5,6,dark);line5(10,10,16,38-ph*5,6,dark);ctx.restore();return;
  }
  if(n==='Fóton'||n==='Táquion'||n==='Raio Gama'){
    const tach=n==='Táquion',gamma=n==='Raio Gama',len=tach?68:gamma?55:46;poly5([[-len,-13],[12,-31],[len+atk*8,-13],[12,5]],gamma?lime:cyan,blue,2);dot5(12,-13,gamma?11:8,'#f0f7e6');for(let i=0;i<3;i++)line5(-len-i*9,-13+i*5,-len+14-i*9,-13+i*5,2,gamma?lime:cyan);ctx.restore();return;
  }
  if(n==='Gráviton'){
    dot5(0,-17,28,dark);for(let i=0;i<4;i++){const a=t*.25+i*Math.PI/2,x=Math.cos(a)*35,y=-17+Math.sin(a)*25;dot5(x,y,8,i%2?cyan:blue);line5(x,y,x*.45,-17+(y+17)*.45,3,cyan)}line5(-16,5,-21,38+ph*3,9,dark);line5(16,5,21,38-ph*3,9,dark);ctx.restore();return;
  }
  if(n==='Campo Estável'){
    for(let i=0;i<4;i++)ring5(0,-18,18+i*8,31-i*4,(i-1.5)*.35,3,i%2?cyan:blue);poly5([[-10,31],[0,13],[10,31]],lime);dot5(0,-18,8,lime);ctx.restore();return;
  }
  if(n==='Onda Estacionária'){
    dot5(-42,-18,8,blue);dot5(42,-18,8,blue);ctx.strokeStyle=cyan;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-42,-18);for(let i=0;i<=12;i++){const x=-42+i*7,y=-18+Math.sin(i*Math.PI/2)*18*(.6+.4*Math.sin(t*3));ctx.lineTo(x,y)}ctx.stroke();dot5(0,-18,7,lime);line5(-25,6,-28,38+ph*3,5,dark);line5(25,6,28,38-ph*3,5,dark);ctx.restore();return;
  }
  if(n==='Acelerador'){
    ctx.fillStyle=dark;rr5(-54,-25,97,48,9);ctx.fill();for(let i=0;i<5;i++)ring5(-34+i*19,-4,10,25,0,4,i%2?cyan:blue);line5(-40,-4,65+atk*9,-4,7,lime);dot5(-38,29,11,blue);dot5(33,29,11,blue);ctx.restore();return;
  }
  if(n==='Elétron'){
    dot5(0,-18,9,cyan);for(let i=0;i<3;i++){const a=t*(i%2?3:-2.4)+i*2,x=Math.cos(a)*34,y=-18+Math.sin(a)*23;ring5(0,-18,34,23,i*Math.PI/3,2,blue);dot5(x,y,5,lime)}ctx.restore();return;
  }
  if(n==='Reator Nuclear'){
    ctx.fillStyle=dark;rr5(-38,-43,76,68,12);ctx.fill();for(let i=-2;i<=2;i++){ctx.fillStyle=i%2?cyan:lime;rr5(i*13-4,-63-Math.abs(i)*5,8,45+Math.abs(i)*5,3);ctx.fill()}dot5(0,-12,22,blue);ring5(0,-12,28,28,t*.1,5,lime);for(let i=0;i<3;i++)dot5(42+i*8,-35+i*11,3,lime);ctx.restore();return;
  }
  /* Singularidade: o espaço distorcido é a silhueta. */
  dot5(0,-20,16,'#03060d');ring5(0,-20,32,18,t*.35,6,cyan);ring5(0,-20,49,28,-t*.2,3,blue);ctx.globalAlpha=.55;for(let i=0;i<7;i++){const a=t*.5+i*Math.PI*2/7,x=Math.cos(a)*48,y=-20+Math.sin(a)*27;dot5(x,y,3,i%2?lime:cyan)}ctx.globalAlpha=1;ctx.restore();
}

function renderLot05Unit(u,t){
  const y=yOf(u),meta=facMeta(u.fac),p=meta.palette,team=teamTheme(u.side);
  const floatFac=u.fac==='Físicos'||(u.fac==='Míticos'&&has5(u.name,['Fada','Dragão','Quimera','Hidra']))||u.fac==='Celestiais';
  const bob=Math.sin(t*6+(u.anim||0))*(floatFac?2.2:u.role==='ranged'?1.1:1.8);
  const roleScale=u.role==='tank'?[1.13,.96]:u.role==='assassin'?[.88,1.06]:u.role==='siege'?[1.14,.92]:[1,1];
  const sc=(.88+y/VIEW_H*.2)*(u.role==='unique'?1.35:u.role==='elite'?1.18:u.minion?.78:1);
  ctx.save();ctx.translate(u.x,y+bob);ctx.scale(sc*roleScale[0],sc*roleScale[1]);
  ctx.fillStyle=u.fac==='Físicos'?'rgba(49,93,157,.15)':u.fac==='Celestiais'?'rgba(142,214,255,.14)':'rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,38,u.minion?21:30,u.minion?6:9,0,0,Math.PI*2);ctx.fill();
  drawTeamMarker(u,t);drawFactionAura(u,t,meta);
  if(u.fac==='Demônios')drawDemon(u,t,p);else if(u.fac==='Celestiais')drawCelestial(u,t,p);else if(u.fac==='Músicos')drawMusician(u,t,p);else if(u.fac==='Cristalinos')drawCrystal(u,t,p);else if(u.fac==='Míticos')drawMythic(u,t,p);else drawPhysics(u,t,p);
  if(u.role==='elite'||u.role==='unique'){ctx.strokeStyle=p[2];ctx.lineWidth=u.role==='unique'?4:2;ctx.globalAlpha=.62;ctx.beginPath();ctx.arc(0,-7,u.role==='unique'?40:34,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  ctx.fillStyle='rgba(10,11,13,.82)';rr5(-29,-67,58,7,4);ctx.fill();ctx.fillStyle=team.primary;rr5(-29,-67,58*Math.max(0,u.hp/u.maxHp),7,4);ctx.fill();
  if(!u.minion){ctx.fillStyle='rgba(12,13,16,.82)';rr5(-50,52,100,20,6);ctx.fill();ctx.strokeStyle=team.primary;ctx.lineWidth=1.5;rr5(-50,52,100,20,6);ctx.stroke();ctx.fillStyle='#f0eadb';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(u.name,0,66)}
  else{ctx.fillStyle=team.primary;ctx.strokeStyle='#f4f7fb';ctx.lineWidth=1.5;ctx.beginPath();if(u.minionType==='tank')ctx.rect(-8,44,16,11);else if(u.minionType==='ranged'){ctx.moveTo(0,43);ctx.lineTo(9,55);ctx.lineTo(-9,55);ctx.closePath()}else ctx.arc(0,49,7,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.restore();
}

drawUnit=function(u,t){if(!LOT05.has(u.fac))return previousDrawUnit(u,t);renderLot05Unit(u,t)};

})();
