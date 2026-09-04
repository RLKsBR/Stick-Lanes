/* Stick Lanes — jungle jogável v1
   - B1 esquerda/baixo, B2 direita/baixo, B3 esquerda/cima, B4 direita/cima.
   - Toda a região colorida do buff conta para captura.
   - Clique em qualquer ponto da região leva a Lenda exatamente para aquele ponto.
   - Paredes físicas cercam as regiões com entradas reais + obstáculos internos. */
'use strict';
(function boot(){
 const map=window.SL_MOBA_SQUARE_V2,buffs=window.SL_BUFF_SYSTEM,vision=window.SL_VISION,tactical=window.SL_TACTICAL_TARGETING;
 if(!map||!buffs?.zones||!vision?.walls||!tactical){setTimeout(boot,50);return}
 if(window.SL_JUNGLE_ACCESS?.version>=1)return;

 const START=.055,SPLIT=.50,END=.945,INNER_A=.035,INNER_B=.965,STEPS=24;
 const PAIRS={upper:[0,1],lower:[1,2]};
 const ASSIGN={
   buff1:{jungle:'lower',t0:START,t1:SPLIT,quadrant:'ESQUERDA / BAIXO'},
   buff2:{jungle:'lower',t0:SPLIT,t1:END,quadrant:'DIREITA / BAIXO'},
   buff3:{jungle:'upper',t0:START,t1:SPLIT,quadrant:'ESQUERDA / CIMA'},
   buff4:{jungle:'upper',t0:SPLIT,t1:END,quadrant:'DIREITA / CIMA'}
 };
 function mix(a,b,q){return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q}}
 function polygon(jungle,t0,t1){
   const [la,lb]=PAIRS[jungle],out=[];
   for(let i=0;i<=STEPS;i++){const t=t0+(t1-t0)*i/STEPS;out.push(mix(map.routePoint(la,t),map.routePoint(lb,t),INNER_A))}
   for(let i=STEPS;i>=0;i--){const t=t0+(t1-t0)*i/STEPS;out.push(mix(map.routePoint(la,t),map.routePoint(lb,t),INNER_B))}
   return out
 }
 function center(points){return{x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length}}
 for(const zone of buffs.zones){
   const a=ASSIGN[zone.id];if(!a)continue;const poly=polygon(a.jungle,a.t0,a.t1),c=center(poly);
   zone.jungleId=a.jungle;zone.t0=a.t0;zone.t1=a.t1;zone.polygon=poly;zone.x=c.x;zone.y=c.y;zone.quadrant=a.quadrant;
 }
 if(Array.isArray(map.buffZones))map.buffZones.splice(0,map.buffZones.length,...buffs.zones);

 function wallFrom(id,a,b,thickness=70){
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
   return{id,x,y,len,a:ang,thickness,x1:a.x,y1:a.y,x2:b.x,y2:b.y}
 }
 function addSpan(out,id,pts,i0,i1){const a=pts[i0],b=pts[i1];if(a&&b&&Math.hypot(b.x-a.x,b.y-a.y)>150)out.push(wallFrom(id,a,b))}
 function halfCap(out,id,a,b){
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<360)return;
   const ux=dx/len,uy=dy/len,gap=Math.min(330,len*.34),side=(len-gap)/2;
   out.push(wallFrom(id+'a',a,{x:a.x+ux*side,y:a.y+uy*side}));
   out.push(wallFrom(id+'b',{x:b.x-ux*side,y:b.y-uy*side},b));
 }
 function obstacle(id,c,angle,offsetX,offsetY){
   const x=c.x+offsetX,y=c.y+offsetY,len=360,dx=Math.cos(angle)*len/2,dy=Math.sin(angle)*len/2;
   return wallFrom(id,{x:x-dx,y:y-dy},{x:x+dx,y:y+dy},76)
 }
 const walls=[];
 for(const zone of buffs.zones){
   const p=zone.polygon,n=STEPS;
   /* Duas bordas curvas com vãos largos. As falhas entre os spans são entradas. */
   addSpan(walls,zone.id+'-a1',p,0,6);addSpan(walls,zone.id+'-a2',p,9,15);addSpan(walls,zone.id+'-a3',p,18,24);
   const b0=n+1;addSpan(walls,zone.id+'-b1',p,b0,b0+6);addSpan(walls,zone.id+'-b2',p,b0+9,b0+15);addSpan(walls,zone.id+'-b3',p,b0+18,b0+24);
   halfCap(walls,zone.id+'-start',p[0],p[p.length-1]);
   halfCap(walls,zone.id+'-end',p[n],p[n+1]);
   const idx=Number(zone.id.slice(-1));
   walls.push(obstacle(zone.id+'-rock',zone,idx%2?.58:-.58,idx<=2?230:-230,idx===1||idx===4?-210:210));
 }
 vision.walls.splice(0,vision.walls.length,...walls);

 /* Buff clicado na quina = capturar na quina. Não recentralizamos o alvo. */
 const previousTap=tactical.handleMapTap;
 tactical.handleMapTap=function(tap){
   if(gameMode==='robot')return previousTap(tap);
   const precise=tactical.clickedTarget?.(tap.world);
   if(precise&&precise.kind!=='buff')return previousTap(tap);
   const zone=buffs.zones.find(z=>buffs.containsBuff(z,tap.world));
   if(!zone)return previousTap(tap);
   const target={kind:'buff',buff:zone,lane:null,x:null,world:{x:tap.world.x,y:tap.world.y}};
   return tactical.commandTarget(target)
 };

 window.SL_JUNGLE_ACCESS={version:1,assignment:ASSIGN,get walls(){return vision.walls},health(){return{loaded:true,zones:buffs.zones.map(z=>({id:z.id,quadrant:z.quadrant,points:z.polygon.length})),walls:vision.walls.length,exactPointCapture:true}}};

 /* O pathfinder precisa nascer DEPOIS que as 44 paredes definitivas substituem
    as paredes provisórias; assim o grafo de visibilidade é construído na
    topologia real da partida. */
 if(!document.querySelector('script[data-sl-jungle-pathfinding]')){
   const s=document.createElement('script');s.src='jungle-pathfinding-v2.js?v=20260904-a-star1';s.async=false;s.dataset.slJunglePathfinding='1';document.head.appendChild(s)
 }
})();
