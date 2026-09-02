/* Stick Lanes — alcance de estruturas por ownership */
(function(){
'use strict';
drawTowerRange=function(s){
  if(!showTowerRanges||s.lane!==selectedLane)return;
  const x=s.x,y=laneYAt(s.lane,s.x),r=s.range*PX,tm=teamTheme(s.side);
  ctx.save();ctx.globalAlpha=.10;ctx.fillStyle=tm.primary;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.52;ctx.strokeStyle=tm.primary;ctx.lineWidth=3;ctx.setLineDash(tm.shape==='sharp'?[10,8]:[20,13]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.94;ctx.fillStyle=tm.primary;ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.fillText(s.range+'u',x,y-r+22);ctx.restore();
};
})();
