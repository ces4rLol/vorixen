import fs from "fs";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const allowNoDotenv = process.env.VORIXEN_ENV_CHECK_ALLOW_NO_DOTENV === "true";
const failures = [];

if (!allowNoDotenv && !fs.existsSync(".env")) {
  failures.push(".env no existe. Créalo con nano .env siguiendo DEPLOY_HOSTINGER.md y completa secretos reales.");
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (!Number.isFinite(nodeMajor) || nodeMajor < 24) {
  failures.push(`Node >=24 requerido. Versión actual: ${process.versions.node}`);
}

const { config, validateConfig } = await import("../src/core/config.js");

try {
  validateConfig();
} catch (error) {
  failures.push(error.message);
}

const requiredExact = {
  NODE_ENV: "production",
  CORS_ORIGIN: "https://vorixen.com",
  ENABLE_AI_CONTROL: "true",
  REQUIRE_AI: "true"
};

for (const [key, expected] of Object.entries(requiredExact)) {
  if (String(process.env[key] || configValueFor(key) || "") !== expected) {
    failures.push(`${key} debe ser ${expected}`);
  }
}

if (!String(config.openaiApiKey || "").startsWith("sk-") || String(config.openaiApiKey || "").length < 24) {
  failures.push("OPENAI_API_KEY debe ser una clave real de OpenAI.");
}

if (String(config.apiKey || "").length < 24) {
  failures.push("VORIXEN_API_KEY debe ser larga y aleatoria.");
}

if (String(config.sessionSecret || "").length < 32) {
  failures.push("SESSION_SECRET debe tener mínimo 32 caracteres.");
}

if (!String(config.authDbFile || "").includes("data/") && !String(config.authDbFile || "").includes("data\\")) {
  failures.push("AUTH_DB_FILE debe apuntar a ./data/vorixen.sqlite o ruta equivalente dentro de data.");
}

if (failures.length) {
  console.error("VORIXEN production env check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("VORIXEN production env check passed.");
console.log(`Domain: ${config.corsOrigin}`);
console.log(`Node: ${process.versions.node}`);
console.log(`OpenAI model: ${config.openaiModel}`);
console.log(`Auth DB: ${config.authDbFile}`);

function configValueFor(key) {
  const map = {
    NODE_ENV: config.nodeEnv,
    CORS_ORIGIN: config.corsOrigin,
    ENABLE_AI_CONTROL: String(config.enableAIControl),
    REQUIRE_AI: String(config.requireAI)
  };
  return map[key];
}
