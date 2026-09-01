# Stick Lanes — Frontline v3

Protótipo de estratégia em tempo real para navegador. O HTML/Canvas é o laboratório rápido de gameplay, mapa, IA, balanceamento e direção visual; a versão final está planejada para Java/libGDX.

## Jogar

- Jogo: https://rlksbr.github.io/Stick-Lanes/
- Laboratório de balanceamento: https://rlksbr.github.io/Stick-Lanes/balance.html

O GitHub Pages publica a branch `main` a partir da raiz. A atualização pode levar alguns minutos depois de um merge.

O menu principal possui somente:

- **Player versus IA**
- **Simulação assistida** — robô versus robô renderizado, com 1×, 3×, 10× e 20×
- **Simulação** — laboratório headless
- **Créditos: Ruan Lukas**

## Estado atual do jogo renderizado

- Mundo horizontal de **22.500 unidades**.
- **3 lanes**, cada uma com **3 sub-lanes**.
- **4 torres principais por lane** e base com **6.000 de vida**.
- Alcance atual das torres, já na escala ampliada: avançada 30, central 30, traseira 32 e fortaleza 36.
- Cada exército combina **2 facções** e usa **8 tropas compráveis**.
- Economia: **+30 de ouro a cada 2 segundos**.
- Ordens por lane: **Base**, **Atrás da torre**, **À frente da torre**, **Avançar** e **Atacar**.
- A IA usa ouro, cooldowns e unidades válidas como o jogador; não recebe bônus invisíveis.

**Avançar** acompanha a onda aliada, prefere limpar minions e ataca estruturas quando existe suporte. **Atacar** não exige minions, prefere tropas inimigas e não persegue um alvo para além da estrutura inimiga atual.

## Minions

Cada onda cria, por lane:

- 1 tanque;
- 2 lutadores;
- 3 atiradores.

São **18 minions por lado** a cada onda. Todos usam velocidade 5,4. O counter entre facções concede +20% contra a facção indicada no catálogo.

Minions só entregam ouro quando são abatidos por uma tropa comprável ou lenda; mortes causadas por minions ou torres não entregam a recompensa. Uma torre sem minions inimigos próximos fica fortificada e recebe apenas 64,5% do dano normal. Minions causam 35% do dano normal a estruturas.

## Facções

`factions-v3.js` é a fonte de verdade para nome, passiva, três minions, tropas e funções de cada unidade. A Frontline v3 possui 26 facções; não renomeie nem invente tropas em código ou plano visual sem atualizar essa referência deliberadamente.

Os planos visuais completos são mantidos fora do código e devem ser consultados antes de implementar uma facção. Já existem planos para Mentalistas, Alienígenas, Medievais, Robôs, Lobos, Zumbis, Samurais, Artrópodes, Elementais e Demônios.

## Laboratório estratégico

O laboratório executa simulações sem renderização. O padrão atual é **500 partidas** e **80 composições candidatas**.

- Facções podem ser aleatórias ou fixas.
- Cada robô escolhe oito tropas e decide durante a partida quando comprar, quanto ouro reter e qual lane reforçar.
- Os pesos de decisão aprendem durante a bateria; rush, turtle e split push não são presets rígidos.
- A métrica principal de uma unidade considera partidas em que ela realmente entrou em campo.
- O relatório registra vitórias, uso, impacto, dano estrutural, duração, P50, P90, impasses e perfis estratégicos.
- Não existe duração máxima fixa. O relógio de impasse é zerado sempre que qualquer torre ou base perde vida; somente **2 horas simuladas sem dano estrutural** encerram a partida como impasse técnico.
- O laboratório modela duas torretas auxiliares entre cada par de torres principais. Essa formação ainda não foi portada para o jogo renderizado.

O banco acumulado usa `localStorage` e pode ser exportado em JSON. A importação só substitui o banco ativo quando o `ruleset` é exatamente o mesmo. Arquivos de regras antigas são arquivados separadamente para impedir que resultados incomparáveis contaminem o balanceamento atual.

O JSON `frontline-v3.2` produzido antes das camadas de mapa, torretas e estratégia serve como histórico, não como base para ajustar diretamente o `ruleset` atual.

## Arquitetura

Consulte [`ARCHITECTURE.md`](ARCHITECTURE.md) antes de alterar ordem de scripts, simulação ou fontes de dados. As camadas posteriores substituem funções do motor base de forma deliberada; a ordem em `balance.html` faz parte do comportamento.

Arquivos principais:

- `index.html`, `game-v3-core.js`, `game-v3-visuals.js` — jogo renderizado.
- `factions-v3.js`, `balance-patch-v3-3.js`, `minion-speed-v1.js` — dados e ajustes compartilhados.
- `balance.html`, `balance-v3.js` — motor e interface base do laboratório.
- `balance-map-v4.js`, `balance-minion-wave-v2.js`, `balance-turrets-v1.js`, `balance-strategy-v1.js` — camadas autoritativas do simulador atual.
- `balance-import.js` — validação, importação e isolamento de bancos incompatíveis.

## Status

Protótipo ativo. O visual procedural ainda é provisório. Os próximos passos são portar as torretas auxiliares para o jogo renderizado, levar as ordens táticas completas ao simulador headless e substituir representações genéricas pelo pipeline visual 2,5D planejado para cada facção.
