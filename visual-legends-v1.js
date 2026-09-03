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
 const dir=u.side,step=movingPulse(u,t),cast=attackPulse(u,t),float=Math.sin(t*2.4+u.anim)*2;
 ctx.save();ctx.translate(0,float);
 /* Pernas longas: contato alternado com o chão, tronco quase imóvel. */
 line(-7,13,-10-step*4,39,'#151020',10);line(-10-step*4,39,-17-step*7,47,p[1],7);
 line(7,13,10+step*4,39,'#151020',10);line(10+step*4,39,17+step*7,47,p[1],7);
 ellipse(-18-step*7,48,11,4,'#0b0b12',p[2],1.2);ellipse(18+step*7,48,11,4,'#0b0b12',p[2],1.2);
 /* Tórax de metal psíquico vivo. */
 ctx.fillStyle=metal(p);ctx.strokeStyle=p[2];ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-16,14);ctx.quadraticCurveTo(-22,-17,-12,-34);ctx.quadraticCurveTo(0,-43,12,-34);ctx.quadraticCurveTo(22,-17,16,14);ctx.quadraticCurveTo(0,25,-16,14);ctx.fill();ctx.stroke();
 ellipse(0,-4,6,10,'#17162d',p[2],2);ellipse(0,-4,2.6,6,p[2]);
 /* Braços finos e gestuais. */
 const reach=cast*15;
 line(-13,-25,-31,-7-step*2,p[0],7);line(-31,-7-step*2,-40-dir*reach,12,p[1],5);
 line(13,-25,30,-12+step*2,p[0],7);line(30,-12+step*2,dir*(43+reach),-7,p[1],5);
 for(const hand of [[-40-dir*reach,12],[dir*(43+reach),-7]])for(let f=-1;f<=1;f++)line(hand[0],hand[1],hand[0]+dir*8,hand[1]+f*4,p[3],1.3);
 /* Cabeça absolutamente sem rosto. */
 ellipse(0,-53,14,20,metal(p,-10,-70,10,-34),p[3],1.8);
 ctx.strokeStyle='rgba(128,244,231,.55)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(-3,-58,8,-2.3,-.7);ctx.stroke();
 /* Coroa/placas orbitais físicas, sem aura circular genérica. */
 for(let i=0;i<4;i++){let a=t*.42+i*Math.PI/2,x=Math.cos(a)*29,y=-48+Math.sin(a)*9;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=i%2?p[2]:p[1];ctx.fillRect(-5,-2,10,4);ctx.restore()}
 if(cast){ctx.globalAlpha=cast*.75;ctx.strokeStyle=p[2];ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(dir*48,-7,8+i*10,Math.PI*.65,Math.PI*1.35);ctx.stroke()}ctx.globalAlpha=1}
 ctx.restore()
}

function crabLeg(side,index,phase,p){
 const y=-9+index*13,rootX=side*18,kneeX=side*(39+index*3),footX=side*(56+phase*7);
 line(rootX,y,kneeX,y+phase*4,p[0],8);line(kneeX,y+phase*4,footX,y+17,p[1],6);ellipse(footX,y+19,9,3,'#0b1417',p[2],1)
}
function drawKarkinos(u,t,p){
 const dir=u.side,step=movingPulse(u,t),strike=attackPulse(u,t);
 /* Oito patas funcionais em passada lateral alternada. */
 for(const side of [-1,1])for(let i=0;i<4;i++)crabLeg(side,i,Math.sin(t*8+u.anim+i*Math.PI+side)*(.45+Math.abs(step)),p);
 /* Abdômen baixo e carapaça em placas. */
 ellipse(0,9,46,31,'#071419');
 ctx.fillStyle=metal(p,-38,-35,38,25);ctx.strokeStyle=p[2];ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-43,9);ctx.quadraticCurveTo(-38,-30,0,-37);ctx.quadraticCurveTo(39,-30,45,8);ctx.lineTo(32,28);ctx.lineTo(-31,28);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='rgba(229,255,244,.34)';ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*13,-29+Math.abs(i)*3);ctx.lineTo(i*15,23);ctx.stroke()}
 ellipse(-13,-16,5,8,'#102d35',p[2],1.5);ellipse(13,-16,5,8,'#102d35',p[2],1.5);
 line(-14,-22,-18,-34,p[1],3);line(14,-22,18,-34,p[1],3);ellipse(-19,-36,4,4,p[3]);ellipse(19,-36,4,4,p[3]);
 /* Pinça demolidora à frente e pinça estabilizadora atrás. */
 const front=dir*(59+strike*17),back=-dir*50;
 line(dir*31,-3,dir*49,-12,p[0],13);ellipse(front,-15,24+strike*5,18,metal(p),p[3],2.5);
 ctx.fillStyle='#071419';ctx.beginPath();ctx.moveTo(front-dir*3,-16);ctx.lineTo(front+dir*24,-31);ctx.lineTo(front+dir*12,-8);ctx.closePath();ctx.fill();
 line(-dir*29,3,-dir*43,0,p[0],10);ellipse(back,-2,15,12,p[1],p[2],2);
 if(strike){ctx.strokeStyle=p[2];ctx.lineWidth=3;ctx.globalAlpha=strike*.75;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(front+dir*20,-13,14+i*11,-1.1,1.1);ctx.stroke()}ctx.globalAlpha=1}
}

function drawVesper(u,t,p){
 const dir=u.side,step=movingPulse(u,t),strike=attackPulse(u,t),points=[];
 /* Corpo segmentado: cada elo acompanha a onda, sem deslize rígido. */
 for(let i=0;i<10;i++){let x=-dir*(i*10-25),y=8+Math.sin(t*4+u.anim-i*.62)*7-i*2.5;points.push([x,y])}
 ctx.strokeStyle='rgba(5,5,12,.45)';ctx.lineWidth=18;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x+3,y+5):ctx.moveTo(x+3,y+5));ctx.stroke();
 points.slice().reverse().forEach(([x,y],j)=>{let r=7+j*.45;ellipse(x,y,r,r*.72,j%2?p[0]:p[1],p[2],1.2);ctx.fillStyle='rgba(255,240,189,.38)';ctx.beginPath();ctx.arc(x-dir*2,y-2,1.4,0,Math.PI*2);ctx.fill()});
 const hx=dir*(36+strike*13),hy=-2+step*2;
 ctx.fillStyle=metal(p);ctx.strokeStyle=p[3];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx+dir*25,hy);ctx.lineTo(hx-dir*5,hy-18);ctx.lineTo(hx-dir*17,hy);ctx.lineTo(hx-dir*5,hy+18);ctx.closePath();ctx.fill();ctx.stroke();
 /* Duas barbatanas crescentes sustentam o voo rasante. */
 for(const s of [-1,1]){ctx.save();ctx.translate(dir*2,s*15);ctx.rotate(s*(.35+step*.05));ctx.fillStyle=s>0?p[2]:p[1];ctx.globalAlpha=.82;ctx.beginPath();ctx.moveTo(-26,0);ctx.quadraticCurveTo(0,s*28,31,0);ctx.quadraticCurveTo(0,s*11,-26,0);ctx.fill();ctx.restore()}ctx.globalAlpha=1;
 ellipse(hx+dir*8,hy-4,3.2,3.2,p[3]);
 /* Eclipse é um órgão/anel atrás da cabeça, não aura do corpo inteiro. */
 ctx.strokeStyle=p[2];ctx.lineWidth=4;ctx.beginPath();ctx.arc(hx-dir*8,hy,21,t*.4,t*.4+Math.PI*1.55);ctx.stroke();
 ctx.fillStyle=p[3];ctx.beginPath();ctx.moveTo(hx+dir*26,hy);ctx.lineTo(hx+dir*35,hy-4);ctx.lineTo(hx+dir*35,hy+4);ctx.closePath();ctx.fill();
 if(strike){ctx.globalAlpha=strike;ctx.fillStyle=p[2];ctx.beginPath();ctx.moveTo(hx+dir*35,hy);ctx.lineTo(hx+dir*67,hy-10);ctx.lineTo(hx+dir*58,hy);ctx.lineTo(hx+dir*67,hy+10);ctx.closePath();ctx.fill();ctx.globalAlpha=1}
}

function drawLegendBody(u,t,data){
 if(data.id==='nefal')drawNefal(u,t,data.palette);else if(data.id==='karkinos')drawKarkinos(u,t,data.palette);else drawVesper(u,t,data.palette)
}
function drawLegendHud(u,data){
 const team=teamTheme(u.side),hp=Math.max(0,u.hp/u.maxHp);
 ctx.fillStyle='rgba(5,7,10,.9)';ctx.beginPath();ctx.roundRect(-45,-91,90,9,5);ctx.fill();ctx.fillStyle=team.primary;ctx.beginPath();ctx.roundRect(-45,-91,90*hp,9,5);ctx.fill();
 ctx.fillStyle='rgba(7,8,12,.9)';ctx.strokeStyle=data.palette[2];ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-67,64,134,24,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff8e8';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(`${u.name} • LENDA`,0,80)
}
function renderLegendUnit(u,t){
 const data=legendData(u),y=yOf(u),bob=data.id==='vesper'?Math.sin(t*3+u.anim)*4:0,scale=(1.18+y/VIEW_H*.2)*(data.id==='karkinos'?1.13:1);
 ctx.save();ctx.translate(u.x,y+bob);ctx.scale(scale,scale);ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(0,48,data.id==='karkinos'?62:48,11,0,0,Math.PI*2);ctx.fill();teamGround(u,t,data.id==='karkinos'?58:45);drawLegendBody(u,t,data);drawLegendHud(u,data);ctx.restore()
}
drawUnit=function(u,t){if(!u.special?.legend)return previousDrawUnit(u,t);renderLegendUnit(u,t)};

function drawPreview(canvas,id){
 const data=SL_LEGENDS_API.get(id),c=canvas.getContext('2d'),old=window.ctx,dummy={side:1,anim:1,lastAttack:-99,lastMoved:0,special:{legendKind:id},name:data.name,hp:data.hp,maxHp:data.hp};
 window.ctx=c;c.clearRect(0,0,canvas.width,canvas.height);let bg=c.createRadialGradient(180,88,8,180,88,170);bg.addColorStop(0,data.palette[0]+'aa');bg.addColorStop(1,'#090b11');c.fillStyle=bg;c.fillRect(0,0,canvas.width,canvas.height);c.save();c.translate(180,106);c.scale(id==='karkinos'?1.02:1.12,1.12);drawLegendBody(dummy,1.7,data);c.restore();c.fillStyle=data.palette[2];c.globalAlpha=.75;c.fillRect(24,157,312,2);c.globalAlpha=1;window.ctx=old
}
function drawPreviews(){document.querySelectorAll('.legendPreview').forEach(canvas=>drawPreview(canvas,canvas.dataset.legendPreview))}
window.SL_LEGEND_VISUALS={drawPreviews,drawLegendBody};drawPreviews();
})();
