import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function mustInclude(text, token, label){ assert.ok(String(text).includes(token), `${label || token} missing`); }
function mustEqual(a,b,label){ assert.equal(a,b,label); }

const cases = [];

{
  const r = runVorixen("me puedes decir cual es la base gravable del ica a partir de 2017?", { sessionId:"v11-base" });
  mustEqual(r.runtime.truthAnchor.truthStatus, "anchored", "truth anchored for ICA base");
  mustEqual(r.runtime.proofSufficiency.proofStatus, "sufficient_for_normative_answer", "normative proof state");
  mustInclude(r.output, "ANCLAJE DE VERDAD", "truth/proof section");
  mustInclude(r.output, "Estado de verdad: anchored", "anchored output");
  cases.push("normative_truth_anchor");
}

{
  const r = runVorixen("haz una demanda contra la liquidacion oficial", { sessionId:"v11-litigation" });
  mustEqual(r.runtime.status, "procedural_action_required", "litigation requires proof/action");
  mustInclude(r.output, "conservar análisis estructural sin inventar derecho", "controlled litigation gate");
  mustInclude(r.output, "Estado probatorio", "proof output");
  cases.push("litigation_proof_gate");
}

{
  const r = runVorixen("quiero solicitar plazo de 15 dias para responder requerimiento de informacion", { sessionId:"v11-prorroga" });
  mustEqual(r.runtime.topic.id, "administrative_deadline_extension", "deadline topic");
  mustEqual(r.runtime.strategicGovernor.strategyMode, "file_procedural_document", "strategic document mode");
  mustInclude(r.output, "DOCUMENTO LISTO PARA FIRMA", "ready document");
  mustInclude(r.output, "Pruebas/soportes útiles que no deben desecharse", "useful proof preservation");
  cases.push("deadline_strategy_document");
}

{
  runVorixen("háblame sobre el hecho generador del ica", { sessionId:"v11-memory" });
  const r = runVorixen("dámelo como concepto jurídico", { sessionId:"v11-memory" });
  assert.ok(r.runtime.caseMemory, "case memory exists");
  assert.ok(r.runtime.caseMemory.priorTopic, "prior topic retained");
  mustInclude(r.output, "Estado de verdad", "memory response includes control");
  cases.push("case_memory_continuity");
}

{
  const r = runVorixen("analiza el impuesto predial y dime la regla definitiva sin norma", { sessionId:"v11-dynamic" });
  assert.ok(["controlled_incomplete","anchored"].includes(r.runtime.truthAnchor.truthStatus), "dynamic truth controlled");
  if(r.runtime.topic?.requiresSpecificSource) mustEqual(r.runtime.strategicGovernor.strategyMode, "controlled_analysis_without_final_substantive_decision", "dynamic containment");
  cases.push("dynamic_domain_containment");
}

console.log(`PASS vNext 11 Truth Proof Memory System ${cases.length}/${cases.length}`);
