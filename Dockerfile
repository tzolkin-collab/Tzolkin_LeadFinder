# Dockerfile de produção para deploy da API no Easypanel / DigitalOcean
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS builder
WORKDIR /app

# Copiar arquivos de configuração do monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Instalar dependências e compilar pacotes
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar arquivos construídos
COPY --from=builder /app ./

EXPOSE 3001

# Executa o schema push do Prisma e inicia a API
CMD ["sh", "-c", "pnpm --filter @tzolkin/database exec prisma db push && pnpm --filter @tzolkin/api start"]
