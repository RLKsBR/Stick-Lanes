/* Stick Lanes — aplicação visual lote 04
   Titãs, Alquimistas, Orcs, Espectrais e Cultistas.
   Camada de render somente: não altera stats, IA ou balanceamento. */
(function(){
'use strict';

const LOT04=new Set(['Titãs','Alquimistas','Orcs','Espectrais','Cultistas']);
const previousDrawUnit=drawUnit;

function rr4(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function line4(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly4(points,fill,stroke=null,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function dot4(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function ellipse4(x,y,rx,ry,c,rot=0){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill()}
function phase4(u,t,s=1){return Math.sin(t*7*s+(u.anim||0))}
function dir4(u){return u.side===1?1:-1}
function kick4(u,t){return Math.max(0,1-(t-(u.lastAttack||-99))*7)}
function has4(name,parts){return parts.some(x=>name.includes(x))}
function crack4(x,y,s,c){line4(x-s,y-s*.3,x,y,1.5,c);line4(x,y,x+s*.55,y+s*.55,1.5,c);line4(x,y,x-s*.1,y+s*.75,1.5,c)}

function drawTitan(u,t,p){
  const f=dir4(u),ph=phase4(u,t,.58),atk=kick4(u,t),n=u.name;
  const runner=has4(n,['Corredor','Colinas']),wall=has4(n,['Muralha']),atlas=n==='Atlas',elder=has4(n,['Ancião']);
  const broad=wall||has4(n,['Quebra-Montes','Pisoteador'])||atlas,stone='#777b80',dark=p[2],gold=p[1];
  ctx.save();ctx.scale(f,1);

  if(has4(n,['Portador de Monólito'])){
    ctx.rotate(-.13);poly4([[-38,-68],[3,-82],[19,12],[-24,22]],dark,gold,3);crack4(-8,-34,17,gold);
    line4(-14,7,-23,38+ph*2,12,stone);line4(12,7,23,38-ph*2,12,stone);
    ellipse4(4,-17,28,32,stone,-.15);dot4(21,-48,12,'#92969a');line4(15,-6,36,-28,12,stone);
    ctx.restore();return;
  }

  const legGap=runner?11:15,legW=runner?9:broad?15:12,step=runner?ph*8:ph*3;
  line4(-legGap,5,-legGap-5,38+step,legW,stone);line4(legGap,5,legGap+5,38-step,legW,stone);
  ellipse4(-legGap-5,39+step,legW*.9,5,dark);ellipse4(legGap+5,39-step,legW*.9,5,dark);
  const torsoW=runner?21:broad?38:30,torsoH=runner?36:broad?33:35;
  poly4([[-torsoW,-31],[-torsoW+5,-48],[0,-57],[torsoW-5,-48],[torsoW,-29],[torsoW-7,8],[-torsoW+7,8]],stone,dark,3);
  poly4([[-torsoW+4,-46],[0,-57],[torsoW-4,-46],[torsoW-10,-34],[-torsoW+10,-34]],gold);
  dot4(runner?5:0,-68,runner?10:13,'#96999b');
  if(elder||atlas){poly4([[-12,-65],[0,-50],[13,-65],[8,-35],[0,-24],[-8,-35]],'#c9c1a8');crack4(0,-70,7,dark)}
  else crack4(0,-29,11,dark);

  const armW=runner?8:broad?14:11;
  line4(-torsoW+5,-34,-torsoW-14,-4+ph*2,armW,stone);
  line4(torsoW-5,-35,torsoW+17+atk*12,-9-ph*2,armW,stone);
  dot4(-torsoW-14,-2+ph*2,armW*.72,stone);dot4(torsoW+18+atk*12,-8-ph*2,armW*.76,stone);

  if(wall){poly4([[18,-49],[51,-42],[52,20],[18,12]],dark,gold,3);for(let y=-28;y<10;y+=15)line4(25,y,45,y+2,2,gold)}
  if(has4(n,['Arremessador','Pedreiro'])){ellipse4(37+atk*14,-27,13,11,dark);ellipse4(-27,-15,10,8,dark)}
  if(has4(n,['Lançador de Colunas'])){ctx.save();ctx.translate(36+atk*13,-27);ctx.rotate(-.3);ctx.fillStyle='#a0a2a0';rr4(-4,-31,12,62,4);ctx.fill();for(let y=-22;y<28;y+=13)line4(-3,y,7,y,1.5,gold);ctx.restore()}
  if(has4(n,['Guardião'])){line4(-34,-39,-35,25,5,gold);poly4([[-35,-48],[-7,-39],[-35,-24]],p[2],gold,2)}
  if(has4(n,['Pisoteador'])){ellipse4(-18,38+step,18,7,dark);ellipse4(18,38-step,18,7,dark)}
  if(has4(n,['Quebra-Montes'])){line4(31,-19,55+atk*11,-45,8,dark);poly4([[48+atk*11,-55],[70+atk*11,-47],[61+atk*11,-26],[42+atk*11,-35]],stone,dark,2)}
  if(atlas){
    poly4([[-42,-52],[-29,-76],[-12,-65],[-1,-88],[13,-66],[31,-78],[43,-50]],'#5c635b',gold,2);
    for(const x of [-27,-4,20]){ctx.fillStyle=gold;rr4(x,-76-(x===-4?12:0),8,20,1);ctx.fill()}
    line4(-35,-54,35,-54,3,'#8e8763');
  }
  ctx.restore();
}

function drawAlchemist(u,t,p){
  const f=dir4(u),ph=phase4(u,t,.92),atk=kick4(u,t),n=u.name;
  const glass='rgba(188,229,215,.76)',copper=p[0],liquid=p[1],violet=p[2],metal='#49433d';
  ctx.save();ctx.scale(f,1);

  if(n==='Pedra Filosofal'){
    ctx.globalAlpha=.9;poly4([[0,-72],[28,-43],[20,-2],[0,27],[-22,-3],[-27,-44]],'#d36454','#f0c46b',3);ctx.globalAlpha=1;
    ctx.strokeStyle=copper;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-24,47,19,t*.4,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,-24,21,48,-t*.25,0,Math.PI*2);ctx.stroke();dot4(0,-25,10,'#ffe19c');ctx.restore();return;
  }
  if(n==='Canhão de Retorta'){
    ctx.fillStyle=metal;rr4(-43,-12,76,31,8);ctx.fill();dot4(-27,25,12,'#292929');dot4(26,25,12,'#292929');
    ctx.fillStyle=glass;ctx.strokeStyle=copper;ctx.lineWidth=4;ctx.beginPath();ctx.arc(-18,-30,20,0,Math.PI*2);ctx.fill();ctx.stroke();ellipse4(-18,-24,14,9,liquid);
    line4(0,-35,37,-49,9,copper);line4(34,-49,61+atk*10,-49,14,metal);line4(-7,-12,20,7,3,copper);ctx.restore();return;
  }

  if(has4(n,['Homúnculo','Frasco Ambulante'])){
    const mercury=n.includes('Mercúrio'),lead=n.includes('Chumbo'),blade=n.includes('Lâmina'),agile=n.includes('Ágil');
    if(mercury){
      ctx.globalAlpha=.88;ellipse4(0,-19,19,35,'#b9c3bd');poly4([[-18,-7],[0,20],[19,-8]],'#9da9a4');ctx.globalAlpha=1;
      line4(-9,8,-17,37+ph*8,agile?4:7,'#9da9a4');line4(9,8,17,37-ph*8,agile?4:7,'#9da9a4');line4(12,-28,48+atk*9,-15,6,'#cfd7d2');
    }else{
      ctx.fillStyle=glass;ctx.strokeStyle=copper;ctx.lineWidth=4;rr4(-22,-48,44,56,13);ctx.fill();ctx.stroke();ellipse4(0,-7,18,11,lead?'#77726b':liquid);
      ctx.fillStyle=copper;rr4(-13,-58,26,12,4);ctx.fill();line4(-11,7,-18,36+ph*5,lead?9:6,lead?metal:copper);line4(11,7,18,36-ph*5,lead?9:6,lead?metal:copper);
      if(blade){poly4([[18,-35],[54+atk*8,-25],[20,-15]],'#d9d4c7',metal,2);poly4([[-18,-35],[-47,-22],[-18,-15]],'#d9d4c7',metal,2)}
      else{line4(20,-30,43+atk*7,-12,6,copper);dot4(45+atk*7,-10,7,liquid)}
    }
    ctx.restore();return;
  }

  const elite=n==='Nicolas Flamel',heavy=u.role==='bruiser';
  line4(-9,5,-14,36+ph*(u.role==='assassin'?7:4),7,metal);line4(9,5,14,36-ph*(u.role==='assassin'?7:4),7,metal);
  poly4([[heavy?-25:-20,-30],[heavy?25:20,-30],[22,11],[-22,11]],elite?violet:copper,metal,2);dot4(0,-47,11,'#c8956d');
  poly4([[-14,-52],[0,-64],[15,-52],[13,-40],[-13,-40]],elite?violet:metal,copper,2);line4(-17,-18,-37,-2+ph*2,6,copper);line4(17,-18,43+atk*7,-12-ph*2,6,copper);
  if(has4(n,['Lançador','Boticário','Sono','Piromante'])){
    const chem=n.includes('Sono')?violet:n.includes('Piromante')?'#e56d37':liquid;
    ctx.fillStyle=glass;ctx.strokeStyle=copper;ctx.lineWidth=3;ctx.beginPath();ctx.arc(46+atk*7,-15,9,0,Math.PI*2);ctx.fill();ctx.stroke();ellipse4(46+atk*7,-11,6,3,chem);
    if(n.includes('Boticário')){ctx.fillStyle=metal;rr4(-37,-21,17,26,3);ctx.fill();dot4(-31,-13,3,liquid);dot4(-25,-4,3,violet)}
  }else if(n.includes('Transmutador')){dot4(47+atk*7,-13,12,metal);poly4([[47,-25],[57,-13],[47,-1],[37,-13]],liquid,copper,2)}
  else{line4(35,-12,51+atk*8,-28,5,metal)}
  if(elite){for(let x of [-16,0,16]){ctx.fillStyle=glass;ctx.strokeStyle=copper;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,-69-Math.abs(x)*.25,5,0,Math.PI*2);ctx.fill();ctx.stroke()}}
  ctx.restore();
}

function drawOrc(u,t,p){
  const f=dir4(u),ph=phase4(u,t,1),atk=kick4(u,t),n=u.name,rage=u.hp/u.maxHp<.4;
  const skin=p[0],leather=p[1],brass=p[2],iron='#3e4140';ctx.save();ctx.scale(f,1);
  if(n==='Catapulta Orc'){
    ctx.fillStyle=leather;rr4(-45,-16,78,24,5);ctx.fill();dot4(-29,18,14,iron);dot4(27,18,14,iron);line4(-24,-15,15,-58,8,leather);line4(14,-58,53,-28,7,leather);ellipse4(57,-25,14,10,iron);line4(-33,-6,32,-6,4,brass);ctx.restore();return;
  }
  if(n==='Montador de Javali'){
    ellipse4(-5,1,43,22,leather);poly4([[24,-15],[52,-8],[32,4]],skin);dot4(34,-13,11,skin);poly4([[43,-5],[60,-1],[45,3]],'#e6d3ae');
    line4(-25,10,-31,37+ph*6,8,leather);line4(16,10,23,37-ph*6,8,leather);dot4(-3,-38,10,skin);ctx.fillStyle=iron;rr4(-16,-31,27,26,5);ctx.fill();line4(8,-25,45,-40-atk*5,5,iron);ctx.restore();return;
  }
  const tank=u.role==='tank',elite=u.role==='elite'||u.role==='unique',lean=rage?.09:0;ctx.rotate(lean);
  line4(-11,5,-17,36+ph*(rage?6:4),tank?10:8,skin);line4(11,5,17,36-ph*(rage?6:4),tank?10:8,skin);
  poly4([[tank?-29:-23,-31],[tank?29:23,-31],[24,11],[-24,11]],tank?iron:skin,iron,2);dot4(0,-48,elite?14:12,skin);
  poly4([[-10,-43],[-2,-34],[1,-43]],'#ead4af');poly4([[10,-43],[2,-34],[-1,-43]],'#ead4af');
  if(elite)poly4([[-18,-58],[-10,-72],[0,-62],[11,-74],[19,-57]],brass,iron,2);
  line4(-19,-20,-41,-3+ph*3,tank?10:8,skin);line4(19,-20,43+atk*(rage?12:8),-9-ph*3,tank?10:8,skin);
  if(has4(n,['Escudo'])){poly4([[-48,-34],[-27,-39],[-24,16],[-48,23],[-60,-4]],iron,brass,3)}
  if(has4(n,['Arco'])){ctx.strokeStyle=leather;ctx.lineWidth=5;ctx.beginPath();ctx.arc(39,-12,29,-1.35,1.35);ctx.stroke();line4(25,-13,59,-13,2,'#d8c498')}
  else if(has4(n,['Tambor'])){ellipse4(45,-4,18,25,leather);line4(31,-22,57,14,3,brass);line4(31,14,57,-22,3,brass);line4(17,-30,51,-45-atk*6,4,leather)}
  else if(has4(n,['Xamã'])){line4(23,-20,51,-47,6,leather);poly4([[49,-56],[62,-49],[55,-36]],brass);for(let i=0;i<3;i++)dot4(-19+i*10,-62-Math.abs(i-1)*4,3,'#d9c078')}
  else if(has4(n,['Arremessador'])){ellipse4(48+atk*10,-13,11,9,'#69645a')}
  else{const dual=has4(n,['Duplo','Berserker']);line4(37+atk*8,-10,55+atk*9,-34,6,leather);poly4([[48+atk*9,-44],[69+atk*9,-36],[58+atk*9,-21],[43+atk*9,-29]],iron,brass,2);if(dual){line4(-35,-3,-53,-29,6,leather);poly4([[-47,-39],[-67,-31],[-57,-17],[-42,-25]],iron,brass,2)}}
  ctx.restore();
}

function drawSpectral(u,t,p){
  const f=dir4(u),ph=phase4(u,t,.72),atk=kick4(u,t),n=u.name;
  ctx.save();ctx.scale(f,1);
  if(n==='Canhão Poltergeist'){
    ctx.globalAlpha=.82;ctx.fillStyle='#66737b';rr4(-45,-15,78,30,7);ctx.fill();dot4(-28,22,14,'rgba(216,244,239,.55)');dot4(27,22,14,'rgba(216,244,239,.55)');line4(-4,-17,55+atk*8,-39,15,p[1]);
    ctx.globalAlpha=.48;for(let i=0;i<3;i++){dot4(-36+i*23,-36-Math.sin(t*2+i)*6,7,p[2]);line4(-36+i*23,-31,-28+i*20,-15,2,p[0])}ctx.globalAlpha=1;ctx.restore();return;
  }
  if(n==='Orbe Assombrado'){
    ctx.globalAlpha=.7;dot4(0,-24,27,p[1]);ctx.globalAlpha=1;dot4(0,-24,12,p[2]);dot4(5,-28,4,'#5b7079');ctx.strokeStyle=p[0];ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-24,38,t,Math.PI*1.5+t);ctx.stroke();line4(25,-24,54+atk*8,-24,4,p[2]);ctx.restore();return;
  }
  const dense=has4(n,['Denso','Cavaleiro']),shadow=has4(n,['Sombra','Vulto']),royal=has4(n,['Antigo','Rei']);
  ctx.globalAlpha=shadow?.48:dense?.8:.66;
  const body=shadow?'#263949':p[1],w=dense?30:royal?27:20;
  poly4([[-w,-39],[-w+7,-54],[0,-64],[w-6,-54],[w,-34],[w-7,2],[15,27+ph*4],[2,13],[-13,30-ph*3],[-w+7,1]],body,p[2],2);
  dot4(0,-51,dense?14:11,p[2]);dot4(4,-53,shadow?3:4,'#46606c');
  line4(-w+5,-32,-42,-9+ph*4,dense?10:5,body);line4(w-5,-32,45+atk*9,-14-ph*4,dense?10:5,body);
  ctx.globalAlpha=1;
  if(dense){poly4([[-31,-45],[0,-61],[31,-45],[23,-19],[-23,-19]],'rgba(105,123,142,.62)',p[2],2)}
  if(n.includes('Cavaleiro')){line4(33,-20,58+atk*8,-48,6,'#8d9ba8');poly4([[56+atk*8,-56],[68+atk*8,-49],[56+atk*8,-42]],p[2])}
  if(n.includes('Eco')){ctx.globalAlpha=.65;for(let i=0;i<3;i++)poly4([[39+i*7,-25],[45+i*7,-18],[37+i*7,-12]],p[2]);ctx.globalAlpha=1}
  if(n.includes('Médium')){line4(-32,-26,-32,13,3,'#b8c9ca');for(let i=0;i<3;i++)dot4(-32+i*7,14+i*2,3,p[2])}
  if(n.includes('Lamento')){ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.globalAlpha=.5;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(26,-47,16+i*9,-.65,.65);ctx.stroke()}ctx.globalAlpha=1}
  if(royal){poly4([[-15,-64],[-8,-80],[0,-69],[9,-82],[16,-63]],p[2],p[0],2);ctx.globalAlpha=.38;ctx.strokeStyle=p[0];ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-29,n.includes('Rei')?43:36,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  ctx.restore();
}

function drawCultist(u,t,p){
  const f=dir4(u),ph=phase4(u,t,.9),atk=kick4(u,t),n=u.name;
  const wine=p[0],violet=p[1],accent=p[2],iron='#353137';ctx.save();ctx.scale(f,1);
  if(n==='Totem Profano'){
    ctx.fillStyle='#403834';rr4(-28,-47,56,67,7);ctx.fill();poly4([[0,-65],[31,-45],[0,-25],[-31,-45]],violet,accent,3);dot4(0,-45,8,accent);line4(-31,14,-41,37+ph*2,9,iron);line4(31,14,41,37-ph*2,9,iron);for(let i=-1;i<=1;i++)dot4(i*17,-66-Math.abs(i)*5,4,'#d77c5d');ctx.restore();return;
  }
  if(n==='Ídolo Desperto'){
    poly4([[-38,-35],[-26,-62],[0,-78],[27,-62],[39,-34],[31,13],[12,7],[0,30],[-13,7],[-31,13]],'#39313b',accent,3);
    poly4([[-19,-48],[0,-66],[20,-48],[12,-26],[-12,-26]],violet);dot4(0,-46,7,accent);crack4(-19,-12,9,accent);crack4(19,-10,9,accent);
    line4(-30,-28,-51,-1+ph*2,12,'#39313b');line4(30,-28,52+atk*9,-5-ph*2,12,'#39313b');ctx.restore();return;
  }
  const tank=u.role==='tank',elite=u.role==='elite',fast=u.role==='assassin'||u.role==='skirmisher';
  line4(-9,5,-15,36+ph*(fast?7:4),tank?9:6,iron);line4(9,5,15,36-ph*(fast?7:4),tank?9:6,iron);
  poly4([[tank?-27:-20,-31],[tank?27:20,-31],[23,11],[-23,11]],tank?iron:wine,violet,2);
  poly4([[-17,-48],[0,-64],[18,-48],[13,-36],[-13,-36]],elite?violet:wine,accent,2);dot4(0,-46,9,'#c4a594');
  poly4([[-10,-52],[0,-58],[10,-52],[8,-42],[-8,-42]],iron,accent,1.5);dot4(3,-48,2,accent);
  line4(-17,-19,-39,-1+ph*3,tank?9:6,tank?iron:wine);line4(17,-19,43+atk*8,-10-ph*3,tank?9:6,tank?iron:wine);
  if(has4(n,['Escudo','Ferro']))poly4([[-48,-34],[-27,-39],[-25,18],[-49,23],[-59,-4]],iron,accent,2);
  else if(n.includes('Acólito')){ctx.fillStyle='#d1b89a';rr4(35+atk*7,-25,20,17,2);ctx.fill();line4(39,-22,51,-11,1.5,violet);line4(49,-22,39,-11,1.5,violet)}
  else if(n.includes('Sacrificador'))poly4([[37+atk*10,-18],[59+atk*11,-10],[37+atk*10,-3]],'#c9c2b5',violet,2);
  else if(n.includes('Flagelante')){ctx.strokeStyle=iron;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(37,-10);ctx.quadraticCurveTo(58+atk*8,-30,65,3);ctx.stroke();for(let i=0;i<3;i++)dot4(63+i*3,3+i*3,2,accent)}
  else if(n.includes('Pregador')){line4(25,-25,49,-54,5,iron);poly4([[48,-62],[61,-54],[49,-45]],accent,violet,2)}
  else if(n.includes('Hipnotista')){line4(39,-12,52,-12,3,accent);line4(52,-12,52,6,2,accent);dot4(52,12,6,accent);dot4(52,12,3,violet)}
  else if(n.includes('Chamas')){line4(35,-13,54,-13,6,iron);ellipse4(57+atk*7,-16,8,13,'#d96c45');ellipse4(57+atk*7,-13,4,7,'#edb868')}
  else{line4(35,-10,53+atk*8,-29,5,iron);poly4([[48+atk*8,-37],[61+atk*8,-29],[53+atk*8,-18]],'#bbb6ae')}
  if(elite){for(let i=-1;i<=1;i++)line4(i*12,-61,i*15,-76-Math.abs(i)*4,3,accent)}
  ctx.restore();
}

function renderLot04Unit(u,t){
  const y=yOf(u),meta=facMeta(u.fac),p=meta.palette,team=teamTheme(u.side),bob=Math.sin(t*6+(u.anim||0))*(u.fac==='Espectrais'?2.4:u.role==='ranged'?1.1:1.8);
  const roleScale=u.role==='tank'?[1.13,.96]:u.role==='assassin'?[.88,1.06]:u.role==='siege'?[1.14,.92]:[1,1];
  const factionScale=u.fac==='Titãs'?1.13:1;
  const sc=(.88+y/VIEW_H*.2)*(u.role==='unique'?1.35:u.role==='elite'?1.18:u.minion?.78:1)*factionScale;
  ctx.save();ctx.translate(u.x,y+bob);ctx.scale(sc*roleScale[0],sc*roleScale[1]);
  ctx.fillStyle=u.fac==='Espectrais'?'rgba(92,170,178,.14)':'rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,38,u.minion?21:30,u.minion?6:9,0,0,Math.PI*2);ctx.fill();
  drawTeamMarker(u,t);drawFactionAura(u,t,meta);
  if(u.fac==='Titãs')drawTitan(u,t,p);
  else if(u.fac==='Alquimistas')drawAlchemist(u,t,p);
  else if(u.fac==='Orcs')drawOrc(u,t,p);
  else if(u.fac==='Espectrais')drawSpectral(u,t,p);
  else drawCultist(u,t,p);
  if(u.role==='elite'||u.role==='unique'){ctx.strokeStyle=p[2];ctx.lineWidth=u.role==='unique'?4:2;ctx.globalAlpha=.62;ctx.beginPath();ctx.arc(0,-7,u.role==='unique'?40:34,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  ctx.fillStyle='rgba(10,11,13,.82)';rr4(-29,-67,58,7,4);ctx.fill();ctx.fillStyle=team.primary;rr4(-29,-67,58*Math.max(0,u.hp/u.maxHp),7,4);ctx.fill();
  if(!u.minion){ctx.fillStyle='rgba(12,13,16,.82)';rr4(-50,52,100,20,6);ctx.fill();ctx.strokeStyle=team.primary;ctx.lineWidth=1.5;rr4(-50,52,100,20,6);ctx.stroke();ctx.fillStyle='#f0eadb';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(u.name,0,66)}
  else{ctx.fillStyle=team.primary;ctx.strokeStyle='#f4f7fb';ctx.lineWidth=1.5;ctx.beginPath();if(u.minionType==='tank')ctx.rect(-8,44,16,11);else if(u.minionType==='ranged'){ctx.moveTo(0,43);ctx.lineTo(9,55);ctx.lineTo(-9,55);ctx.closePath()}else ctx.arc(0,49,7,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.restore();
}

drawUnit=function(u,t){
  if(!LOT04.has(u.fac))return previousDrawUnit(u,t);
  renderLot04Unit(u,t);
};

})();
