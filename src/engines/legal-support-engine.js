// VORIXEN vNext 4
// Legal Professional Support Engine
// Purpose: attach jurisprudential/doctrinal support without inventing authorities.
// The engine separates: (a) verified/canonical support categories already known to the system;
// (b) mandatory support to be retrieved/attached before filing when no verified citation is loaded.

export function buildLegalSupport(runtime){
  const topicId = runtime.topic?.id || "";
  const domain = runtime.domain?.domain || runtime.topic?.domain || "general_law";
  const tax = runtime.domain?.tax || runtime.topic?.tax || null;
  const supports = [];

  if(topicId.includes("ica_base_gravable") || topicId.includes("ica_taxable_event") || tax === "ica"){
    supports.push({
      type:"jurisprudence_required",
      authority:"Consejo de Estado, Sección Cuarta",
      use:"Soporte contencioso tributario sobre elementos esenciales del ICA, base gravable, actividad gravada, territorialidad, procedimiento tributario territorial y control de legalidad de actos administrativos tributarios.",
      verification:"Adjuntar sentencia específica verificada antes de radicar o usar como prueba. VORIXEN no inventa radicados ni fechas."
    });
    supports.push({
      type:"doctrine_required",
      authority:"Ministerio de Hacienda y Crédito Público / DIAN",
      use:"Soporte doctrinal sobre remisión del ICA a conceptos del Estatuto Tributario, devengo contable, realización fiscal del ingreso y procedimientos aplicables por Ley 788 de 2002, artículo 59.",
      verification:"Adjuntar concepto oficial identificado por número, fecha y entidad cuando esté cargado o verificado."
    });
  }

  if(topicId.includes("tax_firmness") || topicId.includes("tax_doubt") || tax === "general"){
    supports.push({
      type:"jurisprudence_required",
      authority:"Consejo de Estado, Sección Cuarta",
      use:"Soporte sobre firmeza, requerimiento especial, notificación, carga probatoria tributaria, debido proceso y aplicación de reglas probatorias del Estatuto Tributario.",
      verification:"Adjuntar sentencia específica verificada antes de usar en documento final."
    });
  }

  if(domain === "administrative" || topicId.includes("administrative_deadline_extension")){
    supports.push({
      type:"jurisprudence_required",
      authority:"Consejo de Estado / Corte Constitucional",
      use:"Soporte sobre debido proceso administrativo, derecho de defensa, derecho de petición, razonabilidad del término y respuesta de fondo en actuaciones administrativas.",
      verification:"Adjuntar providencia específica verificada cuando el documento vaya a radicarse con cita jurisprudencial concreta."
    });
  }

  if(domain === "constitutional"){
    supports.push({
      type:"constitutional_jurisprudence_required",
      authority:"Corte Constitucional",
      use:"Soporte sobre debido proceso, reserva de ley, igualdad, buena fe, confianza legítima, legalidad tributaria o derechos fundamentales activados por los hechos.",
      verification:"Adjuntar sentencia constitucional específica y ratio decidendi aplicable."
    });
  }

  if(domain === "labor"){
    supports.push({
      type:"jurisprudence_required",
      authority:"Corte Suprema de Justicia, Sala Laboral / Corte Constitucional",
      use:"Soporte sobre primacía de la realidad, contrato de trabajo, seguridad social, estabilidad laboral o garantías laborales según los hechos activados.",
      verification:"Adjuntar providencia específica verificada."
    });
  }

  if(domain === "criminal"){
    supports.push({
      type:"jurisprudence_required",
      authority:"Corte Suprema de Justicia, Sala Penal / Corte Constitucional",
      use:"Soporte sobre tipicidad, antijuridicidad, culpabilidad, debido proceso penal, prueba o garantías procesales según el objetivo jurídico.",
      verification:"Adjuntar providencia específica verificada."
    });
  }

  if(domain === "civil"){
    supports.push({
      type:"jurisprudence_required",
      authority:"Corte Suprema de Justicia, Sala Civil / Superintendencia competente cuando aplique",
      use:"Soporte sobre obligaciones, contratos, responsabilidad, prueba y efectos jurídicos civiles o comerciales.",
      verification:"Adjuntar providencia o doctrina oficial específica verificada."
    });
  }

  if(!supports.length){
    supports.push({
      type:"support_required",
      authority:"Autoridad judicial o administrativa competente según el dominio jurídico activado",
      use:"Soporte interpretativo obligatorio cuando el asunto requiera documento probatorio, litigioso o concepto robusto.",
      verification:"Cargar o verificar fuente antes de presentar como jurisprudencia específica."
    });
  }

  return dedupeSupports(supports);
}

export function formatLegalSupport(supports){
  if(!supports?.length) return "";
  return supports.map((s,index)=>`${index+1}. ${s.authority}\n   Uso jurídico: ${s.use}\n   Regla de verificación: ${s.verification}`).join("\n");
}

function dedupeSupports(supports){
  const seen = new Set();
  return supports.filter(s=>{
    const key = `${s.type}|${s.authority}|${s.use}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
