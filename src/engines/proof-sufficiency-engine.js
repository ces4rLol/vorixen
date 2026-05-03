// VORIXEN vNext 11
// Proof Sufficiency Engine
// Purpose: distinguish normative answers from case decisions that require evidence.

const CORE_PROOF_BY_OBJECTIVE = {
  deadline_extension: ["administrative_request_exists", "deadline_extension_requested"],
  tax_firmness: ["tax_return_exists", "due_date_present", "notification_date_present"],
  tax_base: ["general_normative_query"],
  legal_concept: ["general_normative_query"],
  litigation: ["actuation_type_present", "legal_date_present"],
  fiscal_auditor_opinion: ["taxpayer_id_present", "certified_values_present", "accounting_support_present", "certifier_capacity_present"]
};

export function assessProofSufficiency(runtime, analysis = {}) {
  const provided = new Set(analysis.providedFacts || []);
  const objectiveId = runtime?.objective?.id || analysis.objective?.id || "general";
  const mode = analysis.mode || "";
  const topicId = runtime?.topic?.id || analysis.topic?.id || "";
  const required = requiredProofs({ objectiveId, topicId, runtime, analysis });
  const missing = required.filter(f => !provided.has(f));

  const normativeQuery = provided.has("general_normative_query") || mode === "normative_query";
  let proofStatus = "sufficient_for_analysis";
  if (runtime?.status === "ready_for_legal_execution" && !normativeQuery && missing.length) proofStatus = "insufficient_for_execution";
  if (runtime?.status === "procedural_action_required" || runtime?.status === "intake_required") proofStatus = "proof_action_required";
  if (normativeQuery && runtime?.status !== "blocked_by_governance") proofStatus = "sufficient_for_normative_answer";
  if (topicId === "administrative_deadline_extension" && missing.length === 0) proofStatus = "sufficient_for_procedural_document";

  const usefulProofs = deriveUsefulProofs({ runtime, analysis, required, missing });
  return {
    version: "vNext11_proof_sufficiency",
    proofStatus,
    requiredProofs: required,
    missingProofs: missing,
    providedProofs: [...provided],
    usefulProofs,
    canExecute: !["insufficient_for_execution", "proof_action_required"].includes(proofStatus),
    noUsefulProofDiscarded: true
  };
}

export function applyProofSufficiency(runtime, analysis = {}) {
  const proofSufficiency = assessProofSufficiency(runtime, analysis);
  let next = { ...runtime, proofSufficiency };
  if (runtime?.status === "ready_for_legal_execution" && proofSufficiency.proofStatus === "insufficient_for_execution") {
    next = {
      ...next,
      status: "procedural_action_required",
      speechClass: "Ejecutar actuación procesal obligatoria",
      allowedActionLevel: "validation",
      actionType: "execute_procedural_action",
      triggeringFact: `Prueba insuficiente para ejecutar consecuencia jurídica de caso concreto. Faltan: ${proofSufficiency.missingProofs.join(", ")}.`,
      concreteAction: "Completar y verificar las pruebas requeridas antes de emitir decisión ejecutable o documento final de fondo.",
      legalPurpose: "Evitar que una conclusión jurídica opere sin soporte probatorio suficiente."
    };
  }
  return next;
}

function requiredProofs({ objectiveId, topicId, runtime, analysis }) {
  const required = new Set();
  const base = CORE_PROOF_BY_OBJECTIVE[objectiveId] || [];
  for (const item of base) required.add(item);
  if (topicId === "administrative_deadline_extension") {
    required.add("administrative_request_exists");
    required.add("deadline_extension_requested");
  }
  if (runtime?.outputMode === "fiscal_auditor_opinion") {
    for (const item of CORE_PROOF_BY_OBJECTIVE.fiscal_auditor_opinion) required.add(item);
  }
  if (analysis.mode === "litigation") {
    required.add("actuation_type_present");
    required.add("legal_date_present");
  }
  return [...required];
}

function deriveUsefulProofs({ runtime, analysis, required, missing }) {
  const list = [];
  if (analysis.factDetails?.dates?.length) list.push(`Fechas detectadas: ${analysis.factDetails.dates.join(", ")}`);
  if (analysis.factDetails?.years?.length) list.push(`Vigencias/años detectados: ${analysis.factDetails.years.join(", ")}`);
  if (runtime?.triggeringFact) list.push(`Hecho activador: ${runtime.triggeringFact}`);
  if (required.length) list.push(`Pruebas mínimas esperadas: ${required.join(", ")}`);
  if (missing.length) list.push(`Pruebas faltantes: ${missing.join(", ")}`);
  return list;
}
