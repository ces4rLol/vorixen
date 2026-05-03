import { QueryMode } from "../core/types.js";
import { normalize } from "../utils/normalize.js";
import { findLegalTopic } from "../knowledge/legal-topic-catalog.js";
import { detectLegalObjective, detectDomain, hasPhrase } from "./objective-engine.js";

export function analyzeInput(message,mode,conversation){
  const text=normalize(message);
  const objective=detectLegalObjective(message);
  const domain=detectDomain(message);
  const topic=findLegalTopic(text,objective.id,domain)||(mode===QueryMode.FORMAT_TRANSFORM?conversation?.lastLegalTopic:null);
  const facts=extractFacts(text,mode,topic,domain);
  return {
    rawMessage:message,
    normalizedText:text,
    mode,
    objective,
    domain,
    topic,
    providedFacts:facts.ids,
    factDetails:facts.details,
    tension:topic?`Objetivo ${objective.label}: activar solo normas existentes y vigentes sobre ${topic.label}.`:"Tensión jurídica no determinada."
  };
}

function extractFacts(text,mode,topic,domain){
  const facts=[];
  const details={years:[],dates:[],relevantFactDate:null,dueDate:null,notificationDate:null};
  const years=[...text.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map(m=>Number(m[1]));
  details.years=[...new Set(years)];
  if(details.years.length) facts.push("specific_tax_year_present");
  if(details.years.some(y=>y>=2017)) facts.push("period_after_2017");
  if(details.years.some(y=>y<2017)) facts.push("period_before_2017");
  const dateMatches=[...text.matchAll(/\b(\d{1,2})\s+de\s+([a-zñ]+)\s+de\s+(20\d{2}|19\d{2})\b/g)];
  for(const match of dateMatches){
    const iso=toIsoDate(match[1],match[2],match[3]);
    if(iso) details.dates.push(iso);
  }
  if(details.dates.length) facts.push("legal_date_present");
  if(hasPhrase(text,"vencio")||hasPhrase(text,"vencimiento")||hasPhrase(text,"vence")){
    facts.push("due_date_present");
    details.dueDate=details.dates[0]||null;
  }
  if(hasPhrase(text,"notificado")||hasPhrase(text,"notificacion")||hasPhrase(text,"notifico")){
    facts.push("notification_date_present");
    details.notificationDate=details.dates[details.dates.length-1]||details.dates[0]||null;
  }
  if(domain.domain && domain.domain!=="unknown") facts.push("legal_domain_present");
  if(domain.domain && domain.domain!=="unknown") facts.push("legal_objective_present");
  if(hasPhrase(text,"ica")||hasPhrase(text,"industria y comercio")||hasPhrase(text,"yca")||domain.tax==="ica") facts.push("tax_ica");
  if(hasPhrase(text,"renta")||domain.tax==="renta") facts.push("tax_income");
  if(hasPhrase(text,"arauca")||hasPhrase(text,"municipio")) facts.push("municipality_present");
  if(hasPhrase(text,"nit")) facts.push("taxpayer_id_present");
  if(hasPhrase(text,"ingresos")||hasPhrase(text,"valor")||hasPhrase(text,"certifico")||hasPhrase(text,"certificados")) facts.push("certified_values_present");
  if(hasPhrase(text,"soporte")||hasPhrase(text,"contabilidad")||hasPhrase(text,"estado financiero")||hasPhrase(text,"puc")||hasPhrase(text,"libro")) facts.push("accounting_support_present");
  if(hasPhrase(text,"contador")||hasPhrase(text,"revisor fiscal")||hasPhrase(text,"certificante")) facts.push("certifier_capacity_present");
  if(hasPhrase(text,"industrial")||hasPhrase(text,"comercial")||hasPhrase(text,"servicios")) facts.push("activity_type_present");
  if(hasPhrase(text,"declaracion")) facts.push("tax_return_exists");
  if(hasPhrase(text,"requerimiento")||hasPhrase(text,"solicitud de informacion")||hasPhrase(text,"fiscalizacion")) { facts.push("administrative_request_exists"); facts.push("actuation_type_present"); }
  if(hasPhrase(text,"prorroga")||hasPhrase(text,"solicitar plazo")||hasPhrase(text,"ampliacion de termino")||hasPhrase(text,"plazo de 15 dias")||hasPhrase(text,"quince dias")) { facts.push("deadline_extension_requested"); facts.push("administrative_request_exists"); facts.push("actuation_type_present"); }
  if(hasPhrase(text,"liquidacion")) { facts.push("official_assessment_exists"); facts.push("actuation_type_present"); }
  if(hasPhrase(text,"inspeccion tributaria")) { facts.push("tax_procedure_present"); facts.push("inspection_requested_present"); }
  if(hasPhrase(text,"duda")||hasPhrase(text,"745")) facts.push("probative_doubt_present");
  if(hasPhrase(text,"vacio probatorio")||hasPhrase(text,"prueba insuficiente")) facts.push("evidence_gap_present");
  if(hasPhrase(text,"procedimiento")||hasPhrase(text,"requerimiento")||hasPhrase(text,"liquidacion")||hasPhrase(text,"declaracion")) facts.push("tax_procedure_present");
  if(hasPhrase(text,"contrato de trabajo")||hasPhrase(text,"trabajador")||hasPhrase(text,"empleador")||hasPhrase(text,"despido")) facts.push("labor_relation_present");
  if(hasPhrase(text,"delito")||hasPhrase(text,"denuncia")||hasPhrase(text,"codigo penal")||hasPhrase(text,"fiscalia")) facts.push("criminal_matter_present");
  if(hasPhrase(text,"contrato")||hasPhrase(text,"incumplimiento")||hasPhrase(text,"arrendamiento")||hasPhrase(text,"deuda")) facts.push("civil_obligation_present");
  if(mode===QueryMode.NORMATIVE_QUERY&&topic) facts.push("general_normative_query");
  details.relevantFactDate=deriveRelevantFactDate(details, text);
  return {ids:[...new Set(facts)],details};
}

function deriveRelevantFactDate(details,text){
  if(details.years.length){
    const y=details.years[0];
    return `${y}-12-31`;
  }
  return details.dates[0]||null;
}

function toIsoDate(day,monthName,year){
  const months={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
  const m=months[monthName];
  if(!m) return null;
  return `${year}-${String(m).padStart(2,"0")}-${String(Number(day)).padStart(2,"0")}`;
}
