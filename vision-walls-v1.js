/* Stick Lanes — paredes de visão / fog-of-war v1
   O terreno bloqueia linha de visão. Jogador e IA usam a mesma regra.
   Não concede informação oculta; inimigos escondidos não são desenhados. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map||typeof draw!=='function'||typeof drawUnit!=='function')return;
const WALLS=[
 {id:'u1',x:1580,y:3740,w:760,h:300,a:-.62},
 {id:'u2',x:2380,y:2760,w:680,h:300,a:-.48},
 {id:'u3',x:3300,y:1960,w:720,h:300,a:-.24},
 {id:'u4',x:4260,y:1420,w:660,h:280,a:-.08},
 {id:'l1',x:3060,y:5260,w:760,h:300,a:-.62},
 {id:'l2',x:4060,y:4540,w:680,h:300,a:-.48},
 {id:'l3',x:4920,y:3620,w:720,h:300,a:-.24},
 {id:'l4',x:5480,y:2680,w:660,h:280,a:-.08}
];
const lastSeen={1:new Map(),'-1':new Map()};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function corners(w){const c=Math.cos(w.a),s=Math.sin(w.a),hx=w.w/2,hy=w.h/2,local=[[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]];return local.map(([x,y])=>({x:w.x+x*c-y*s,y:w.y+x*s+y*c}))}
function orient(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function onSeg(a,b,p){return p.x>=Math.min(a.x,b.x)-.001&&p.x<=Math.max(a.x,b.x)+.001&&p.y>=Math.min(a.y,b.y)-.001&&p.y<=Math.max(a.y,b.y)+.001}
function segHit(a,b,c,d){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;if(Math.abs(o1)<.001&&onSeg(a,b,c))return true;if(Math.abs(o2)<.001&&onSeg(a,b,d))return true;if(Math.abs(o3)<.001&&onSeg(c,d,a))return true;if(Math.abs(o4)<.001&&onSeg(c,d,b))return true;return false}
function pointInside(w,p){const c=Math.cos(-w.a),s=Math.sin(-w.a),dx=p.x-w.x,dy=p.y-w.y,x=dx*c-dy*s,y=dx*s+dy*c;return Math.abs(x)<=w.w/2&&Math.abs(y)<=w.h/2}
function blocked(a,b){for(const w of WALLS){if(pointInside(w,a)||pointInside(w,b))continue;const q=corners(w);for(let i=0;i<4;i++)if(segHit(a,b,q[i],q[(i+1)%4]))return true}return false}
function visionRadiusUnit(u){if(u.special?.legend)return 1120;if(u.minion)return 650;if(u.role==='ranged'||u.role==='siege'||u.role==='support')return 850;return 760}
function visionSources(side){const src=[];for(const u of units){if(u.dead||u.side!==side)continue;src.push({p:map.unitPos(u),r:visionRadiusUnit(u)})}for(const s of structures){if(s.dead||s.side!==side)continue;src.push({p:map.structurePos(s),r:s.auxiliary?720:980})}const bp=side===1?map.routePoint(1,.01):map.routePoint(1,.99);src.push({p:bp,r:1200});return src}
function isPointVisible(side,p){for(const src of visionSources(side)){const d=Math.hypot(src.p.x-p.x,src.p.y-p.y);if(d<=src.r&&!blocked(src.p,p))return true}return false}
function isVisibleTo(side,u){if(!u||u.dead)return false;if(u.side===side)return true;const p=map.unitPos(u),visible=isPointVisible(side,p);if(visible)lastSeen[side]?.set(u.id,{t:simTime,x:p.x,y:p.y,lane:u.lane});return visible}
function seenRecently(side,u,seconds=2.6){if(isVisibleTo(side,u))return true;const s=lastSeen[side]?.get(u?.id);return!!(s&&simTime-s.t<=seconds)}
function visibleEnemies(side){return units.filter(u=>!u.dead&&u.side===-side&&isVisibleTo(side,u))}
function lastSeenInfo(side,id){return lastSeen[side]?.get(id)||null}
function drawWallShape(w){ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.a);const hx=w.w/2,hy=w.h/2;ctx.fillStyle='#11191d';ctx.strokeStyle='rgba(178,195,201,.28)';ctx.lineWidth=14;ctx.beginPath();ctx.roundRect(-hx,-hy,w.w,w.h,70);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(97,118,126,.23)';ctx.beginPath();ctx.roundRect(-hx+22,-hy+22,w.w-44,w.h-44,52);ctx.fill();ctx.strokeStyle='rgba(220,232,235,.09)';ctx.lineWidth=3;for(let x=-hx+80;x<hx-40;x+=145){ctx.beginPath();ctx.moveTo(x,-hy+35);ctx.lineTo(x+54,hy-38);ctx.stroke()}ctx.restore()}
function drawWalls(){ctx.save();ctx.setTransform(map.zoom,0,0,map.zoom,-map.cameraX*map.zoom,-map.cameraY*map.zoom);for(const w of WALLS)drawWallShape(w);ctx.restore()}
const baseDrawUnit=drawUnit;drawUnit=function(u,t){if(u?.side===-1&&!isVisibleTo(1,u))return;baseDrawUnit(u,t)};
const baseDraw=draw;draw=function(t){baseDraw(t);drawWalls()};
const tactical=window.SL_TACTICAL_TARGETING;
if(tactical){const oldClicked=tactical.clickedTarget;tactical.clickedTarget=function(world){const target=oldClicked(world);if(target?.kind==='unit'){const u=units.find(x=>!x.dead&&x.id===target.unitId);if(u&&u.side===-1&&!isVisibleTo(1,u))return null}return target}}
window.SL_VISION={version:1,walls:WALLS,blocked,isPointVisible,isVisibleTo,seenRecently,visibleEnemies,lastSeenInfo,health(){return{loaded:true,walls:WALLS.length,playerVisibleEnemies:visibleEnemies(1).length,aiVisibleEnemies:visibleEnemies(-1).length}}};
})();