/* Stick Lanes — pathfinding de jungle v2
   A parede agora é obstáculo de verdade, então a navegação também precisa ser de verdade.
   Em vez do desvio guloso por uma única quina, usamos um grafo de visibilidade + A*.
   O grafo estático é reconstruído somente quando a topologia das paredes muda;
   cada Lenda guarda seu caminho e só replana quando destino/obstáculo muda. */
'use strict';
(function boot(){
 const map=window.SL_MOBA_SQUARE_V2,vision=window.SL_VISION,tt=window.SL_TACTICAL_TARGETING;
 if(!map||!vision?.walls||!vision.blockingWall||!vision.pointInside||!tt?.handleUnit){setTimeout(boot,50);return}
 if(window.SL_JUNGLE_PATHFINDING?.version>=2)return;

 const CLEAR=42,NODE_CLEAR=76,ARRIVE=16,REPLAN_UNIT=.55;
 let signature='',nodes=[],edges=[],graphBuilds=0,plans=0,failedPlans=0,replans=0;

 function wallSig(){return vision.walls.map(w=>`${w.id}:${Math.round(w.x)}:${Math.round(w.y)}:${Math.round(w.len)}:${Math.round(w.a*1000)}:${Math.round(w.thickness)}`).join('|')}
 function localToWorld(w,x,y){const c=Math.cos(w.a),s=Math.sin(w.a);return{x:w.x+x*c-y*s,y:w.y+x*s+y*c}}
 function wallNodes(w){const hx=w.len/2+NODE_CLEAR,hy=w.thickness/2+NODE_CLEAR;return[localToWorld(w,-hx,-hy),localToWorld(w,hx,-hy),localToWorld(w,hx,hy),localToWorld(w,-hx,hy)]}
 function insideAny(p,pad=CLEAR-5){return vision.walls.some(w=>vision.pointInside(w,p,pad))}
 function lineClear(a,b,pad=CLEAR){return!vision.blockingWall(a,b,pad)}
 function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
 function pushOutside(input,pad=CLEAR+8){
   let p={x:input.x,y:input.y};
   for(let pass=0;pass<5;pass++){
     let moved=false;
     for(const w of vision.walls){
       if(!vision.pointInside(w,p,pad))continue;
       const c=Math.cos(-w.a),s=Math.sin(-w.a),dx=p.x-w.x,dy=p.y-w.y,qx=dx*c-dy*s,qy=dx*s+dy*c,
             hx=w.len/2+pad,hy=w.thickness/2+pad,px=hx-Math.abs(qx),py=hy-Math.abs(qy);
       let nx=qx,ny=qy;if(px<py)nx=Math.sign(qx||1)*(hx+5);else ny=Math.sign(qy||1)*(hy+5);
       const cw=Math.cos(w.a),sw=Math.sin(w.a);p={x:w.x+nx*cw-ny*sw,y:w.y+nx*sw+ny*cw};moved=true
     }
     if(!moved)break
   }
   return p
 }
 function dedupe(points){
   const out=[];for(const p of points){if(insideAny(p))continue;if(!out.some(q=>distance(p,q)<24))out.push(p)}return out
 }
 function rebuildGraph(){
   signature=wallSig();nodes=dedupe(vision.walls.flatMap(w=>wallNodes(w)));edges=Array.from({length:nodes.length},()=>[]);
   for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
     if(!lineClear(nodes[i],nodes[j]))continue;const d=distance(nodes[i],nodes[j]);edges[i].push([j,d]);edges[j].push([i,d])
   }
   graphBuilds++
 }
 function ensureGraph(){if(signature!==wallSig())rebuildGraph()}
 function simplify(start,path){
   if(path.length<2)return path;const out=[],all=[start,...path];let i=0;
   while(i<all.length-1){let j=all.length-1;while(j>i+1&&!lineClear(all[i],all[j]))j--;out.push(all[j]);i=j}
   return out
 }
 function planRoute(rawStart,rawGoal){
   ensureGraph();plans++;
   const start=pushOutside(rawStart),goal=pushOutside(rawGoal);
   if(lineClear(start,goal))return[goal];
   const n=nodes.length,S=n,G=n+1,total=n+2,dist=new Float64Array(total),prev=new Int32Array(total),closed=new Uint8Array(total);
   dist.fill(Infinity);prev.fill(-1);dist[S]=0;
   const startLinks=[],goalCost=new Float64Array(n);goalCost.fill(Infinity);
   for(let i=0;i<n;i++){
     if(lineClear(start,nodes[i]))startLinks.push([i,distance(start,nodes[i])]);
     if(lineClear(nodes[i],goal))goalCost[i]=distance(nodes[i],goal)
   }
   function relax(from,to,cost){const nd=dist[from]+cost;if(nd<dist[to]){dist[to]=nd;prev[to]=from}}
   for(let iter=0;iter<total;iter++){
     let cur=-1,best=Infinity;
     for(let i=0;i<total;i++){if(closed[i]||!Number.isFinite(dist[i]))continue;const p=i===S?start:i===G?goal:nodes[i],f=dist[i]+distance(p,goal);if(f<best){best=f;cur=i}}
     if(cur<0)break;if(cur===G)break;closed[cur]=1;
     if(cur===S){for(const[e,c]of startLinks)relax(S,e,c);if(lineClear(start,goal))relax(S,G,distance(start,goal));continue}
     for(const[e,c]of edges[cur])relax(cur,e,c);if(Number.isFinite(goalCost[cur]))relax(cur,G,goalCost[cur])
   }
   if(prev[G]===-1){failedPlans++;const greedy=vision.routeWaypoint(start,goal,CLEAR);return[greedy,goal]}
   const rev=[];let k=G;while(k!==S&&k!==-1){rev.push(k===G?goal:nodes[k]);k=prev[k]}
   rev.reverse();return simplify(start,rev)
 }
 function goalFor(u,d){
   if(d?.kind==='unit'){const v=units.find(x=>!x.dead&&x.id===d.unitId&&x.side===-u.side);return v?map.unitPos(v):null}
   return d?.world?{x:d.world.x,y:d.world.y}:null
 }
 function speed(u,t){const rs=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),bonus=window.SL_BUFF_SYSTEM?.moveBonus?.(u.side,t)||0;return Math.max(55,u.speed*MOVE_SCALE*(window.SL_MOVEMENT_V6?.multiplier||1)*rs)*(1+bonus)}
 function resetPath(u){delete u.slWallPath;delete u.slWallPathIndex;delete u.slWallPathGoal;delete u.slWallPathAt;delete u.slWallPathSig}
 function needsPlan(u,goal,d,t){
   if(!u.slWallPath?.length||u.slWallPathIndex>=u.slWallPath.length||u.slWallPathSig!==signature)return true;
   const old=u.slWallPathGoal;if(!old||distance(old,goal)>90)return true;
   if(d.kind==='unit'&&t-(u.slWallPathAt||-99)>REPLAN_UNIT&&distance(old,goal)>36)return true;
   const wp=u.slWallPath[u.slWallPathIndex];return!wp||!lineClear(u.tacticalWorld,wp)
 }
 function ensurePath(u,goal,d,t){
   ensureGraph();if(!needsPlan(u,goal,d,t))return;
   if(u.slWallPath)replans++;u.slWallPath=planRoute(u.tacticalWorld,goal);u.slWallPathIndex=0;u.slWallPathGoal={...goal};u.slWallPathAt=t;u.slWallPathSig=signature
 }
 function movePath(u,goal,d,dt,t,stop=ARRIVE){
   ensurePath(u,goal,d,t);let guard=0;
   while(u.slWallPathIndex<u.slWallPath.length&&guard++<4){
     const wp=u.slWallPath[u.slWallPathIndex],dx=wp.x-u.tacticalWorld.x,dy=wp.y-u.tacticalWorld.y,dd=Math.hypot(dx,dy);
     if(dd<=stop){u.slWallPathIndex++;continue}
     const step=Math.min(dd,speed(u,t)*dt);if(step>0){u.tacticalWorld.x+=dx/dd*step;u.tacticalWorld.y+=dy/dd*step;u.tacticalWorld.a=Math.atan2(dy,dx);u.lastMoved=t}return false
   }
   return distance(u.tacticalWorld,pushOutside(goal))<=stop*1.6
 }

 const oldHandle=tt.handleUnit.bind(tt);
 tt.handleUnit=function(u,dt,t){
   const d=u?.tacticalDestination;if(!u?.special?.legend||!u.tacticalWorld||!d)return oldHandle(u,dt,t);
   const goal=goalFor(u,d);if(!goal){resetPath(u);return oldHandle(u,dt,t)}
   if(d.kind==='unit'){
     const rs=map.routeLengths[1]/(BASE_X[-1]-BASE_X[1]),range=Math.max(30,u.range*PX*rs),dist=distance(u.tacticalWorld,goal);
     if(dist<=range&&!vision.blocked(u.tacticalWorld,goal)){resetPath(u);return oldHandle(u,dt,t)}
     movePath(u,goal,d,dt,t,Math.max(14,range*.72));return true
   }
   if(movePath(u,goal,d,dt,t,ARRIVE)){
     u.tacticalWorld.x=pushOutside(goal).x;u.tacticalWorld.y=pushOutside(goal).y;resetPath(u);
     return oldHandle(u,dt,t)
   }
   return true
 };

 window.SL_JUNGLE_PATHFINDING={version:2,planRoute,clear:lineClear,rebuild:rebuildGraph,health(){return{loaded:true,version:2,walls:vision.walls.length,nodes:nodes.length,graphBuilds,plans,failedPlans,replans}}};
 rebuildGraph();
})();
