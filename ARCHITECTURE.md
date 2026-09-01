# Arquitetura operacional do Stick Lanes

Este documento registra a autoridade real das camadas atuais. Ele não propõe uma reescrita: serve para impedir que uma alteração válida seja sobrescrita por um módulo carregado depois.

## Entradas

| Entrada | Finalidade | Arquivo autoritativo |
|---|---|---|
| `index.html` | Player versus IA e simulação assistida renderizada | `game-v3-core.js` |
| `balance.html` | Simulações headless em lote | última camada que redefine cada função |

## Ordem do jogo renderizado

1. `factions-v3.js` cria facções, tropas, minions e regras de combate.
2. `minion-speed-v1.js` uniformiza a velocidade dos minions em 5,4.
3. `balance-patch-v3-3.js` aplica o balanceamento numérico vigente às tropas.
4. `game-v3-core.js` executa economia, ondas, ordens, IA, combate e estruturas.
5. `game-v3-visuals.js` desenha mapa, unidades, efeitos e interface Canvas.
6. `extras.js` cuida das composições salvas no navegador.

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
