import { OutputMode } from "../core/types.js";
import { assertLegalSpeechLock } from "../governance/legal-speech-lock.js";
import { buildLegalSupport, formatLegalSupport } from "./legal-support-engine.js";
import { assessOutputSufficiency, validateOutputSufficiency } from "./legal-output-sufficiency-engine.js";

export function buildResponse(runtime){
  if(runtime.status === "blocked_by_governance") {
    return assertLegalSpeechLock(`Bloqueo jurídico operativo\n\nMOTIVO:\n${runtime.reason || "El runtime jurídico bloqueó la salida."}`);
  }
  if(runtime.status === "non_legal_passthrough") {
    return assertLegalSpeechLock(`Clasificación no jurídica\n\nMOTIVO:\n${runtime.reason}`);
  }

  const sufficiency = assessOutputSufficiency(runtime);
  let output;
  if(sufficiency.includeReadyToFileBody && runtime.topic?.id === "administrative_deadline_extension") output = buildAdministrativeDeadlineExtension(runtime, sufficiency);
  else if(runtime.outputMode === OutputMode.FISCAL_AUDITOR_OPINION) output = buildFiscalAuditorOpinion(runtime, sufficiency);
  else if(runtime.outputMode === OutputMode.LEGAL_CONCEPT) output = buildLegalConcept(runtime, sufficiency);
  else if(runtime.outputMode === OutputMode.LEGAL_CHARGE) output = buildLegalCharge(runtime, sufficiency);
  else if(runtime.outputMode === OutputMode.READY_TO_FILE) output = buildReadyToFile(runtime, sufficiency);
  else output = buildProfessionalStructured(runtime, sufficiency);

  validateOutputSufficiency(runtime, output);
  return assertLegalSpeechLock(output);
}

function conceptTrace(runtime){
  if(!runtime.legalConcepts?.length) return "No se detectaron conceptos legales definidos cargados para sustitución semántica expresa. Si el expediente contiene definiciones legales especiales, deben incorporarse antes de la radicación final.";
  return runtime.legalConcepts.map(c=>`- ${c.definition} (${c.source})`).join("\n");
}

function activatedTrace(runtime){
  if(!runtime.activatedNorms?.length) return "La red normativa mínima se conserva en el marco normativo principal. No se agregan fuentes externas no verificadas.";
  return runtime.activatedNorms.map(n=>`- ${n.name} [${n.role}; ${n.activationLevel}]`).join("\n");
}

function legalSupportTrace(runtime){
  return formatLegalSupport(buildLegalSupport(runtime));
}

function truthProofTrace(runtime){
  const truth = runtime.truthAnchor || {};
  const proof = runtime.proofSufficiency || {};
  const strategy = runtime.strategicGovernor || {};
  const anchors = (truth.anchors || []).slice(0,8).map(a=>`- ${a.type}: ${a.value}`).join("\n") || "- Anclaje no aplicable o pendiente.";
  const useful = (proof.usefulProofs || []).map(p=>`- ${p}`).join("\n") || "- No se detectaron pruebas adicionales necesarias para esta salida.";
  const warnings = (truth.warnings || []).map(w=>`- ${w}`).join("\n") || "- Sin advertencias de verdad operativa.";
  return `Estado de verdad: ${truth.truthStatus || "no evaluado"}\nEstado probatorio: ${proof.proofStatus || "no evaluado"}\nEstrategia de salida: ${strategy.strategyMode || "no evaluada"}\nInstrucción estratégica: ${strategy.strategicInstruction || "Emitir salida jurídica controlada."}\n\nAnclajes usados:\n${anchors}\n\nPruebas/soportes útiles que no deben desecharse:\n${useful}\n\nAdvertencias de control:\n${warnings}`;
}

function problemStatement(runtime){
  const topic = runtime.topic?.label || "Asunto jurídico";
  const objective = runtime.objective?.label || runtime.topic?.label || "objetivo jurídico activado";
  return `Se debe determinar ${objective} dentro del asunto: ${topic}. La respuesta debe identificar norma aplicable, hecho activador, concepto legal, consecuencia jurídica, prueba disponible y soporte interpretativo suficiente para sostener la actuación.`;
}

function normativeFrame(runtime, sufficiency){
  let frame = `NORMA O RED NORMATIVA ACTIVADA:\n${runtime.normReference || "Norma jurídica operativa aplicable."}`;
  frame += `\n\nRed mínima activada:\n${activatedTrace(runtime)}`;
  frame += `\n\nCONCEPTOS LEGALES OBLIGATORIOS incorporados como parte integral de la ley:\n${conceptTrace(runtime)}`;
  frame += `\n\nRegla de lectura literal-controlada: los conceptos definidos por la ley gobiernan el significado jurídico de las palabras y desplazan el sentido común cuando exista definición normativa, remisión legal o consecuencia jurídica específica.`;
  frame += `\n\nRegla de suficiencia jurídica: ${sufficiency.stopRule}`;
  return frame;
}

function technicalInterpretation(runtime){
  const result = runtime.result || runtime.concreteAction || "Debe completarse el análisis jurídico con la norma y los hechos activadores.";
  const strategy = runtime.strategicGovernor?.strategicInstruction || "La salida debe conservar control jurídico.";
  return `${result}\n\nLa conclusión no nace de palabras aisladas ni de coincidencias por tema. Nace de conectar objetivo jurídico, dominio, vigencia, hechos activadores, red normativa mínima, conceptos legales obligatorios y finalidad de la actuación. Ningún elemento probatorio o normativo útil debe descartarse cuando incida en existencia, validez, activación, alcance, prueba o consecuencia de la norma.\n\nGobernador estratégico: ${strategy}`;
}

function applicationToCase(runtime){
  return `HECHO ACTIVADOR:\n${runtime.triggeringFact || "Hecho jurídico pendiente de precisión."}\n\nACCIÓN JURÍDICA:\n${runtime.concreteAction || "Completar hechos y soportes antes de decidir."}\n\nFINALIDAD JURÍDICA:\n${runtime.legalPurpose || "Evitar una respuesta sin consecuencia jurídica verificable."}`;
}

function conclusion(runtime){
  if(runtime.status === "intake_required") return runtime.concreteAction;
  if(runtime.status === "procedural_action_required") return runtime.concreteAction;
  return runtime.concreteAction || runtime.result || "La consecuencia jurídica se ejecuta únicamente si la norma vigente y activada produce efecto obligatorio.";
}

function professionalBody(runtime, sufficiency, heading="CONCEPTO JURÍDICO PROFESIONAL"){
  const support = sufficiency.includeSupport ? legalSupportTrace(runtime) : "Soporte no exigido por la complejidad de la salida.";
  return `${runtime.speechClass}\n\n${heading}\n\nI. PROBLEMA JURÍDICO\n${problemStatement(runtime)}\n\nII. MARCO NORMATIVO APLICABLE\n${normativeFrame(runtime, sufficiency)}\n\nIII. INTERPRETACIÓN TÉCNICO-JURÍDICA\n${technicalInterpretation(runtime)}\n\nIV. JURISPRUDENCIA, SENTENCIAS Y DOCTRINA OFICIAL DE SOPORTE\n${support}\n\nV. ANCLAJE DE VERDAD Y SUFICIENCIA PROBATORIA\n${truthProofTrace(runtime)}\n\nVI. APLICACIÓN AL CASO O A LA CONSULTA\n${applicationToCase(runtime)}\n\nVI. CONCLUSIÓN JURÍDICA\n${conclusion(runtime)}`;
}

function buildProfessionalStructured(runtime, sufficiency){
  return professionalBody(runtime, sufficiency, "RESPUESTA JURÍDICA ESTRUCTURADA");
}

function buildLegalConcept(runtime, sufficiency){
  return professionalBody(runtime, sufficiency, "CONCEPTO JURÍDICO");
}

function buildFiscalAuditorOpinion(runtime, sufficiency){
  const title = runtime.status === "intake_required" ? "REQUISITOS PREVIOS PARA DICTAMEN TÉCNICO DE REVISOR FISCAL" : "DICTAMEN TÉCNICO DE REVISOR FISCAL";
  return `${runtime.speechClass}\n\n${title}\n\nI. ASUNTO\n${runtime.topic?.label || "Determinación jurídico-contable"}\n\nII. ALCANCE DEL DICTAMEN\n${runtime.triggeringFact}\n\nIII. MARCO NORMATIVO Y CONCEPTOS LEGALES OBLIGATORIOS\n${normativeFrame(runtime, sufficiency)}\n\nIV. ANÁLISIS TÉCNICO-CONTABLE Y JURÍDICO\n${technicalInterpretation(runtime)}\n\nV. SOPORTE JURISPRUDENCIAL, SENTENCIAS Y DOCTRINA OFICIAL\n${legalSupportTrace(runtime)}\n\nVI. ANCLAJE DE VERDAD Y SUFICIENCIA PROBATORIA\n${truthProofTrace(runtime)}\n\nVII. EFECTO SOBRE LA CERTIFICACIÓN O DICTAMEN\n${applicationToCase(runtime)}\n\nVII. CONCLUSIÓN DEL DICTAMEN\n${conclusion(runtime)}`;
}

function buildLegalCharge(runtime, sufficiency){
  return `${runtime.speechClass}\n\nCARGO JURÍDICO\n\nI. PROBLEMA JURÍDICO\n${problemStatement(runtime)}\n\nII. NORMA SUPERIOR Y NORMA INFRINGIDA\n${normativeFrame(runtime, sufficiency)}\n\nIII. CONCEPTO DE VIOLACIÓN\n${technicalInterpretation(runtime)}\n\nIV. JURISPRUDENCIA, SENTENCIAS Y DOCTRINA OFICIAL DE SOPORTE\n${legalSupportTrace(runtime)}\n\nV. ANCLAJE DE VERDAD Y SUFICIENCIA PROBATORIA\n${truthProofTrace(runtime)}\n\nVI. APLICACIÓN AL ACTO, HECHO O CONDUCTA DISCUTIDA\n${applicationToCase(runtime)}\n\nVI. PRETENSIÓN O CONSECUENCIA JURÍDICA\n${conclusion(runtime)}`;
}

function buildReadyToFile(runtime, sufficiency){
  return professionalBody(runtime, sufficiency, "DOCUMENTO JURÍDICO LISTO PARA ESTRUCTURAR");
}

function buildAdministrativeDeadlineExtension(runtime, sufficiency){
  const todayPlaceholder = "Arauca, ___ de __________ de 2026";
  return `${runtime.speechClass}\n\nDOCUMENTO LISTO PARA FIRMA\nSOLICITUD DE PRÓRROGA PARA RESPONDER REQUERIMIENTO\n\n${todayPlaceholder}\n\nSeñores\n[ENTIDAD REQUIRENTE]\nÁrea o dependencia competente\nCiudad\n\nASUNTO: Solicitud de prórroga para dar respuesta a requerimiento de información\nREFERENCIA: [Radicado, fecha y asunto del requerimiento]\n\n[Nombre del solicitante o representante legal], identificado como aparece al pie de mi firma, obrando en nombre de [nombre de la sociedad o interesado], de manera respetuosa solicito la ampliación del término otorgado para dar respuesta integral al requerimiento de información de la referencia.\n\nI. PROBLEMA JURÍDICO\n${problemStatement(runtime)}\n\nII. MARCO NORMATIVO APLICABLE\n${normativeFrame(runtime, sufficiency)}\n\nIII. FUNDAMENTOS DE LA SOLICITUD\nEl requerimiento exige reunir, revisar y validar información documental. Cuando la información comprende soportes contables, laborales, administrativos, certificaciones, varias vigencias o datos de terceros, la respuesta debe prepararse con veracidad, consistencia y trazabilidad. La ampliación solicitada no sustituye la respuesta de fondo ni desconoce el requerimiento; ordena el trámite para que la información entregada sea completa, verificable y útil para la actuación administrativa.\n\nIV. JURISPRUDENCIA, SENTENCIAS Y DOCTRINA OFICIAL DE SOPORTE\n${legalSupportTrace(runtime)}\n\nV. ANCLAJE DE VERDAD Y SUFICIENCIA PROBATORIA\n${truthProofTrace(runtime)}\n\nVI. SOLICITUD\nPRIMERO. Conceder una prórroga de quince (15) días hábiles adicionales para responder de manera integral el requerimiento de información de la referencia.\n\nSEGUNDO. Tener presente que la solicitud busca garantizar una respuesta completa, veraz, ordenada y soportada, evitando inconsistencias por entrega incompleta o no verificada.\n\nTERCERO. Tener como finalidad de la ampliación el ejercicio efectivo del debido proceso, la contradicción, la defensa y la respuesta de fondo dentro de la actuación administrativa.\n\nVI. CONCLUSIÓN JURÍDICA\n${conclusion(runtime)}\n\nAtentamente,\n\n____________________________________\n[Nombre]\n[Calidad: representante legal / apoderado / autorizado]\n[Documento de identificación]\n[Sociedad o interesado]\n[Correo electrónico]\n[Teléfono]\n\nAnexos: los que se estimen necesarios.`;
}
