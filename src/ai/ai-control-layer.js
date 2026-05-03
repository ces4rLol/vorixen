import { buildAIRequestContract, buildOpenAIMessages } from "./ai-request-contract-engine.js";
import { callOpenAIChat, isOpenAIConfigured } from "./openai-client.js";
import { validateAIControlledResponse, buildAIValidationFailureOutput } from "./ai-response-validator-engine.js";
import { config } from "../core/config.js";
import { markAIResponseRejected } from "./openai-monitor.js";

export async function applyAIControlLayer({ message, runtime, output, conversation, fetchImpl } = {}) {
  const contract = buildAIRequestContract({ message, runtime, output, conversation });
  if (!isOpenAIConfigured()) {
    if (config.requireAI) throw new Error("required_ai_unavailable: OPENAI_API_KEY no configurada");
    return { usedAI: false, reason: "openai_api_key_not_configured", output, contractSummary: summarizeContract(contract) };
  }

  const aiResult = await callOpenAIChat({ messages: buildOpenAIMessages(contract), fetchImpl });
  if (!aiResult.ok) {
    if (config.requireAI) throw new Error(`required_ai_failed: ${aiResult.reason}`);
    return { usedAI: false, reason: aiResult.reason, output, contractSummary: summarizeContract(contract), aiResult };
  }

  const validation = validateAIControlledResponse({ text: aiResult.text, contract });
  if (!validation.valid) {
    markAIResponseRejected("ai_response_rejected_by_vorixen", { errors: validation.errors });
    if (config.requireAI) throw new Error(`required_ai_rejected_by_vorixen: ${validation.errors.join("; ")}`);
    return {
      usedAI: false,
      reason: "ai_response_rejected_by_vorixen",
      output: buildAIValidationFailureOutput({ localOutput: output, validation }),
      validation,
      contractSummary: summarizeContract(contract)
    };
  }

  return { usedAI: true, reason: "ai_response_validated", output: validation.output, validation, usage: aiResult.usage, model: aiResult.model, contractSummary: summarizeContract(contract) };
}

function summarizeContract(contract) {
  return {
    version: contract.version,
    status: contract.runtimeLock.status,
    speechClass: contract.runtimeLock.speechClass,
    topic: contract.runtimeLock.topic?.id || null,
    objective: contract.runtimeLock.objective?.id || null,
    hardRules: contract.hardRules.length
  };
}
