const SOFT_LANGUAGE = [
  "podría", "podria", "sería recomendable", "seria recomendable", "se recomienda",
  "conviene", "resultaría prudente", "resultaria prudente", "sería útil", "seria util",
  "opción", "opcion", "alternativa", "tal vez", "quizá", "quiza", "considerar"
];

const FAKE_CITATION_PATTERNS = [
  /radicad[oa]\s*(no\.|n[°.])?\s*\d{4,}/i,
  /sentencia\s+[ctsu]-\d{2,4}\s+de\s+\d{4}/i,
  /expediente\s+\d{4,}/i
];

export function validateAIControlledResponse({ text, contract }) {
  const errors = [];
  const output = String(text || "").trim();
  if (!output) errors.push("ai_response:empty");

  const speechClass = contract?.runtimeLock?.speechClass;
  if (speechClass && !output.startsWith(speechClass)) errors.push("ai_response:speech_class_mismatch");

  const normalized = output.toLowerCase();
  for (const token of SOFT_LANGUAGE) {
    if (normalized.includes(token)) errors.push(`ai_response:soft_language:${token}`);
  }

  const status = contract?.runtimeLock?.status || "";
  if (status !== "non_legal_passthrough" && status !== "blocked_by_governance") {
    for (const section of contract.requiredReturnShape.mustIncludeSectionsWhenLegal) {
      if (!normalized.includes(section.toLowerCase())) errors.push(`ai_response:missing_section:${section}`);
    }
  }

  const knownSources = [
    contract?.runtimeLock?.normReference,
    ...(contract?.runtimeLock?.activatedNorms || []).map(n => n.name),
    ...(contract?.runtimeLock?.legalConcepts || []).map(c => c.source)
  ].filter(Boolean).join("\n").toLowerCase();

  for (const pattern of FAKE_CITATION_PATTERNS) {
    const match = output.match(pattern);
    if (match && !knownSources.includes(match[0].toLowerCase())) {
      errors.push(`ai_response:unverified_citation:${match[0]}`);
    }
  }

  if (contract?.runtimeLock?.normReference) {
    const anchors = String(contract.runtimeLock.normReference).split(/[;,]/).map(s => s.trim()).filter(Boolean);
    const missingAnchors = anchors.filter(anchor => anchor.length > 5 && !normalized.includes(anchor.toLowerCase().slice(0, Math.min(18, anchor.length))));
    if (missingAnchors.length === anchors.length) errors.push("ai_response:norm_reference_not_preserved");
  }

  return { valid: errors.length === 0, errors, output };
}

export function buildAIValidationFailureOutput({ localOutput, validation }) {
  return `${localOutput}\n\nCONTROL DE IA VORIXEN\nLa expansión generada por IA fue descartada por validación estricta: ${validation.errors.join("; ")}. Se conserva la salida jurídica local validada.`;
}
