// VORIXEN vNext 6
// Legal Output Sufficiency Engine
// Purpose: make output as developed as the legal action requires, without artificial length.

export function assessOutputSufficiency(runtime){
  const topicId = runtime.topic?.id || "";
  const status = runtime.status || "";
  const mode = runtime.outputMode || "structured";
  const isDocument = mode === "ready_to_file" || mode === "fiscal_auditor_opinion" || mode === "legal_charge";
  const isProcedural = status === "procedural_action_required" || status === "intake_required";
  const requiresSupport = isDocument || mode === "legal_concept" || status === "ready_for_legal_execution";
  const requiresReadyText = mode === "ready_to_file" || topicId === "administrative_deadline_extension";
  const depth = computeDepth(runtime, { isDocument, isProcedural, requiresSupport, requiresReadyText });

  return {
    depth,
    isDocument,
    isProcedural,
    requiresSupport,
    requiresReadyText,
    includeLiteralNormFrame: true,
    includeSupport: requiresSupport,
    includeEvidenceRule: true,
    includeReadyToFileBody: requiresReadyText,
    stopRule: "Detener expansión cuando norma, hecho, interpretación, acción y finalidad estén completos; expandir únicamente si falta soporte útil para sostener la actuación."
  };
}

function computeDepth(runtime, flags){
  if(flags.requiresReadyText) return "document";
  if(flags.isDocument) return "document";
  if(runtime.topic?.dynamic === true || runtime.topic?.requiresSpecificSource === true) return "controlled";
  if(flags.isProcedural) return "procedural";
  return "standard";
}

export function validateOutputSufficiency(runtime, output){
  const text = String(output || "");
  if(runtime.status === "blocked_by_governance" || runtime.status === "non_legal_passthrough") return true;
  const requiredGroups = [["PROBLEMA JURÍDICO","ASUNTO"], ["MARCO NORMATIVO"], ["CONCLUSIÓN"]];
  for(const group of requiredGroups){
    if(!group.some(token=>text.includes(token))) throw new Error(`legal_output_sufficiency:missing_`);
  }
  if((runtime.outputMode === "ready_to_file" || runtime.topic?.id === "administrative_deadline_extension") && !text.includes("SOLICITUD")){
    throw new Error("legal_output_sufficiency:missing_ready_to_file_request");
  }
  if(text.includes("NORMA:\n") && !text.includes("Regla de suficiencia jurídica")){
    throw new Error("legal_output_sufficiency:missing_sufficiency_rule");
  }
  return true;
}
