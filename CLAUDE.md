# Scanner Inteligente de PMEs Sem Anúncios e Sem Website — Lead Finder / Tzolkin

## 📌 Visão Geral & Contexto
Porta de entrada para a **produtização do Lead Finder** (Task do Calendário Operacional — Gustavo, 21/07/2026).
O **Scanner Inteligente de PMEs Sem Anúncios e Sem Website** é a ferramenta interna de prospecção e inteligência comercial da Tzolkin. Ele encontra negócios locais **sem website**, enriquece cada lead com dados públicos (Instagram, Meta Ads, CNPJ/Brasil API) e usa IA para pontuá-los (score 1–10) em relação à aderência para serviços de criação de site/landing page, gerando sugestões de abordagem.

A produtização transforma a ferramenta interna em um **SaaS B2B** cuja promessa central é **conectar leads ideais com prestadores de serviço**, assistindo o **last mile: identificar/alcançar o decisor e iniciar a conversa**.

---

## 🎯 Tese Central & Diferenciais (Moat)
- **Achar lead = Table Stakes** (ferramentas horizontais globais como Apollo.io já fazem a busca).
- **Fosso Defensável (Moat) = Last Mile Local (Brasil)**: Identificação do decisor real + aproximação da 1ª conversa, algo impreenchível pela Apollo (US-first, horizontal).
- **Superpoderes no Brasil**:
  - **CNPJ → Sócio**: Identificação do decisor por consulta de quadro societário (dados públicos por lei).
  - **WhatsApp (Evolution API)**: Canal primário e direto de comunicação com donos de PME no Brasil.
- **Cliente Zero**: A própria **Tzolkin**. O ICP primário é composto por "empresas como a Tzolkin".

---

## 🔌 Fontes de Dados Padrão
O scanner utiliza as seguintes fontes públicas e APIs por padrão (configuráveis via `.env`):

| Fonte | Propósito | Chave Padrão (dev) |
| --- | --- | --- |
| **Google Places API** | Descoberta em massa de PMEs locais | `GOOGLE_PLACES_API_KEY` |
| **Serper.dev** | Busca indexada no Google (Instagram, Meta Ads, CNPJ, LinkedIn) | `SERPER_API_KEY` |
| **Brasil API** | Enriquecimento de CNPJ (gratuito, sem chave) | N/A |
| **Meta Ads Library API** | Verificação de anúncios ativos no Facebook/Instagram | `META_ADS_TOKEN` (opcional) |
| **OpenAI** | Geração do dossiê comercial e score | `OPENAI_API_KEY` |
| **Redis** | Cache distribuído e rate limiting | `REDIS_URL` (opcional) |

> O fallback para todas as fontes pagas é **graceful**: se a chave não estiver configurada ou a API falhar, o lead continua sendo enriquecido com os dados disponíveis.

## 🏗️ Arquitetura de Produto: Last Mile & Agente (Documento 4 da Wiki)

O núcleo de valor do Lead Finder transiciona da simples *descoberta de leads* para a **assistência completa no Last Mile**: identificar o decisor real, obter contato direto, gerar a minuta personalizada da primeira conversa e controlar a execução da abordagem.

### 🤖 1. Notebook-Agente (UI de Comando estilo Claude & Split Workspace)
- **Conceito**: Substituição do botão estático único "Gerar Dossiê" por um **Workspace Dinâmico por Lead** estilo Claude (Chat Interativo na esquerda + Artefatos Atualizáveis na direita).
- **Descoberta Inicial de LinkedIn no Topo do Funil**:
  - Na busca inicial em lote (1 clique), o sistema já executa queries paralelas (`site:linkedin.com/company` e `site:linkedin.com/in`) via Serper API para capturar o LinkedIn da empresa e dos sócios **antes mesmo de abrir o dossiê**.
- **Arquitetura de Memória & Swarm**:
  - **Memory Consolidation**: Retém buscas passadas (< 30 dias). Não repete chamadas de API desnecessárias.
  - **Agent Swarm (Multi-Model)**: Subagentes especializados (CNPJ/Bureau, Social OSINT, Meta Ads e Copywriter Sales Closer).
  - **Chat com Streaming & Tool Access**: O usuário conversa diretamente com o lead ("Escreva um pitch pro WhatsApp do Raniere", "Qual a verba de anúncios deles?") com acesso a tools e integrações Tzolkin.
- **Separação de Camadas (Volume vs Deep-Dive)**:
  - **Topo do Funil (Volume)**: Busca em lote (1 clique, até 50 leads) + badges de presença (`[🌐 Site]`, `[📸 IG]`, `[💼 LinkedIn]`, `[📢 Meta Ads]`).
  - **Fundo do Funil (Last Mile)**: Notebook-Agente e revelação de WhatsApp do Sócio via sistema de créditos.

### 📋 2. Micro-CRM Outbound Integrado
Evolução do enum simples atual (`PENDING → REVIEWED → CONTACTED → REJECTED`) para um pipeline de aquisição completo:
$$\text{Novo} \rightarrow \text{Qualificado} \rightarrow \text{Decisor Identificado} \rightarrow \text{Contato Obtido}$$

### 👤 3. Descoberta & Mapeamento Multi-Decisor (Sem Descarte)
- **Princípio da Não-Exclusão**: Nenhum decisor ou canal de contato é descartado. O sistema monta uma **Mini-lista de Decisores** por empresa (CEO, Sócios, CMO, CTO, RH, Diretor Comercial, Gerente).
- **Fontes de Mapeamento**:
  - `CNPJ → Quadro de Sócios`: Sócio-Administrador e demais sócios cotistas com CPF mascarado, cargo e faixa etária (dado público federal).
  - `Meta Ads + Instagram + Bio`: Contatos vinculados aos responsáveis de marketing / comercial da operação.
  - `LinkedIn`: Mapeamento de executivos e liderança por função em empresas maiores.
- **Visibilidade Unificada (Dossiê + Pipeline Outbound)**:
  - Exibido tanto no **Dossiê do Negócio (`/business/[id]`)** quanto no **Micro-CRM Outbound**, permitindo ao prestador selecionar para qual decisor deseja disparar o pitch ou cadência.

### 📞 4. Aquisição de Contato, E-mails & Categorização por Badges
- **(a) Mapeamento de E-mails Vinculados aos Decisores**:
  - Extração de e-mails corporativos e pessoais vinculados (Registro CNPJ, Bio do Instagram, Linktree, formulários públicos e WHOIS).
  - Associação direta: cada e-mail é vinculado ao seu respetivo decisor ou marcado como `[E-mail Geral / Comercial]`.
- **(b) Preservação & Categorização de Todos os Telefones (Badges Visuais)**:
  - **Validação Automática sem Descarte**: Telefones sem WhatsApp **NÃO são excluídos**. Eles são mantidos na lista com a categorização por Badges:
    - `🟢 [WhatsApp Verificado]` — Celular móvel com conta ativa no WhatsApp (link padronizado obrigatoriamente como `https://wa.me/55...`).
    - `☎️ [Telefone Fixo]` — Linha fixa identificada (útil para ligações diretas via recepção/secretária).
    - `⚠️ [WhatsApp Não Encontrado / Móvel Inativo]` — Número móvel sem conta ativa detectada no protocolo.
    - `📧 [E-mail Corporativo / Pessoal]` — E-mail associado com indicador de entregabilidade.
- **(c) Validação / Override Manual pelo Usuário**:
  - O usuário pode alterar manualmente o status de qualquer número ou e-mail (`[Validado]`, `[Falso / Inexistente]`, `[Não Pertence ao Decisor]`), personalizando o cadastro conforme a evolução da abordagem.

### 🛡️ 5. Guardrails Operacionais & Compliance (Evolution API & LGPD)
- **Guardrails Operacionais (Ajustáveis nas Configurações)**:
  - Volume diário de abordagens, intervalo entre mensagens, janela de horário de envio, tempo de cooldown e cadência de follow-ups — protegendo contra o banimento de instâncias da Evolution API.
- **Guardrails de Compliance (Piso Fixo Inegociável)**:
  - Inclusão obrigatória de mecanismos de opt-out, respeito imediato a solicitações de remoção ("não quero") e embasamento legal rígido na LGPD (legítimo interesse/dados públicos).

### 🔗 Shape Unificado do Produto (End-to-End)
$$\text{Busca em Lote} \rightarrow \text{Cards no Micro-CRM} \rightarrow \text{Notebook-Agente por Lead} \rightarrow \text{Identificação de Decisor/Contato} \rightarrow \text{Geração do Pitch} \rightarrow \text{Disparo Assistido 1-a-1 via WhatsApp}$$
*O SaaS assiste cada etapa, mas o envio final é acionado 1-a-1 pelo prestador, eliminando disparos em massa automatizados e mantendo a operação segura contra sanções ou bloqueios.*

---

## 🎯 ICP & ILP: Decisor Alcançável (Documento 3 da Wiki)

> **Statement de Posicionamento**:
> Para **prestadores de serviço digital de pequeno porte no Brasil** (agências enxutas e freelancers produtizados) que vivem de encher o próprio pipeline, o Lead Finder é a ferramenta que **entrega PMEs locais com dor digital óbvia e orçamento comprovado, já com o pitch pronto** — porque cruza Google Maps + Instagram + bibliotecas de anúncios para achar quem demonstravelmente gasta com marketing mas ainda não tem site.

### 👤 Nível 1 — ICP (Quem PAGA)
- **Firmográficos**: Agências digitais enxutas (1–20 pessoas) ou freelancers produtizados que vendem sites, landing pages, tráfego pago, social media ou automação para PMEs locais.
  - Faturamento estimado: 🟡 R$ 10k–200k/mês.
  - Ticket médio de projetos: R$ 1.5k–15k (pontual) ou R$ 500–5k/mês (recorrente).
  - Mercado: Brasil-first (atendendo tanto capitais quanto cidades do interior). Fazem prospecção outbound ativa.
- **Persona**: Dono-operador (acumula a função de vendas/SDR) ou único closer/SDR da operação.
- **Jobs To Be Done (JTBD)**: *"Encher meu funil comercial com leads que têm dor real e orçamento, sem perder horas garimpando no Google Maps e Instagram manualmente."*
- **Dores Principais**: Prospecção manual extremamente lenta, perda de tempo com leads frios ou falidos, escassez de indicações, alto custo de mídia para captação B2B, frustração com ferramentas de sales intelligence gringas/caras que não cobrem PMEs locais brasileiras.
- **Tiering de ICP**:
  - **T1 (Coração)**: Freelancer produtizado focado em prospecção outbound.
  - **T2**: Micro-agência enxuta (2 a 10 pessoas).
  - **T3**: Agência em expansão (10 a 20 pessoas com closer dedicado).
- **Anti-ICP (Não atender)**: Times B2B Enterprise / SaaS (foco da Apollo), agências grandes com estrutura de BDRs, e-commerce / produtos físicos, prestadores que só dependem de indicação / inbound, empresas fora do Brasil.

### 🏬 Nível 2 — ILP (O Lead Entregue)
O grande diferencial do lead entregue é a interseção entre **Dor + Dinheiro Comprovado + Decisor Alcançável**:

| Sinal de Qualificação | Significado Estratégico | Fonte de Extração |
| --- | --- | --- |
| ❌ **Sem site** (ou site inoperante) | Dor digital vendável e imediata | Google Places (`hasWebsite`) |
| ✅ **Instagram ativo** | Preocupação com a imagem da empresa | Scraping IG / Serper API |
| ✅ **Muitos reviews + boa nota** | Negócio estabelecido, operante e faturando | Google Places API |
| ✅ **Anuncia no Meta Ads** | **Orçamento de marketing comprovado** | Meta Ads Library API |

- **Sweet Spot**: Negócio com Instagram bombando + Anunciando no Meta Ads + **Sem Website**.
- **Nichos Alvo Principais**: Clínicas/estética, restaurantes/food, salões/barbearias, academias, oficinas mecânicas, comércio de bairro e profissionais liberais.
- **Novo Critério Inegociável — Decisor Alcançável**: Um lead cujo decisor não pode ser identificado ou contatado é um **lead morto**, independente de ter `suitabilityScore` 10/10. O ILP exige a trinca: **Dor + Dinheiro + Decisor Alcançável**.

### 💰 Modelo de Precificação & Canais
- **Preço Âncora Estimado**: 🟡 **R$ 47 a R$ 197/mês** (precificação em Reais, altamente competitiva vs ferramentas em dólar).
- **Watering Holes (Canais de Aquisição)**: Comunidades de gestores de tráfego, no-code, desenvolvedores freelas e donos de agência (em vez do LinkedIn corporativo).

---

## 📊 Análise Competitiva: Apollo.io (Documento 2 da Wiki)

### 🏢 Perfil do Concorrente (Apollo.io)
- **Posicionamento**: "The AI sales platform for smarter, faster revenue growth" / "AI-native all-in-one GTM platform".
- **Público-Alvo**: Times de vendas B2B (SDRs/RevOps), majoritariamente corporativos e baseados nos EUA.
- **Métricas & Escala**: ARR de ~US$ 150M (2025), ~600k empresas clientes, Valuation de US$ 1.6B (Série D, Bain Capital).
- **Preços (per-seat, anual)**: Free $0 | Basic $49 | Professional $79 | Organization $119/usuário (mín. 3 assentos). Limite rígido de exportações e dados de celular impulsiona upsell.

### 💪 Forças da Apollo
- **Fosso de Dados**: 240M+ contatos proprietários.
- **Máquina de SEO & Aquisição**: 15.000+ palavras-chave ranqueadas, milhões de acessos orgânicos/mês e plano gratuito como motor de aquisição.
- **Plataforma All-in-One**: Do enriquecimento de dados às sequências de e-mail e integração com CRM.

### 🎯 A Brecha (Fraquezas a Explorar)
- **Baixa Precisão de Dados Fora dos EUA**: Taxa de precisão cai para ~60% na América Latina/Brasil (vs ~88% nos EUA), gerando alta taxa de bounce (15–35%). Nota no Trustpilot de 2.9 (vs 4.7 no G2).
- **Incompatibilidade com PMEs Locais BR**: Foco horizontal e US-first. Não localiza PMEs locais sem site, não consulta dados públicos societários brasileiros e não atua via WhatsApp.
- **Fricção & Custo**: Curva de aprendizado longa, suporte lento e modelo de cobrança por assento em dólar inviável para pequenas agências/prestadores locais.

### ⚔️ Matriz de Messaging
| Dimensão | Lead Finder | Apollo.io |
| --- | --- | --- |
| **Comprador** | Prestador de serviço/agência vendendo para PMEs locais (BR) | Times de vendas B2B enterprise/mid-market (Global/US) |
| **Diferenciador** | Localiza quem **não tem presença digital** + gera dossiê/pitch de abordagem via IA | Maior base de dados B2B do mercado + plataforma all-in-one |
| **Dado Central** | Sinais públicos em tempo real (Google Maps, Instagram, Meta Ads, CNPJ) | Base proprietária estática de 240M+ contatos cadastrados |

### 🧭 Diretrizes Estratégicas vs Apollo
1. **Não competir de frente em Sourcing via LinkedIn**: Território da Apollo. O LinkedIn será usado pelo Lead Finder **apenas para identificar o decisor** de um lead garimpado localmente.
2. **Posicionamento por Outcome de Nicho**: Evitar o termo genérico "sales platform"; posicionar como a solução que entrega o **lead certo com a mensagem pronta**.
3. **Precificação em Reais (R$)**: Modelo mais acessível que os planos em dólar por assento da Apollo.
4. **Bandeira de Precisão Local**: Destacar que os dados do Lead Finder são vivos (validados via APIs e sinais públicos no momento da busca) em contraste com bases legadas.

---

## 💻 Estado Técnico Atual (Documento 1 da Wiki)

### 🚀 Tech Stack
| Camada | Tecnologia | Detalhes |
| --- | --- | --- |
| **Frontend** | Next.js 16.1.6, React 19.2 | App Router, JavaScript puro (sem TS), CSS nativo com variáveis (sem Tailwind/shadcn) |
| **Backend** | Node.js ≥20, Express 4 | CommonJS, API REST rodando na porta `:3001` |
| **Banco de Dados**| PostgreSQL + Prisma 6 | Utiliza o adapter `@prisma/adapter-pg` |
| **IA** | OpenAI `gpt-4o-mini` | Análise estruturada e saída rigorosamente em JSON |

### 🛠️ Arquitetura do Backend (Camadas Limpas)
- `routes/`: Endpoints HTTP e orquestração (`auth`, `businesses`, `search`, `settings`).
- `services/`: Integrações externas isoladas (1 serviço por arquivo):
  - `google-places.js`: Busca de estabelecimentos locais via Google Places API.
  - `instagram.js`: Extração via Serper API (ou fallback por scraping) + parsing de links/Linktree.
  - `meta-ads.js`: Verificação de anúncios ativos na Meta Ads Library.
  - `ai-review.js`: Chamada estruturada à OpenAI GPT-4o-mini.
- `lib/prisma.js`: Singleton do Prisma Client.
- `middleware/auth.js`: Middleware único de validação da senha de acesso.
- **Padronização**: `router.use(authMiddleware)`, tratamento com `next(error)` central e logs padronizados (`[Search]`, `[Review]`).

### 🗄️ Modelo de Dados (Prisma)
- `Business`: Dados obtidos do Google Places (`name`, `phone`, `rating`, `hasWebsite`, geolocalização, fotos).
- `BusinessReport` (Relação 1:1 com Business): Dados enriquecidos do Instagram (bio, seguidores, posts), identidade visual sugerida pela IA, `suitabilityScore` (1–10), `aiSummary`, `approachSuggestion` e status do lead (`PENDING → REVIEWED → CONTACTED → REJECTED`).
- `User`: Estrutura de CRUD com papéis/roles, atualmente funcional para gerenciamento mas decorativa (sem rotas autenticadas por usuário individual).

### 🔄 Pipeline de Enriquecimento/Review (por Negócio)
1. **Instagram**: Busca via Serper API (ou scraping) → atualiza `hasWebsite` se encontrar site na bio/linktree.
2. **Meta Ads**: Checa veiculação de anúncios ativos.
3. **IA (GPT-4o-mini)**: Gera análise estruturada com algoritmo de backoff/retry.
4. **Lote**: Endpoint `/review-all` executa o pipeline em lote (até 10 leads simultâneos).

### 🖥️ Frontend (Telas & Estrutura)
- `/`: Autenticação por senha estática (`AUTH_PASSWORD`).
- `/dashboard`: Painel principal com busca, estatísticas, listagem e filtros.
- `/business/[id]`: Dossiê completo do lead enriquecido e pontuado.
- `/settings`: CRUD de usuários e estimativa de custos das APIs.
- **Sub-páginas Legais**: `/settings/privacy-policy`, `/settings/terms-of-use`, `/settings/data-deletion` (compliance para app review Meta).

---

## ⚖️ Decisões Estratégicas & Trade-offs
- **Assistência ao Last Mile**: O produto **assiste** o fluxo (localiza decisor, sugere canal e minuta de mensagem); **não dispara em massa automaticamente** (respeito estrito à LGPD e proteção contra bloqueios/ban na Evolution API).
- **Guardrails Inegociáveis**: Controle de ritmo de abordagens e conformidade legal estrita.
- **Roadmap Prioritário**: Priorizar preenchimento de lacunas das ferramentas tradicionais (Trends, palavras-chave de alto custo em anúncios, bibliotecas de ads) antes de integração com LinkedIn.
- **Auth Simplificada**: O token é a senha estática salva no `localStorage` sem hash/expiração. Suficiente internamente, inadequado para exibição pública.
- **Arquivos Secretos**: O arquivo `.env` armazena segredos reais (Google, OpenAI, Serper, Meta). Mantido fora do Git via `.gitignore`.
- **Fragilidade de Scraping**: Scraping direto no Google/IG é suscetível a instabilidades; Serper API atua como camada de mitigação.

---

## 🛠️ Oportunidades de Refatoração & Débito Técnico
- **Camada de Orquestração no Backend**: Os endpoints `/review` e `/review-all` duplicam a lógica do pipeline → Criar `services/review-pipeline.js`.
- **DRY no Frontend**: Reutilização de rotinas de API (`API_URL`, `getToken()`, `authHeaders()`) atualmente redefinidas em cada página → Criar `lib/api.js`.
- **Componentização do Frontend**: Extrair componentes reutilizáveis (`ScoreCircle`, `StatusBadge`, Modais) hoje definidos inline.
- **Single Source of Truth para Status**: Padronizar enums de status (`PENDING`, `REVIEWED`, `CONTACTED`, `REJECTED`) entre backend e frontend.
- **Padronização Tzolkin**: Transicionar futuramente para TypeScript + Tailwind/shadcn para alinhar ao ecossistema da empresa.

---

## 🔬 Hipóteses & Validações (Learnings)
- 🟡 **Hipóteses em Validação**:
  - Faturamento / ticket médio do ICP e *willingness-to-pay* (R$ 47–197/mês).
  - Qualidade e taxa de cobertura real do dado de `CNPJ → Sócio`.
  - Taxa de contato público alcançável no sweet spot.
  - Limites operacionais seguros anti-ban da Evolution API.
  - Nichos com maior taxa de conversão real (`suitabilityScore` × status `CONTACTED`).
- 🧪 **Plano de Validação**: 5 a 10 entrevistas em profundidade com ICPs + medições diretas de uso e conversão no Lead Finder.
- 📐 **Próximo Passo Técnico**: Elaborar o blueprint de Tool-Use (Function Calling API Anthropic/Claude) para o Notebook-Agente.

---

## ⚙️ Estrutura do Monorepo
- `backend/`: API Express / Node.js (`src/routes`, `src/services`, `src/middleware`, `prisma/schema.prisma`).
- `frontend/`: Aplicação Next.js 16 (`src/app/`, `public/`).

---

## 📅 Informações Operacionais
- **Cliente / Proprietário**: Tzolkin
- **Responsável**: Gustavo
- **Data da Definição**: 21/07/2026
