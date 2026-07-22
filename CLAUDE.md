# Lead Finder — Tzolkin (Produtização SaaS)

## 📌 Visão Geral & Contexto
Porta de entrada para a **produtização do Lead Finder** (Task do Calendário Operacional — Gustavo).
O Lead Finder é uma ferramenta de prospecção e inteligência comercial que busca negócios locais sem site, enriquece dados com Instagram/Meta Ads e pontua os leads via IA.

A produtização transforma a ferramenta interna da Tzolkin em um **SaaS B2B** cuja promessa central é **conectar leads ideais com prestadores de serviço**, assistindo o **last mile: identificar/alcançar o decisor e iniciar a conversa**.

---

## 🎯 Tese Central & Diferenciais (Moat)
- **Achar lead = Table Stakes** (ferramentas horizontais globais como Apollo.io já fazem a busca).
- **Fosso Defensável (Moat) = Last Mile Local (Brasil)**: Identificação do decisor real + aproximação da 1ª conversa, algo que concorrentes US-first/globais não entregam no mercado brasileiro.
- **Superpoderes no Brasil**:
  - **CNPJ → Sócio**: Identificação do decisor por consulta de quadro societário (dados públicos).
  - **WhatsApp (Evolution API)**: Canal primário e direto de comunicação de donos de PME no Brasil.
- **Cliente Zero**: A própria **Tzolkin**. O ICP primário é composto por "empresas como a Tzolkin".

---

## 📂 Documentos Internos & Arquitetura
1. **Estado Técnico Atual**: Stack (Next.js, Node.js/Express, Prisma, PostgreSQL), arquitetura de serviços e schema.
2. **Análise Competitiva (Apollo.io)**: Posicionamento, precificação, forças/fraquezas e mapeamento de brechas no mercado BR.
3. **ICP & ILP (Ideal Lead Profile & Decisor Alcançável)**: Perfil de cliente comprador, lead ideal, sweet spot e anti-ICP.
4. **Arquitetura de Produto**: Notebook-agente, micro-CRM, módulo de descoberta de decisor, enriquecimento de contatos e guardrails de operação.

---

## ⚖️ Decisões Estratégicas & Trade-offs
- **Assistência ao Last Mile**: O produto **assiste** o fluxo (localiza decisor, sugere canal e minuta de mensagem); **não dispara em massa automaticamente** (respeito estrito à LGPD e proteção contra bloqueios na Evolution API).
- **Guardrails Inegociáveis**: Controle de ritmo de abordagens e conformidade legal estrita.
- **Roadmap Prioritário**: Priorizar preenchimento de lacunas das ferramentas tradicionais (Trends, palavras-chave de alto custo em anúncios, bibliotecas de ads) antes de integração com LinkedIn.

---

## 🔬 Hipóteses & Validações (Learnings)
- 🟡 **Hipóteses em Validação**:
  - Faturamento / ticket médio do ICP e *willingness-to-pay* (disposição a pagar pelo SaaS).
  - Taxa de cobertura real de CNPJ → Sócio e taxa de contato público alcançável.
- 🧪 **Plano de Validação**: 5 a 10 entrevistas em profundidade com ICPs + métricas reais obtidas no uso interno do Lead Finder.

---

## ⚙️ Estrutura do Monorepo
- `backend/`: API Node.js (Express, Prisma ORM, integrações com Google Places, Instagram, Meta Ads, AI Review).
- `frontend/`: Aplicação web Next.js (App Router, Tailwind CSS/CSS Modules, Dashboard, Business details, Settings).

---

## 📅 Informações Operacionais
- **Cliente / Proprietário**: Tzolkin
- **Responsável**: Gustavo
- **Data da Definição**: 21/07/2026
