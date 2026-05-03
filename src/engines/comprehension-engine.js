import { validateTemporalValidity } from "./temporal-validity-engine.js";
import { activateNorms } from "./normative-activation-engine.js";

export function buildLegalSpace(analysis){
  if(!analysis.topic) return {norms:[],activatedNorms:[],eliminated:[],conflicts:[],temporal:{},activation:{}};
  const temporal=validateTemporalValidity(analysis.topic, analysis.factDetails||{});
  const activation=activateNorms(analysis, temporal);
  const validNorms=activation.activatedNorms.filter(n=>n.hasForceOfLaw===true&&n.isNormativelyRecognized===true);
  const eliminated=[...(temporal.temporallyEliminated||[]),...activation.activatedNorms.filter(n=>!validNorms.includes(n))];
  return {norms:validNorms,activatedNorms:validNorms,eliminated,conflicts:detectConflicts(validNorms),temporal,activation};
}

function detectConflicts(norms){
  const governing=norms.filter(n=>n.activationLevel==="governing");
  if(governing.length>1) return [{type:"equal_governing_collision",norms:governing.map(n=>n.name)}];
  return [];
}
