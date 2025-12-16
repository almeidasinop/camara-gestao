# Estágio 1: Build do Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Estágio 2: Build do Backend
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app
# Instalar build-base para CGO (necessário para go-sqlite3)
RUN apk add --no-cache build-base
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
# Build estático com suporte a CGO
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o server .

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
