/* Stick Lanes — layout mobile + tela cheia opcional */
(function(){
'use strict';

const root=document.documentElement;
const gameSection=()=>document.getElementById('gameUI');
let fullscreenButton=null;

function isMatchActive(){
  const ui=gameSection();
  return !!ui&&!ui.hidden;
}

function ensureFullscreenButton(){
  if(fullscreenButton&&fullscreenButton.isConnected)return fullscreenButton;
  const actions=document.querySelector('#gameUI .hudActions');
  if(!actions)return null;
  const button=document.createElement('button');
  button.id='fullscreenToggle';
  button.className='secondary fullscreenToggle';
  button.type='button';
  button.setAttribute('aria-label','Alternar tela cheia');
  button.addEventListener('click',toggleFullscreen);
  actions.appendChild(button);
  fullscreenButton=button;
  return button;
}

function syncLayout(){
  const active=isMatchActive();
  root.classList.toggle('sl-match-active',active);
  root.classList.toggle('sl-native-fullscreen',!!document.fullscreenElement);

  const button=ensureFullscreenButton();
  if(button){
    const fullscreen=!!document.fullscreenElement;
    button.hidden=!active;
    button.textContent=fullscreen?'⛶ Sair da tela cheia':'⛶ Tela cheia';
    button.setAttribute('aria-pressed',fullscreen?'true':'false');
    const supported=!!(document.documentElement.requestFullscreen&&document.exitFullscreen);
    button.disabled=!supported;
    button.title=supported?'Tela cheia opcional — a orientação do aparelho não será forçada.':'Tela cheia não é suportada neste navegador.';
  }

  if(active)requestAnimationFrame(()=>window.scrollTo(0,0));
}

async function toggleFullscreen(){
  try{
    if(document.fullscreenElement){
      await document.exitFullscreen();
    }else if(document.documentElement.requestFullscreen){
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
    }
  }catch(err){
    console.warn('Stick Lanes: não foi possível alternar tela cheia.',err);
  }finally{
    syncLayout();
  }
}

/*
 * Importante para Android:
 * launchBattle NÃO solicita fullscreen e NÃO trava a orientação.
 * A partida abre na orientação atual do aparelho; tela cheia é sempre opt-in.
 */
const oldLaunch=launchBattle;
launchBattle=function(...args){
  const result=oldLaunch.apply(this,args);
  syncLayout();
  return result;
};

window.addEventListener('resize',syncLayout,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(syncLayout,80),{passive:true});
document.addEventListener('fullscreenchange',syncLayout);

syncLayout();
})();
