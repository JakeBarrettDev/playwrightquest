FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime environment
ENV NODE_ENV=production
ENV EXECUTION_RUNNER=local
ENV PORT=3000

# Ensure the sandbox directory exists and is writable
RUN mkdir -p /app/.sandbox/traces

EXPOSE 3000
CMD ["npm", "start"]
