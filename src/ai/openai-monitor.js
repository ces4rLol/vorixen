import fs from "fs";
import path from "path";
import { config } from "../core/config.js";

const metrics = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  rejectedResponses: 0,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorReason: null,
  lastLatencyMs: null
};

export function markOpenAIAttempt(){
  metrics.totalCalls += 1;
}

export function markOpenAISuccess({ latencyMs } = {}){
  metrics.successfulCalls += 1;
  metrics.lastSuccessAt = new Date().toISOString();
  metrics.lastLatencyMs = latencyMs ?? null;
}

export function markOpenAIFailure(reason, detail = {}){
  metrics.failedCalls += 1;
  metrics.lastErrorAt = new Date().toISOString();
  metrics.lastErrorReason = reason || "unknown";
  appendOpenAILog({ level: "error", reason, ...sanitizeDetail(detail) });
}

export function markAIResponseRejected(reason, detail = {}){
  metrics.rejectedResponses += 1;
  metrics.lastErrorAt = new Date().toISOString();
  metrics.lastErrorReason = reason || "ai_response_rejected";
  appendOpenAILog({ level: "warn", reason: reason || "ai_response_rejected", ...sanitizeDetail(detail) });
}

export function getOpenAIMetrics(){
  return { ...metrics, configured: Boolean(config.openaiApiKey), requireAI: config.requireAI, model: config.openaiModel };
}

function appendOpenAILog(entry){
  try{
    const file = path.resolve(config.openaiLogFile);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ time: new Date().toISOString(), ...entry }) + "\n");
  }catch(error){
    // Logging failure must never expose secrets or crash the legal pipeline.
    console.error("openai_monitor_log_failed", error.message);
  }
}

function sanitizeDetail(detail){
  const safe = { ...detail };
  delete safe.apiKey;
  delete safe.authorization;
  delete safe.headers;
  if(typeof safe.data === "object" && safe.data){
    safe.data = JSON.parse(JSON.stringify(safe.data));
  }
  return safe;
}
