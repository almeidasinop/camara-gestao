# Estágio 1: Build do Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Estágio 2: Build do Backend
FROM golang:alpine AS backend-builder
WORKDIR /app
# glebarez/sqlite é pure Go, não precisa de gcc/build-base
COPY go.mod go.sum ./
COPY vendor ./vendor
COPY *.go ./
# Build Pure Go
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o server .

# Estágio 3: Imagem Final
FROM alpine:latest
WORKDIR /app

# Instalar dependências leves se necessário (ca-certificates para HTTPS)
RUN apk add --no-cache ca-certificates

# Copiar binário
COPY --from=backend-builder /app/server .
# Copiar arquivos estáticos do frontend buildado
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Criar pasta para o Banco de Dados (volume)
RUN mkdir -p /app/data
# Setar variável de ambiente para o banco usar o volume
ENV DB_PATH=/app/data/glpi_clone.db
ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
