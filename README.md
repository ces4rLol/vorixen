# VORIXEN vNext 12 — Required AI Monitoring Release

Sistema jurídico Node/Express con control obligatorio de OpenAI en producción, monitoreo de errores de API, salida profesional, autoauditoría de código, anclaje de verdad, suficiencia probatoria, memoria de caso y gobernador estratégico.

## Ambiente

- Node.js >= 24
- Express + ES Modules
- SQLite nativo de Node (`node:sqlite`)
- Frontend: `/public`
- Backend: `/src/server.js`
- Endpoint principal: `POST /chat`
- Login: `POST /auth/login`
- Usuario actual: `GET /auth/me`
- Gestión de usuarios: `/admin/users`
- Health: `GET /health`
- Estado IA: `GET /admin/ai-health`
- Autoauditoría: `POST /admin/self-audit` y `npm run self-audit`
- PM2 compatible: `npm run pm2:start`

## Instalación

```bash
npm install
nano .env
npm test
npm run self-audit
npm start
```

## Despliegue en Hostinger VPS

La guía completa para GitHub, VPS Ubuntu, PM2, Nginx, SSL y `vorixen.com` está en [`DEPLOY_HOSTINGER.md`](./DEPLOY_HOSTINGER.md).

Resumen:

```bash
git clone <tu-repo-github> vorixen
cd vorixen
nano .env
npm install
npm run prod:check
npm test
npm run self-audit
npm run pm2:start
```

## Configuración mínima para operar como La Reina con API

El archivo `.env` real se mantiene fuera de GitHub. En el VPS créalo con `nano .env` y completa la clave OpenAI real:

```env
NODE_ENV=production
VORIXEN_API_KEY=coloca_una_clave_segura
CORS_ORIGIN=https://vorixen.com
AUTH_DB_FILE=./data/vorixen.sqlite
SESSION_SECRET=coloca_un_secreto_largo_de_minimo_32_caracteres
VORIXEN_ADMIN_EMAIL=admin@vorixen.com
VORIXEN_ADMIN_PASSWORD=coloca_una_contraseña_segura
OPENAI_API_KEY=sk-tu_clave_openai_real
OPENAI_MODEL=gpt-5.5
ENABLE_AI_CONTROL=true
REQUIRE_AI=true
OPENAI_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=2
OPENAI_LOG_FILE=./logs/openai_errors.log
```

## Regla crítica de IA

VORIXEN exige OpenAI fuera de pruebas. Si OpenAI no está configurado, falla o entrega una respuesta rechazada por el validador Reina, la respuesta se bloquea con error explícito.

## Autenticación

El chat web usa correo y contraseña. El primer admin se crea desde `.env` con `VORIXEN_ADMIN_EMAIL` y `VORIXEN_ADMIN_PASSWORD`. Luego ese admin puede crear usuarios desde el panel web. Las sesiones se guardan en cookie `HttpOnly`; el frontend no almacena ni expone `VORIXEN_API_KEY`.

## Monitoreo

```bash
pm2 logs
cat logs/openai_errors.log
```

Endpoint:

```http
GET /admin/ai-health
x-api-key: <VORIXEN_API_KEY>
```

## Regla de release

Este paquete es reemplazable completo. No mezclar con zips anteriores.
