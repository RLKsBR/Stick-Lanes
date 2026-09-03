/* Stick Lanes — rigs procedurais das três primeiras Lendas.
   Silhuetas, materiais e locomoções próprias; nenhuma usa o rig genérico. */
'use strict';
(function(){
const previousDrawUnit=drawUnit;

function legendData(u){return SL_LEGENDS_API.get(u.special.legendKind)}
function line(x1,y1,x2,y2,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function ellipse(x,y,rx,ry,fill,stroke=null,width=1){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function metal(p,x0=-25,y0=-50,x1=25,y1=30){let g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,p[3]);g.addColorStop(.24,p[1]);g.addColorStop(.63,p[0]);g.addColorStop(1,'#090b12');return g}
function attackPulse(u,t){return Math.max(0,1-(t-u.lastAttack)/.32)}
function movingPulse(u,t){return t-u.lastMoved<.24?Math.sin(t*11+u.anim):Math.sin(t*2.1+u.anim)*.18}

function teamGround(u,t,wide=43){
 const team=teamTheme(u.side),pulse=1+Math.sin(t*3.5+u.anim)*.04;
 ctx.save();ctx.scale(pulse,1);ctx.strokeStyle=team.primary;ctx.lineWidth=5;ctx.globalAlpha=.88;ctx.beginPath();ctx.ellipse(0,45,wide,12,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.32;ctx.fillStyle=team.primary;ctx.fill();ctx.restore()
}
function drawNefal(u,t,p){
 const dir=u.side,step=movingPulse(u,t),cast=attackPulse(u,t),float=Math.sin(t*1.45+u.anim)*2.6;
 ctx.save();ctx.translate(0,float);
 const shell=metal(p,-28,-108,32,34);
 ctx.save();ctx.globalAlpha=.62;ctx.strokeStyle=p[2];ctx.lineWidth=4.2;ctx.beginPath();ctx.ellipse(0,-70,34+cast*4,13+cast*2,0,0,Math.PI*2);ctx.stroke();
 if(cast){ctx.globalAlpha=.28+cast*.24;ctx.strokeStyle=p[4];ctx.lineWidth=2.2;ctx.beginPath();ctx.ellipse(0,-70,45+cast*7,18+cast*3,0,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
 for(let i=0;i<4;i++){
   const a=t*.42+u.anim*.3+i*Math.PI/2,x=Math.cos(a)*(22+(i%2)*8),y=-70+Math.sin(a)*11;
   ctx.save();ctx.translate(x,y);ctx.rotate(a+t*.12);ctx.fillStyle=i%2?p[1]:p[3];ctx.globalAlpha=.86;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(0,-5);ctx.lineTo(8,0);ctx.lineTo(0,5);ctx.closePath();ctx.fill();ctx.restore()
 }
 for(const side of [-1,1]){
   const kneeX=side*(10+step*side*4),footX=side*(15+step*side*8);
   line(side*5,8,kneeX,35,p[0],6.5);line(kneeX,35,footX,58,p[1],4.2);ellipse(footX+side*4,59,10,2.8,'#080913',p[2],1)
 }
 ctx.fillStyle=shell;ctx.strokeStyle=p[3];ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-8,10);ctx.quadraticCurveTo(-14,-10,-16,-38);ctx.quadraticCurveTo(-13,-60,0,-68);ctx.quadraticCurveTo(14,-60,16,-38);ctx.quadraticCurveTo(13,-10,8,10);ctx.quadraticCurveTo(0,18,-8,10);ctx.fill();ctx.stroke();
 ctx.strokeStyle='rgba(111,255,224,.58)';ctx.lineWidth=1.6;
 for(let i=0;i<4;i++){const y=-49+i*13;ctx.beginPath();ctx.moveTo(-9+i*.8,y);ctx.quadraticCurveTo(0,y+6,9-i*.8,y);ctx.stroke()}
 ellipse(0,-19,4.5,7,'#090a16',p[2],1.2);line(0,-56,0,8,'rgba(241,216,255,.55)',1.7);
 for(const side of [-1,1]){
   const lift=side===dir?cast*14:cast*4,elbowX=side*(24+lift*.3),handX=side*(35+lift),handY=8-cast*17+(side===dir?-2:2);
   line(side*10,-45,elbowX,-19+step*side*2,p[0],5.8);line(elbowX,-19+step*side*2,handX,handY,p[1],3.8);
   for(let f=-1;f<=1;f++)line(handX,handY,handX+side*(8+f*1.5),handY+f*5,p[3],1.1)
 }
 ctx.fillStyle=shell;ctx.strokeStyle=p[3];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-110);ctx.quadraticCurveTo(-18,-102,-17,-82);ctx.quadraticCurveTo(-15,-66,0,-62);ctx.quadraticCurveTo(15,-66,17,-82);ctx.quadraticCurveTo(18,-102,0,-110);ctx.fill();ctx.stroke();
 ctx.fillStyle='rgba(7,7,18,.42)';ctx.beginPath();ctx.moveTo(0,-104);ctx.quadraticCurveTo(-4,-90,0,-68);ctx.quadraticCurveTo(4,-90,0,-104);ctx.fill();
 if(cast){
   ctx.save();ctx.globalAlpha=.38+cast*.28;ctx.strokeStyle=p[2];ctx.lineWidth=2.2;
   for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(dir*(37+i*5),4-i*5);ctx.quadraticCurveTo(dir*(57+i*10),-25,dir*(82+i*11),-8+i*6);ctx.stroke()}
   ctx.restore();
   ctx.save();ctx.globalAlpha=.16+cast*.12;const g=ctx.createRadialGradient(0,-24,4,0,-24,36);g.addColorStop(0,p[4]);g.addColorStop(.5,p[1]);g.addColorStop(1,'rgba(30,20,55,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-20,24+cast*7,34+cast*10,0,0,Math.PI*2);ctx.fill();ctx.restore()
 }
 ctx.restore()
}

function crabLeg(side,index,phase,p){
 const y=-5+index*12,rootX=side*20,kneeX=side*(40+index*3),footX=side*(58+phase*7),lift=(index%2?1:-1)*phase*3;
 line(rootX,y,kneeX,y+lift,p[0],9);line(kneeX,y+lift,footX,y+17,p[1],6.5);ellipse(footX+side*4,y+19,11,3.2,'#091214',p[2],1.2)
}
function drawKarkinos(u,t,p){
 const dir=u.side,step=movingPulse(u,t),strike=attackPulse(u,t),level=u.legendLevel||1;
 const bodyMax=u.karkinosBodyMaxHp||Math.max(1,u.maxHp/(1+(u.special?.shellPct||.30))),shellMax=u.karkinosShellMax||bodyMax*(u.special?.shellPct||.30),shellHp=Math.max(0,u.hp-bodyMax),shellRatio=Math.max(0,Math.min(1,shellHp/Math.max(1,shellMax)));
 const pinchReady=!u.karkinosPinchReadyAt||t>=u.karkinosPinchReadyAt,reflect=level>=12;
 for(const side of [-1,1])for(let i=0;i<4;i++)crabLeg(side,i,Math.sin(t*7.2+u.anim+i*Math.PI+side)*(.42+Math.abs(step)),p);
 ellipse(0,12,50,30,'#071419');
 const armor=metal(p,-52,-48,48,28);
 ctx.fillStyle=armor;ctx.strokeStyle=shellRatio>0?p[2]:'#3c5e63';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(-49,8);ctx.quadraticCurveTo(-46,-34,-19,-45);ctx.quadraticCurveTo(0,-53,20,-45);ctx.quadraticCurveTo(48,-34,51,8);ctx.lineTo(35,30);ctx.lineTo(-35,30);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle=shellRatio>.35?'rgba(229,255,244,.48)':'rgba(105,142,145,.45)';ctx.lineWidth=2.2;
 for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*15,-37+Math.abs(i)*3);ctx.quadraticCurveTo(i*17,-7,i*16,23);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(-39,-7);ctx.quadraticCurveTo(0,7,39,-7);ctx.stroke();
 if(shellRatio>0){ctx.save();ctx.globalAlpha=.18+.28*shellRatio;ctx.strokeStyle=p[2];ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,-7,52,39,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 if(shellRatio<.45){ctx.strokeStyle='#071012';ctx.lineWidth=3;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*10,-38);ctx.lineTo(s*18,-20);ctx.lineTo(s*9,-8);ctx.lineTo(s*22,7);ctx.stroke()}}
 line(-16,-28,-20,-40,p[1],3);line(16,-28,20,-40,p[1],3);ellipse(-21,-42,4.2,4.2,p[3]);ellipse(21,-42,4.2,4.2,p[3]);
 const frontRoot=dir*31,frontX=dir*(62+strike*12),jaw=pinchReady?15-strike*10:8;
 line(frontRoot,-5,dir*49,-15,p[0],14);ellipse(frontX,-16,25+strike*3,18,armor,pinchReady?p[3]:p[2],2.6);
 ctx.fillStyle='#061014';ctx.beginPath();ctx.moveTo(frontX-dir*2,-16);ctx.lineTo(frontX+dir*26,-16-jaw);ctx.lineTo(frontX+dir*11,-5);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(frontX-dir*2,-14);ctx.lineTo(frontX+dir*26,-14+jaw);ctx.lineTo(frontX+dir*11,-25);ctx.closePath();ctx.fill();
 if(pinchReady){ctx.save();ctx.globalAlpha=.55+.25*Math.sin(t*5);ctx.strokeStyle=p[3];ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(frontX,-16,29,-1.1,1.1);ctx.stroke();ctx.restore()}
 const back=-dir*51;line(-dir*30,3,-dir*43,1,p[0],10);ellipse(back,-1,16,12,p[1],p[2],2);ctx.fillStyle='#061014';ctx.beginPath();ctx.moveTo(back-dir*2,-1);ctx.lineTo(back-dir*17,-9);ctx.lineTo(back-dir*8,1);ctx.lineTo(back-dir*17,8);ctx.closePath();ctx.fill();
 if(reflect){ctx.save();ctx.globalAlpha=.34+.18*Math.sin(t*4);ctx.strokeStyle='#d9fff7';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-5,57+i*7,t*.45+i*.8,t*.45+i*.8+1.55);ctx.stroke()}ctx.restore()}
 if(strike){ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.globalAlpha=strike*.78;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(frontX+dir*20,-15,14+i*11,-1.1,1.1);ctx.stroke()}ctx.globalAlpha=1}
}

function drawVesper(u,t,p){
 const dir=u.side,step=movingPulse(u,t),strike=attackPulse(u,t),level=u.legendLevel||1,points=[];
 const attackCount=u.vesperAttackCount||0,poisonReady=(u.vesperPoisonReadyAt??Infinity)<=t,dashCharge=Math.min(3,attackCount),dashFlash=Math.max(0,1-(t-(u.powerFlash??-999))/.42),maxSpeed=level>=12;
 const waveSpeed=maxSpeed?5.8:4.4;
 for(let i=0;i<12;i++){
   const taper=1-i/16,x=-dir*(i*9-26-dashFlash*8),y=7+Math.sin(t*waveSpeed+u.anim-i*.66)*6.5-i*1.8;
   points.push([x,y,Math.max(3.5,8.5*taper)])
 }
 if(dashFlash>0||maxSpeed){ctx.save();ctx.globalAlpha=(dashFlash*.42)+(maxSpeed?0.08:0);ctx.strokeStyle=p[2];ctx.lineWidth=10;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x-dir*(12+dashFlash*18),y+4):ctx.moveTo(x-dir*(12+dashFlash*18),y+4));ctx.stroke();ctx.restore()}
 ctx.strokeStyle='rgba(5,5,12,.5)';ctx.lineWidth=17;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x+3,y+5):ctx.moveTo(x+3,y+5));ctx.stroke();
 points.slice().reverse().forEach(([x,y,r],j)=>{ellipse(x,y,r,r*.7,j%2?p[0]:p[1],p[2],1.15);if(j%3===0){ctx.fillStyle='rgba(255,240,189,.38)';ctx.beginPath();ctx.arc(x-dir*2,y-2,1.3,0,Math.PI*2);ctx.fill()}});
 const hx=dir*(38+strike*12+dashFlash*10),hy=-3+step*2;
 ctx.fillStyle=metal(p);ctx.strokeStyle=p[3];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx+dir*27,hy);ctx.lineTo(hx-dir*3,hy-18);ctx.lineTo(hx-dir*18,hy);ctx.lineTo(hx-dir*3,hy+18);ctx.closePath();ctx.fill();ctx.stroke();
 for(const s of [-1,1]){ctx.save();ctx.translate(dir*3,s*14);ctx.rotate(s*(.32+step*.04)-dir*dashCharge*.025);ctx.fillStyle=s>0?p[2]:p[1];ctx.globalAlpha=.84;ctx.beginPath();ctx.moveTo(-29,0);ctx.quadraticCurveTo(0,s*(27+dashCharge*2),33,0);ctx.quadraticCurveTo(0,s*10,-29,0);ctx.fill();ctx.restore()}ctx.globalAlpha=1;
 ellipse(hx+dir*9,hy-4,3.2,3.2,p[3]);
 ctx.strokeStyle=p[2];ctx.lineWidth=4;ctx.beginPath();ctx.arc(hx-dir*9,hy,22,t*.35,t*.35+Math.PI*1.6);ctx.stroke();
 for(let i=0;i<4;i++){
   const a=-Math.PI*.72+i*Math.PI*.48,x=hx-dir*9+Math.cos(a)*26,y=hy+Math.sin(a)*26,filled=i<dashCharge;
   ellipse(x,y,filled?3.8:2.4,filled?3.8:2.4,filled?p[3]:'rgba(255,255,255,.22)');
 }
 if(dashCharge===3){ctx.save();ctx.globalAlpha=.38+.25*Math.sin(t*7);ctx.strokeStyle=p[3];ctx.lineWidth=2;ctx.beginPath();ctx.arc(hx-dir*9,hy,31,0,Math.PI*2);ctx.stroke();ctx.restore()}
 const venom=poisonReady?'#9cff72':'#315338';ellipse(hx-dir*11,hy-10,5.2,7.4,venom,poisonReady?'#d9ffbf':null,1.2);ellipse(hx-dir*15,hy+8,4.5,6.4,venom,poisonReady?'#d9ffbf':null,1.1);
 if(poisonReady){ctx.save();ctx.globalAlpha=.18+.12*Math.sin(t*5);ctx.fillStyle='#9cff72';ctx.beginPath();ctx.arc(hx-dir*11,hy,19,0,Math.PI*2);ctx.fill();ctx.restore()}
 ctx.fillStyle=p[3];ctx.beginPath();ctx.moveTo(hx+dir*28,hy);ctx.lineTo(hx+dir*38,hy-4);ctx.lineTo(hx+dir*38,hy+4);ctx.closePath();ctx.fill();
 if(strike){ctx.globalAlpha=strike;ctx.fillStyle=poisonReady?'#9cff72':p[2];ctx.beginPath();ctx.moveTo(hx+dir*37,hy);ctx.lineTo(hx+dir*(67+dashFlash*15),hy-10);ctx.lineTo(hx+dir*(58+dashFlash*12),hy);ctx.lineTo(hx+dir*(67+dashFlash*15),hy+10);ctx.closePath();ctx.fill();ctx.globalAlpha=1}
 if(maxSpeed){ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle=p[3];ctx.lineWidth=1.6;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-dir*(42+i*12),-18+i*13);ctx.lineTo(-dir*(72+i*15),-18+i*13);ctx.stroke()}ctx.restore()}
}

function drawLegendBody(u,t,data){
 if(data.id==='nefal')drawNefal(u,t,data.palette);else if(data.id==='karkinos')drawKarkinos(u,t,data.palette);else drawVesper(u,t,data.palette)
}
function drawLegendHud(u,data){
 const team=teamTheme(u.side),hp=Math.max(0,u.hp/u.maxHp);
 const top=data.id==='nefal'?-139:-91,level=u.legendLevel||1,xp=u.legendNextXp?Math.min(1,(u.legendXp||0)/u.legendNextXp):0;
 ctx.fillStyle='rgba(5,7,10,.92)';ctx.beginPath();ctx.roundRect(-50,top,100,10,5);ctx.fill();ctx.fillStyle=team.primary;ctx.beginPath();ctx.roundRect(-50,top,100*hp,10,5);ctx.fill();
 ctx.fillStyle='rgba(5,7,10,.9)';ctx.fillRect(-50,top+12,100,4);ctx.fillStyle=data.palette[2];ctx.fillRect(-50,top+12,100*xp,4);
 ctx.fillStyle='rgba(7,8,12,.92)';ctx.strokeStyle=data.palette[2];ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-72,67,144,25,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff8e8';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(`${u.name} • L${level} • LENDA`,0,84)
}
function renderLegendUnit(u,t){
 const data=legendData(u),y=yOf(u),bob=data.id==='vesper'?Math.sin(t*3+u.anim)*4:0,scale=(1.18+y/VIEW_H*.2)*(data.id==='karkinos'?1.16:data.id==='nefal'?1.24:1.06);
 ctx.save();ctx.translate(u.x,y+bob);ctx.scale(scale,scale);ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(0,48,data.id==='karkinos'?68:50,11,0,0,Math.PI*2);ctx.fill();teamGround(u,t,data.id==='karkinos'?62:47);drawLegendBody(u,t,data);drawLegendHud(u,data);ctx.restore()
}
drawUnit=function(u,t){if(!u.special?.legend)return previousDrawUnit(u,t);renderLegendUnit(u,t)};

function drawPreview(canvas,id){
 const data=SL_LEGENDS_API.get(id),c=canvas.getContext('2d'),old=window.ctx,dummy={side:1,anim:1,lastAttack:id==='nefal'?1.54:-99,lastMoved:0,special:{...(data.special||{}),legendKind:id},name:data.name,hp:data.hp,maxHp:data.hp,legendLevel:id==='vesper'?12:1,legendXp:0,legendNextXp:350,powerFlash:id==='vesper'?1.5:-999};
 if(id==='karkinos'){dummy.karkinosBodyMaxHp=data.hp;dummy.karkinosShellMax=Math.round(data.hp*(data.special?.shellPct||.30));dummy.maxHp=dummy.hp=data.hp+dummy.karkinosShellMax;dummy.karkinosPinchReadyAt=0}
 if(id==='vesper'){dummy.vesperAttackCount=3;dummy.vesperPoisonReadyAt=0}
 window.ctx=c;c.clearRect(0,0,canvas.width,canvas.height);let bg=c.createRadialGradient(180,88,8,180,88,170);bg.addColorStop(0,data.palette[0]+'cc');bg.addColorStop(.58,'#11101e');bg.addColorStop(1,'#07090d');c.fillStyle=bg;c.fillRect(0,0,canvas.width,canvas.height);c.save();c.translate(180,id==='nefal'?116:id==='karkinos'?108:106);const scale=id==='karkinos'?.98:id==='nefal'?1.02:1.08;c.scale(scale,scale);drawLegendBody(dummy,1.7,data);c.restore();c.fillStyle=data.palette[2];c.globalAlpha=.75;c.fillRect(24,157,312,2);c.globalAlpha=1;window.ctx=old
}
function drawWorldEffects(t){
 const list=window.SL_NEFAL_SYSTEM?.fx||[];
 for(const fx of list){const age=t-fx.t;if(age<0||age>fx.duration)continue;const life=1-age/fx.duration;ctx.save();ctx.globalAlpha=life;
   if(fx.type==='lance'){
     const bend=(fx.index-(fx.count-1)/2)*34;ctx.strokeStyle='rgba(37,10,62,.82)';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(fx.x1,fx.y1);ctx.quadraticCurveTo((fx.x1+fx.x2)/2,(fx.y1+fx.y2)/2+bend,fx.x2,fx.y2);ctx.stroke();ctx.strokeStyle=fx.color;ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#ffffff';ctx.globalAlpha=life*.78;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=life;ctx.fillStyle=fx.color;ctx.beginPath();ctx.arc(fx.x2,fx.y2,18+age*55,0,Math.PI*2);ctx.fill()
   }else if(fx.type==='proc'){ctx.strokeStyle=fx.color;ctx.lineWidth=6;ctx.beginPath();ctx.arc(fx.x,fx.y,34+age*48,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f7eaff';ctx.font='900 17px system-ui';ctx.textAlign='center';ctx.fillText(fx.label,fx.x,fx.y-52-age*16)}ctx.restore()
 }
 while(list.length&&t-list[0].t>1.2)list.shift()
}
function drawPreviews(){document.querySelectorAll('.legendPreview').forEach(canvas=>drawPreview(canvas,canvas.dataset.legendPreview))}
window.SL_LEGEND_VISUALS={drawPreviews,drawLegendBody,drawWorldEffects};drawPreviews();
})();
