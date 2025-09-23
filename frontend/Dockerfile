# Dockerfile para frontend React + Vite
# Dockerfile para desarrollo y producción

FROM node:20-alpine AS base

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

# Update OS packages to reduce vulnerabilities
RUN apk update && apk upgrade

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host"]

