import { QueryMode,OutputStatus,SpeechClass,OutputMode } from "../core/types.js";

export function decide(analysis,legalSpace,outputMode){
  if(analysis.mode===QueryMode.NON_LEGAL){
    return {status:OutputStatus.NON_LEGAL,speechClass:SpeechClass.NON_LEGAL,allowedActionLevel:"none",actionType:"non_legal",outputMode,reason:"La consulta no activa espacio jurídico."};
  }
  if(!analysis.topic) return block("No existe tema jurídico reconocido en el espacio entregado.",outputMode,analysis);

  if(legalSpace.temporal?.temporallyEliminated?.length && !legalSpace.norms.length){
    return {
      status:OutputStatus.PROCEDURAL,
      speechClass:SpeechClass.PROCEDURAL,
      allowedActionLevel:"validation",
      actionType:"execute_procedural_action",
      outputMode,
      topic:analysis.topic,
      objective:analysis.objective,
      domain:analysis.domain,
      normReference:legalSpace.temporal.temporallyEliminated.map(n=>n.name).join("; "),
      triggeringFact:`Fecha jurídica relevante: ${legalSpace.temporal.relevantDate||"no determinada"}.`,
      concreteAction:"Aplicar únicamente la norma vigente al momento jurídico del hecho y excluir la norma posterior sin retroactividad expresa.",
      legalPurpose:"Impedir aplicación retroactiva o temporalmente inválida de una fuente jurídica.",
      legalConcepts:analysis.legalConcepts||[],
      conceptOverrideApplied:analysis.conceptOverrideApplied===true
    };
  }

  if(legalSpace.conflicts?.length) return block(`Colisión normativa no resuelta: ${JSON.stringify(legalSpace.conflicts)}`,outputMode,analysis);

  if(legalSpace.activation?.activationBlocked){
    return procedural(analysis,outputMode,legalSpace.activation.missingFacts,legalSpace.norms[0]?.name||analysis.topic.norms?.[0]?.name||analysis.topic.label);
  }

  if(!legalSpace.norms.length) return block("No existe norma vigente y activada por hechos para decidir.",outputMode,analysis);

  if(needsDocumentIntake(analysis,outputMode)){
    const missing=(analysis.topic.intakeForDocument||[]).filter(f=>!analysis.providedFacts.includes(f));
    if(missing.length){
      return {
        status:OutputStatus.INTAKE,
        speechClass:SpeechClass.INTAKE,
        allowedActionLevel:"validation",
        actionType:"execute_procedural_action",
        outputMode,
        topic:analysis.topic,
        objective:analysis.objective,
        domain:analysis.domain,
        normReference:legalSpace.norms.map(n=>n.name).join("; "),
        triggeringFact:`Salida documental solicitada sin requisitos completos: ${missing.join(", ")}.`,
        concreteAction:"Completar identificación del contribuyente, periodo, municipio, valores certificados, soportes contables y calidad del certificante antes de emitir documento contable o listo para radicar.",
        legalPurpose:"Evitar emisión de documento jurídico-contable con hechos insuficientes.",
        legalConcepts:analysis.legalConcepts||[],
        conceptOverrideApplied:analysis.conceptOverrideApplied===true,
        activatedNorms:legalSpace.norms.map(n=>({name:n.name,role:n.role,activationLevel:n.activationLevel}))
      };
    }
  }

  const governingNorm=legalSpace.norms[0];

  if(analysis.topic?.requiresSpecificSource===true){
    return {
      status:OutputStatus.PROCEDURAL,
      speechClass:SpeechClass.PROCEDURAL,
      allowedActionLevel:"validation",
      actionType:"execute_procedural_action",
      outputMode,
      topic:analysis.topic,
      objective:analysis.objective,
      domain:analysis.domain,
      normReference:legalSpace.norms.map(n=>n.name).join("; "),
      triggeringFact:`Consulta jurídica de ${analysis.domain?.label||analysis.topic.label} sin norma especial verificada cargada.`,
      concreteAction:"Exigir la norma especial vigente, sus definiciones legales, remisiones, jurisprudencia y doctrina verificadas antes de emitir decisión de fondo; mientras tanto, conservar análisis estructural sin inventar derecho.",
      legalPurpose:"Permitir entrada jurídica universal sin convertir una red normativa incompleta en conclusión sustancial.",
      result:analysis.topic.rule,
      legalConcepts:analysis.legalConcepts||[],
      conceptOverrideApplied:analysis.conceptOverrideApplied===true,
      activatedNorms:legalSpace.norms.map(n=>({name:n.name,role:n.role,activationLevel:n.activationLevel}))
    };
  }

  if(analysis.mode===QueryMode.LITIGATION){
    return {
      status:OutputStatus.PROCEDURAL,
      speechClass:SpeechClass.PROCEDURAL,
      allowedActionLevel:"validation",
      actionType:"execute_procedural_action",
      outputMode,
      topic:analysis.topic,
      objective:analysis.objective,
      domain:analysis.domain,
      normReference:governingNorm.name,
      triggeringFact:"Solicitud litigiosa sin expediente completo, actos demandados y pruebas incorporadas.",
      concreteAction:"Completar acto administrativo, fechas, periodo discutido, pretensiones y pruebas documentales antes de construir cargo final.",
      legalPurpose:"Permitir construcción litigiosa sin inventar hechos ni convertir validación en decisión de fondo.",
      legalConcepts:analysis.legalConcepts||[],
      conceptOverrideApplied:analysis.conceptOverrideApplied===true,
      activatedNorms:legalSpace.norms.map(n=>({name:n.name,role:n.role,activationLevel:n.activationLevel}))
    };
  }

  return {
    status:OutputStatus.EXECUTION,
    speechClass:SpeechClass.EXECUTION,
    allowedActionLevel:"action",
    actionType:"execute_legal_consequence",
    outputMode,
    topic:analysis.topic,
    objective:analysis.objective,
    domain:analysis.domain,
    normReference:legalSpace.norms.map(n=>n.name).join("; "),
    triggeringFact:triggeringFact(analysis),
    concreteAction:analysis.topic.action,
    legalPurpose:analysis.topic.purpose,
    result:analysis.topic.rule,
    legalConcepts:analysis.legalConcepts||[],
    conceptOverrideApplied:analysis.conceptOverrideApplied===true,
    activatedNorms:legalSpace.norms.map(n=>({name:n.name,role:n.role,activationLevel:n.activationLevel}))
  };
}

function needsDocumentIntake(analysis,outputMode){
  return outputMode===OutputMode.READY_TO_FILE||analysis.objective?.requiresDocumentIntake===true;
}

function triggeringFact(analysis){
  if(analysis.mode===QueryMode.NORMATIVE_QUERY||analysis.mode===QueryMode.FORMAT_TRANSFORM) return `Consulta normativa general con objetivo: ${analysis.objective?.label||analysis.topic.label}.`;
  return `Hechos suficientes activaron el objetivo ${analysis.objective?.label||analysis.topic.label}: ${analysis.providedFacts.join(", ")}.`;
}

function procedural(analysis,outputMode,missing,normReference){
  return {
    status:OutputStatus.PROCEDURAL,
    speechClass:SpeechClass.PROCEDURAL,
    allowedActionLevel:"validation",
    actionType:"execute_procedural_action",
    outputMode,
    topic:analysis.topic,
    objective:analysis.objective,
    domain:analysis.domain,
    normReference,
    triggeringFact:`Faltan hechos requeridos: ${missing.join(", ")}.`,
    concreteAction:"Completar los hechos jurídicos requeridos para activar la norma aplicable.",
    legalPurpose:"Permitir la activación normativa sin inventar hechos.",
    legalConcepts:analysis.legalConcepts||[],
    conceptOverrideApplied:analysis.conceptOverrideApplied===true
  };
}

function block(reason,outputMode,analysis){
  return {status:OutputStatus.BLOCKED,speechClass:SpeechClass.BLOCK,allowedActionLevel:"none",actionType:"blocked",outputMode,topic:analysis?.topic,objective:analysis?.objective,domain:analysis?.domain,reason};
}
