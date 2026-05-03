import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function test(name,fn){try{fn();console.log(`PASS vNext.5 ${name}`);}catch(error){console.error(`FAIL vNext.5 ${name}`);console.error(error);process.exitCode=1;}}

function noIcaContamination(result){
  const text=[result.output, result.runtime?.normReference, result.analysis?.topic?.label, result.analysis?.topic?.rule].join("\n");
  assert.ok(!text.includes("Decreto Ley 1333"));
  assert.ok(!text.includes("Ley 14 de 1983"));
  assert.ok(!text.includes("Industria y Comercio"));
}

test("IVA activa análisis jurídico estructural sin inventar ni contaminar ICA",()=>{
  const r=runVorixen("háblame del hecho generador del IVA",{sessionId:"v5-iva-hecho"});
  assert.equal(r.analysis.domain.domain,"tax");
  assert.equal(r.analysis.domain.tax,"iva");
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.ok(r.output.includes("norma especial verificada") || r.output.includes("Norma tributaria especial"));
  noIcaContamination(r);
});

test("base gravable de IVA no queda como bloqueo muerto",()=>{
  const r=runVorixen("base gravable de IVA en 2024",{sessionId:"v5-iva-base"});
  assert.equal(r.analysis.domain.tax,"iva");
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.ok(r.output.includes("I. PROBLEMA JURÍDICO"));
  assert.ok(r.output.includes("JURISPRUDENCIA"));
  noIcaContamination(r);
});

test("predial entra como tributario estructural sin caer en ICA",()=>{
  const r=runVorixen("explícame la base gravable del impuesto predial",{sessionId:"v5-predial"});
  assert.equal(r.analysis.domain.domain,"tax");
  assert.equal(r.analysis.domain.tax,"predial");
  assert.equal(r.runtime.status,"procedural_action_required");
  noIcaContamination(r);
});

test("renta conserva tema propio y no se vuelve dinámica innecesaria",()=>{
  const r=runVorixen("explícame el artículo 26 del Estatuto Tributario y la renta líquida",{sessionId:"v5-renta"});
  assert.equal(r.analysis.domain.tax,"renta");
  assert.equal(r.analysis.topic.id,"income_tax_net_taxable_income");
  assert.equal(r.runtime.status,"ready_for_legal_execution");
  assert.ok(r.output.includes("Estatuto Tributario, artículo 26"));
  noIcaContamination(r);
});

test("penal mantiene salida profesional sin referencias tributarias",()=>{
  const r=runVorixen("explícame la tipicidad en un caso penal por estafa",{sessionId:"v5-penal"});
  assert.equal(r.analysis.domain.domain,"criminal");
  assert.notEqual(r.runtime.status,"non_legal_passthrough");
  assert.ok(r.output.includes("Código Penal"));
  assert.ok(!r.output.includes("Estatuto Tributario"));
});

test("formato de dictamen sobre consulta anterior no borra fondo jurídico",()=>{
  const sessionId="v5-formato";
  runVorixen("me puedes decir cual es la base gravable del ica a partir de 2017?",{sessionId});
  const r=runVorixen("tu respuesta es muy superficial, damela larga como dictamen de revisor fiscal",{sessionId});
  assert.equal(r.mode,"format_transform");
  assert.equal(r.outputMode,"fiscal_auditor_opinion");
  assert.ok(r.output.includes("DICTAMEN TÉCNICO DE REVISOR FISCAL"));
  assert.ok(r.output.includes("Ley 1819 de 2016"));
  assert.ok(r.output.includes("Ningún elemento probatorio o normativo útil debe descartarse"));
});

test("salida profesional mantiene advertencia de no inventar jurisprudencia",()=>{
  const r=runVorixen("dame concepto jurídico sobre hecho generador del ICA",{sessionId:"v5-jurisprudencia"});
  assert.ok(r.output.includes("VORIXEN no inventa radicados ni fechas") || r.output.includes("Adjuntar sentencia específica verificada"));
});

process.exit(process.exitCode||0);
