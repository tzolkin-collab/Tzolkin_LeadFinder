---
name: tracer-design
description: Design system do Tracer (Lead Finder) — tokens, componentes, os 4 eixos de sinal, tipografia de três vozes, regras anti-layout-shift e voz de interface. Use SEMPRE que for criar ou alterar qualquer tela, componente, estilo ou texto de interface em apps/web, e antes de escrever qualquer CSS, JSX ou copy de produto.
---

# Design system do Tracer

O dono do produto é muito detalhista com design. Não improvise valores: se não
existe token, o token está faltando — crie o token, não um número mágico.

## Fonte de verdade dos tokens

`apps/web/src/app/globals.css`. **Nunca introduza paleta nova.** A identidade em
produção é **cinza neutro de verdade — R=G=B, matiz 0°** — o mesmo raciocínio
das âncoras do próprio Claude Design System da Anthropic (`#ffffff` /
`#0b0b0b`, sem viés de matiz), com acento amarelo da Tzolkin.

| Papel | Token |
|---|---|
| Fundo | `--bg-primary` `#262626` · `--bg-secondary` `#2e2e2e` · `--bg-card` `#363636` · `--bg-card-hover` `#404040` · `--bg-elevated` `#4a4a4a` |
| Borda | `--border-primary` (8% branco) · `--border-secondary` (14%) · `--border-accent` (22%) |
| Texto | `--text-primary` `#f2f2f2` · `--text-secondary` `#c2c2c2` · `--text-tertiary` `#949494` |
| Acento | `--tzolkin-yellow` `#FFD400` · `--tzolkin-offwhite` `#FAFAF7` |
| Semântico | `--success` · `--warning` · `--error` (+ variantes `-soft`) |
| Score | `--score-high` · `--score-medium` · `--score-low` |
| Raio | `--radius-sm` 6 · `-md` 8 · `-lg` 12 · `-xl` 16 · `-pill` |
| Transição | `--transition-fast` 150ms · `--transition-normal` 200ms |

### ⚠️ Nunca dê viés de matiz ao cinza neutro — duas tentativas provaram errado

Duas versões anteriores desta escala tentaram um "cinza quente": a primeira
calculava em **hue ~41°**, a segunda em **~26°**. As duas foram testadas e
**as duas leram como esverdeadas** e pioraram a leitura — mesmo a segunda,
calculada para ficar longe da faixa de oliva, ainda carregava viés suficiente
para o olho detectar "alguma cor" num cinza esse escuro e dessaturado.

A conclusão que fica: **cinza neutro de verdade (R=G=B exato) é a única opção
que não pode, matematicamente, ler como esverdeada.** Não tente reintroduzir
calor na rampa neutra — se algum dia for preciso um cinza "quente" para um
contexto específico, isso é um **token de acento à parte**, nunca o
`--bg-*`/`--text-*` de base.

**Antes de propor qualquer hex novo de fundo/texto neutro, confira que é
neutro de verdade:**

```js
function isNeutral(hex){
  const c=hex.replace("#","");
  const r=parseInt(c.slice(0,2),16), g=parseInt(c.slice(2,4),16), b=parseInt(c.slice(4,6),16);
  return r===g && g===b; // se falso, tem viés de matiz — rejeite
}
```

**Nunca hardcode hex/rgba de cinza ou preto num componente.** Se precisar de
fundo, borda ou texto neutro, use o token — mesmo em telas legadas (auth,
settings). Hardcode é como versões erradas dessa escala voltaram a vazar para
o código nas últimas vezes: use `grep -noE "#[0-9a-fA-F]{3,8}" <arquivo>` antes
de considerar uma tela pronta, e mapeie qualquer acerto para o token do papel
equivalente (fundo de página → `--bg-primary`, painel → `--bg-card`, hover →
`--bg-card-hover`, elevado → `--bg-elevated`). `--text-tertiary` tem contraste
~4,99:1 contra o fundo — vale só para texto grande, legendas e metadados,
nunca para corpo de texto pequeno.

### Luminosidade — não confunda "refinado" com "quase preto"

Uma primeira versão desta escala mirou luminosidade muito baixa (`bg-primary`
em ~7%, quase preto) tentando imitar "dark mode minimalista". O tom real que
o dono do produto reconhece como "do Claude" é **claramente mais claro** —
`bg-primary` em ~15% de luminosidade (`#262626`), não ~7%. Se for ajustar essa
escala de novo, mude a luminosidade de base primeiro (é o eixo que mais mexe
com a percepção de "cinza refinado" vs. "quase preto"), e só depois mexa em
matiz/saturação — os dois eixos são independentes e já erramos em cada um
separadamente por tentar acertar os dois de uma vez.

**Amarelo é acento, não decoração.** Uma ênfase por tela. Duas ocorrências de
amarelo competindo e nenhuma comunica.

## Escala de espaço

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Se você precisou de `padding: 13px`, o
token está errado. Espaçamento sai de `gap` em flex/grid, nunca de margem por
elemento — margem colapsa e duplica em silêncio.

## Os quatro eixos de sinal

Ordem **fixa**, em qualquer lugar que apareçam: `dor · dinheiro · momento · alcance`.

É o que permite ler o conjunto pelo padrão de cor sem processar número. Trocar a
ordem quebra a leitura de todo mundo que já usou o produto.

- **dor** — sem site, site fora do ar, só Linktree
- **dinheiro** — anuncia no Meta, volume de reviews
- **momento** — mudou agora (é o diferencial do produto)
- **alcance** — canal comercial aberto

### ⚠️ Nota numérica (`dinheiro 8`) já foi tentada e rejeitada

Uma versão anterior mostrava cada eixo como rótulo + dígito de 1 a 10
(`dor 9`, `dinheiro 8`...) até no feed, não só no dossiê. Foi rejeitada: é o
mesmo defeito que já tínhamos corrigido no dossiê (nota sem evidência não
convence) e tem um problema mais fundo — **antes da validação com cliente
zero (nenhum desfecho real coletado ainda), qualquer dígito é confiança
fabricada**, a mesma categoria de mentira do bureau e do wire com dado falso
que já banimos.

**A pílula mostra o fato curto que sustenta o eixo, nunca uma nota:**
`dor · sem site` · `dinheiro · anuncia + 340 av.` · `momento · 16 dias` ·
`alcance · whatsapp`. Ordem e cor do eixo continuam fixas; o que muda é que
cada pílula é verificável, não uma confiança que ainda não ganhamos.

Score numérico pode voltar **depois** que o cliente zero gerar desfecho de
verdade pra calibrar — aí "10" significa algo (converteu nesse nicho), não é
palpite de fórmula. Até lá: fato, nunca nota. **Nunca dentro do dossiê** —
lá vale evidência rica (timeline, citação, ângulo), não pílula compacta.

## Tipografia — três vozes, três funções

- **Sans** (`--font-sans`, Inter) — interface. Pesos **400 e 500 apenas**. Nunca
  600 ou 700: peso alto endurece a tela.
- **Mono** — tudo que é medição: datas, contagens, IDs, valores. Sempre
  `font-variant-numeric: tabular-nums`, senão coluna de número não alinha.
- **Serifa** — **exclusiva** para citação literal de uma pessoa (avaliação de
  cliente, resposta de lead). Nunca para título. A serifa marca quem fala.

## Layout do feed — mapa, não pilha de cards

### ⚠️ Card com borda arredondada + badge dentro foi tentado e rejeitado

A primeira execução do feed era uma pilha vertical de cards — cada um com
`border-radius`, borda de 1px, pílulas dentro. Compila com todas as regras
desta skill e ainda assim foi rejeitado como **"sem vida e sem graça"**. É o
layout mais genérico que existe — todo CRM do mercado tem exatamente isso —
e "seguir a regra" não bastou; faltou ponto de vista na forma.

**Não volte pra pilha de card com borda como default do feed.** Se for
redesenhar essa tela, comece pelo layout aprovado abaixo, não por "cards mais
bonitos".

### Layout aprovado (28/07/2026): mapa + lista densa + painel inferior

Três painéis, um app real de prospecção local — não uma lista abstrata:

1. **Mapa estilizado** (esquerda/centro) — os negócios são geograficamente
   reais (`CanonicalBusiness.latitude/longitude` já existe no schema). O
   mapa resolve o que uma lista não resolve: proximidade, rota, "qual bairro
   trabalhar hoje". Pino usa a **mesma linguagem de frescor** do resto do
   produto — sinal recente pulsa em amarelo com anel de destaque; sinal antigo
   esmaece pra cinza (`#4d4d47`→`#6b6558`, nunca preto). Nunca usar o pino
   vermelho padrão de mapa.
2. **Lista lateral densa** (direita) — linha, não card: ponto de cor +
   nome + fato + timestamp relativo, separador de 1px, sem borda ao redor
   de cada item (estilo Linear/issue-tracker, não estilo "card de produto").
   Densidade controlada é o que lê como caro; caixa arredondada em volta de
   pouco conteúdo é o que lê como gerado.
3. **Painel inferior** (dock, não navegação) — ao selecionar um pino/linha,
   mostra fato-pílulas + diagnóstico curto do negócio ali mesmo, sem trocar
   de página. Um botão "abrir dossiê" leva à página rica
   (`business/[id]`) só quando o usuário decide que vale a evidência
   completa. O mapa nunca perde estado ao trocar seleção.

### Mapa é artefato do chat, não do Feed

Decisão de 28/07/2026: o mapa não vive mais na página Feed. Ele é uma
ferramenta que o agente do `/tracer` invoca durante a conversa (mesmo
painel de artefatos do dossiê `.md` ao vivo). Feed volta a ser só o feed
de sinais + widgets editoriais abaixo — sem painel de mapa fixo.

### Motor de mapa

**⚠️ Correção (28/07/2026): MapLibre puro NÃO é permitido para os pinos.**
Verificado direto na política oficial da Places API: *"Places API results
displayed on a map must be shown on a Google Map, with proper attribution
including the Google logo."* Dado que veio da Places API só pode ser
plotado num Google Map de verdade — não dá pra renderizar negócio vindo da
Places API como pino num mapa MapLibre/MapTiler. Uma recomendação anterior
desta skill sugeria MapLibre sem checar essa regra primeiro; estava errada.

**Caminho A (recomendado) — Google Maps JavaScript API, estilizado via
Map ID/`styles` array.** É Google Map de verdade, cumpre a regra. Dá pra
escurecer ruas/água/rótulos até ficar perto da nossa paleta; só a logo do
Google é intocável (tamanho mínimo 16dp, posição definida pelos termos).
Mesmo fornecedor dos dados (Places), sem chave de outro serviço.

**Caminho B — geocodificar por conta própria + MapLibre.** Se a coordenada
do negócio vier de um geocodificador independente (MapTiler, Nominatim) e
não da Places API, a restrição não se aplica — mas exige mais engenharia
(chamada extra, risco de divergência de coordenada) e mais cuidado jurídico
para sustentar que o dado plotado não é "resultado da Places API".

Sem mapa nenhum (só lista), ainda existe a exigência de mostrar a logo do
Google em algum lugar da tela, mesmo sem mapa.

**Decisão de qual caminho seguir ainda está aberta.** `place_id` é isento
das restrições de cache da Places API; lat/long e nome do negócio, não —
isso importa para quanto tempo `CanonicalBusiness`/`Observation` podem reter
esses campos, vale revisitar quando for implementar de verdade.
**Implementação real do mapa fica bloqueada até o backend (Fase 1/2 —
ingestão canônica + motor de sinal) estar servindo dado de verdade.** Não
construir mapa em cima de feed vazio.

## Ritmo editorial — widgets de inteligência de mercado no feed

Decisão de 28/07/2026. Objetivo explícito do dono do produto: *"quero que a
pessoa bata o olho e sinta que tem inúmeras oportunidades esperando por ela
e que às vezes ela nem as vê."* Isso não se resolve com mais números — se
resolve **quebrando o ritmo** da lista de sinal com blocos largos de
inteligência de mercado, cada um terminando em ação, nunca em estatística
solta.

**Nunca vire grid uniforme de stat tile.** É o mesmo erro do card genérico
em outra roupa — dashboard de BI é tão sem graça quanto pilha de card. A
espinha continua sendo os cards de sinal densos e sem borda (linha, não
caixa); os widgets de mercado são blocos **visualmente distintos** que
interrompem essa espinha de vez em quando — como uma revista quebra coluna
de texto com uma foto ou destaque, não como um dashboard empilha tiles
iguais.

**Todo widget de mercado termina em ação concreta**, nunca em número
abstrato. "73% das barbearias sem site" sozinho é dado; "ver as 22
barbearias →" é o que produz a sensação de oportunidade — a estatística
vira lista real de negócios que a pessoa pode abrir agora.

### As quatro fontes, por esforço real de implementação

1. **Pesquisa de nicho** — grátis, é agregação da própria base canônica
   (`CanonicalBusiness`/`Signal` por categoria+cidade). Zero integração nova.
2. **LinkedIn** — cliente já existe (`scrapeLinkedInCompany`,
   `packages/core/src/clients/apify.client.ts`); falta wiring + UI.
3. **Trends** — sem API oficial do Google; scraping frágil ou serviço pago
   (SerpApi). Nada construído.
4. **Keyword Planner** — o mais pesado: exige Google Ads API com developer
   token aprovado e conta gerenciadora (MCC). Nada construído.

Sequenciar por esforço (nicho → LinkedIn → Trends → Keyword), a menos que o
dono do produto decida priorizar diferente.

## Anti-layout-shift (orçamento: CLS < 0,05)

1. Altura de linha do feed **fixa**; esqueleto com a **mesma dimensão exata**, não aproximada.
2. **Nunca anime `height`.** Só `transform` e `opacity`.
3. Reserve espaço de tudo assíncrono — avatar, badge, contagem — com dimensão explícita.
4. Fonte com `size-adjust` no fallback.

## Voz da interface

Número datado no lugar de adjetivo. O produto relata o que observou e deixa a
conclusão com quem vende.

| Escreva | Não escreva |
|---|---|
| Começou a anunciar há 16 dias | Alto potencial de conversão |
| 4 de 7 concorrentes têm site | Oportunidade estratégica na região |
| Nada mudou hoje | Ops! Nenhum resultado encontrado |
| Publicou um site — provavelmente perdido | Status atualizado com sucesso! |
| Abordar pelo canal comercial | Desbloqueie o contato do decisor |

A última linha é **regra jurídica, não estilo** — ver o ADR do bureau. O produto
nunca promete acesso a dado pessoal de sócio.

Frase sempre em caixa de sentença. Sem emoji na interface de produto.

## O que quebra a identidade

- Gradiente, glow, neon. Destaque vem de hierarquia e recência, não de luz.
- Cor de eixo usada por estética — destrói a leitura por padrão.
- Score dentro do dossiê.
- Raio em borda de um lado só.

## Regras do projeto que tocam a UI

- **WhatsApp:** todo link é `https://wa.me/<E.164>`. Nunca `api.whatsapp.com`
  nem `web.whatsapp.com`. Ver `.agents/AGENTS.md`.
- `observerCount` e `triggeredByTenantId` da base canônica **nunca** chegam à
  interface.

## Referência completa

Brandbook: https://claude.ai/code/artifact/a6c8ab43-5b4e-4521-a219-0adb1ecbed88
Marca em `brand/tracer-mark.svg`, `-lockup.svg`, `-favicon.svg` (versões ópticas
separadas — nunca escalar o arquivo grande para 16 px).
