// VORIXEN vNext 11
// Truth Anchor Engine
// Purpose: every legal output must identify whether its legal truth is anchored, incomplete, or blocked.

const VERIFIED_SOURCE_HINTS = [
  "ley", "decreto", "constitucion", "codigo", "estatuto", "sentencia", "jurisprudencia", "consejo de estado", "corte constitucional", "dian", "ministerio", "cpaca", "codigo penal", "codigo sustantivo", "codigo civil"
];

export function buildTruthAnchor(runtime, analysis = {}) {
  const normText = String(runtime?.normReference || "").toLowerCase();
  const resultText = String(runtime?.result || runtime?.concreteAction || "").toLowerCase();
  const anchors = [];
  if (runtime?.normReference) anchors.push({ type: "normative_source", value: runtime.normReference });
  if (runtime?.activatedNorms?.length) anchors.push(...runtime.activatedNorms.map(n => ({ type: "activated_norm", value: n.name })));
  if (runtime?.legalConcepts?.length) anchors.push(...runtime.legalConcepts.map(c => ({ type: "legal_concept", value: `${c.definition} (${c.source})` })));
  if (runtime?.triggeringFact) anchors.push({ type: "triggering_fact", value: runtime.triggeringFact });
  if (runtime?.legalPurpose) anchors.push({ type: "legal_purpose", value: runtime.legalPurpose });

  const hasVerifiedSourceShape = VERIFIED_SOURCE_HINTS.some(k => normText.includes(k) || resultText.includes(k));
  const dynamicOrIncomplete = runtime?.topic?.dynamic === true || runtime?.topic?.requiresSpecificSource === true;
  const hasMinimumAnchor = anchors.some(a => a.type === "normative_source" || a.type === "activated_norm") && anchors.some(a => a.type === "triggering_fact");
  const status = runtime?.status;

  let truthStatus = "anchored";
  const warnings = [];
  const hardBlocks = [];

  if (status === "blocked_by_governance" || status === "non_legal_passthrough") {
    truthStatus = "not_applicable";
  } else if (!hasMinimumAnchor) {
    truthStatus = "incomplete";
    warnings.push("La salida carece de anclaje mínimo entre fuente normativa y hecho activador.");
  }

  if (dynamicOrIncomplete) {
    truthStatus = truthStatus === "anchored" ? "controlled_incomplete" : truthStatus;
    warnings.push("Dominio o norma especial no completamente cargado: conservar análisis estructural y exigir fuente verificable antes de decidir de fondo.");
  }

  if (!hasVerifiedSourceShape && status !== "non_legal_passthrough" && status !== "blocked_by_governance") {
    warnings.push("La referencia normativa no muestra forma de fuente jurídica verificable; requiere revisión antes de radicación final.");
  }

  const softRisk = containsUnanchoredClaim(runtime);
  if (softRisk) {
    warnings.push("Se detectó riesgo de afirmación no anclada; debe mantenerse como análisis controlado o completarse fuente/prueba.");
  }

  return {
    version: "vNext11_truth_anchor",
    truthStatus,
    anchors,
    warnings,
    hardBlocks,
    canEmitSubstantiveDecision: truthStatus === "anchored" && hardBlocks.length === 0,
    canEmitControlledAnalysis: hardBlocks.length === 0
  };
}

export function applyTruthAnchor(runtime, analysis = {}) {
  const truthAnchor = buildTruthAnchor(runtime, analysis);
  return { ...runtime, truthAnchor };
}

function containsUnanchoredClaim(runtime) {
  const text = `${runtime?.result || ""} ${runtime?.concreteAction || ""}`.toLowerCase();
  if (!text) return false;
  const absolute = ["siempre", "nunca", "definitivamente", "sin excepcion", "automaticamente"];
  return absolute.some(w => text.includes(w)) && !runtime?.normReference;
}
