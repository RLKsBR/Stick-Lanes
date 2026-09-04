/* Stick Lanes — clareza de combate v2
   Números de dano, hit feedback, alcance visível, fog of war suave e duelos de
   Lenda mais decisivos. O fog usa a mesma visão real do gameplay, inclusive
   visão estrutural além do alcance de ataque e bloqueio por paredes. */
'use strict';
(function boot(){
 const map=window.SL_MOBA_SQUARE_V2,vision=window.SL_VISION;
 if(!map||!vision||typeof attack!=='function'||typeof draw!=='function'||typeof factionDamageBonus!=='function'){setTimeout(boot,50);return}
 if(window.SL_COMBAT_CLARITY?.version>=2)return;

 const LEGEND_DUEL_DAMAGE=2.2;
 const FX_LIFE=.82,FOG_MASK_W=64,FOG_REFRESH_REAL=.13,FOG_ALPHA=214;
 const fx=[];
 let fogCanvas=null,fogCtx=null,fogImage=null,lastFogReal=-999;

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
   for(const u of units){if(u.dead||u.side!==1)continue;const r=vision.visionRadiusUnit?.(u)??(u.special?.legend?1120:u.minion?650:['ranged','siege','support','controller'].includes(u.role)?850:760);src.push({p:unitWorld(u),r})}
   for(const s of structures){if(s.dead||s.side!==1)continue;const r=vision.visionRadiusStructure?.(s)??(s.auxiliary?900:1250);src.push({p:structureWorld(s),r})}
   src.push({p:map.routePoint(1,.01),r:1450});return src
 }
 function pointVisibleFast(p,sources){
   for(const s of sources){const dx=s.p.x-p.x,dy=s.p.y-p.y;if(dx*dx+dy*dy>s.r*s.r)continue;if(!vision.blocked(s.p,p))return true}return false
 }
 function ensureFog(){
   if(fogCanvas)return;const h=Math.max(24,Math.round(FOG_MASK_W*VIEW_H/VIEW_W));fogCanvas=document.createElement('canvas');fogCanvas.width=FOG_MASK_W;fogCanvas.height=h;fogCtx=fogCanvas.getContext('2d',{alpha:true});fogImage=fogCtx.createImageData(FOG_MASK_W,h)
 }
 function rebuildFog(){
   ensureFog();const now=performance.now()/1000;if(now-lastFogReal<FOG_REFRESH_REAL)return;lastFogReal=now;
   const w=fogCanvas.width,h=fogCanvas.height,sources=ownVisionSources(),z=map.zoom,cx=map.cameraX,cy=map.cameraY,raw=new Uint8Array(w*h),soft=new Uint8Array(w*h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const p={x:cx+(x+.5)*VIEW_W/(w*z),y:cy+(y+.5)*VIEW_H/(h*z)};raw[y*w+x]=pointVisibleFast(p,sources)?0:FOG_ALPHA
   }
   /* Um box blur minúsculo no mask + interpolação do canvas remove o efeito de
      azulejos/retângulos sem alterar a regra lógica de quem está visível. */
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     let sum=0,n=0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const xx=x+ox,yy=y+oy;if(xx<0||yy<0||xx>=w||yy>=h)continue;sum+=raw[yy*w+xx];n++}soft[y*w+x]=Math.round(sum/n)
   }
   const d=fogImage.data;for(let i=0;i<soft.length;i++){const k=i*4;d[k]=1;d[k+1]=4;d[k+2]=7;d[k+3]=soft[i]}fogCtx.putImageData(fogImage,0,0)
 }
 function drawFog(){
   rebuildFog();ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(fogCanvas,0,0,VIEW_W,VIEW_H);ctx.restore()
 }

 const previousDraw=draw;
 draw=function(t){
   /* O mapa quadrado desenhava todos os inimigos antes da máscara. Filtramos o
      array apenas durante o frame: gameplay continua intacto, render respeita visão. */
   const all=units,visibleIds=new Set(all.filter(u=>u.side===1||vision.isVisibleTo(1,u)).map(u=>u.id));
   units=all.filter(u=>visibleIds.has(u.id));
   try{previousDraw(t)}finally{units=all}
   drawRanges(t);drawFx(t);drawFog()
 };

 window.SL_COMBAT_CLARITY={version:2,legendDuelDamage:LEGEND_DUEL_DAMAGE,get effects(){return fx},health(){return{loaded:true,damageNumbers:true,hitAnimation:true,attackRange:true,fog:true,fogSmooth:true,structureVisionBeyondAttack:!!vision.health?.().structureVisionBeyondAttack,legendDuelDamage:LEGEND_DUEL_DAMAGE,balance:window.SL_LEGENDS_API?.balanceReport?.()||null}}};
})();