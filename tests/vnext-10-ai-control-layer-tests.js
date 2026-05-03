import assert from "assert";
import { buildAIRequestContract, buildOpenAIMessages } from "../src/ai/ai-request-contract-engine.js";
import { validateAIControlledResponse } from "../src/ai/ai-response-validator-engine.js";
import { runVorixenControlled } from "../src/pipeline/vorixen-pipeline.js";

let pass=0;
function ok(name,fn){try{fn(); pass++; console.log(`PASS ${name}`);}catch(e){console.error(`FAIL ${name}`); console.error(e); process.exit(1);}}
function okAsync(name,fn){return fn().then(()=>{pass++; console.log(`PASS ${name}`);}).catch(e=>{console.error(`FAIL ${name}`); console.error(e); process.exit(1);});}

const runtime={
  status:"ready_for_legal_execution",
  speechClass:"Ejecutar consecuencia jurídica gobernante",
  topic:{id:"ica_taxable_base",label:"Base gravable ICA"},
  objective:{id:"define_taxable_base",label:"definir base gravable"},
  normReference:"Ley 1819 de 2016, artículo 342; Estatuto Tributario, artículos 28 y 21-1",
  triggeringFact:"Consulta normativa general sobre base gravable ICA posterior a 2017.",
  concreteAction:"Determinar la base gravable conforme a ingresos devengados susceptibles de incrementar patrimonio.",
  legalPurpose:"Fijar regla aplicable.",
  activatedNorms:[{name:"Ley 1819 de 2016 artículo 342",role:"norma madre",activationLevel:"direct"}],
  legalConcepts:[{definition:"ingreso = incremento patrimonial",source:"Estatuto Tributario"}]
};
const localOutput="Ejecutar consecuencia jurídica gobernante\n\nCONCEPTO JURÍDICO\n\nI. PROBLEMA JURÍDICO\n...\nII. MARCO NORMATIVO APLICABLE\nLey 1819 de 2016, artículo 342; Estatuto Tributario, artículos 28 y 21-1\nIII. INTERPRETACIÓN TÉCNICO-JURÍDICA\n...\nV. APLICACIÓN AL CASO O A LA CONSULTA\n...\nVI. CONCLUSIÓN JURÍDICA\n...";

ok("contract preserves runtime lock",()=>{
  const contract=buildAIRequestContract({message:"base gravable ICA",runtime,output:localOutput});
  assert.equal(contract.contractName,"VORIXEN_AI_CONTROL_CONTRACT");
  assert.equal(contract.runtimeLock.status,runtime.status);
  assert.equal(contract.runtimeLock.normReference,runtime.normReference);
  assert(contract.hardRules.some(r=>r.includes("No inventar")));
});

ok("openai messages contain contract only as controlled payload",()=>{
  const contract=buildAIRequestContract({message:"base gravable ICA",runtime,output:localOutput});
  const messages=buildOpenAIMessages(contract);
  assert.equal(messages.length,2);
  assert.equal(messages[0].role,"system");
  assert(messages[1].content.includes("CONTRATO VORIXEN"));
});

ok("validator accepts controlled professional legal output",()=>{
  const contract=buildAIRequestContract({message:"base gravable ICA",runtime,output:localOutput});
  const text="Ejecutar consecuencia jurídica gobernante\n\nI. PROBLEMA JURÍDICO\nDefinir base gravable.\n\nII. MARCO NORMATIVO\nLey 1819 de 2016, artículo 342; Estatuto Tributario, artículos 28 y 21-1.\n\nIII. INTERPRETACIÓN\nEl concepto legal gobierna el análisis.\n\nIV. APLICACIÓN\nSe aplica al hecho consultado.\n\nV. CONCLUSIÓN\nSe ejecuta la consecuencia jurídica gobernante.";
  const result=validateAIControlledResponse({text,contract});
  assert.equal(result.valid,true,result.errors.join(","));
});

ok("validator rejects soft language",()=>{
  const contract=buildAIRequestContract({message:"base gravable ICA",runtime,output:localOutput});
  const text="Ejecutar consecuencia jurídica gobernante\n\nPROBLEMA JURÍDICO\nX\nMARCO NORMATIVO\nLey 1819 de 2016, artículo 342.\nINTERPRETACIÓN\nse recomienda evaluar.\nAPLICACIÓN\nX\nCONCLUSIÓN\nX";
  const result=validateAIControlledResponse({text,contract});
  assert.equal(result.valid,false);
  assert(result.errors.some(e=>e.includes("soft_language")));
});

ok("validator rejects unverified fake citation",()=>{
  const contract=buildAIRequestContract({message:"base gravable ICA",runtime,output:localOutput});
  const text="Ejecutar consecuencia jurídica gobernante\n\nPROBLEMA JURÍDICO\nX\nMARCO NORMATIVO\nLey 1819 de 2016, artículo 342.\nINTERPRETACIÓN\nSentencia C-999 de 2099.\nAPLICACIÓN\nX\nCONCLUSIÓN\nX";
  const result=validateAIControlledResponse({text,contract});
  assert.equal(result.valid,false);
  assert(result.errors.some(e=>e.includes("unverified_citation")));
});

await okAsync("runVorixenControlled preserves local output when AI not requested",async()=>{
  const result=await runVorixenControlled("hablame del hecho generador del ica",{sessionId:"v10-no-ai"});
  assert.equal(result.aiControl.usedAI,false);
  assert.equal(result.aiControl.reason,"ai_not_requested");
  assert(result.output.includes("PROBLEMA JURÍDICO") || result.output.includes("Clasificación no jurídica")===false);
});

await okAsync("runVorixenControlled does not call OpenAI without key",async()=>{
  const result=await runVorixenControlled("base gravable ica 2017",{sessionId:"v10-no-key",useAI:true});
  assert.equal(result.aiControl.usedAI,false);
  assert.equal(result.aiControl.reason,"openai_api_key_not_configured");
  assert(result.output.length>100);
});

console.log(`PASS vnext-10-ai-control-layer-tests ${pass}/7`);
