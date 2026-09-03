/* Stick Lanes — paredes físicas + visão bloqueada v2
   Parede é parede: estreita, sólida, não atravessável e corta linha de visão.
   As paredes ficam afastadas dos centros B1/B2/B3/B4 para não cobrir os buffs. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map||!window.SL_TACTICAL_TARGETING)return;

function wall(id,x,y,len,a,thickness=74){
 const dx=Math.cos(a)*len/2,dy=Math.sin(a)*len/2;
 return{id,x,y,len,a,thickness,x1:x-dx,y1:y-dy,x2:x+dx,y2:y+dy};
}
/* Obstáculos dentro das jungles, mas deslocados dos centros dos quatro buffs. */
const WALLS=[
 wall('u1',1100,3550,560,.58),wall('u2',1850,4300,520,-.72),
 wall('u3',3550,1100,560,.58),wall('u4',4300,1850,520,-.72),
 wall('l1',2500,5000,560,.58),wall('l2',3300,5700,520,-.72),
 wall('l3',5000,2500,560,.58),wall('l4',5700,3300,520,-.72)
];
const lastSeen={1:new Map(),'-1':new Map()};

function wallLocal(w,p){
 const c=Math.cos(-w.a),s=Math.sin(-w.a),dx=p.x-w.x,dy=p.y-w.y;
 return{x:dx*c-dy*s,y:dx*s+dy*c};
}
function pointInside(w,p,pad=0){const q=wallLocal(w,p);return Math.abs(q.x)<=w.len/2+pad&&Math.abs(q.y)<=w.thickness/2+pad}
function corners(w,pad=0){
 const hx=w.len/2+pad,hy=w.thickness/2+pad,c=Math.cos(w.a),s=Math.sin(w.a);
 return[[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]].map(([x,y])=>({x:w.x+x*c-y*s,y:w.y+x*s+y*c}));
}
function orient(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function onSeg(a,b,p){return p.x>=Math.min(a.x,b.x)-.01&&p.x<=Math.max(a.x,b.x)+.01&&p.y>=Math.min(a.y,b.y)-.01&&p.y<=Math.max(a.y,b.y)+.01}
function segHit(a,b,c,d){
 const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
 if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;
 if(Math.abs(o1)<.01&&onSeg(a,b,c))return true;if(Math.abs(o2)<.01&&onSeg(a,b,d))return true;
 if(Math.abs(o3)<.01&&onSeg(c,d,a))return true;if(Math.abs(o4)<.01&&onSeg(c,d,b))return true;return false;
}
function segmentHitsWall(a,b,w,pad=0){
 if(pointInside(w,a,pad)||pointInside(w,b,pad))return true;
 const q=corners(w,pad);for(let i=0;i<4;i++)if(segHit(a,b,q[i],q[(i+1)%4]))return true;return false;
}
function blockingWall(a,b,pad=0){return WALLS.find(w=>segmentHitsWall(a,b,w,pad))||null}
function blocked(a,b){return!!blockingWall(a,b,0)}
function pushOutside(p,pad=34){
 for(const w of WALLS){
  if(!pointInside(w,p,pad))continue;const q=wallLocal(w,p),hx=w.len/2+pad,hy=w.thickness/2+pad;
  const dx=hx-Math.abs(q.x),dy=hy-Math.abs(q.y);if(dx<dy)q.x=Math.sign(q.x||1)*(hx+2);else q.y=Math.sign(q.y||1)*(hy+2);
  const c=Math.cos(w.a),s=Math.sin(w.a);p={x:w.x+q.x*c-q.y*s,y:w.y+q.x*s+q.y*c};
 }
 return p;
}
function routeWaypoint(a,b,pad=48){
 b=pushOutside({...b},pad);const hit=blockingWall(a,b,pad);if(!hit)return b;
 const candidates=corners(hit,pad+30).map(p=>pushOutside(p,pad+8));let best=null,bestScore=Infinity;
 for(const c of candidates){
  if(blockingWall(a,c,pad-8))continue;const score=Math.hypot(c.x-a.x,c.y-a.y)+Math.hypot(b.x-c.x,b.y-c.y)+(blockingWall(c,b,pad)?900:0);
  if(score<bestScore){bestScore=score;best=c}
 }
 if(best)return best;
 const ends=[{x:hit.x1,y:hit.y1},{x:hit.x2,y:hit.y2}].map(p=>pushOutside(p,pad+45));
 return ends.sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(p.x-b.x,p.y-b.y)-Math.hypot(q.x-a.x,q.y-a.y)-Math.hypot(q.x-b.x,q.y-b.y))[0];
}

function visionRadiusUnit(u){if(u.special?.legend)return 1120;if(u.minion)return 650;if(['ranged','siege','support','controller'].includes(u.role))return 850;return 760}
function visionSources(side){
 const src=[];for(const u of units){if(u.dead||u.side!==side)continue;src.push({p:map.unitPos(u),r:visionRadiusUnit(u)})}
 for(const s of structures){if(s.dead||s.side!==side)continue;src.push({p:map.structurePos(s),r:s.auxiliary?720:980})}
 const bp=side===1?map.routePoint(1,.01):map.routePoint(1,.99);src.push({p:bp,r:1200});return src;
}
function isPointVisible(side,p){for(const src of visionSources(side)){if(Math.hypot(src.p.x-p.x,src.p.y-p.y)<=src.r&&!blocked(src.p,p))return true}return false}
function isVisibleTo(side,u){if(!u||u.dead)return false;if(u.side===side)return true;const p=map.unitPos(u),v=isPointVisible(side,p);if(v)lastSeen[side]?.set(u.id,{t:simTime,x:p.x,y:p.y,lane:u.lane});return v}
function seenRecently(side,u,seconds=2.6){if(isVisibleTo(side,u))return true;const s=lastSeen[side]?.get(u?.id);return!!(s&&simTime-s.t<=seconds)}
function visibleEnemies(side){return units.filter(u=>!u.dead&&u.side===-side&&isVisibleTo(side,u))}

function drawWall(w){
 ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.a);const hx=w.len/2,hy=w.thickness/2;
 ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.roundRect(-hx+10,-hy+18,w.len,w.thickness,18);ctx.fill();
 ctx.fillStyle='#263238';ctx.strokeStyle='#6f8087';ctx.lineWidth=6;ctx.beginPath();ctx.roundRect(-hx,-hy,w.len,w.thickness,15);ctx.fill();ctx.stroke();
 ctx.fillStyle='#121a1e';ctx.fillRect(-hx+18,-hy+14,w.len-36,w.thickness-28);
 ctx.strokeStyle='rgba(210,225,230,.18)';ctx.lineWidth=3;for(let x=-hx+70;x<hx-30;x+=120){ctx.beginPath();ctx.moveTo(x,-hy+8);ctx.lineTo(x+24,hy-8);ctx.stroke()}
 ctx.fillStyle='#4b5b62';for(const x of[-hx,hx]){ctx.beginPath();ctx.roundRect(x-18,-hy-18,36,w.thickness+36,10);ctx.fill()}
 ctx.restore();
}
function drawWalls(){ctx.save();ctx.setTransform(map.zoom,0,0,map.zoom,-map.cameraX*map.zoom,-map.cameraY*map.zoom);for(const w of WALLS)drawWall(w);ctx.restore()}

const baseDrawUnit=drawUnit;drawUnit=function(u,t){if(u?.side===-1&&!isVisibleTo(1,u))return;baseDrawUnit(u,t)};
const baseDraw=draw;draw=function(t){baseDraw(t);drawWalls()};

const tactical=window.SL_TACTICAL_TARGETING,oldClicked=tactical.clickedTarget;
tactical.clickedTarget=function(world){
 if(WALLS.some(w=>pointInside(w,world,12)))return null;const target=oldClicked(world);
 if(target?.kind==='unit'){const u=units.find(x=>!x.dead&&x.id===target.unitId);if(u&&u.side===-1&&!isVisibleTo(1,u))return null}return target;
};

function tacticalSpeed(u,t){
 const rs=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),bonus=window.SL_BUFF_SYSTEM?.moveBonus?.(u.side,t)||0;
 return Math.max(55,u.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*rs)*(1+bonus);
}
function moveWorld(u,goal,dt,t,stop=10){
 const a=u.tacticalWorld,b=routeWaypoint(a,goal,46),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<=stop)return Math.hypot(goal.x-a.x,goal.y-a.y)<=stop;
 const step=Math.min(d,tacticalSpeed(u,t)*dt);if(step>0){a.x+=dx/d*step;a.y+=dy/d*step;a.a=Math.atan2(dy,dx);u.lastMoved=t}return false;
}
function releasePointToLane(u,d){
 delete u.tacticalWorld;delete u.tacticalDestination;delete u.manualUnitTargetId;u.lane=d.lane;u.x=d.x;u.sub=0;u.subTarget=0;
 if(d.slNoHold){delete u.manualHold;return}u.manualHold={lane:d.lane,x:d.x,world:d.world};
}
function handleTacticalTravel(u,dt,t){
 if(!u.tacticalWorld||!u.tacticalDestination)return false;const d=u.tacticalDestination;
 if(d.kind==='unit'){
  const v=units.find(x=>!x.dead&&x.id===d.unitId&&x.side===-u.side);if(!v){delete u.tacticalDestination;return true}
  const goal=map.unitPos(v),a=u.tacticalWorld,rs=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),range=Math.max(30,u.range*PX*rs),distance=Math.hypot(goal.x-a.x,goal.y-a.y);
  if(distance>range||blocked(a,goal)){moveWorld(u,goal,dt,t,Math.max(12,range*.76));return true}
  if(t-u.lastAttack>=attackRate(u)){attack(u,v,t);u.lastAttack=t;u.attackCount++}return true;
 }
 const goal=pushOutside({...d.world},44),arrived=moveWorld(u,goal,dt,t,14);if(!arrived)return true;
 u.tacticalWorld.x=goal.x;u.tacticalWorld.y=goal.y;
 if(d.kind==='buff'){u.tacticalDestination=null;u.manualBuff=d.buff.id;return true}
 releasePointToLane(u,d);return true;
}
function handleJungleHold(u,dt,t){
 if(!u?.special?.legend||!u.tacticalWorld||u.tacticalDestination||!u.manualBuff)return false;
 const api=window.SL_BUFF_SYSTEM,zone=api?.zones?.find(z=>z.id===u.manualBuff);if(!zone)return false;
 const enemy=units.find(v=>!v.dead&&v.side===-u.side&&v.special?.legend&&api.containsBuff(zone,map.unitPos(v)));if(!enemy)return true;
 const a=u.tacticalWorld,b=map.unitPos(enemy),rs=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),range=Math.max(32,u.range*PX*rs),distance=Math.hypot(b.x-a.x,b.y-a.y);
 if(distance>range||blocked(a,b)){moveWorld(u,b,dt,t,Math.max(12,range*.78));return true}
 if(t-u.lastAttack>=attackRate(u)){attack(u,enemy,t);u.lastAttack=t;u.attackCount++}return true;
}
const oldHandle=tactical.handleUnit;tactical.handleUnit=function(u,dt,t){if(handleTacticalTravel(u,dt,t))return true;if(handleJungleHold(u,dt,t))return true;return oldHandle(u,dt,t)};

window.SL_VISION={version:2,walls:WALLS,blocked,blockingWall,pointInside,routeWaypoint,isPointVisible,isVisibleTo,seenRecently,visibleEnemies,lastSeenInfo:(side,id)=>lastSeen[side]?.get(id)||null,health(){return{loaded:true,physical:true,walls:WALLS.length,playerVisibleEnemies:visibleEnemies(1).length,aiVisibleEnemies:visibleEnemies(-1).length}}};
})();