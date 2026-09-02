/* Stick Lanes — layout mobile + tela cheia opcional, sem interferir no boot */
(function(){
'use strict';

const root=document.documentElement;
const gameUI=document.getElementById('gameUI');
let fullscreenButton=null;

function isMatchActive(){return !!gameUI&&!gameUI.hidden}

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
    const supported=typeof document.documentElement.requestFullscreen==='function'&&typeof document.exitFullscreen==='function';
    button.disabled=!supported;
    button.title=supported?'Tela cheia opcional — a orientação do aparelho não será forçada.':'Tela cheia não é suportada neste navegador.';
  }

  if(active)requestAnimationFrame(()=>window.scrollTo(0,0));
}

async function toggleFullscreen(){
  try{
    if(document.fullscreenElement){
      await document.exitFullscreen();
    }else if(typeof document.documentElement.requestFullscreen==='function'){
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
    }
  }catch(err){
    console.warn('Stick Lanes: não foi possível alternar tela cheia.',err);
  }finally{
    syncLayout();
  }
}

/*
 * Não intercepta launchBattle, não pede fullscreen sozinho e não trava orientação.
 * O layout acompanha somente a visibilidade real do gameUI.
 */
if(gameUI&&typeof MutationObserver==='function'){
  new MutationObserver(syncLayout).observe(gameUI,{attributes:true,attributeFilter:['hidden']});
}
window.addEventListener('resize',syncLayout,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(syncLayout,80),{passive:true});
document.addEventListener('fullscreenchange',syncLayout);

syncLayout();
})();
