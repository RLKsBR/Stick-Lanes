/* Stick Lanes — frontline MOBA v1
   Corrige avanço/recuo e impede salto de estruturas vivas. */
(function(){
'use strict';

function mostAdvancedFriendlyTower(side,lane){
  const a=aliveTowers(side,lane);
  if(!a.length)return null;
  return a.reduce((best,s)=>!best||(side===1?s.x>best.x:s.x<best.x)?s:best,null);
}
function holdFrontX(side,lane){
  const tower=mostAdvancedFriendlyTower(side,lane);
  return tower?tower.x+side*190:BASE_X[side]+side*220;
}
function waveActuallyAhead(u,front,hold){
  if(!front||front.dead)return false;
  return u.side===1?front.x>hold+35:front.x<hold-35;
}

/* A primeira estrutura inimiga viva da lane é sempre o bloqueio autoritativo.
   A posição atual da tropa jamais permite pular uma torre ainda viva. */
frontEnemyStructure=function(side,lane){
  const a=aliveTowers(-side,lane);
  if(!a.length)return{kind:'base',side:-side,lane,x:BASE_X[-side]};
  return a.reduce((front,s)=>!front||(side===1?s.x<front.x:s.x>front.x)?s:front,null);
};
nextStructure=function(u){
  const front=frontEnemyStructure(u.side,u.lane);
  if(u.minion)u.objectiveId=front.kind==='tower'?front.id:null;
  return front;
};

/* Nunca perseguir um alvo através da estrutura inimiga que ainda bloqueia a lane. */
chaseAllowed=function(u,v,s){
  if(!v)return false;
  if(s.kind==='base')return true;
  const margin=4*PX;
  return u.side===1?v.x<=s.x+margin:v.x>=s.x-margin;
};
orderedEnemy=function(u,range,order,s){
  if(order==='advance'){
    const minion=enemyCandidates(u,range,v=>v.minion&&chaseAllowed(u,v,s))[0];
    if(minion)return minion;
    return enemyCandidates(u,range,v=>chaseAllowed(u,v,s))[0];
  }
  if(order==='attack'){
    const troop=enemyCandidates(u,range,v=>!v.minion&&chaseAllowed(u,v,s))[0];
    if(troop)return troop;
    return enemyCandidates(u,range,v=>chaseAllowed(u,v,s))[0];
  }
  return enemyCandidates(u,range)[0];
};

/* AVANÇAR:
   - sem uma onda realmente à frente: segura na frente da torre aliada mais avançada;
   - com onda à frente: acompanha a onda;
   - estrutura inimiga viva funciona como portão e não pode ser atravessada. */
escortX=function(u){
  const hold=holdFrontX(u.side,u.lane);
  const wave=waveFrontIndex[u.side][u.lane];
  if(!waveActuallyAhead(u,wave,hold))return hold;

  const gap=(u.role==='ranged'||u.role==='support'||u.role==='controller'||u.role==='siege')?190:75;
  let dest=wave.x-u.side*gap;
  const blocker=frontEnemyStructure(u.side,u.lane);
  if(blocker.kind==='tower'){
    const gate=blocker.x-u.side*22;
    dest=u.side===1?Math.min(dest,gate):Math.max(dest,gate);
  }
  /* nunca usar a onda para puxar a tropa para trás do ponto de contenção */
  return u.side===1?Math.max(dest,hold):Math.min(dest,hold);
};

/* Também torna a posição defensiva independente da torre mais próxima: cada ordem usa
   a torre aliada mais avançada como referência de frente. */
defX=function(u){
  const o=orders[u.side][u.lane];
  if(o==='base')return BASE_X[u.side]+u.side*220;
  const tower=mostAdvancedFriendlyTower(u.side,u.lane);
  if(!tower)return BASE_X[u.side]+u.side*220;
  if(o==='behind')return tower.x-u.side*190;
  if(o==='ahead')return tower.x+u.side*190;
  return tower.x-u.side*45;
};

window.SL_FRONTLINE_MOBA_V1={mostAdvancedFriendlyTower,holdFrontX,waveActuallyAhead};
})();
