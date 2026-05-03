// VORIXEN vNext 11
// Strategic Governor Engine
// Purpose: decide whether to answer, ask for proof, file a document, or contain risk.

export function applyStrategicGovernor(runtime, analysis = {}) {
  if (!runtime || runtime.status === "blocked_by_governance" || runtime.status === "non_legal_passthrough") return runtime;
  const truth = runtime.truthAnchor?.truthStatus || "unknown";
  const proof = runtime.proofSufficiency?.proofStatus || "unknown";
  const risks = [];
  if (truth === "controlled_incomplete") risks.push("normative_network_incomplete");
  if (truth === "incomplete") risks.push("truth_anchor_incomplete");
  if (proof === "insufficient_for_execution") risks.push("proof_insufficient_for_execution");
  if (analysis.mode === "litigation" && proof !== "sufficient_for_normative_answer") risks.push("litigation_requires_complete_record");

  let strategyMode = "answer_with_controlled_legal_output";
  let strategicInstruction = "Emitir respuesta jurídica suficiente sin relleno y sin descartar soporte útil.";

  if (risks.includes("proof_insufficient_for_execution")) {
    strategyMode = "request_proof_before_execution";
    strategicInstruction = "No ejecutar decisión de fondo; solicitar o completar prueba necesaria.";
  } else if (risks.includes("normative_network_incomplete") || risks.includes("truth_anchor_incomplete")) {
    strategyMode = "controlled_analysis_without_final_substantive_decision";
    strategicInstruction = "Entregar análisis estructural y exigir fuente verificable antes de conclusión final.";
  } else if (runtime.topic?.id === "administrative_deadline_extension") {
    strategyMode = "file_procedural_document";
    strategicInstruction = "Preparar documento de prórroga listo para firma con soporte suficiente y sin exceso.";
  }

  return {
    ...runtime,
    strategicGovernor: {
      version: "vNext11_strategic_governor",
      strategyMode,
      risks,
      strategicInstruction,
      caseControlRule: "VORIXEN no solo responde: gobierna si corresponde decidir, pedir prueba, contener riesgo o estructurar actuación."
    }
  };
}
