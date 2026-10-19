FROM node:24-slim

WORKDIR /app

# 1. Dependencias primero (aprovecha la caché de Docker)
COPY package.json package-lock.json ./
RUN npm ci

# 2. Luego el código, y se compila TypeScript a JavaScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# 3. No correr como root
USER node

CMD ["node", "dist/index.js"]