import { QueryMode } from "../core/types.js";

export function activateNorms(analysis, temporal){
  const required=analysis.mode===QueryMode.NORMATIVE_QUERY || analysis.mode===QueryMode.FORMAT_TRANSFORM ? [] : (analysis.topic?.requiredFactsForConcreteCase||[]);
  const missing=required.filter(f=>!analysis.providedFacts.includes(f));
  if(missing.length){
    return {activatedNorms:[],missingFacts:missing,activationBlocked:true,reason:`normative_activation:missing_facts:${missing.join(",")}`};
  }
  const activated=(temporal.validNorms||[]).map((norm,index)=>({
    id:slug(norm.name),
    ...norm,
    type:"law",
    hasForceOfLaw:true,
    isNormativelyRecognized:true,
    activatedByObjective:analysis.objective?.id||null,
    activatedByFacts:analysis.providedFacts,
    activationLevel:index===0?"governing":"support"
  }));
  return {activatedNorms:activated,missingFacts:[],activationBlocked:false,reason:null};
}

function slug(value){return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}
