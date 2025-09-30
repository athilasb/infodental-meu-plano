FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto dos arquivos
COPY . .

# Expor porta 3001 (porta configurada no package.json)
EXPOSE 3001

# Comando para rodar em modo desenvolvimento com hot reload
CMD ["npm", "run", "dev"]