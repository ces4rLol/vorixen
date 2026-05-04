import { config } from "../core/config.js";
import { markOpenAIAttempt, markOpenAISuccess, markOpenAIFailure } from "./openai-monitor.js";

export function isOpenAIConfigured() {
  return Boolean(config.openaiApiKey && config.openaiApiKey.length > 20);
}

export async function callOpenAIChat({ messages, temperature = 0.1, maxTokens = 2400, fetchImpl = globalThis.fetch } = {}) {
  if (!isOpenAIConfigured()) {
    markOpenAIFailure("openai_api_key_not_configured");
    return { ok: false, skipped: true, reason: "openai_api_key_not_configured" };
  }
  if (typeof fetchImpl !== "function") {
    markOpenAIFailure("fetch_unavailable");
    return { ok: false, skipped: false, reason: "fetch_unavailable" };
  }

  const attempts = Math.max(1, config.openaiMaxRetries + 1);
  let lastResult = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    markOpenAIAttempt();
    const started = Date.now();
    const result = await singleOpenAIChatAttempt({ messages, temperature, maxTokens, fetchImpl });
    if (result.ok) {
      markOpenAISuccess({ latencyMs: Date.now() - started });
      return { ...result, attempts: attempt };
    }
    lastResult = { ...result, attempts: attempt };
    const retryable = ["openai_timeout", "openai_call_failed", "openai_http_error"].includes(result.reason) && (!result.status || result.status >= 429);
    if (!retryable || attempt === attempts) break;
  }
  markOpenAIFailure(lastResult?.reason || "openai_unknown_failure", lastResult || {});
  return lastResult || { ok: false, skipped: false, reason: "openai_unknown_failure" };
}

async function singleOpenAIChatAttempt({ messages, temperature, maxTokens, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.openaiTimeoutMs);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages,
        temperature,
        max_completion_tokens: maxTokens
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, skipped: false, reason: "openai_http_error", status: response.status, data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text.trim()) return { ok: false, skipped: false, reason: "openai_empty_response", status: response.status, data };
    return { ok: true, text, usage: data?.usage || null, model: data?.model || config.openaiModel };
  } catch (error) {
    return { ok: false, skipped: false, reason: error.name === "AbortError" ? "openai_timeout" : "openai_call_failed", error: error.message };
  } finally {
    clearTimeout(timer);
  }
}
