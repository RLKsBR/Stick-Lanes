/* Stick Lanes — bridge Research100 -> árbitro da Lenda */
'use strict';
(function(){
const arb=window.SL_LEGEND_INTENT_ARBITER,dir=window.SL_AI_RESEARCH_DIRECTOR;
if(!arb||!dir||arb._research100Bridge)return;
const fallbackGet=typeof arb.get==='function'?arb.get.bind(arb):()=>null;
arb.get=function(side){return dir.getLegendIntent?.(side)||fallbackGet(side)};
arb._research100Bridge=true;
window.SL_AI_RESEARCH_BRIDGE={version:1,health:()=>({loaded:true,researchCount:dir.researchCount||0})};
})();