FROM node:20-alpine

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Update OS packages to reduce vulnerabilities
RUN apk update && apk upgrade

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "run", "dev", "--", "--host"]
