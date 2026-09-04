# Stick Lanes — Pesquisa de 100 pontos para IA

Este documento registra os 100 pontos pesquisados antes da implementação do `ai-research-director-v1.js`. Os itens não são 100 hacks isolados: foram consolidados em um único pipeline de percepção → blackboard → utility/lookahead → plano estável → executor único, para evitar conflito entre subsistemas.

## Fontes principais

- Epic — Behavior Trees in Unreal Engine: https://dev.epicgames.com/documentation/unreal-engine/behavior-trees-in-unreal-engine
- Epic — AI Perception: https://dev.epicgames.com/documentation/unreal-engine/ai-perception-in-unreal-engine
- Epic — Environment Query System: https://dev.epicgames.com/documentation/unreal-engine/environment-query-system-quick-start-in-unreal-engine
- GDC — Improving AI Decision Modeling Through Utility Theory (Dill/Mark): https://gdcvault.com/play/1012841/Improving-AI-Decision-Modeling-Through
- Game Developer — Building the AI of F.E.A.R. with GOAP: https://www.gamedeveloper.com/design/building-the-ai-of-f-e-a-r-with-goal-oriented-action-planning
- Red Blob Games — Amit's A* Pages: https://theory.stanford.edu/~amitp/GameProgramming/
- Craig Reynolds — Steering Behaviors for Autonomous Characters: https://www.red3d.com/cwr/steer/gdc99/
- Valve GDC 2009 — Left 4 Dead AI Director / Adaptive Dramatic Pacing: https://steamcdn-a.akamaihd.net/apps/valve/2009/GDC2009_ReplayableCooperativeGameDesign_Left4Dead.pdf
- Game Developer — The Secrets of Enemy AI in Uncharted 2: https://www.gamedeveloper.com/design/the-secrets-of-enemy-ai-in-i-uncharted-2-i-
- Game Developer — The Modular AI Design in MAV: https://www.gamedeveloper.com/programming/the-modular-ai-design-in-mav
- Game Developer — The AI of Total War (Part 5): https://www.gamedeveloper.com/design/war-hammer-the-ai-of-total-war-part-5-
- Game Developer — Behind the AI of Horizon Zero Dawn: https://www.gamedeveloper.com/design/behind-the-ai-of-horizon-zero-dawn-part-1-
- AIIDE — Kiting in RTS Games Using Influence Maps: https://ojs.aaai.org/index.php/AIIDE/article/view/12544
- Artificial Intelligence Review — MCTS review: https://link.springer.com/article/10.1007/s10462-022-10228-y
- Entertainment Computing — Opponent modelling for case-based adaptive game AI: https://www.sciencedirect.com/science/article/pii/S1875952109000044

## 100 pontos e aplicação

### 1. Arquitetura e controle

_Base técnica: Behavior Trees, blackboards, hierarchy, single-authority._

1. **Autoridade única de execução** — aplicado em governança do controlador/telemetria.
2. **Separar percepção decisão execução** — aplicado em governança do controlador/telemetria.
3. **Blackboard compartilhado** — aplicado em governança do controlador/telemetria.
4. **Hierarquia macro/micro** — aplicado em governança do controlador/telemetria.
5. **Ações persistentes Running** — aplicado em governança do controlador/telemetria.
6. **Interrupção só por prioridade** — aplicado em governança do controlador/telemetria.
7. **Fallback seguro** — aplicado em governança do controlador/telemetria.
8. **Estados explícitos** — aplicado em governança do controlador/telemetria.
9. **Controlador de equipe** — aplicado em governança do controlador/telemetria.
10. **Reason codes** — aplicado em governança do controlador/telemetria.

### 2. Utility AI e estabilidade

_Base técnica: utility theory, response curves, hysteresis._

11. **Utility contínua** — aplicado em scoring utility e troca de plano.
12. **Normalização** — aplicado em scoring utility e troca de plano.
13. **Curvas suaves** — aplicado em scoring utility e troca de plano.
14. **Histerese** — aplicado em scoring utility e troca de plano.
15. **Margem de troca** — aplicado em scoring utility e troca de plano.
16. **Tempo de compromisso** — aplicado em scoring utility e troca de plano.
17. **Custo de deslocamento** — aplicado em scoring utility e troca de plano.
18. **Risco e recompensa separados** — aplicado em scoring utility e troca de plano.
19. **Diversidade entre equivalentes** — aplicado em scoring utility e troca de plano.
20. **Aleatoriedade limitada** — aplicado em scoring utility e troca de plano.

### 3. Planejamento e objetivos

_Base técnica: GOAP, short-horizon planning, contingency._

21. **Objetivo terminal de vitória** — aplicado em planejamento/validação.
22. **Condição terminal de derrota** — aplicado em planejamento/validação.
23. **Pré-condições** — aplicado em planejamento/validação.
24. **Validação do plano** — aplicado em planejamento/validação.
25. **Replanejamento por evento** — aplicado em planejamento/validação.
26. **Planos curtos** — aplicado em planejamento/validação.
27. **Custo de oportunidade** — aplicado em planejamento/validação.
28. **Evitar explosão combinatória** — aplicado em planejamento/validação.
29. **Lookahead curto** — aplicado em planejamento/validação.
30. **Plano de contingência** — aplicado em planejamento/validação.

### 4. Percepção e memória

_Base técnica: AI Perception, fog of war, stale memory._

31. **Linha de visão justa** — aplicado em percepção e memória.
32. **Memória de última visão** — aplicado em percepção e memória.
33. **Decaimento de memória** — aplicado em percepção e memória.
34. **Sem posição oculta exata** — aplicado em percepção e memória.
35. **Visível lembrado desconhecido** — aplicado em percepção e memória.
36. **Conhecimento legítimo do time** — aplicado em percepção e memória.
37. **Dano como estímulo** — aplicado em percepção e memória.
38. **Esquecimento** — aplicado em percepção e memória.
39. **Reaquisição** — aplicado em percepção e memória.
40. **Incerteza reduz agressão** — aplicado em percepção e memória.

### 5. Navegação e espaço

_Base técnica: A*, steering, influence maps, walls._

41. **Pathfinding separado de steering** — aplicado em navegação/risco espacial.
42. **Parede bloqueia visão/passagem** — aplicado em navegação/risco espacial.
43. **Waypoint** — aplicado em navegação/risco espacial.
44. **Arrival** — aplicado em navegação/risco espacial.
45. **Leash** — aplicado em navegação/risco espacial.
46. **Custo de rota** — aplicado em navegação/risco espacial.
47. **Exposição de rota** — aplicado em navegação/risco espacial.
48. **Influence safety/danger** — aplicado em navegação/risco espacial.
49. **Chokepoint** — aplicado em navegação/risco espacial.
50. **Invalidar rota** — aplicado em navegação/risco espacial.

### 6. Micro e combate

_Base técnica: kiting, retreat, target/risk evaluation._

51. **Retreat de troca perdida** — aplicado em micro/combate.
52. **Evitar all-in low HP** — aplicado em micro/combate.
53. **Kite** — aplicado em micro/combate.
54. **Peel** — aplicado em micro/combate.
55. **Alvo finalizável** — aplicado em micro/combate.
56. **Evitar dive ruim** — aplicado em micro/combate.
57. **Força local** — aplicado em micro/combate.
58. **Vantagem numérica** — aplicado em micro/combate.
59. **Focus fire** — aplicado em micro/combate.
60. **Posição por função** — aplicado em micro/combate.

### 7. Coordenação de equipe

_Base técnica: team AI, shared blackboard, reserves._

61. **Blackboard de equipe** — aplicado em coordenação de equipe.
62. **Evitar overcommit** — aplicado em coordenação de equipe.
63. **Weak-side resources** — aplicado em coordenação de equipe.
64. **Reforçar defesa salvável** — aplicado em coordenação de equipe.
65. **Abandonar defesa impossível** — aplicado em coordenação de equipe.
66. **Realocar novas tropas** — aplicado em coordenação de equipe.
67. **Ordens não conflitantes** — aplicado em coordenação de equipe.
68. **Reserva estratégica** — aplicado em coordenação de equipe.
69. **Lenda com tropas** — aplicado em coordenação de equipe.
70. **Objetivo vs estrutura** — aplicado em coordenação de equipe.

### 8. Macro de mapa/MOBA

_Base técnica: win condition, structures, tempo, cross-map._

71. **Base inimiga objetivo final** — aplicado em macro/condição de vitória.
72. **Base própria prioridade** — aplicado em macro/condição de vitória.
73. **Base race** — aplicado em macro/condição de vitória.
74. **Valor estrutural por profundidade** — aplicado em macro/condição de vitória.
75. **Converter vantagem** — aplicado em macro/condição de vitória.
76. **Lane priority** — aplicado em macro/condição de vitória.
77. **Tempo de wave** — aplicado em macro/condição de vitória.
78. **Strong side** — aplicado em macro/condição de vitória.
79. **Weak side** — aplicado em macro/condição de vitória.
80. **Cross-map** — aplicado em macro/condição de vitória.

### 9. Adaptação ao oponente

_Base técnica: opponent modelling, controlled online adaptation._

81. **Modelar pressão por lane** — aplicado em opponent model.
82. **Modelar buffs do oponente** — aplicado em opponent model.
83. **Modelar composição** — aplicado em opponent model.
84. **Adaptar defesa** — aplicado em opponent model.
85. **Adaptar alocação** — aplicado em opponent model.
86. **Explorar padrão repetido** — aplicado em opponent model.
87. **Sem adaptação por info oculta** — aplicado em opponent model.
88. **Memória curta+longa** — aplicado em opponent model.
89. **Evitar overfit** — aplicado em opponent model.
90. **Exploration/exploitation** — aplicado em opponent model.

### 10. Robustez, debug e performance

_Base técnica: decision budgets, traces, invariants, tests._

91. **Tick macro/micro separado** — aplicado em robustez/observabilidade.
92. **Budget CPU** — aplicado em robustez/observabilidade.
93. **Decision trace** — aplicado em robustez/observabilidade.
94. **Scores descartados** — aplicado em robustez/observabilidade.
95. **Detectar ping-pong** — aplicado em robustez/observabilidade.
96. **Detectar falta de progresso** — aplicado em robustez/observabilidade.
97. **Sanitizar estados** — aplicado em robustez/observabilidade.
98. **Invariantes de segurança** — aplicado em robustez/observabilidade.
99. **Testar real/acelerado** — aplicado em robustez/observabilidade.
100. **Sem cheats** — aplicado em robustez/observabilidade.

## Implementação

- `ai-research-director-v1.js`: blackboard, percepção justa, memória com decaimento, utility scoring, lookahead curto, modelos de lane/buff/composição, plano estável, anti-ping-pong e trace de decisão.
- `ai-research-arbiter-bridge-v1.js`: faz o árbitro da Lenda consumir a intenção do Research Director.
- `legend-authority-lock-v1.js`: executor físico único da Lenda; impede subsistemas antigos de sequestrar o movimento.
- `vision-walls-v1.js`: linha de visão e paredes físicas, usadas pelo diretor para não obter informação privilegiada.