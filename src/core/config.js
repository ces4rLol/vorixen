import fs from "fs";

loadEnvFile();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
  apiKey: process.env.VORIXEN_API_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  authDbFile: process.env.AUTH_DB_FILE || "./data/vorixen.sqlite",
  sessionSecret: process.env.SESSION_SECRET || "",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "vorixen_session",
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 7),
  adminEmail: process.env.VORIXEN_ADMIN_EMAIL || "",
  adminPassword: process.env.VORIXEN_ADMIN_PASSWORD || "",
  enableMemory: process.env.NODE_ENV === "test" ? String(process.env.ENABLE_MEMORY || "false") === "true" : String(process.env.ENABLE_MEMORY || "true") === "true",
  memoryFile: process.env.MEMORY_FILE || "./data/vorixen_memory.json",
  strictGovernor: String(process.env.STRICT_GOVERNOR || "true") === "true",
  strictSpeechLock: String(process.env.STRICT_SPEECH_LOCK || "true") === "true",
  strictExecutionPrecision: String(process.env.STRICT_EXECUTION_PRECISION || "true") === "true",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.5",
  openaiTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 30000),
  enableAIControl: String(process.env.ENABLE_AI_CONTROL || "true") === "true",
  requireAI: process.env.NODE_ENV === "test" ? false : String(process.env.REQUIRE_AI || "true") === "true",
  openaiMaxRetries: Number(process.env.OPENAI_MAX_RETRIES || 2),
  openaiLogFile: process.env.OPENAI_LOG_FILE || "./logs/openai_errors.log"
};

export function validateConfig(){
  const errors=[];
  const unsafeApiKeys=new Set(["", "change_this_api_key", "dev_vorixen_key", "changeme", "test", "123456"]);
  const unsafeSecretTokens=["change_this","changeme","password","123456"];
  const nonTest=config.nodeEnv!=="test";
  if(!Number.isFinite(config.port)||config.port<=0||config.port>65535) errors.push("PORT inválido");
  if(config.nodeEnv==="production" && unsafeApiKeys.has(config.apiKey)) errors.push("VORIXEN_API_KEY seguro requerido en producción");
  if(config.nodeEnv==="production" && config.corsOrigin==="*") errors.push("CORS_ORIGIN no puede ser * en producción");
  if(!config.authDbFile) errors.push("AUTH_DB_FILE requerido");
  if(!Number.isFinite(config.sessionTtlDays)||config.sessionTtlDays<1||config.sessionTtlDays>30) errors.push("SESSION_TTL_DAYS inválido");
  if(nonTest && (String(config.sessionSecret||"").length<32 || unsafeSecretTokens.some(token=>String(config.sessionSecret||"").toLowerCase().includes(token)))) errors.push("SESSION_SECRET seguro requerido");
  if(nonTest && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.adminEmail)) errors.push("VORIXEN_ADMIN_EMAIL válido requerido");
  if(nonTest && (String(config.adminPassword||"").length<8 || unsafeSecretTokens.some(token=>String(config.adminPassword||"").toLowerCase().includes(token)))) errors.push("VORIXEN_ADMIN_PASSWORD seguro requerido");
  if(!config.memoryFile) errors.push("MEMORY_FILE requerido");
  if(!Number.isFinite(config.openaiTimeoutMs)||config.openaiTimeoutMs<1000||config.openaiTimeoutMs>120000) errors.push("OPENAI_TIMEOUT_MS inválido");
  if(nonTest && !config.requireAI) errors.push("REQUIRE_AI debe ser true fuera de pruebas");
  if(config.requireAI && !config.enableAIControl) errors.push("ENABLE_AI_CONTROL debe ser true cuando REQUIRE_AI=true");
  if(config.requireAI && !config.openaiApiKey) errors.push("OPENAI_API_KEY requerido cuando REQUIRE_AI=true");
  if(config.nodeEnv==="production" && config.enableAIControl && !config.openaiApiKey) errors.push("OPENAI_API_KEY requerido si ENABLE_AI_CONTROL=true en producción");
  if(!Number.isFinite(config.openaiMaxRetries)||config.openaiMaxRetries<0||config.openaiMaxRetries>5) errors.push("OPENAI_MAX_RETRIES inválido");
  if(errors.length) throw new Error("config_error: "+errors.join("; "));
  return true;
}

function loadEnvFile(){
  const file = ".env";
  if(!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, "utf-8");
  for(const line of raw.split(/\r?\n/)){
    const trimmed=line.trim();
    if(!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index=trimmed.indexOf("=");
    const key=trimmed.slice(0,index).trim();
    const value=trimmed.slice(index+1).trim();
    if(!process.env[key]) process.env[key]=value;
  }
}
