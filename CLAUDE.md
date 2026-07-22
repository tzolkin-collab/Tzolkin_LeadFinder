# Lead Finder — Tzolkin (Produtização SaaS)

## 📌 Visão Geral & Contexto
Porta de entrada para a **produtização do Lead Finder** (Task do Calendário Operacional — Gustavo, 21/07/2026).
O Lead Finder é a ferramenta interna de prospecção e inteligência comercial da Tzolkin. Ele encontra negócios locais **sem website**, enriquece cada lead com dados públicos (Instagram, Meta Ads) e usa IA para pontuá-los (score 1–10) em relação à aderência para serviços de criação de site/landing page, gerando sugestões de abordagem.

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
  - Faturamento / ticket médio do ICP e *willingness-to-pay* (disposição a pagar pelo SaaS).
  - Taxa de cobertura real de CNPJ → Sócio e taxa de contato público alcançável.
- 🧪 **Plano de Validação**: 5 a 10 entrevistas em profundidade com ICPs + métricas reais obtidas no uso interno do Lead Finder.

---

## ⚙️ Estrutura do Monorepo
- `backend/`: API Express / Node.js (`src/routes`, `src/services`, `src/middleware`, `prisma/schema.prisma`).
- `frontend/`: Aplicação Next.js 16 (`src/app/`, `public/`).

---

## 📅 Informações Operacionais
- **Cliente / Proprietário**: Tzolkin
- **Responsável**: Gustavo
- **Data da Definição**: 21/07/2026
