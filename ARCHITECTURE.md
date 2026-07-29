# Arquitetura e Organização de Código — Tzolkin Tracer / Lead Finder

Este documento descreve a estrutura de diretórios, arquitetura de componentes, sistema de design e regras de desenvolvimento do projeto **Tzolkin Tracer**.

---

## 1. Estrutura do Monorepo

O repositório é gerenciado via **pnpm Workspaces** e compilado pelo **Turbopack / Next.js 16**.

```
lead-finder/
├── apps/
│   └── web/                     # Aplicação Web Principal (Next.js App Router)
│       ├── public/              # Assets estáticos e imagens públicos
│       │   ├── logos/           # Logos normalizados de serviços (manifest.json)
│       │   ├── slider/          # Imagens do carrossel interativo Hero
│       │   └── favicon.svg      # Favicons estáticos e animados (fill="#18181B")
│       └── src/
│           ├── app/             # Rotas do App Router (/feed, /tracer, /settings, /business/[id])
│           ├── components/      # Componentes React isolados por Domínio
│           │   ├── brand/       # Sistema de Design & Logos (TzolkinLogo, ServiceLogos, Slider)
│           │   ├── shell/       # App Shell & Navegação (AppShell, Sidebar)
│           │   ├── market/      # Inteligência de Mercado B2B (HeroStat, KeywordChip, PersonMention)
│           │   ├── signal/      # Feeds de Intenção & Sinais (SignalRow, AxisPills)
│           │   └── legacy/      # Componentes legados e backups de arquivos
│           └── lib/             # Funções utilitárias e clientes de banco de dados
├── brand/                       # Arquivos-fonte vetoriais da marca (.svg / .ai)
├── packages/
│   ├── database/                # Schema Prisma, migrações e scripts de seed
│   └── config/                  # Configurações compartilhadas (ESLint, TSConfig, Prettier)
├── AGENTS.md                    # Regras globais para agentes e desenvolvedores
└── ARCHITECTURE.md              # Este guia de arquitetura
```

---

## 2. Organização por Domínios (Domain-Driven Components)

Todos os componentes React em `apps/web/src/components` estão organizados em **domínios funcionais**, cada um contendo um arquivo `index.js` para exportações diretas:

- **`@/components/brand`**: Componentes da identidade visual da marca Tzolkin (Logos vetoriais com morphing, Slider Elementor, ícones e animações).
- **`@/components/shell`**: Estrutura da aplicação, navegação lateral e layouts universais.
- **`@/components/market`**: Componentes visuais para exibição de dados de inteligência comercial B2B (dossiês, chips de nicho, mídias e menções a sócios).
- **`@/components/signal`**: Feeds de sinais de intenção, badges de divergência e pilhas de eixos comerciais.

### Exemplo de Importação Limpa
```javascript
// Importando via alias @/components e barrel exports
import { TzolkinMorphingTile, LeadFinderLockup } from '@/components/brand';
import { AppShell } from '@/components/shell';
import { SignalRow } from '@/components/signal';
```

---

## 3. Tokens do Sistema de Design (CSS Variables)

As variáveis globais de estilo estão definidas em [`apps/web/src/app/globals.css`](file:///d:/Códigos/Tzolkin/Portifolio/lead-finder/apps/web/src/app/globals.css):

| Token CSS | Valor / Hex | Descrição |
| :--- | :--- | :--- |
| `var(--tzolkin-yellow)` | **`#FFD400`** | Amarelo de acento e destaque de divergência |
| `var(--bg-primary)` | **`#0A0A0A`** | Fundo principal da aplicação |
| `var(--bg-secondary)` | **`#18181B`** | Fundo dos cards e tiles de logos |
| `var(--text-primary)` | **`#FAFAF7`** | Texto branco de alta legibilidade |
| `var(--text-secondary)` | **`#9A9A92`** | Texto cinza secundário |

---

## 4. Regras Obrigatórias

1. **Links de WhatsApp**: Devem utilizar EXCLUSIVAMENTE a estrutura `https://wa.me/<numero>` sanitizada em E.164 (conforme definido no `AGENTS.md`).
2. **Logos SVG**: Devem utilizar nomenclatura em `kebab-case` sem atributos fixos de `width`/`height` no container externo quando for responsivo.
3. **Favicons**: Devem conter o atributo nativo `fill="#18181B"` no elemento `<rect>` para garantir a renderização exata do fundo cinza nos navegadores.
