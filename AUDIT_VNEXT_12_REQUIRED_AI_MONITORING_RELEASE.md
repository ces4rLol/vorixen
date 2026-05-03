# AUDIT VORIXEN vNext 12 — Required AI Monitoring Release

## Veredicto

Esta versión consolida VORIXEN como release limpio y reemplazable completo, con OpenAI obligatorio en producción cuando `REQUIRE_AI=true`, sin fallback silencioso y con monitoreo estructurado de errores de API.

## Objetivo de la versión

Cerrar el riesgo operativo detectado: que VORIXEN pareciera usar IA, pero respondiera en modo local/fallback sin advertirlo. Desde esta versión, si se exige IA y la API no está configurada, falla o produce una respuesta inválida, VORIXEN bloquea la respuesta en vez de simular suficiencia.

## Cambios principales

1. `REQUIRE_AI=true` como modo de producción recomendado.
2. Validación de configuración: si `REQUIRE_AI=true`, `OPENAI_API_KEY` es obligatoria.
3. `/chat` usa IA automáticamente cuando el modo requerido está activo; no depende de que el frontend envíe `useAI:true`.
4. Si OpenAI no está configurado, falla o responde mal, VORIXEN bloquea con error explícito.
5. `openai-monitor` registra métricas sin exponer secretos.
6. Log estructurado en `OPENAI_LOG_FILE`, por defecto `./logs/openai_errors.log`.
7. Reintentos controlados con `OPENAI_MAX_RETRIES`.
8. Endpoint administrativo `GET /admin/ai-health` para revisar estado de IA.
9. Conserva el control Reina: OpenAI expande análisis, pero VORIXEN valida, filtra y gobierna la respuesta.

## Variables críticas de entorno

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
OPENAI_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=2
ENABLE_AI_CONTROL=true
REQUIRE_AI=true
OPENAI_LOG_FILE=./logs/openai_errors.log
```

## Regla soberana

```text
La API no decide.
La API produce análisis.
VORIXEN valida verdad, prueba, suficiencia, lenguaje y consecuencia jurídica antes de entregar salida.
```

## Pruebas observadas

```text
npm test: PASS run-all 16/16 suites
syntax: PASS 43/43
self-audit: codebase_operational, score 100/100
vNext 12 required AI monitoring: PASS 7/7
```

## Compatibilidad

```text
Node.js >= 24
ES Modules
Express
SQLite nativo de Node
PM2 compatible
Endpoint principal: POST /chat
Health: GET /health
AI health: GET /admin/ai-health
```

## Uso correcto

Este paquete debe reemplazar completo la versión anterior. No debe mezclarse con releases viejos. No incluye `.env` real ni memoria runtime previa.
