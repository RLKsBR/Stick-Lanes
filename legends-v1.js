/* Stick Lanes — primeiras Lendas
   Uma Lenda gratuita entra com a primeira onda de cada exército. */
'use strict';
(function(){
const LEGENDS=[
  {
    id:'nefal',name:'Néfal',title:'O Horizonte Interior',role:'controller',
    hp:760,def:172,atk:138,speed:4.2,range:12,rate:1.55,cost:0,gen:0,
    fantasy:'Mentalista sem rosto que dobra espaço e vontade com gestos mínimos.',
    playstyle:'Controle de linha • alcance • interrupção',
    palette:['#371b62','#9d63ff','#80f4e7','#f0ddff'],
    ability:{name:'Dobra de Vontade',desc:'A cada 7,5s paralisa brevemente o alvo e comprime inimigos próximos.'},
    special:{legend:true,legendKind:'nefal',legendColor:'#9d63ff',stun:{duration:.9,cool:7.5},splash:.16}
  },
  {
    id:'karkinos',name:'Karkinos',title:'O Quebra-Marés',role:'tank',
    hp:1080,def:225,atk:92,speed:3.45,range:2.1,rate:1.42,cost:0,gen:0,
    fantasy:'Caranguejo abissal colossal; carapaça em muralha e uma pinça demolidora assimétrica.',
    playstyle:'Linha de frente • bloqueio • pressão',
    palette:['#173f4b','#2f8e91','#81dfc5','#e5fff4'],
    ability:{name:'Pinça de Maré',desc:'Absorve parte do dano e desacelera tudo que acerta.'},
    special:{legend:true,legendKind:'karkinos',legendColor:'#81dfc5',block:.22,slow:true,splash:.10}
  },
  {
    id:'vesper',name:'Vesper',title:'A Serpente do Eclipse',role:'skirmisher',
    hp:690,def:142,atk:172,speed:5.35,range:11,rate:1.68,cost:0,gen:0,
    fantasy:'Serpente astral segmentada que voa rente ao campo e dispara lâminas de eclipse.',
    playstyle:'Mobilidade • flanco • dano em área',
    palette:['#17182f','#4451a8','#ffb64d','#fff0bd'],
    ability:{name:'Órbita Rasante',desc:'É difícil de atingir e seus disparos ferem inimigos próximos.'},
    special:{legend:true,legendKind:'vesper',legendColor:'#ffb64d',dodge:.16,splash:.28,armorPierce:.12}
  }
];

function get(id){return LEGENDS.find(legend=>legend.id===id)||LEGENDS[0]}
window.SL_LEGENDS=LEGENDS;
window.SL_LEGENDS_API={get};
})();
