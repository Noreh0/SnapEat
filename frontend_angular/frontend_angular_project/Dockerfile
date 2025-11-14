# Estágio de build
FROM node:18 as build

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código e construir
COPY . .
RUN npm run build -- --configuration=production

# Estágio final com Nginx
FROM nginx:alpine

# Copiar configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build da aplicação
COPY --from=build /app/dist/frontend_angular_project /usr/share/nginx/html

# Expor porta
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
