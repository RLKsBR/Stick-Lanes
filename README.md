# Stick Lanes — Frontline v3

Protótipo de estratégia em tempo real para navegador, com exércitos formados por duas facções, oito unidades compráveis por composição, ondas automáticas de minions e um campo de batalha grande dividido em três frentes.

## Jogar

- Jogo: https://rlksbr.github.io/Stick-Lanes/
- Laboratório de balanceamento: https://rlksbr.github.io/Stick-Lanes/balance.html

O GitHub Pages publica a branch `main` a partir da raiz do repositório. Depois de um commit, a atualização pode levar alguns minutos para aparecer.

O menu inicial separa três fluxos:

- **Jogar** — montagem manual de duas facções e oito tropas contra a IA.
- **Robô × Robô** — Simulação assistida com as facções dos dois lados sorteadas; cada robô escolhe seu próprio elenco de oito tropas. Velocidades 1×, 3×, 10× e 20×.
- **Simulação** — laboratório sem renderização, com facções aleatórias ou um par fixo escolhido pelo usuário.

## Frontline v3

- Mundo horizontal com largura virtual de **22.500**.
- **3 lanes principais**, cada uma dividida visualmente em **3 sub-lanes**.
- As rotas convergem nas bases.
- **4 torres por lane**, totalizando **12 torres por lado**.
- Bases com **6.000 de vida**.
- Cada exército combina **2 facções** e escolhe **8 unidades compráveis**.
- Unidades compráveis têm tempos de geração bem mais longos, atualmente na faixa de **28 a 120 segundos**.
- A direção de balanceamento é buscar partidas de aproximadamente **15 minutos ou mais**.
- Economia atual: **+30 de ouro a cada 2 segundos**.

## Minions

Cada facção possui três minions próprios:

- **Tanque** — ocupa a sub-lane de resistência.
- **Lutador** — pressão corpo a corpo.
- **À distância** — pressão de retaguarda.

As ondas são automáticas. Os minions saem pelo eixo central da frente e depois se distribuem pelas três sub-lanes.

Existe um sistema inicial de counters entre facções: o minion de uma facção recebe **+20% de vantagem** contra os minions de uma facção específica. O ciclo foi construído de forma simétrica para servir como base de testes antes de ajustes manuais de matchups.

## Facções

A Frontline v3 possui 26 facções:

1. Alienígenas
2. Mentalistas
3. Robôs
4. Lobos
5. Zumbis
6. Samurais
7. Artrópodes
8. Elementais
9. Demônios
10. Celestiais
11. Dinossauros
12. Mutantes
13. Necromantes
14. Bestas Marinhas
15. Medievais
16. Ninjas
17. Nômades do Deserto
18. Titãs
19. Alquimistas
20. Orcs
21. Espectrais
22. Cultistas
23. Músicos
24. Cristalinos
25. Míticos
26. Físicos

Cada facção possui identidade visual própria, paleta/material, passiva de facção, três minions temáticos e um catálogo de unidades com papéis como lutador, tanque, assassino, suporte, controle, cerco, elite e unidade única.

Alguns exemplos de identidade:

- **Medievais** — disciplina de linha, metal, madeira, couro e máquinas de cerco.
- **Alienígenas** — formas orgânicas e assimétricas; Gosma dourada, Olho Flutuante sem asas, Cuspidor-caixa, Fauce Errante etc.
- **Mentalistas** — humanoides extraterrestres metálicos e completamente sem rosto; a Entidade Psíquica usa corpo com aparência de galáxia.
- **Robôs** — blindagem modular e linguagem industrial/mecânica.
- **Lobos** — bônus de matilha e silhuetas ferais.
- **Zumbis** — decomposição, persistência e retorno de minions.
- **Samurais** — Bushidô e identidade militar japonesa estilizada.
- **Necromantes** — mortos-vivos, ossos e invocações.
- **Alquimistas** — corrosão, transmutação e efeitos químicos.
- **Músicos** — unidades baseadas em instrumentos e ritmo.
- **Cristalinos** — geodos, minerais, refração e reflexão.
- **Míticos** — criaturas como lobisomem, vampiro, bruxa e dragão.
- **Físicos** — conceitos de física transformados em unidades e efeitos, incluindo radiação acumulativa.

## Ordens de batalha

As ordens atuais por lane são:

- Base
- Atrás da torre
- À frente da torre
- Avançar
- Atacar

**Avançar** mantém as tropas junto dos minions e prioriza a limpeza da onda. **Atacar** avança sem depender de minions e prioriza tropas inimigas, mas interrompe perseguições que tentem puxar a unidade para além da torre atual.

## Laboratório de balanceamento

O projeto possui um simulador separado, sem renderização, para testar grandes volumes de partidas entre robôs.

Estado atual:

- **10.000 partidas** como padrão de uma bateria.
- Opções maiores disponíveis no próprio laboratório.
- As facções podem ser sorteadas automaticamente para cada composição ou fixadas pelo usuário.
- Depois de receber as facções, cada robô escolhe e testa automaticamente seu elenco de oito tropas.
- O robô economiza ouro até colocar todas as oito tropas escolhidas em campo.
- O relatório mede vitórias, derrotas, empates, spawns, dano, dano estrutural e impacto das unidades.
- O win rate principal de uma unidade considera jogos em que ela **realmente entrou em campo**, evitando atribuir desempenho a unidades que ficaram apenas no loadout.
- Existe um banco acumulado local por unidade.
- Resultados e composições podem ser salvos no `localStorage`.
- O banco de balanceamento pode ser exportado em JSON.

O banco Frontline v3 é separado do baseline antigo, anterior ao sistema de minions.

## Salvamento local

O jogo permite salvar composições de oito unidades diretamente no navegador. O laboratório também mantém histórico local das baterias e estatísticas acumuladas.

Como o armazenamento é via `localStorage`, os dados pertencem ao navegador/aparelho em que foram criados. Para preservar resultados de balanceamento fora do navegador, use a exportação JSON do laboratório.

## Estrutura principal

- `index.html` — interface principal do jogo.
- `factions-v3.js` — catálogo, identidades, unidades, minions e dados das facções.
- `game-v3-core.js` — regras e motor da batalha.
- `game-v3-visuals.js` — renderização procedural 2.5D.
- `extras.js` — salvamento local de composições.
- `balance.html` — interface do laboratório.
- `balance-v3.js` — simulador e métricas da Frontline v3.

## Status

Projeto em protótipo ativo. Números de custo, dano, vida, defesa, geração, counters, duração das ondas e passivas ainda estão sujeitos a alterações conforme os testes automatizados e as partidas manuais apontarem problemas de balanceamento.
