/* Stick Lanes — primeiras Lendas
   Uma Lenda gratuita entra com a primeira onda de cada exército. */
'use strict';
(function(){
const LEGENDS=[
  {
    id:'nefal',name:'Néfal',title:'O Horizonte Interior',role:'controller',
    hp:1520,def:268,atk:174,speed:4.35,range:13,rate:1.38,cost:0,gen:0,
    fantasy:'Alienígena psíquico alto e impossível de ler; um corpo espectral que dobra espaço e vontade.',
    playstyle:'Poder mágico • rajada dupla • anomalias de 40%',
    palette:['#100c24','#7551ba','#6fffe0','#f1d8ff','#e48dff'],
    ability:{name:'Convergência do Horizonte',desc:'Dispara duas lanças psíquicas — nunca mais de três — e limita o dano por classe de alvo.'},
    progression:{maxLevel:12,hpPerLevel:.07,atkPerLevel:.05,defPerLevel:.03,baseSkillDamage:150,skillPerLevel:15,skillCooldown:5.8,thirdBoltBase:.18,thirdBoltPerLevel:.025},
    special:{legend:true,legendKind:'nefal',legendColor:'#b475ff',procChance:.40,lifestealProc:.05,stunProc:.07}
  },
  {
    id:'karkinos',name:'Karkinos',title:'O Quebra-Marés',role:'tank',
    hp:2180,def:348,atk:118,speed:3.45,range:2.1,rate:1.42,cost:0,gen:0,
    fantasy:'Caranguejo abissal colossal; carapaça em muralha e uma pinça demolidora assimétrica.',
    playstyle:'Linha de frente • bloqueio • pressão',
    palette:['#173f4b','#2f8e91','#81dfc5','#e5fff4'],
    ability:{name:'Pinça de Maré',desc:'Absorve parte do dano e desacelera tudo que acerta.'},
    special:{legend:true,legendKind:'karkinos',legendColor:'#81dfc5',block:.22,slow:true,splash:.10}
  },
  {
    id:'vesper',name:'Vesper',title:'A Serpente do Eclipse',role:'skirmisher',
    hp:1290,def:218,atk:224,speed:5.35,range:11,rate:1.62,cost:0,gen:0,
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
