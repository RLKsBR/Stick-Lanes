# Consolidação do runtime — 10/09/2026

Este passe trata falhas verificáveis da lista de 120 pontos. Os números abaixo
referem-se à lista; não significam que toda a categoria esteja encerrada.

| Área da lista | Mudança concreta |
|---|---|
| 2–4, 107–112 | Carregamento único e explícito do A* e da autoridade; quatro camadas substituídas fora do HTML; verificação de dependências e erros de boot. |
| 7–14, 54 | Retorno Automático compartilha A*; falha não atravessa parede; quinas respeitadas; destino morto não deixa estado órfão; watchdog invalida caminho, diferencia stun e oscilação. |
| 20–22 | Regressões de segmentos sem colisão e chegada exata nos quatro buffs. |
| 30–31 | Mesma percepção para força e minions; comandos, inspetor e marcador não seguem inimigos ocultos; minimapa filtra frontline oculta. |
| 48–49 | Vida interna e exibida unificadas em 15.000, sem divisor oculto de dano. |
| 56 | Rótulos TODAS/TOP/MID/BOT corrigidos. Diagnóstico recolhível para não ocupar toda a tela. |
| 60–61 | Passo fixo de 40 ms em 1×/3×/10×/20×; resto do frame acumulado. |
| 68–70 | Base danificada sozinha não dispara defesa emergencial sem pressão inimiga percebida. |
| 87–92 | Fontes de visão reutilizadas por fotografia; interseção por clipping elimina arrays de quinas por raio; retentativas de rota falha limitadas. |
| 93–95 | Regressões da página real, runner que administra servidor, lockfile e CI em PRs. Clique em Chromium por software tem prazo de 10 s; o limite de saúde do RAF continua em 700 ms. |
| 98–100, 102, 117 | Painel e JSON com plano, pontuações, razões de rejeição, compromisso e recuperação; histórico limitado a 240 registros e limpo no reset. |
| 106 | Hashes automáticos para JS/CSS no jogo e laboratório, verificados em CI. |

## Limites

- Ainda não há migração completa de globais/wrappers para módulos, nem bundler.
- A IA continua heurística. Opening book, objetivos de buff no controlador final,
  previsão de reforços/TTK e política de base race precisam de trabalho próprio.
- HP/estado das estruturas e bases continuam públicos. Memória de incerteza e
  scouting/wards não foram implementados. O reset de última visão foi corrigido.
- Não existe replay determinístico ou seed exposta no jogo renderizado. Passo
  fixo é apenas uma fundação; registrar entradas e separar RNG visual/combatente
  ainda é necessário. O laboratório já tinha seeds, que não foram alteradas.
- Não foram realizados milhares de confrontos para calibrar winrate, duração,
  composição ou matchups. Nenhum atributo de facção/Lenda foi recalibrado aqui.
- Os testes mobile usam Chromium em viewports móveis. Não medem GPU de Android
  real, APK ou EXE; não se declara meta de FPS atingida. Na máquina de teste,
  renderização por software continua custosa.
- Novas regressões cobrem cenários específicos, não as 26 facções e todas as
  combinações. O smoke VM antigo ainda usa uma montagem histórica.
- Arte, animações completas, balanceamento de draft, minimapa completo, análise
  pós-partida e empacotamento EXE continuam pendentes.

## Validação reproduzível

`npm ci` → `npx playwright install chromium` → `npm run check` → `npm test` →
`npm run test:browser`. A execução preserva o ritmo econômico e a durabilidade
anterior da base, mas as decisões e o ritmo em aceleração podem mudar porque
informação oculta e dt variável deixaram de influenciar o controlador.
