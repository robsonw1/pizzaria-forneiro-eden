# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

COPY package*.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
