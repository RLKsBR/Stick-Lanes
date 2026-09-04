/* Stick Lanes — clareza de combate v1
   Números de dano, hit feedback, alcance visível, fog of war e duelos de Lenda
   mais decisivos. Tudo usa o mesmo estado real do combate; nada é cosmético
   a ponto de mentir sobre alcance ou dano. */
'use strict';
(function boot(){
 const map=window.SL_MOBA_SQUARE_V2,vision=window.SL_VISION;
 if(!map||!vision||typeof attack!=='function'||typeof draw!=='function'||typeof factionDamageBonus!=='function'){setTimeout(boot,50);return}
 if(window.SL_COMBAT_CLARITY?.version>=1)return;

 const LEGEND_DUEL_DAMAGE=2.2;
 const FX_LIFE=.82,FOG_STEP=72,FOG_REFRESH=.12;
 const fx=[];
 let fogCanvas=null,fogCtx=null,lastFogAt=-999;

 /* Duelos de Lenda deixam de durar uma eternidade. O multiplicador é simétrico:
    aumenta a decisão do confronto sem favorecer uma Lenda específica. */
 const previousFactionDamageBonus=factionDamageBonus;
 factionDamageBonus=function(attacker,target){
   let m=previousFactionDamageBonus(attacker,target);
   if(attacker?.special?.legend&&target?.special?.legend)m*=LEGEND_DUEL_DAMAGE;
   return m
 };

 function unitWorld(u){try{return map.unitPos(u)}catch(_){return{x:u.x,y:typeof yOf==='function'?yOf(u):500}}}
 function structureWorld(s){if(s?.kind==='base')return map.routePoint(1,s.side===1?.01:.99);try{return map.structurePos(s)}catch(_){return{x:s.x,y:500}}}
 function visibleWorld(p){return gameMode==='robot'||vision.isPointVisible(1,p)}
 function recordDamage(attacker,target,damage,t,kind='unit'){
   if(!(damage>.4))return;const p=kind==='unit'?unitWorld(target):structureWorld(target),a=attacker?unitWorld(attacker):p;
   fx.push({type:'damage',x:p.x,y:p.y-54,value:Math.max(1,Math.round(damage)),t,side:target?.side||0});
   fx.push({type:'hit',x:p.x,y:p.y,ax:a.x,ay:a.y,t,ranged:!!(attacker&&(attacker.range>4||['ranged','controller','support','siege'].includes(attacker.role)))});
   if(target)target.slHitFlashUntil=t+.20;if(attacker)attacker.slAttackFlashUntil=t+.16;
 }

 const previousAttack=attack;
 attack=function(attacker,target,t){
   const before=Math.max(0,target?.hp||0),result=previousAttack(attacker,target,t),after=Math.max(0,target?.hp||0);
   recordDamage(attacker,target,before-after,t,'unit');return result
 };
 const previousAttackStructure=typeof attackStructure==='function'?attackStructure:null;
 if(previousAttackStructure)attackStructure=function(attacker,target,t){
   const before=target?.kind==='base'?baseHp(target.side):Math.max(0,target?.hp||0),result=previousAttackStructure(attacker,target,t),after=target?.kind==='base'?baseHp(target.side):Math.max(0,target?.hp||0);
   recordDamage(attacker,target,before-after,t,'structure');return result
 };
 const previousUpdateTowers=typeof updateTowers==='function'?updateTowers:null;
 if(previousUpdateTowers)updateTowers=function(t){
   const before=new Map(units.filter(u=>!u.dead).map(u=>[u.id,Math.max(0,u.hp)]));
   const result=previousUpdateTowers(t);
   for(const u of units){const old=before.get(u.id);if(old==null)continue;const d=old-Math.max(0,u.hp);if(d>.4)recordDamage(null,u,d,t,'unit')}
   return result
 };

 function projectedRange(u){
   const route=map.routeLengths?.[u.lane]||map.routeLengths?.[1]||9000;
   return Math.max(28,(u.range||1)*PX*route/(BASE_X[-1]-BASE_X[1]))
 }
 function drawRangeFor(u,t,selected=false){
   if(!u||u.dead)return;const p=unitWorld(u);if(u.side===-1&&!vision.isVisibleTo(1,u))return;
   const r=projectedRange(u),color=u.side===1?'#f08a24':'#c93645';
   ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=selected?.42:.16;ctx.lineWidth=selected?5:3;ctx.setLineDash(selected?[20,12]:[10,14]);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=selected?.055:.025;ctx.fill();ctx.setLineDash([]);
   if(selected){ctx.globalAlpha=.9;ctx.font='800 18px system-ui';ctx.textAlign='center';ctx.fillText(`ALCANCE ${(u.range||0).toFixed(1)}u`,p.x,p.y-r-12)}ctx.restore()
 }
 function drawRanges(t){
   ctx.save();ctx.setTransform(map.zoom,0,0,map.zoom,-map.cameraX*map.zoom,-map.cameraY*map.zoom);
   const selected=window.SL_BATTLE_UI?.selected?.object;
   if(selected&&!selected.dead&&Number.isFinite(selected.range)&&!selected.kind)drawRangeFor(selected,t,true);
   for(const u of units){
     if(u.dead||!u.special?.legend||u===selected)continue;
     const engaged=(t-u.lastDamaged<3)||(u.legendAggroUntil||0)>t||u.manualBuff;
     if(engaged)drawRangeFor(u,t,false)
   }
   ctx.restore()
 }

 function drawFx(t){
   ctx.save();ctx.setTransform(map.zoom,0,0,map.zoom,-map.cameraX*map.zoom,-map.cameraY*map.zoom);
   for(const e of fx){const age=t-e.t;if(age<0||age>FX_LIFE||!visibleWorld({x:e.x,y:e.y}))continue;const q=age/FX_LIFE;
     if(e.type==='damage'){
       ctx.save();ctx.globalAlpha=Math.max(0,1-q);ctx.translate(e.x,e.y-q*105);ctx.fillStyle='#fff4df';ctx.strokeStyle='rgba(5,7,9,.9)';ctx.lineWidth=7;ctx.font=`1000 ${Math.round(34+8*(1-q))}px system-ui`;ctx.textAlign='center';ctx.strokeText(`-${e.value}`,0,0);ctx.fillText(`-${e.value}`,0,0);ctx.restore()
     }else{
       ctx.save();ctx.globalAlpha=Math.max(0,1-age/.28);ctx.strokeStyle='#fff0b5';ctx.lineWidth=e.ranged?7:10;ctx.beginPath();
       if(e.ranged){ctx.moveTo(e.ax,e.ay);ctx.lineTo(e.x,e.y)}else{const dx=e.x-e.ax,dy=e.y-e.ay,d=Math.hypot(dx,dy)||1;ctx.moveTo(e.x-dy/d*38,e.y+dx/d*38);ctx.lineTo(e.x+dy/d*38,e.y-dx/d*38)}ctx.stroke();
       ctx.beginPath();ctx.arc(e.x,e.y,26+age*120,0,Math.PI*2);ctx.stroke();ctx.restore()
     }
   }
   ctx.restore();
   while(fx.length&&t-fx[0].t>FX_LIFE+.2)fx.shift()
 }

 function ownVisionSources(){
   const src=[];
   for(const u of units){if(u.dead||u.side!==1)continue;let r=u.special?.legend?1120:u.minion?650:['ranged','siege','support','controller'].includes(u.role)?850:760;src.push({p:unitWorld(u),r})}
   for(const s of structures){if(s.dead||s.side!==1)continue;src.push({p:structureWorld(s),r:s.auxiliary?720:980})}
   src.push({p:map.routePoint(1,.01),r:1200});return src
 }
 function pointVisibleFast(p,sources){
   for(const s of sources){const dx=s.p.x-p.x,dy=s.p.y-p.y;if(dx*dx+dy*dy>s.r*s.r)continue;if(!vision.blocked(s.p,p))return true}return false
 }
 function ensureFog(){if(fogCanvas)return;fogCanvas=document.createElement('canvas');fogCanvas.width=VIEW_W;fogCanvas.height=VIEW_H;fogCtx=fogCanvas.getContext('2d')}
 function rebuildFog(t){
   ensureFog();if(t-lastFogAt<FOG_REFRESH)return;lastFogAt=t;fogCtx.clearRect(0,0,VIEW_W,VIEW_H);
   const sources=ownVisionSources(),z=map.zoom,cx=map.cameraX,cy=map.cameraY;
   for(let y=0;y<VIEW_H;y+=FOG_STEP)for(let x=0;x<VIEW_W;x+=FOG_STEP){
     const p={x:cx+(x+FOG_STEP*.5)/z,y:cy+(y+FOG_STEP*.5)/z};if(pointVisibleFast(p,sources))continue;
     fogCtx.fillStyle='rgba(1,4,7,.78)';fogCtx.fillRect(x-2,y-2,FOG_STEP+4,FOG_STEP+4)
   }
 }
 function drawFog(t){
   rebuildFog(t);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(fogCanvas,0,0);ctx.restore()
 }

 const previousDraw=draw;
 draw=function(t){
   /* O mapa quadrado desenhava todos os inimigos antes da máscara. Filtramos o
      array apenas durante o frame: gameplay continua intacto, render respeita visão. */
   const all=units,visibleIds=new Set(all.filter(u=>u.side===1||vision.isVisibleTo(1,u)).map(u=>u.id));
   units=all.filter(u=>visibleIds.has(u.id));
   try{previousDraw(t)}finally{units=all}
   drawRanges(t);drawFx(t);drawFog(t)
 };

 window.SL_COMBAT_CLARITY={version:1,legendDuelDamage:LEGEND_DUEL_DAMAGE,get effects(){return fx},health(){return{loaded:true,damageNumbers:true,hitAnimation:true,attackRange:true,fog:true,legendDuelDamage:LEGEND_DUEL_DAMAGE,balance:window.SL_LEGENDS_API?.balanceReport?.()||null}}};
})();
