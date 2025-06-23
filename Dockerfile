# Usar uma imagem Node.js oficial como base
FROM node:18-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
# Verificar se libc6-compat pode ser necessário
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar dependências baseado no gerenciador de pacote preferido
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile não encontrado." && exit 1; \
  fi

# Rebuild da aplicação apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Executar o build da aplicação
RUN npm run build

# Imagem de produção, copiar todos os arquivos e executar
FROM nginx:alpine AS runner
WORKDIR /app

# Copiar os arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Criar configuração personalizada do nginx
RUN echo 'server { \
    listen 8081; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://localhost:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expor a porta 8081
EXPOSE 8081

# Iniciar o nginx
CMD ["nginx", "-g", "daemon off;"] 