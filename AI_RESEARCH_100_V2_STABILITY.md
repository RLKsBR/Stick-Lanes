# Stick Lanes — Pesquisa 100 pontos v2: estabilidade, navegação e anti-oscilação

Motivação: em teste real, o time Laranja perdeu em ~8 minutos e a Lenda ficou no meio do Top alternando entre avançar e voltar. A segunda pesquisa foi refeita com foco específico em **movement thrashing, cyclic repetition, deadlock, single-writer ownership, arrival semantics, path following e replanejamento estável**.

## Fontes-base

- Craig Reynolds — Steering Behaviors for Autonomous Characters / Arrival / Path Following: https://www.red3d.com/cwr/steer/gdc99/
- Epic Games — Behavior Tree Move To / Acceptable Radius / Ignore Restart Self: https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-tasks
- Epic Games — Move To Location: https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/AI/Navigation/MovetoLocation
- Unity — NavMeshAgent (`remainingDistance`, `stoppingDistance`, `pathStatus`, `autoRepath`): https://docs.unity3d.com/ScriptReference/AI.NavMeshAgent.html
- Amit Patel / Red Blob — A* Pages, movement vs pathfinding: https://theory.stanford.edu/~amitp/GameProgramming/
- Amit Patel / Red Blob — Moving obstacles, local repair and selective replanning: https://theory.stanford.edu/~amitp/GameProgramming/MovingObstacles.html
- Amit Patel / Red Blob — Heuristics and deterministic tie-breaking: https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
- David Silver — Cooperative Pathfinding (AIIDE 2005), incluindo deadlock e cyclic repetition: https://ojs.aaai.org/index.php/AIIDE/article/view/18726
- Wagner, Veerapaneni, Likhachev — Minimizing Coordination in Multi-Agent Path Finding with Dynamic Execution (AIIDE 2022): https://ojs.aaai.org/index.php/AIIDE/article/view/21948
- Wu et al. — Cooperative-ORCA*: proactive deadlock avoidance (2026): https://arxiv.org/abs/2606.22757
- Jain et al. — Graph Attention-Guided Search for Dense Multi-Agent Pathfinding (AAAI 2026), com deadlock detection: https://ojs.aaai.org/index.php/AAAI/article/view/40192

## Diagnóstico encontrado no código

A pesquisa levou a uma auditoria da cadeia real de execução e revelou três defeitos concretos:

1. `live-strategy-ai-v1.js` e `macro-rotation-ai-v1.js` ainda alteravam diretamente `tacticalWorld`, `tacticalDestination`, lane e alvos da Lenda antes do Research Director terminar o tick. Portanto havia **mais de um escritor físico**, apesar da intenção arquitetural de autoridade única.
2. `legend-authority-lock-v1.js` v1 considerava um destino correto quando ele apontava para a **mesma lane**, mesmo que outro controlador tivesse trocado o ponto da lane de, por exemplo, posição defensiva para ofensiva. Isso permitia exatamente o ciclo “vai → volta → vai → volta” no Top.
3. Os mesmos módulos legados ainda reescreviam `orders[side]` antes/depois da decisão nova. Isso fazia o time alternar postura de lane mesmo quando o Research Director mantinha o plano. A quarentena v2 agora preserva economia, compra e aprendizado legados, mas devolve ao Research Director a propriedade exclusiva das ordens de equipe.

## 100 pontos pesquisados e aplicados

### A. Propriedade da decisão e single-writer
1. Um único subsistema deve possuir o estado físico de movimento da Lenda.
2. Planejadores legados podem sugerir, mas não escrever destino físico.
3. Economia e compras devem permanecer independentes do controlador de movimento.
4. Ordens de tropas e ordens de Lenda devem ter canais distintos.
5. Toda ordem física deve carregar identificação de autoria.
6. Destino sem autoria válida deve ser tratado como hijack.
7. Igualdade de lane não implica igualdade de objetivo.
8. Igualdade de tipo não implica igualdade de ponto.
9. Um controlador posterior não deve confiar em estado deixado por outro controlador.
10. O executor deve validar a intenção antes de cada restauração.

### B. Compromisso e replanejamento
11. Planos não emergenciais precisam de tempo mínimo de compromisso.
12. Não replanejar só porque um score oscilou pouco.
13. Troca de plano deve exigir margem suficiente.
14. Emergência de base pode interromper compromisso.
15. Retirada crítica pode interromper compromisso.
16. Janela clara de finalizar a base pode interromper compromisso.
17. Um plano que está progredindo recebe proteção contra troca.
18. Um plano sem progresso pode ser liberado antes.
19. Troca de lane durante rotação precisa de barreira extra.
20. Planos de objetivo neutro precisam de compromisso maior que micro comum.

### C. Semântica de chegada
21. “Cheguei na lane” não significa “cheguei no objetivo”.
22. Um Move To deve ter raio/critério explícito de chegada.
23. Após rotação, o agente deve normalizar de volta para o sistema da lane.
24. Destino ofensivo deve resultar em ordem ofensiva coerente.
25. Destino defensivo deve resultar em ordem defensiva coerente.
26. Guard deve terminar em `behind`, não em hold arbitrário.
27. Finish deve terminar em `attack`.
28. Base/retreat deve terminar em `base`.
29. Push normal deve terminar em `advance` ou `attack` conforme intenção.
30. Estado manual antigo deve ser limpo ao concluir rotação de IA.

### D. Progresso e stuck detection
31. Cada plano precisa de métrica de progresso própria.
32. Métrica de progresso não pode vazar do plano anterior.
33. Trocar de plano deve reiniciar baseline de progresso.
34. Defesa mede redução de ameaça.
35. Push mede avanço/pressão na lane.
36. Finish mede HP restante da base inimiga.
37. Objetivo mede captura/posse.
38. Hunt mede deterioração do alvo, quando visível.
39. Movimento físico precisa de watchdog de deslocamento.
40. Watchdog deve distinguir detour válido de ausência real de movimento.

### E. Anti-oscilação e anti-reversal
41. Detectar mudanças repetidas entre lanes.
42. Bloquear reversão durante uma rotação que ainda está em execução.
43. Não aceitar destino alternativo na mesma lane sem assinatura correta.
44. Não reiniciar tarefa que já está executando corretamente.
45. Evitar cancel/restart frequente de Move To.
46. Preferir continuidade quando dois planos têm valor parecido.
47. Separar urgência de volatilidade de score.
48. Reversão precisa de motivo observável, não apenas ruído.
49. Ping-pong deve entrar na telemetria.
50. Hijacks rejeitados devem entrar na telemetria.

### F. Pathfinding, steering e paredes
51. Pathfinding decide rota; steering executa o trecho local.
52. Obstáculo móvel/local não deve forçar replanejamento macro completo.
53. Parede deve produzir waypoint, não teleporte nem atravessamento.
54. Replanejamento local é preferível a descartar a rota inteira.
55. Waypoint deve ser recalculado quando o entorno relevante muda.
56. Arrival evita ultrapassar objetivo e retornar.
57. Stop distance deve ser maior que zero.
58. O ponto final deve ser projetado para espaço alcançável.
59. Rotas equivalentes devem usar desempate determinístico.
60. Evitar jitter aleatório por frame na direção.

### G. Multiagente, congestionamento e deadlock
61. Agentes dinâmicos podem gerar ciclos mesmo com paths válidos isoladamente.
62. Deadlock precisa de detecção explícita.
63. Cyclic repetition é diferente de simples “stuck”.
64. Coordenação deve minimizar conflito sem sincronizar todos rigidamente.
65. Pequeno atraso local é melhor que inverter toda a rota.
66. Rotas precisam tolerar variações de velocidade.
67. Plano rígido de tempo falha quando execução atrasa.
68. Unidades próximas podem ser tratadas via steering/local avoidance.
69. Congestionamento não deve mudar objetivo estratégico automaticamente.
70. Recuperação de deadlock deve preservar objetivo quando possível.

### H. Estabilidade macro de equipe
71. Strong side não deve mudar a cada amostra.
72. Weak side não deve consumir a Lenda por ruído pequeno.
73. Defesa de base tem prioridade sobre otimização marginal de lane.
74. Defesa de torre só vale se a estrutura for salvável.
75. Uma rotação custa tempo; esse custo entra na troca de plano.
76. Cross-map exige compromisso suficiente para compensar viagem.
77. Objetivo neutro não pode puxar Lenda de uma defesa crítica.
78. Push com vantagem deve converter antes de abandonar a lane.
79. Se o objetivo atual está funcionando, preferir continuidade.
80. Macro e micro podem operar em frequências diferentes sem disputar o mesmo estado.

### I. Observabilidade e regressão
81. Registrar plano proposto e plano comprometido separadamente.
82. Registrar switches aceitos.
83. Registrar switches rejeitados.
84. Registrar reversões bloqueadas.
85. Registrar hijacks legados bloqueados.
86. Registrar restaurações da autoridade.
87. Registrar stuck recoveries.
88. Expor health API para teste automatizado.
89. Teste deve reproduzir hijack na mesma lane.
90. Teste deve verificar autoria do destino restaurado.

### J. Performance e fail-safe
91. Controle de estabilidade deve ser O(1) por Lenda.
92. Não rodar A* global a cada frame.
93. Não serializar estado inteiro do jogo por tick.
94. Reutilizar plano comprometido enquanto válido.
95. Replanejamento macro continua em frequência baixa.
96. Watchdog físico usa poucas amostras.
97. Falha de um módulo legado não pode quebrar economia.
98. Falha de destino deve cair para ordem de lane segura.
99. Emergência deve continuar capaz de preemptar locks.
100. Correção deve ser validada em Chromium real e modo acelerado.

## Aplicação no código

- `legacy-legend-quarantine-v2.js`: coloca `live-strategy` e `macro-rotation` em quarentena estratégica. Compras, economia e aprendizado legados continuam funcionando; mutações físicas da Lenda **e reescritas legadas de `orders[side]`** são revertidas antes de o Research Director assumir o tick.
- `ai-plan-stability-v2.js`: compromisso mínimo, margem de troca, progresso por plano, bloqueio de reversão durante rotação e restauração das ordens do plano comprometido.
- `legend-authority-lock-v1.js` v2: destino precisa ser `slAuthority`; mesma lane com ponto diferente não passa mais na validação; chegada é semântica; watchdog recupera ausência real de movimento.
- `vision-walls-v1.js`: mantém waypoint local e desvio físico de paredes.
- `tests/ai-stability.mjs`: regressão específica para o bug de hijack na mesma lane, simulação acelerada longa e telemetria da nova pilha.

A meta desta versão não é fazer a IA “pensar mais vezes”; é fazer cada decisão válida **convergir e terminar**, em vez de múltiplos cérebros reescreverem o destino.