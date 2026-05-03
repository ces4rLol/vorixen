import { hasPhrase } from "./objective-engine.js";

const conceptCatalog=[
  {id:"legal_definition_override",terms:["concepto de ley","definido por la ley","definicion legal","literal","conceptos definidos"],definition:"Los conceptos definidos por la ley integran la norma y sustituyen el significado común para ese espacio jurídico.",source:"Regla de interpretación normativa interna VORIXEN: concepto legal prevalece sobre lenguaje natural."},
  {id:"income_tax_concept",terms:["ingreso","ingresos","ingresos ordinarios","ingresos extraordinarios"],definition:"Ingreso jurídicamente relevante es el susceptible de producir incremento neto del patrimonio cuando la norma tributaria lo exige.",source:"Estatuto Tributario, artículo 26 y reglas de realización fiscal aplicables."},
  {id:"accrual_concept",terms:["devengo","devengado","contabilidad","niif"],definition:"Cuando la ley remite al devengo contable, la lectura natural de caja no gobierna por sí sola la realización fiscal.",source:"Estatuto Tributario, artículos 21-1 y 28, cuando estén temporal y materialmente activados."},
  {id:"taxable_event_concept",terms:["hecho generador","supuesto de hecho"],definition:"El hecho generador es el supuesto normativo cuya realización activa la obligación jurídica; no es una descripción libre del usuario.",source:"Estructura general de obligación jurídica y normas especiales del tributo o dominio activado."},
  {id:"legal_subject_concept",terms:["sujeto pasivo","contribuyente","responsable","empleador","trabajador","victima","acusado","demandado"],definition:"El sujeto jurídico se determina por la posición normativa atribuida por la ley, no solo por la denominación usada por las partes.",source:"Norma sustancial del dominio jurídico activado."}
];

export function extractLegalConcepts(analysis){
  const text=analysis.normalizedText||"";
  const concepts=[];
  for(const concept of conceptCatalog){
    if(concept.terms.some(term=>hasPhrase(text,term))){ concepts.push(concept); }
  }
  if(analysis.topic?.rule?.includes("incremento")) concepts.push(conceptCatalog.find(c=>c.id==="income_tax_concept"));
  return [...new Map(concepts.filter(Boolean).map(c=>[c.id,c])).values()];
}

export function applyConceptOverride(analysis){
  const legalConcepts=extractLegalConcepts(analysis);
  return {...analysis,legalConcepts,conceptOverrideApplied:legalConcepts.length>0};
}
