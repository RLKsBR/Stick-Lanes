function attackColor(u){if(u.special?.legendColor)return u.special.legendColor;let p=facMeta(u.fac)?.palette||['#ddd'];return p[0]}
const TEAM_THEME={
  1:{primary:'#f08a24',dark:'#603812',soft:'rgba(240,138,36,.22)',label:'TIME LARANJA',shape:'round'},
  '-1':{primary:'#c93645',dark:'#5d1c26',soft:'rgba(201,54,69,.22)',label:'TIME VERMELHO',shape:'sharp'}
};
function teamTheme(side){return TEAM_THEME[side]||TEAM_THEME[1]}
function seeded(n){let x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function draw(t){
 let bg=ctx.createLinearGradient(0,0,0,VIEW_H);bg.addColorStop(0,'#343a31');bg.addColorStop(.5,'#292f28');bg.addColorStop(1,'#1d211c');
 ctx.fillStyle=bg;ctx.fillRect(0,0,VIEW_W,VIEW_H);drawGroundTexture();
 ctx.save();ctx.translate(-cameraX,0);drawRoads();drawBases(t);
 structures.forEach(s=>{if(s.x>cameraX-s.range*PX-220&&s.x<cameraX+VIEW_W+s.range*PX+220)drawTower(s,t)});
 units.filter(u=>u.x>cameraX-180&&u.x<cameraX+VIEW_W+180).sort((a,b)=>yOf(a)-yOf(b)).forEach(u=>drawUnit(u,t));
 drawEffects(t);ctx.restore();drawMiniMap()
}
function drawGroundTexture(){
 ctx.save();for(let i=0;i<85;i++){let x=seeded(i+Math.floor(cameraX/60))*VIEW_W,y=85+seeded(i*7+11)*(VIEW_H-110),r=1+seeded(i*13)*3;
 ctx.fillStyle=i%3?'rgba(220,210,173,.04)':'rgba(0,0,0,.08)';ctx.beginPath();ctx.ellipse(x,y,r*2,r,0,0,Math.PI*2);ctx.fill()}ctx.restore()
}
function pathMain(lane,sub=0){
 ctx.beginPath();for(let x=BASE_X[1];x<=BASE_X[-1];x+=120){let y=pathY(lane,sub,x,1);if(x===BASE_X[1])ctx.moveTo(x,y);else ctx.lineTo(x,y)}
}
function drawRoads(){
 for(let lane=0;lane<3;lane++){
   pathMain(lane,0);ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=210;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
   pathMain(lane,0);ctx.strokeStyle=lane===selectedLane?'#71684f':'#5f5948';ctx.lineWidth=196;ctx.stroke();
   [-1,0,1].forEach(sub=>{
     pathMain(lane,sub);ctx.strokeStyle=sub===0?'#9b8968':'#8c7b5e';ctx.lineWidth=48;ctx.stroke();
     pathMain(lane,sub);ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=3;ctx.setLineDash([26,38]);ctx.stroke();ctx.setLineDash([])
   });
 }
}
function drawBases(t){
 for(const side of [1,-1]){let x=BASE_X[side],y=BASE_Y,hp=baseHp(side),team=teamTheme(side),p=side===1?['#34475b','#637d98']:['#5a343b','#93606a'];
   ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(0,52,138,38,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=p[0];ctx.fillRect(-82,-112,164,92);ctx.fillStyle=p[1];ctx.beginPath();ctx.moveTo(-82,-112);ctx.lineTo(-52,-143);ctx.lineTo(106,-143);ctx.lineTo(82,-112);ctx.closePath();ctx.fill();
   ctx.fillStyle='#15171b';ctx.fillRect(-24,-78,48,58);ctx.fillStyle='#111';ctx.fillRect(-82,-168,164,12);ctx.fillStyle=team.primary;ctx.fillRect(-82,-168,164*hp/BASE_HP,12);
   ctx.fillStyle=team.primary;ctx.font='700 17px system-ui';ctx.textAlign='center';ctx.fillText(side===1?'SUA BASE • AZUL':'BASE INIMIGA • VERMELHO',0,-181);ctx.restore()
 }
}
function drawTowerRange(s){
 if(!showTowerRanges||s.lane!==selectedLane)return;
 let x=s.x,y=structureY(s),r=s.range*PX,color=s.side===1?'#69b7ff':'#ff7c83';
 ctx.save();ctx.globalAlpha=.12;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=.48;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash([18,12]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=color;ctx.globalAlpha=.9;ctx.font='700 15px system-ui';ctx.textAlign='center';ctx.fillText(s.range+'u',x,y-r+24);ctx.restore()
}
function drawTower(s,t){
 if(s.auxiliary)return drawAuxTurret(s,t);
 if(s.dead)return;let x=s.x,y=structureY(s),tier=s.visualTier||1,p=s.side===1?['#425a72','#91adc5','#293a4d']:['#75434b','#b47a81','#4c2a31'];
 drawTowerRange(s);
 ctx.save();ctx.translate(x,y);
 let scale=.88+tier*.08;ctx.scale(scale,scale);
 ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(0,48,48+tier*7,14+tier*2,0,0,Math.PI*2);ctx.fill();
 if(s.fortified){
   let pulse=.76+Math.sin(t*3+s.lane)*.08;ctx.globalAlpha=pulse;ctx.strokeStyle=s.side===1?'#7cc8ff':'#ff9aa0';ctx.lineWidth=4;
   ctx.beginPath();ctx.arc(0,-18,54+tier*4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1
 }
 ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(-30-tier*3,-8);ctx.lineTo(30+tier*3,-8);ctx.lineTo(38+tier*4,42);ctx.lineTo(-38-tier*4,42);ctx.closePath();ctx.fill();
 ctx.fillStyle=p[0];ctx.fillRect(-27-tier*4,-56-tier*7,54+tier*8,50+tier*7);
 ctx.fillStyle=p[1];
 for(let i=0;i<Math.max(2,tier);i++){let bw=12,bx=(i-(Math.max(2,tier)-1)/2)*18;ctx.fillRect(bx-bw/2,-69-tier*7,bw,17)}
 if(tier>=3){ctx.fillStyle=p[2];ctx.fillRect(-48,-32,18,58);ctx.fillRect(30,-32,18,58)}
 if(tier===4){ctx.fillStyle=p[1];ctx.beginPath();ctx.moveTo(-18,-88);ctx.lineTo(0,-112);ctx.lineTo(18,-88);ctx.closePath();ctx.fill()}
 let aim=s.side,gunY=-51-tier*7;ctx.save();ctx.scale(aim,1);ctx.strokeStyle='#1d2228';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(0,gunY);ctx.lineTo(47+tier*6,gunY-2);ctx.stroke();ctx.strokeStyle=p[1];ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,gunY-2);ctx.lineTo(47+tier*6,gunY-4);ctx.stroke();ctx.restore();
 let hp=Math.max(0,s.hp/s.maxHp),team=teamTheme(s.side);ctx.fillStyle='#0b0c0e';roundRect(-48,-117-tier*7,96,10,5);ctx.fill();ctx.fillStyle=team.primary;roundRect(-48,-117-tier*7,96*hp,10,5);ctx.fill();
 if(hp<.7){ctx.strokeStyle='rgba(20,15,15,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-36);ctx.lineTo(5,-22);ctx.lineTo(-2,-8);if(hp<.35){ctx.moveTo(22,-48);ctx.lineTo(10,-31)}ctx.stroke()}
 ctx.fillStyle=s.fortified?'rgba(18,33,48,.88)':'rgba(72,39,22,.9)';roundRect(-58,52,116,24,6);ctx.fill();
 ctx.fillStyle=s.fortified?'#bfe6ff':'#ffd19a';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(s.fortified?'FORTIFICADA':'CERCO ABERTO',0,68);
 ctx.fillStyle='rgba(10,11,13,.78)';roundRect(-58,79,116,21,6);ctx.fill();ctx.fillStyle='#eee7d7';ctx.font='11px system-ui';ctx.fillText(s.label+' • '+s.range+'u',0,94);ctx.restore()
}
function drawAuxTurret(s,t){
 if(s.dead)return;let x=s.x,y=structureY(s),p=s.side===1?['#3d566e','#8db4d0','#253747']:['#704048','#b77a82','#48272d'];
 drawTowerRange(s);ctx.save();ctx.translate(x,y);
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,35,42,12,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=p[2];roundRect(-34,-3,68,38,8);ctx.fill();ctx.fillStyle=p[0];roundRect(-25,-29,50,31,9);ctx.fill();
 ctx.fillStyle=p[1];ctx.beginPath();ctx.arc(0,-29,13,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.scale(s.side,1);ctx.strokeStyle='#171c22';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(4,-30);ctx.lineTo(45,-34);ctx.stroke();ctx.strokeStyle=p[1];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(5,-32);ctx.lineTo(45,-36);ctx.stroke();ctx.restore();
 if(s.fortified){ctx.strokeStyle=s.side===1?'rgba(124,200,255,.7)':'rgba(255,154,160,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-8,39+Math.sin(t*3+s.x)*2,Math.PI,Math.PI*2);ctx.stroke()}
 let hp=Math.max(0,s.hp/s.maxHp),team=teamTheme(s.side);ctx.fillStyle='#0b0c0e';roundRect(-34,-55,68,8,4);ctx.fill();ctx.fillStyle=team.primary;roundRect(-34,-55,68*hp,8,4);ctx.fill();
 ctx.fillStyle='rgba(10,11,13,.78)';roundRect(-39,45,78,18,5);ctx.fill();ctx.fillStyle='#eee7d7';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText('TORRETA • '+s.range+'u',0,57);ctx.restore()
}
function drawFactionAura(u,t,meta){
 let p=meta.palette,m=meta.motif,pulse=.5+.5*Math.sin(t*3+u.anim);
 ctx.save();ctx.globalAlpha=u.minion?.13:.20;ctx.strokeStyle=p[2];ctx.fillStyle=p[0];ctx.lineWidth=2;
 if(['robot','physics','crystal'].includes(m)){ctx.rotate(t*.22);ctx.strokeRect(-27,-24,54,54);ctx.rotate(-t*.44);ctx.strokeRect(-20,-17,40,40)}
 else if(['faceless','celestial','elemental','mythic'].includes(m)){ctx.beginPath();ctx.arc(0,-4,30+pulse*4,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,-4,20,0,Math.PI*2);ctx.stroke()}
 else if(['zombie','necromancer','spectral','demon','cult'].includes(m)){for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-20+i*20,28-Math.sin(t*2+i+u.anim)*8,3+i,0,Math.PI*2);ctx.fill()}}
 else if(['wolf','dino','marine','arthropod','mutant','organic'].includes(m)){ctx.beginPath();ctx.moveTo(-34,30);ctx.quadraticCurveTo(0,42+pulse*5,34,30);ctx.stroke();ctx.beginPath();ctx.moveTo(-25,34);ctx.lineTo(-17,25);ctx.moveTo(25,34);ctx.lineTo(17,25);ctx.stroke()}
 else{ctx.beginPath();ctx.moveTo(-28,31);ctx.lineTo(0,40+pulse*3);ctx.lineTo(28,31);ctx.stroke()}
 ctx.restore()
}
function drawTeamMarker(u,t){
 let team=teamTheme(u.side),pulse=.88+Math.sin(t*4+u.anim)*.08;
 ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle=team.primary;ctx.lineWidth=u.minion?4.5:3.5;
 ctx.beginPath();ctx.ellipse(0,38,u.minion?25:34,u.minion?8:11,0,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha=1;ctx.fillStyle=team.dark;ctx.strokeStyle=team.primary;ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-9,-76);ctx.lineTo(9,-76);ctx.lineTo(0,-66);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.restore()
}
function drawUnit(u,t){
 let y=yOf(u),meta=facMeta(u.fac),p=meta.palette,team=teamTheme(u.side),bob=Math.sin(t*6+u.anim)*(u.role==='ranged'?1.5:2.4);
 let roleScale=u.role==='tank'?[1.12,.96]:u.role==='assassin'?[.88,1.06]:u.role==='siege'?[1.13,.92]:[1,1];
 let sc=(.88+y/VIEW_H*.2)*(u.role==='unique'?1.35:u.role==='elite'?1.18:u.minion?.78:1);
 ctx.save();ctx.translate(u.x,y+bob);ctx.scale(sc*roleScale[0],sc*roleScale[1]);
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,38,u.minion?21:29,u.minion?6:9,0,0,Math.PI*2);ctx.fill();
 drawTeamMarker(u,t);
 drawFactionAura(u,t,meta);
 if(u.fac==='Alienígenas')drawAlienV3(u,t,p);else if(u.fac==='Mentalistas')drawMentalV3(u,t,p);else drawFactionFighter(u,t,meta);
 if(u.role==='elite'||u.role==='unique'){ctx.strokeStyle=p[2];ctx.lineWidth=u.role==='unique'?4:2;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(0,-7,u.role==='unique'?38:33,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
 if(t<u.musicUntil){ctx.fillStyle='#ffd85f';ctx.font='16px system-ui';ctx.fillText('♪',18,-48)}
 if(u.fac==='Mentalistas'&&t>=u.mentalGuardReadyAt){ctx.strokeStyle='#7fffe1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-29,17,0,Math.PI*2);ctx.stroke()}
 if(u.fac==='Medievais'&&nearFriendlyTower(u)){ctx.strokeStyle='#d8c27c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,4,30,Math.PI*.12,Math.PI*.88);ctx.stroke()}
 ctx.fillStyle='rgba(10,11,13,.82)';roundRect(-29,-67,58,7,4);ctx.fill();ctx.fillStyle=team.primary;roundRect(-29,-67,58*Math.max(0,u.hp/u.maxHp),7,4);ctx.fill();
 if(!u.minion){ctx.fillStyle='rgba(12,13,16,.82)';roundRect(-50,52,100,20,6);ctx.fill();ctx.strokeStyle=team.primary;ctx.lineWidth=1.5;roundRect(-50,52,100,20,6);ctx.stroke();ctx.fillStyle='#f0eadb';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(u.name,0,66)}
 else{ctx.fillStyle=team.primary;ctx.strokeStyle='#f4f7fb';ctx.lineWidth=1.5;ctx.beginPath();if(u.minionType==='tank')ctx.rect(-8,44,16,11);else if(u.minionType==='ranged'){ctx.moveTo(0,43);ctx.lineTo(7,54);ctx.lineTo(-7,54);ctx.closePath()}else ctx.arc(0,49,6,0,Math.PI*2);ctx.fill();ctx.stroke()}
 ctx.restore()
}
function shadedCircle(x,y,r,p){
 let g=ctx.createRadialGradient(x-r*.35,y-r*.45,1,x,y,r);g.addColorStop(0,p[2]||'#eee');g.addColorStop(.38,p[0]);g.addColorStop(1,p[1]||'#222');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()
}
function limb(x1,y1,x2,y2,p,w=6){
 ctx.strokeStyle='rgba(8,9,11,.45)';ctx.lineWidth=w+3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1+2,y1+2);ctx.lineTo(x2+2,y2+2);ctx.stroke();
 ctx.strokeStyle=p[0];ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle=p[2]||'#ddd';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x1-1,y1-1);ctx.lineTo(x2-1,y2-1);ctx.stroke()
}
function baseHumanoid(u,p){
 let lean=u.fac==='Zumbis'?5:0,head=u.role==='tank'?12:u.role==='assassin'?9:11,body=u.role==='tank'?11:7;
 shadedCircle(lean,-28,head,p);limb(lean,-16,0,20,p,body);limb(0,-5,-16,8,p,u.role==='tank'?8:6);limb(0,-5,18,4,p,u.role==='tank'?8:6);limb(0,20,-12,43,p,7);limb(0,20,13,43,p,7);
 if(u.role==='elite'||u.role==='unique'){ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(-13,-39);ctx.lineTo(0,-53-(u.role==='unique'?8:0));ctx.lineTo(13,-39);ctx.lineTo(7,-43);ctx.lineTo(0,-38);ctx.lineTo(-7,-43);ctx.closePath();ctx.fill()}
}
function drawFactionFighter(u,t,meta){
 let p=meta.palette,d=u.side,m=meta.motif;baseHumanoid(u,p);ctx.strokeStyle=p[2];ctx.fillStyle=p[2];ctx.lineWidth=4;
 if(u.role==='tank'){ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(-d*17,3,14,18,0,0,Math.PI*2);ctx.fill()}
 if(u.role==='ranged'||u.role==='controller'||u.role==='support'){ctx.beginPath();ctx.moveTo(d*12,2);ctx.lineTo(d*36,-5);ctx.stroke();ctx.beginPath();ctx.arc(d*40,-6,4,0,Math.PI*2);ctx.fill()}
 if(u.role==='siege'){ctx.fillStyle=p[1];ctx.fillRect(-34,8,68,24);ctx.beginPath();ctx.arc(-23,36,10,0,Math.PI*2);ctx.arc(23,36,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-8,7);ctx.lineTo(35,-23);ctx.stroke()}
 if(u.role==='assassin'){ctx.strokeStyle=p[2];ctx.beginPath();ctx.moveTo(d*13,5);ctx.lineTo(d*34,-12);ctx.moveTo(-d*13,5);ctx.lineTo(-d*29,-9);ctx.stroke()}
 switch(m){
  case'robot':ctx.strokeStyle='#79e4ef';ctx.lineWidth=2;ctx.strokeRect(-8,-36,16,14);[-14,14].forEach(x=>{ctx.beginPath();ctx.arc(x,7,3,0,Math.PI*2);ctx.stroke()});break;
  case'wolf':ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(-10,-36);ctx.lineTo(-5,-50);ctx.lineTo(0,-38);ctx.lineTo(7,-50);ctx.lineTo(11,-36);ctx.fill();ctx.beginPath();ctx.moveTo(-2,15);ctx.quadraticCurveTo(-28,18,-34,4);ctx.stroke();break;
  case'zombie':ctx.strokeStyle=p[1];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,-6);ctx.lineTo(-27,18);ctx.stroke();break;
  case'samurai':ctx.fillStyle=p[1];ctx.beginPath();ctx.moveTo(-15,-36);ctx.lineTo(0,-50);ctx.lineTo(15,-36);ctx.closePath();ctx.fill();ctx.strokeStyle=p[2];ctx.beginPath();ctx.moveTo(d*12,5);ctx.lineTo(d*35,-16);ctx.stroke();break;
  case'arthropod':ctx.strokeStyle=p[1];ctx.lineWidth=4;[-1,1].forEach(s=>{ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(s*28,-8);ctx.moveTo(0,10);ctx.lineTo(s*31,22);ctx.stroke()});break;
  case'elemental':ctx.globalAlpha=.35;ctx.strokeStyle=p[1];ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,-3,29+Math.sin(t*5+u.anim)*3,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;break;
  case'demon':ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(-9,-37);ctx.lineTo(-18,-53);ctx.lineTo(-3,-40);ctx.moveTo(9,-37);ctx.lineTo(18,-53);ctx.lineTo(3,-40);ctx.fill();break;
  case'celestial':ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-47,17,5,0,0,Math.PI*2);ctx.stroke();break;
  case'dino':ctx.strokeStyle=p[0];ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-2,19);ctx.quadraticCurveTo(-30,25,-42,9);ctx.stroke();break;
  case'mutant':ctx.fillStyle=p[1];ctx.beginPath();ctx.arc(-17,-2,7,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(13,17,5,0,Math.PI*2);ctx.fill();break;
  case'necromancer':ctx.fillStyle=p[2];ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(-17,-34);ctx.lineTo(0,-55);ctx.lineTo(17,-34);ctx.lineTo(12,8);ctx.lineTo(-12,8);ctx.closePath();ctx.fill();ctx.globalAlpha=1;break;
  case'marine':ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(-8,-25);ctx.lineTo(-22,-38);ctx.lineTo(-18,-18);ctx.fill();ctx.beginPath();ctx.moveTo(8,-25);ctx.lineTo(22,-38);ctx.lineTo(18,-18);ctx.fill();break;
  case'medieval':ctx.strokeStyle='#a98a54';ctx.beginPath();ctx.moveTo(d*13,5);ctx.lineTo(d*34,-15);ctx.stroke();break;
  case'ninja':ctx.fillStyle=p[1];ctx.fillRect(-11,-32,22,9);ctx.strokeStyle=p[2];ctx.beginPath();ctx.moveTo(-8,-18);ctx.lineTo(-28,-31);ctx.stroke();break;
  case'desert':ctx.strokeStyle=p[2];ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-31,15,Math.PI,0);ctx.stroke();break;
  case'titan':ctx.save();ctx.scale(1.12,1.12);ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,-8);ctx.lineTo(12,-8);ctx.stroke();ctx.restore();break;
  case'alchemist':ctx.fillStyle='#7fd171';ctx.beginPath();ctx.arc(d*22,-2,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p[2];ctx.beginPath();ctx.moveTo(d*16,0);ctx.lineTo(d*27,-16);ctx.stroke();break;
  case'orc':ctx.fillStyle='#e7dfb8';ctx.beginPath();ctx.moveTo(-8,-19);ctx.lineTo(-3,-11);ctx.lineTo(0,-20);ctx.fill();ctx.beginPath();ctx.moveTo(8,-19);ctx.lineTo(3,-11);ctx.lineTo(0,-20);ctx.fill();break;
  case'spectral':ctx.globalAlpha=.28;ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,4,25,48,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;break;
  case'cult':ctx.fillStyle=p[1];ctx.beginPath();ctx.moveTo(-15,-35);ctx.lineTo(0,-54);ctx.lineTo(15,-35);ctx.closePath();ctx.fill();ctx.strokeStyle=p[2];ctx.beginPath();ctx.arc(0,7,8,0,Math.PI*2);ctx.stroke();break;
  case'music':ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.beginPath();ctx.arc(d*21,2,10,0,Math.PI*2);ctx.moveTo(d*29,-6);ctx.lineTo(d*33,-30);ctx.stroke();break;
  case'crystal':ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(0,-49);ctx.lineTo(12,-30);ctx.lineTo(5,-17);ctx.lineTo(-9,-20);ctx.lineTo(-13,-35);ctx.closePath();ctx.fill();break;
  case'mythic':ctx.strokeStyle=p[2];ctx.beginPath();ctx.arc(0,-4,26,0,Math.PI*2);ctx.stroke();break;
  case'physics':ctx.strokeStyle=p[1];ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-7,31,11,.5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(0,-7,31,11,-.5,0,Math.PI*2);ctx.stroke();break;
 }
}
function drawAlienV3(u,t,p){
 if(u.name==='Gosma'||u.minion&&u.minionType==='fighter'){let wob=Math.sin(t*6+u.anim),g=ctx.createRadialGradient(-8,-7,2,2,7,29);g.addColorStop(0,'#fff0ac');g.addColorStop(.38,p[2]);g.addColorStop(1,'#68480c');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,7,28+wob*2,20-wob,0,0,Math.PI*2);ctx.fill();return}
 if(u.name==='Olho Flutuante'||u.minion&&u.minionType==='ranged'){ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(0,-5,25,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f4e7c4';ctx.beginPath();ctx.arc(0,-5,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#18191c';ctx.beginPath();ctx.arc(2,-5,5,0,Math.PI*2);ctx.fill();return}
 if(u.name==='Trípode'){ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(0,-13,17,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p[0];ctx.lineWidth=6;[-12,0,12].forEach((x,i)=>{ctx.beginPath();ctx.moveTo(x,-5);ctx.lineTo(x+(i-1)*10,42);ctx.stroke()});return}
 if(u.name==='Cuspidor'){ctx.fillStyle=p[0];ctx.fillRect(-24,-21,48,42);ctx.strokeStyle=p[1];ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-13,21);ctx.lineTo(-13,40);ctx.lineTo(-28,40);ctx.moveTo(13,21);ctx.lineTo(13,40);ctx.lineTo(28,40);ctx.stroke();return}
 drawFactionFighter(u,t,facMeta('Alienígenas'))
}
function drawMentalV3(u,t,p){
 let c=u.name==='Entidade Psíquica'?null:p[0],flash=t-u.powerFlash<.7,g;
 if(u.name==='Entidade Psíquica'){
   g=ctx.createLinearGradient(-22,-45,24,40);g.addColorStop(0,'#111426');g.addColorStop(.25,'#6d2fb3');g.addColorStop(.52,'#29aa79');g.addColorStop(.8,'#e68136');g.addColorStop(1,'#28104c')
 }else{g=ctx.createLinearGradient(-18,-42,20,40);g.addColorStop(0,'#f3f4f6');g.addColorStop(.18,c);g.addColorStop(.7,p[1]);g.addColorStop(1,'#22242a')}
 ctx.fillStyle=g;ctx.strokeStyle=g;let w=flash?Math.sin(t*18)*3:0;ctx.beginPath();ctx.ellipse(0,-28,13+w*.2,17,0,0,Math.PI*2);ctx.fill();
 ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,22);ctx.moveTo(0,-3);ctx.lineTo(-19,10);ctx.moveTo(0,-3);ctx.lineTo(20,7);ctx.moveTo(0,22);ctx.lineTo(-13,45);ctx.moveTo(0,22);ctx.lineTo(13,45);ctx.stroke();
 if(u.name==='Entidade Psíquica'){ctx.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<6;i++){let a=i*2.399+t*.15;ctx.beginPath();ctx.arc(Math.cos(a)*12,Math.sin(a)*25-5,1.2,0,Math.PI*2);ctx.fill()}}
}
function drawEffects(t){
 for(const e of effects){let age=t-e.t;if(age>.35)continue;ctx.save();ctx.globalAlpha=1-age/.35;
   if(e.type==='shot'||e.type==='beam'){ctx.strokeStyle=e.color||(e.side===1?'#f0cf72':'#ff7b7b');ctx.lineWidth=e.type==='shot'?4:3;ctx.beginPath();ctx.moveTo(e.x1,e.y1);ctx.lineTo(e.x2,e.y2);ctx.stroke()}
   else{ctx.fillStyle=e.color||'#fff1a6';ctx.beginPath();ctx.arc(e.x,e.y-12,7+age*25,0,Math.PI*2);ctx.fill()}ctx.restore()
 }
 effects=effects.filter(e=>t-e.t<=.35)
}
function drawMiniMap(){
 const x=20,y=17,w=VIEW_W-40,h=49;ctx.fillStyle='rgba(9,10,13,.82)';roundRect(x,y,w,h,9);ctx.fill();
 const sx=w/WORLD_W;ctx.strokeStyle='rgba(220,207,160,.42)';ctx.lineWidth=1.5;
 for(let lane=0;lane<3;lane++){ctx.beginPath();for(let wx=BASE_X[1];wx<=BASE_X[-1];wx+=400){let px=x+wx*sx,py=y+25+(laneYAt(lane,wx)-BASE_Y)*.065;if(wx===BASE_X[1])ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.stroke()}
 structures.filter(s=>!s.dead).forEach(s=>{ctx.fillStyle=s.side===1?'#6e9ad0':'#c96b70';ctx.fillRect(x+s.x*sx-2,y+22+(s.lane-1)*8,4,4)});
 units.filter(u=>u.minion).slice(-120).forEach(u=>{ctx.fillStyle=u.side===1?'rgba(105,190,255,.7)':'rgba(255,120,120,.7)';ctx.fillRect(x+u.x*sx,y+24+(u.lane-1)*8,1.5,1.5)});
 ctx.strokeStyle='#efe4bd';ctx.lineWidth=2;ctx.strokeRect(x+cameraX*sx,y+3,VIEW_W*sx,h-6)
}
