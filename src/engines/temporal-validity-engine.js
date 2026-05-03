export function validateTemporalValidity(topic, facts){
  const factYear=facts.years?.[0]||null;
  const relevantDate=facts.relevantFactDate || (factYear?`${factYear}-12-31`:null);
  const eliminated=[];
  const valid=[];
  for(const norm of topic?.norms||[]){
    const from=norm.effectiveFrom||"1900-01-01";
    const to=norm.effectiveTo||null;
    if(norm.requiresFactDate && !relevantDate){
      eliminated.push({...norm,reason:"temporal_validity:missing_relevant_fact_date"});
      continue;
    }
    if(relevantDate && from && relevantDate<from && norm.retroactive!==true){
      eliminated.push({...norm,reason:"temporal_validity:norm_after_fact_date"});
      continue;
    }
    if(relevantDate && to && relevantDate>to){
      eliminated.push({...norm,reason:"temporal_validity:norm_expired_before_fact_date"});
      continue;
    }
    valid.push(norm);
  }
  return {relevantDate,validNorms:valid,temporallyEliminated:eliminated};
}
