import { normalize } from "../utils/normalize.js";

const objectives=[
  {id:"request_deadline_extension",label:"Solicitar ampliación, prórroga o plazo para responder requerimiento",tokens:["prorroga","prorrogar","ampliacion de termino","ampliar termino","plazo de 15 dias","15 dias","quince dias","solicitar plazo","solicitar prorroga","responder requerimiento","ampliar plazo","termino para responder"]},
  {id:"verify_firmness",label:"Verificar firmeza, prescripción, caducidad o competencia temporal",tokens:["firmeza","prescripcion","caducidad","requerimiento especial","requerimiento","notificacion","notificado","vencimiento","vencio","714","termino","extemporaneo","fuera de termino"]},
  {id:"request_tax_inspection",label:"Solicitar o exigir inspección tributaria",tokens:["inspeccion tributaria","778","testigos actuarios","solicitar inspeccion","practica de inspeccion"]},
  {id:"resolve_probative_doubt",label:"Resolver duda probatoria",tokens:["745","duda","favor del contribuyente","vacio probatorio","prueba insuficiente","carga de la prueba","prueba"]},
  {id:"define_tax_base",label:"Definir base gravable o base imponible",tokens:["base gravable","base imponible","base grabable","bawse grabable","ingresos","renta liquida","articulo 26","art 26"]},
  {id:"identify_taxable_event",label:"Identificar hecho generador o supuesto de hecho",tokens:["hecho generador","supuesto de hecho","conducta punible","actividad gravada","actividad comercial","actividad industrial","actividad de servicios"]},
  {id:"identify_legal_subject",label:"Identificar sujeto jurídico obligado o responsable",tokens:["sujeto pasivo","contribuyente","responsable","sujeto obligado","empleador","trabajador","victima","acusado","demandante","demandado","deudor"]},
  {id:"identify_procedure",label:"Identificar procedimiento jurídico aplicable",tokens:["procedimiento","actuacion administrativa","requerimiento","liquidacion oficial","recurso","demanda","audiencia","proceso","termino"]},
  {id:"build_litigation_document",label:"Construir actuación litigiosa",tokens:["demanda","nulidad","restablecimiento","cargo juridico","recurso","alegatos","pretensiones","contestacion"]},
  {id:"issue_accounting_certificate",label:"Emitir certificación o dictamen contable",tokens:["certificacion contable","certificacion","dictamen","revisor fiscal","contador"]},
  {id:"explain_normative_concept",label:"Explicar concepto jurídico normativo",tokens:["hablame","explicame","explica","que significa","concepto","definicion","definido por la ley","literal"]}
];

const legalFamilyRules=[
  {family:"tax",label:"Derecho tributario",anchors:["impuesto","tributario","estatuto tributario","contribuyente","declaracion","requerimiento especial","liquidacion oficial","base gravable","base grabable","bawse grabable","hecho generador","sujeto pasivo","renta","iva","ica","yca","industria y comercio","retencion en la fuente","retefuente","predial","impuesto predial","impuesto al consumo","firmeza","714","745","778"]},
  {family:"labor",label:"Derecho laboral y seguridad social",anchors:["contrato de trabajo","trabajador","empleador","salario","prestaciones sociales","arl","pension","cesantias","despido","relacion laboral","seguridad social","pila","ugpp","subordinacion"]},
  {family:"criminal",label:"Derecho penal",anchors:["penal","delito","conducta punible","denuncia","fiscalia","acusado","imputacion","victima","hurto","estafa","lesiones personales","dolo","culpa","tipo penal"]},
  {family:"administrative",label:"Derecho administrativo",anchors:["acto administrativo","nulidad","restablecimiento","cpaca","entidad publica","debido proceso administrativo","notificacion administrativa","recurso de reconsideracion","recurso de reposicion","revocatoria directa","requerimiento de informacion","solicitud de informacion","fiscalizacion","prorroga","ampliacion de termino","plazo para responder","responder requerimiento","caja de compensacion","comfiar","aportes parafiscales"]},
  {family:"civil",label:"Derecho civil/comercial",anchors:["contrato","obligacion","incumplimiento","clausula","arrendamiento","compraventa","responsabilidad civil","pago","deuda","sociedad comercial","titulo valor","pagare","factura"]},
  {family:"general_law",label:"Teoría general de la norma jurídica",anchors:["conceptos definidos por la ley","definicion legal","concepto de ley","norma juridica","literalmente como parte de la ley"]},
  {family:"constitutional",label:"Derecho constitucional",anchors:["constitucion","tutela","derecho fundamental","debido proceso","igualdad","peticion","accion de tutela","bloque de constitucionalidad"]}
];

const taxMatterRules=[
  {tax:"ica",label:"Impuesto de Industria y Comercio",anchors:["industria y comercio","impuesto de industria y comercio","ica","yca"],structuralSignals:["actividad industrial","actividad comercial","actividad de servicios","municipio","territorial"]},
  {tax:"renta",label:"Impuesto sobre la renta",anchors:["impuesto de renta","renta liquida","renta gravable","renta","articulo 26","art 26"],structuralSignals:["costos","deducciones","renta liquida","ingresos ordinarios y extraordinarios"]},
  {tax:"iva",label:"IVA",anchors:["iva","impuesto sobre las ventas"],unsupported:true},
  {tax:"predial",label:"Impuesto predial",anchors:["predial","impuesto predial"],unsupported:true},
  {tax:"consumo",label:"Impuesto al consumo",anchors:["impuesto al consumo"],unsupported:true},
  {tax:"retencion_fuente",label:"Retención en la fuente",anchors:["retefuente","retencion en la fuente"],unsupported:true},
  {tax:"general",label:"Tributario general",anchors:["estatuto tributario","procedimiento tributario","745","714","778","firmeza","inspeccion tributaria","requerimiento especial","liquidacion oficial"],structuralSignals:["procedimiento","prueba","notificacion","declaracion"]}
];

export function detectLegalObjective(message){
  const text=normalize(message);
  if(hasPhrase(text,"certificacion contable")) return {id:"define_tax_base",label:"Emitir certificación contable sobre base gravable",score:99,requiresDocumentIntake:true};
  let best={id:"identify_legal_objective",label:"Identificar objetivo jurídico",score:0};
  for(const objective of objectives){
    let score=0;
    for(const token of objective.tokens){ if(hasPhrase(text, token)) score+=token.length>6?2:1; }
    if(score>best.score) best={...objective,score};
  }
  if(best.id==="issue_accounting_certificate" && (hasPhrase(text,"certificacion")||hasPhrase(text,"dictamen"))) return {id:"define_tax_base",label:"Emitir dictamen técnico-contable sobre base gravable",score:best.score,requiresDocumentIntake:false};
  return best;
}

export function detectDomain(message){
  const text=normalize(message);
  const familyScores=legalFamilyRules.map(rule=>scoreRule(text,rule)).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
  const family=familyScores[0]||null;
  if(!family) return {domain:"unknown",tax:null,family:null,confidence:0,evidence:[]};

  if(family.family!=="tax"){
    return {domain:family.family,tax:null,family:family.family,label:family.label,unsupported:false,confidence:family.score,evidence:family.evidence};
  }

  const matterScores=taxMatterRules.map(rule=>scoreRule(text,rule)).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
  const tax=matterScores[0]||null;
  if(!tax) return {domain:"tax",tax:"general",family:"tax",label:"Derecho tributario general",unsupported:false,confidence:family.score,evidence:family.evidence};
  return {domain:"tax",tax:tax.tax,family:"tax",label:tax.label,unsupported:tax.unsupported===true,confidence:family.score+tax.score,evidence:[...family.evidence,...tax.evidence],structuralSignals:tax.structuralSignals||[]};
}

function scoreRule(text,rule){
  let score=0; const evidence=[];
  for(const anchor of rule.anchors||[]){ if(hasPhrase(text,anchor)){ const points=anchor.length>5?2:1; score+=points; evidence.push(anchor); } }
  for(const signal of rule.structuralSignals||[]){ if(hasPhrase(text,signal)){ score+=1; evidence.push(signal); } }
  return {...rule,score,evidence:[...new Set(evidence)]};
}

export function hasPhrase(text,phrase){
  const source=normalize(text); const value=normalize(phrase);
  if(!value) return false;
  if(/^[a-z0-9ñ]+$/.test(value)) return new RegExp(`\\b${escapeRegExp(value)}\\b`).test(source);
  return source.includes(value);
}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
