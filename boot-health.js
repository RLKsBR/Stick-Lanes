'use strict';
(function(){
 const errors=[];
 window.addEventListener('error',event=>{
   const source=event.target?.src||event.filename||'';
   errors.push({message:event.message||'Falha ao carregar recurso',source});
 },true);
 window.SL_BOOT={errors,check(){
   const required=['SL_MOBA_SQUARE_V2','SL_TACTICAL_TARGETING','SL_BUFF_SYSTEM','SL_VISION','SL_JUNGLE_ACCESS','SL_JUNGLE_PATHFINDING','SL_AI_SIDE_VISION','SL_AI_FUNCTIONAL_CONTROLLER','SL_ASSISTED_DRAFT','SL_AI_DIAGNOSTICS'];
   const missing=required.filter(name=>!window[name]);
   return{ready:!missing.length&&!errors.length,missing,errors:errors.slice()};
 }};
})();
