import { config } from "../core/config.js";
import { classifyIntent } from "../engines/intent-engine.js";
import { detectOutputMode } from "../engines/output-mode-engine.js";
import { analyzeInput } from "../engines/analysis-engine.js";
import { applyConceptOverride } from "../engines/legal-concept-engine.js";
import { buildLegalSpace } from "../engines/comprehension-engine.js";
import { decide } from "../engines/decision-engine.js";
import { enforceGovernor } from "../governance/governor.js";
import { assertExecutionPrecision } from "../governance/execution-precision.js";
import { buildResponse } from "../engines/response-engine.js";
import { isCodeSelfAuditRequest, runCodeSelfAudit, formatCodeSelfAudit } from "../engines/code-self-audit-engine.js";
import { applyAIControlLayer } from "../ai/ai-control-layer.js";
import { recordMemory,getConversation,updateConversation } from "../memory/memory-engine.js";
import { applyTruthAnchor } from "../engines/truth-anchor-engine.js";
import { applyProofSufficiency } from "../engines/proof-sufficiency-engine.js";
import { applyCaseMemory } from "../engines/case-memory-engine.js";
import { applyStrategicGovernor } from "../engines/strategic-governor-engine.js";

export function runVorixen(message,options={}){
  const sessionId=options.sessionId||"default";
  const conversation=getConversation(sessionId);

  if(isCodeSelfAuditRequest(message)){
    const audit=runCodeSelfAudit({rootDir: options.rootDir || process.cwd(), apply: options.applySelfAudit===true});
    const output=formatCodeSelfAudit(audit);
    const memory=recordMemory({status:"code_self_audit",topic:{id:"code_self_audit",label:"Autoauditoría de código VORIXEN"},result:audit.status},sessionId);
    return {sessionId,mode:"code_self_audit",outputMode:"code_audit",analysis:{rawMessage:message,engine:"CODE_SELF_AUDIT_ENGINE"},legalSpace:{},runtime:audit,output,memory,aiControl:{usedAI:false,reason:"code_self_audit_local_only"}};
  }

  return buildLocalVorixenResult(message,{sessionId,conversation});
}

export async function runVorixenControlled(message,options={}){
  const local=runVorixen(message,options);
  if(local.mode==="code_self_audit") return local;
  const mustUseAI = config.requireAI || options.useAI === true;
  if(!config.enableAIControl) {
    if(config.requireAI) throw new Error("required_ai_disabled: ENABLE_AI_CONTROL debe estar activo");
    return {...local,aiControl:{usedAI:false,reason: options.useAI===true?"ai_control_disabled":"ai_not_requested"}};
  }
  if(!mustUseAI) return {...local,aiControl:{usedAI:false,reason:"ai_not_requested"}};

  const conversation=getConversation(local.sessionId);
  const aiControl=await applyAIControlLayer({message,runtime:local.runtime,output:local.output,conversation,fetchImpl:options.fetchImpl});
  return {...local,output:aiControl.output,aiControl};
}

function buildLocalVorixenResult(message,{sessionId,conversation}){
  const mode=classifyIntent(message,conversation);
  const outputMode=detectOutputMode(message,conversation);
  const rawAnalysis=analyzeInput(message,mode,conversation);
  const analysis=applyConceptOverride(rawAnalysis);
  const legalSpace=buildLegalSpace(analysis);
  const decision=decide(analysis,legalSpace,outputMode);
  const governed=enforceGovernor(decision);
  const precise=assertExecutionPrecision(governed);
  const anchored=applyTruthAnchor(precise,analysis);
  const proofed=applyProofSufficiency(anchored,analysis);
  const remembered=applyCaseMemory(proofed,analysis,conversation);
  const strategic=applyStrategicGovernor(remembered,analysis);
  const output=buildResponse(strategic);
  const memory=recordMemory(strategic,sessionId);
  if(analysis.topic) updateConversation(sessionId,{lastLegalTopic:analysis.topic,lastRuntime:strategic,lastOutputMode:outputMode});
  return {sessionId,mode,outputMode,analysis,legalSpace,runtime:strategic,output,memory};
}

export { runCodeSelfAudit };
