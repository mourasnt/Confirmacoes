# Configuração Kong para WhatsApp Confirmações

## Problemas Comuns

### 404 em /api/instancias e /api/templates

A rota `/api/templates` **não existe**. Use `/templates` ao invés.

### Headers X-Forwarded não estão sendo passados

Certifique-se que o Kong está  passando os headers corretamente.

---

## Configuração do Kong

### 1. Adicionar o serviço no Kong

```bash
curl -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "whatsapp-confirmacoes",
    "url": "http://whatsapp-confirmacoes:5000",
    "protocol": "http",
    "host": "whatsapp-confirmacoes",
    "port": 5000
  }'
```

### 2. Adicionar a rota no Kong

```bash
curl -X POST http://localhost:8001/services/whatsapp-confirmacoes/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "whatsapp-confirmacoes-route",
    "paths": ["/"],
    "strip_path": false,
    "preserve_host": true,
    "https_redirect_status_code": 301
  }'
```

### 3. Adicionar plugin de headers para ProxyFix

```bash
curl -X POST http://localhost:8001/services/whatsapp-confirmacoes/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "request-transformer",
    "config": {
      "add": {
        "headers": [
          "X-Forwarded-Proto:https",
          "X-Forwarded-Host:interno.3zx.com.br",
          "X-Forwarded-Prefix:/",
          "X-Forwarded-Port:443"
        ]
      }
    }
  }'
```

### 4. Adicionar proxy headers do Kong

```bash
curl -X PATCH http://localhost:8001/services/whatsapp-confirmacoes \
  -H "Content-Type: application/json" \
  -d '{
    "client_certificate": null,
    "connect_timeout": 60000,
    "host": "whatsapp-confirmacoes",
    "name": "whatsapp-confirmacoes",
    "port": 5000,
    "protocol": "http",
    "read_timeout": 60000,
    "write_timeout": 60000,
    "enabled": true
  }'
```

### 5. Habilitar proxy headers no Kong Gateway (kong.conf)

Certifique-se que estas configurações estão no `kong.conf`:

```conf
# Habilitar proxy headers
proxy_protocol = "on"
real_ip_header = "X-Forwarded-For"
trusted_ips = "0.0.0.0/0, ::/0"
real_ip_recursive = "off"
```

---

## Rotas Disponíveis

### API Endpoints

- `GET /api/instancias` - Lista instâncias da Evolution API
- `POST /api/criar-instancia` - Cria nova instância
- `POST /api/get-qrcode` - Obtém QR Code
- `POST /api/enviar-lote` - Envia mensagens em lote

### Web Endpoints

- `GET /` - Dashboard principal
- `GET /templates` - Lista de templates
- `POST /templates/novo` - Cria novo template
- `GET /historico` - Histórico de envios
- `GET /config` - Configurações (protegida por senha)
- `GET /health` - Health check

---

## Teste da Conectividade

```bash
# Test direto no container
docker exec whatsapp-confirmacoes curl http://localhost:5000/health

# Test através do Kong
curl -H "Host: interno.3zx.com.br" http://localhost:8000/health
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Configure no `.env`:
- `EVOLUTION_API_URL` - URL da Evolution API
- `EVOLUTION_API_KEY` - Chave API da Evolution
- `FLASK_ENV` - "production" ou "development"

---

## Debug

Se continuar recebendo 404:

1. Verifique se o container está rodando:
   ```bash
   docker ps | grep whatsapp-confirmacoes
   ```

2. Verifique os logs:
   ```bash
   docker logs -f whatsapp-confirmacoes
   ```

3. Teste acesso direto ao container:
   ```bash
   docker exec whatsapp-confirmacoes curl http://localhost:5000/api/instancias
   ```

4. Verifique a configuração do Kong:
   ```bash
   curl http://localhost:8001/services/whatsapp-confirmacoes
   curl http://localhost:8001/routes
   ```
