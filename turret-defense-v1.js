/* Stick Lanes — torretas auxiliares v1
   Um par por intervalo; no mínimo 75% do corredor defensivo fica coberto. */
'use strict';
(function(){
const TURRET_HP=900,TURRET_ATK=10,TURRET_RATE=1.15;
const SIDE_MAIN_SHARE=.23,CENTER_MAIN_SHARE=.24,TURRET_SHARE=.20,MIN_GAP_COVERAGE=.75;
const blue=new Image(),red=new Image();blue.src='assets/map/turret-blue.svg';red.src='assets/map/turret-red.svg';
const oldMake=makeStructures,oldTowerDamage=towerDamageTaken,oldDraw=drawTower;

function arcLength(lane,x1,x2){
 let n=18,px=x1,py=laneYAt(lane,x1),d=0;
 for(let i=1;i<=n;i++){let x=lerp(x1,x2,i/n),y=laneYAt(lane,x);d+=Math.hypot(x-px,y-py);px=x;py=y}
 return d
}
function xAtArcFraction(lane,x1,x2,f){
 let n=36,pts=[],total=0,px=x1,py=laneYAt(lane,x1);pts.push({x:x1,d:0});
 for(let i=1;i<=n;i++){let x=lerp(x1,x2,i/n),y=laneYAt(lane,x);total+=Math.hypot(x-px,y-py);pts.push({x,d:total});px=x;py=y}
 let target=total*f;for(let i=1;i<pts.length;i++)if(pts[i].d>=target){let a=pts[i-1],b=pts[i],q=(target-a.d)/Math.max(1,b.d-a.d);return lerp(a.x,b.x,q)}return x2
}
function addTurrets(){
 const mains=structures.filter(s=>!s.auxiliary);
 for(const side of [1,-1])for(let lane=0;lane<3;lane++){
   const line=mains.filter(s=>s.side===side&&s.lane===lane).sort((a,b)=>a.x-b.x);
   const gaps=[];for(let i=0;i<line.length-1;i++)gaps.push(arcLength(lane,line[i].x,line[i+1].x));
   /* Alcance calculado sobre o comprimento real da rota, nunca sobre a tela. */
   line.forEach((s,i)=>{
     const adj=[];if(i>0)adj.push(gaps[i-1]);if(i<gaps.length)adj.push(gaps[i]);
     const share=lane===1?CENTER_MAIN_SHARE:SIDE_MAIN_SHARE;
     if(adj.length)s.range=Math.max(s.range||0,8,Math.ceil(Math.min(...adj)*share/PX))
   });
   for(let i=0;i<line.length-1;i++){
     const a=line[i],b=line[i+1],D=gaps[i],pairId=`${side}:${lane}:${i}`;
     [-.75,.75].forEach((subOffset,slot)=>{
       const x=xAtArcFraction(lane,a.x,b.x,.5),range=Math.max(7,Math.ceil(D*TURRET_SHARE/PX));
       structures.push({id:++structureSeq,side,lane,x,kind:'tower',auxiliary:true,pairId,auxSlot:slot,subOffset,label:'Torreta',hp:TURRET_HP,maxHp:TURRET_HP,atk:TURRET_ATK,range,rate:TURRET_RATE,visualTier:0,blockedSubs:[-1,0,1],openSubs:[-2,2],collisionSpan:3,lastAttack:0,dead:false,fortified:false,breachUntil:-999,targetId:null})
     })
   }
 }
}
makeStructures=function(){oldMake();addTurrets()};
towerDamageTaken=function(s,t){if(s.auxiliary){s.fortified=false;return 1}return oldTowerDamage(s,t)};

function valid(s,u){let sy=structureY(s),r=s.range*PX;return u&&!u.dead&&!u.tacticalWorld&&u.side===-s.side&&u.lane===s.lane&&Math.hypot(u.x-s.x,yOf(u)-sy)<=r}
function provokedLegend(s,u,t){return!!(u.special?.legend&&u.legendAggroUntil>t&&u.legendAggroDefendingSide===s.side)}
function targetPriority(u,defensive){
 if(defensive){if(u.special?.legend)return 0;return u.minion?2:1}
 if(u.minion)return 0;return u.special?.legend?2:1
}
function choose(s,used,t){
 let sy=structureY(s),r=s.range*PX,list=nearbyUnits(-s.side,s.lane,s.x,r).filter(u=>valid(s,u)),defensive=list.some(u=>provokedLegend(s,u,t));
 return list.filter(u=>!used.has(u.id)||(defensive&&u.special?.legend)).sort((a,b)=>targetPriority(a,defensive)-targetPriority(b,defensive)||Math.hypot(a.x-s.x,yOf(a)-sy)-Math.hypot(b.x-s.x,yOf(b)-sy))[0]||null
}
function fire(s,v,t){let def=effectiveDefense(v),d=s.atk*(1-Math.min(.65,def/(def+140)))*incomingMultiplier(v);v.hp-=d;v.lastDamaged=t;if(v.hp<=0)killUnit(v,{side:s.side,fac:'Torre'},t);s.lastAttack=t;effects.push({type:'shot',x1:s.x,y1:structureY(s)-28,x2:v.x,y2:yOf(v)-10,t,side:s.side})}
function mainFire(s,t){towerDamageTaken(s,t);if(t-s.lastAttack<s.rate)return;let v=choose(s,new Set(),t);if(v)fire(s,v,t)}
updateTowers=function(t){
 for(const s of structures)if(!s.dead&&!s.auxiliary)mainFire(s,t);
 const groups=new Map();for(const s of structures)if(!s.dead&&s.auxiliary){if(!groups.has(s.pairId))groups.set(s.pairId,[]);groups.get(s.pairId).push(s)}
 for(const pair of groups.values()){
   pair.sort((a,b)=>a.auxSlot-b.auxSlot);const used=new Set();
   for(const s of pair){let v=choose(s,used,t);s.targetId=v?.id||null;if(v&&!provokedLegend(s,v,t))used.add(v.id);if(v&&t-s.lastAttack>=s.rate)fire(s,v,t)}
 }
};

function ready(im){return im.complete&&im.naturalWidth>0}
function tangent(lane,x){let d=55;return Math.atan2(laneYAt(lane,x+d)-laneYAt(lane,x-d),d*2)}
drawTower=function(s,t){
 if(!s.auxiliary)return oldDraw(s,t);if(s.dead)return;if(typeof drawTowerRange==='function')drawTowerRange(s);
 let x=s.x,y=structureY(s),im=s.side===1?blue:red;ctx.save();ctx.translate(x,y);ctx.rotate(tangent(s.lane,x));ctx.scale(s.side,1);
 if(ready(im))ctx.drawImage(im,-72,-92,144,120);else{ctx.fillStyle=s.side===1?'#2d9fd0':'#c44551';ctx.beginPath();ctx.arc(0,-18,28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111820';ctx.fillRect(0,-25,60,12)}ctx.restore();
 let hp=Math.max(0,s.hp/s.maxHp),w=80;ctx.fillStyle='rgba(3,6,9,.9)';ctx.fillRect(x-w/2,y-101,w,7);ctx.fillStyle=hp>.4?'#47bd70':'#df5962';ctx.fillRect(x-w/2,y-101,w*hp,5)
};

if(structures.length&&!structures.some(s=>s.auxiliary))addTurrets();
window.SL_TURRETS_V1={hp:TURRET_HP,atk:TURRET_ATK,rate:TURRET_RATE,minGapCoverage:MIN_GAP_COVERAGE,mainShare:{side:SIDE_MAIN_SHARE,center:CENTER_MAIN_SHARE},turretShare:TURRET_SHARE,targetPriority:{normal:['minion','troop','legend'],legendDefense:['legend','troop','minion']},priorityFor:targetPriority};
})();
