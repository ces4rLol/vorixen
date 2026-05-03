# Despliegue de VORIXEN en Hostinger VPS Ubuntu

Guía para subir VORIXEN a GitHub y desplegarlo manualmente en un VPS Ubuntu de Hostinger con `vorixen.com`, Node 24, PM2, Nginx y SSL.

## 1. Preparar GitHub desde tu computador

No subas secretos ni datos runtime. Este repo ya ignora `.env`, SQLite, memoria, logs y `node_modules`.

```bash
git init
git add .
git commit -m "Prepare Vorixen production deploy"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Si `npm` está disponible en tu computador, genera `package-lock.json` antes del commit:

```bash
npm install --package-lock-only
git add package-lock.json
git commit -m "Add package lock"
```

## 2. Apuntar el dominio

En Hostinger DNS crea estos registros:

```text
A     @      IP_DEL_VPS
A     www    IP_DEL_VPS
```

Espera la propagación antes de pedir SSL.

## 3. Preparar el VPS Ubuntu

Conéctate por SSH:

```bash
ssh root@IP_DEL_VPS
```

Actualiza Ubuntu e instala herramientas:

```bash
apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx
```

Instala Node 24 con NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
node --version
npm --version
```

Instala PM2:

```bash
npm install -g pm2
pm2 startup systemd
```

Ejecuta el comando que `pm2 startup` te imprima.

## 4. Clonar y configurar VORIXEN

```bash
cd /var/www
git clone https://github.com/TU_USUARIO/TU_REPO.git vorixen
cd /var/www/vorixen
nano .env
```

Pega esta base y completa los valores reales:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
VORIXEN_API_KEY=clave_tecnica_larga_y_aleatoria
CORS_ORIGIN=https://vorixen.com
AUTH_DB_FILE=./data/vorixen.sqlite
SESSION_SECRET=secreto_largo_y_aleatorio_de_32_caracteres_minimo
SESSION_COOKIE_NAME=vorixen_session
SESSION_TTL_DAYS=7
VORIXEN_ADMIN_EMAIL=tu_correo_admin
VORIXEN_ADMIN_PASSWORD=tu_contraseña_admin_segura
ENABLE_MEMORY=true
MEMORY_FILE=./data/vorixen_memory.json
STRICT_GOVERNOR=true
STRICT_SPEECH_LOCK=true
STRICT_EXECUTION_PRECISION=true
ALLOW_SELF_AUDIT_WRITE=false
OPENAI_API_KEY=sk-tu_clave_openai
OPENAI_MODEL=gpt-5.5
OPENAI_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=2
REQUIRE_AI=true
ENABLE_AI_CONTROL=true
OPENAI_LOG_FILE=./logs/openai_errors.log
```

## 5. Instalar, probar y arrancar

```bash
mkdir -p data logs
npm install
npm run prod:check
npm test
npm run self-audit
npm run pm2:start
pm2 save
```

Verifica localmente:

```bash
curl http://127.0.0.1:3000/health
```

## 6. Configurar Nginx

```bash
cp /var/www/vorixen/deploy/nginx-vorixen.conf /etc/nginx/sites-available/vorixen
ln -sfn /etc/nginx/sites-available/vorixen /etc/nginx/sites-enabled/vorixen
nginx -t
systemctl reload nginx
```

Abre en navegador:

```text
http://vorixen.com
```

## 7. Activar SSL

Cuando DNS ya apunte al VPS:

```bash
certbot --nginx -d vorixen.com -d www.vorixen.com
systemctl reload nginx
```

Certbot ajustará Nginx para HTTPS. Luego abre:

```text
https://vorixen.com
```

## 8. Actualizar después de cambios en GitHub

En el VPS:

```bash
cd /var/www/vorixen
bash scripts/deploy_pull.sh
```

Ese script hace `git pull`, valida `.env`, instala dependencias, corre pruebas, autoauditoría, reinicia PM2 y ejecuta healthcheck local.

## 9. Primer uso

1. Entra a `https://vorixen.com`.
2. Inicia sesión con `VORIXEN_ADMIN_EMAIL` y `VORIXEN_ADMIN_PASSWORD`.
3. Abre el panel `Usuarios`.
4. Crea los usuarios que podrán usar el chat jurídico.
5. Cambia la contraseña admin inicial si fue temporal.

## 10. Comandos útiles

```bash
pm2 status
pm2 logs vorixen
pm2 restart vorixen
npm run prod:check
npm run self-audit
tail -f logs/openai_errors.log
```

## 11. Seguridad mínima

- Nunca subas `.env` a GitHub.
- Nunca subas `data/vorixen.sqlite`.
- Usa una clave OpenAI real y privada solo en el VPS.
- Usa contraseña admin fuerte.
- Mantén `REQUIRE_AI=true` en producción.
- Mantén `CORS_ORIGIN=https://vorixen.com`.
