# Arquitetura operacional do Stick Lanes

Este documento registra a autoridade real das camadas atuais. Ele não propõe uma reescrita: serve para impedir que uma alteração válida seja sobrescrita por um módulo carregado depois.

## Entradas

| Entrada | Finalidade | Arquivo autoritativo |
|---|---|---|
| `index.html` | Player versus IA e simulação assistida renderizada | `game-v3-core.js` |
| `balance.html` | Simulações headless em lote | última camada que redefine cada função |

## Ordem do jogo renderizado

### Consolidação de 10/09/2026

A ordem efetiva está em `index.html` e é validada por `npm run check`:
mapa → targeting → buffs → visão/paredes → jungle definitiva → A* → percepção
por lado → autoridade única → diagnóstico → draft. Pathfinder e autoridade
não são mais injetados dinamicamente. Os quatro módulos de research/quarantine/
bridge/stability substituídos foram retirados do carregamento, mas permanecem
no repositório como histórico. `live-strategy-ai-v1.js` e macro ainda fornecem
compatibilidade; a cadeia antiga de `runSideAI` não é chamada pela autoridade.

`SL_AI_SIDE_VISION.capture(side)` calcula força e contagem de ondas a partir da
mesma visão do time, reutilizando fontes por fotografia. Não redefine funções
globais durante a decisão. Estruturas e vida das bases continuam sendo estado
público do modelo atual; isso não implementa memória estratégica completa.

`SL_JUNGLE_PATHFINDING` é o executor de travessias e retorno automático. Falhas
de A* retornam rota vazia, com nova tentativa limitada; pontos intermediários
são atingidos sem cortar quinas. A autoridade acompanha distância restante e
invalida o caminho após 3,2 segundos sem progresso, descontando stun. Clique
em alvo que morre/some da visão encerra a perseguição e retorna à lane.

`BASE_HP=15000` usa a mesma unidade no combate e no HUD. O antigo divisor 2,5
de dano foi removido, preservando a durabilidade efetiva. Torres e torretas
mantêm seus multiplicadores. O loop usa passos fixos de 40 ms em todas as
velocidades; tempo visual/HUD continua em relógio real. Isso não constitui
replay determinístico: RNG, entrada e configurações ainda não são gravados.

`SL_AI_FUNCTIONAL_CONTROLLER.trace()` entrega até 240 decisões/recuperações;
`inspect(side)` entrega percepção filtrada. O painel de diagnóstico aparece
na simulação assistida e exporta plano, pontuações, motivos, navegação e saúde.
Reset limpa o histórico e a memória de visão para evitar IDs de outra partida.

`boot-health.js` registra falhas de carga e verifica APIs essenciais antes de
liberar o menu. `npm run assets` grava hashes de conteúdo normalizados em LF
nos recursos JS/CSS das duas páginas; `npm run check` verifica hashes, sintaxe,
duplicatas e ordem. Não existe bundler ainda. Novos módulos devem entrar
explicitamente no HTML, sem novos carregadores por polling.

Os detalhes históricos abaixo descrevem responsabilidades anteriores; para a
autoridade atual, vale esta seção e a ordem validada de `index.html`.

1. `factions-v3.js` cria facções, tropas, minions e regras de combate.
2. `minion-speed-v1.js` uniformiza a velocidade dos minions em 5,4.
3. `balance-patch-v3-3.js` aplica o balanceamento numérico vigente às tropas.
4. `legends-v1.js` registra as três Lendas sem inseri-las no catálogo de tropas das facções.
5. `game-v3-core.js` executa economia, ondas, pré-estratégia de spawn, ordens, IA, combate e estruturas.
6. `game-v3-visuals.js` desenha mapa, unidades, efeitos e interface Canvas.
7. `extras.js` salva composição, proporção de spawn, Lenda e foco inicial no navegador.
8. `visual-lote-01.js` a `visual-lote-05.js` especializam as 26 facções; `visual-legends-v1.js` deve vir depois deles para manter os rigs exclusivos das Lendas.
9. `moba-square-v2.js` instala a projeção/câmera definitiva do mapa atual; `tactical-targeting-v1.js` adiciona alvo contextual, travessia da Lenda e atalhos de câmera.
10. `buff-regions-v1.js` depende do mapa e do targeting: controla as quatro metades dos dois territórios, captura contínua, recarga, Cegueira e decisão de objetivo da IA.
11. `legend-powers-v1.js` deve vir depois do sistema de mapa: adiciona progressão, tabela de procs, dano limitado por classe e efeitos espaciais de Néfal.

## Ordem do laboratório

| Ordem | Módulo | Responsabilidade |
|---:|---|---|
| 1 | `factions-v3.js` | dados-base |
| 2 | `minion-speed-v1.js` | velocidade uniforme dos minions |
| 3 | `balance-patch-v3-3.js` | ajuste numérico das tropas e versão-base do ruleset |
| 4 | `balance-v3.js` | motor agregado, métricas, persistência e UI base |
| 5 | `balance-map-v4.js` | pressão lateral e defesa reforçada do centro |
| 6 | `balance-minion-wave-v2.js` | onda 1/2/3 por lane |
| 7 | `balance-turrets-v1.js` | seis torretas auxiliares por lane no modelo headless |
| 8 | `balance-strategy-v1.js` | compra, escolha de lane, ordens adaptativas, duração aberta e detector de impasse |
| 9 | `balance-import.js` | entrada segura de bancos JSON |

Funções como `newSide`, `spawnWave`, `towerRetaliation`, `simMatch`, `run` e os histogramas são deliberadamente substituídas pelas camadas posteriores. Ler somente `balance-v3.js` não descreve o simulador em produção.

## Fonte de verdade por assunto

| Assunto | Fonte |
|---|---|
| Facções, tropas, minions, passivas | `factions-v3.js` |
| Ajuste numérico atual de tropas | `balance-patch-v3-3.js` depois de `factions-v3.js` |
| Formação e velocidade de minions | `balance-minion-wave-v2.js` e `minion-speed-v1.js` |
| Mapa aproximado do laboratório | `balance-map-v4.js` |
| Torretas auxiliares no laboratório | `balance-turrets-v1.js` |
| Escolha adaptativa no laboratório | `balance-strategy-v1.js` |
| Ordens e combate do jogo visível | `game-v3-core.js` |
| Lendas e pré-estratégia renderizada | `legends-v1.js` e `game-v3-core.js` |
| Rigs procedurais das Lendas | `visual-legends-v1.js` |
| Progressão e habilidades das Lendas | `legend-powers-v1.js` |
| Captura e Cegueira dos territórios | `buff-regions-v1.js` |
| Renderização provisória | `game-v3-visuals.js` |
| Planos visuais finais | pasta Stick Lanes no Google Drive |

## Compatibilidade de resultados

O `ruleset` identifica toda combinação de balanceamento, mapa, onda, torretas e estratégia. Resultados só podem ser somados ou substituir o banco ativo quando o identificador é idêntico.

O laboratório estratégico usa semente explícita e calendário `round-robin-v1`. A semente é armazenada no banco e no histórico; repetir ruleset, parâmetros e semente deve reproduzir a bateria.

Ao mudar uma regra que afeta resultados:

1. altere a versão da camada responsável;
2. deixe o navegador arquivar o banco anterior;
3. execute uma bateria de fumaça;
4. só então gere uma bateria grande para balanceamento.

## Divergências conhecidas

- A IA headless usa as cinco ordens do jogador, mas seus efeitos são agregados por lane; o jogo renderizado resolve posição, perseguição e alvo unidade por unidade.
- A IA do jogo renderizado usa as mesmas ordens, mas sua política ainda é heurística e separada do aprendizado headless.
- O mapa Canvas e os bonecos procedurais são ferramentas de protótipo, não o visual final 2,5D.

Essas lacunas devem ser fechadas incrementalmente. Não unifique os dois motores por uma grande reescrita enquanto gameplay, mapa e pipeline visual ainda estão em consolidação.
