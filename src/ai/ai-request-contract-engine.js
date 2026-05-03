const DISALLOWED_INSTRUCTIONS = [
  "inventar normas",
  "inventar jurisprudencia",
  "decidir contra el runtime",
  "usar lenguaje blando",
  "crear opciones no solicitadas"
];

export function buildAIRequestContract({ message, runtime, output, conversation = {} }) {
  const contract = {
    contractName: "VORIXEN_AI_CONTROL_CONTRACT",
    version: "vNext_12",
    role: "La IA expande redacción y análisis bajo control de VORIXEN; no decide por fuera del runtime.",
    hardRules: [
      "No modificar el status jurídico decidido por VORIXEN.",
      "No inventar normas, sentencias, radicados, conceptos, fechas ni hechos.",
      "Usar únicamente fuentes presentes en el runtime o declarar fuente faltante.",
      "Respetar conceptos legales definidos como parte integral de la ley.",
      "No usar lenguaje blando, opcional o de recomendación.",
      "La extensión depende de la suficiencia jurídica, no de una longitud fija.",
      "Ningún elemento normativo, probatorio o jurisprudencial útil debe desecharse si sostiene la acción."
    ],
    runtimeLock: {
      status: runtime.status,
      speechClass: runtime.speechClass,
      topic: runtime.topic || null,
      objective: runtime.objective || null,
      normReference: runtime.normReference || null,
      triggeringFact: runtime.triggeringFact || null,
      concreteAction: runtime.concreteAction || null,
      legalPurpose: runtime.legalPurpose || null,
      activatedNorms: runtime.activatedNorms || [],
      legalConcepts: runtime.legalConcepts || []
    },
    userMessage: String(message || ""),
    localControlledOutput: String(output || ""),
    conversationContext: {
      lastLegalTopic: conversation.lastLegalTopic || null,
      lastOutputMode: conversation.lastOutputMode || null
    },
    forbidden: DISALLOWED_INSTRUCTIONS,
    requiredReturnShape: {
      format: "plain_text",
      mustBeginWithSpeechClass: runtime.speechClass || "",
      mustIncludeSectionsWhenLegal: [
        "PROBLEMA JURÍDICO",
        "MARCO NORMATIVO",
        "INTERPRETACIÓN",
        "APLICACIÓN",
        "CONCLUSIÓN"
      ]
    }
  };
  return Object.freeze(contract);
}

export function buildOpenAIMessages(contract) {
  return [
    {
      role: "system",
      content: [
        "Eres una capa de redacción jurídica controlada por VORIXEN.",
        "No eres autoridad decisoria. La decisión jurídica ya fue fijada por el runtime.",
        "Debes expandir, ordenar y redactar sin inventar fuentes ni alterar el resultado.",
        "Si falta jurisprudencia o fuente específica, decláralo sin crear radicados.",
        "Devuelve solo el texto final, sin JSON."
      ].join("\n")
    },
    {
      role: "user",
      content: `CONTRATO VORIXEN:\n${JSON.stringify(contract, null, 2)}`
    }
  ];
}
