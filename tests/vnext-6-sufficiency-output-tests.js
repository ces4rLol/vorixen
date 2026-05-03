import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function test(name,fn){try{fn();console.log(`PASS vNext.6 ${name}`);}catch(error){console.error(`FAIL vNext.6 ${name}`);console.error(error);process.exitCode=1;}}

test("solicitud de plazo de 15 días activa documento listo para firma",()=>{
  const r=runVorixen("quiero solicitar plazo de 15 dias para responder requerimiento",{sessionId:"v6-prorroga"});
  assert.equal(r.analysis.topic.id,"administrative_deadline_extension");
  assert.equal(r.outputMode,"ready_to_file");
  assert.ok(r.output.includes("DOCUMENTO LISTO PARA FIRMA"));
  assert.ok(r.output.includes("SOLICITUD DE PRÓRROGA"));
  assert.ok(r.output.includes("quince (15) días hábiles adicionales"));
  assert.ok(r.output.includes("Constitución Política, artículo 29"));
  assert.ok(r.output.includes("Ley 1755 de 2015"));
});

test("salida incluye regla de suficiencia y no longitud artificial",()=>{
  const r=runVorixen("háblame del hecho generador del ICA",{sessionId:"v6-suficiencia"});
  assert.ok(r.output.includes("Regla de suficiencia jurídica"));
  assert.ok(r.output.includes("Detener expansión"));
  assert.ok(r.output.includes("Ningún elemento probatorio o normativo útil debe descartarse"));
});

test("dictamen conserva suficiencia jurídica y soporte",()=>{
  const sessionId="v6-dictamen";
  runVorixen("me puedes decir cual es la base gravable del ica a partir de 2017?",{sessionId});
  const r=runVorixen("dámela tipo dictamen de revisor fiscal",{sessionId});
  assert.equal(r.outputMode,"fiscal_auditor_opinion");
  assert.ok(r.output.includes("DICTAMEN TÉCNICO DE REVISOR FISCAL"));
  assert.ok(r.output.includes("Regla de suficiencia jurídica"));
  assert.ok(r.output.includes("Consejo de Estado"));
});

test("tributo no cargado mantiene entrada jurídica sin contaminar ICA",()=>{
  const r=runVorixen("haz concepto jurídico sobre base gravable de IVA",{sessionId:"v6-iva"});
  assert.equal(r.analysis.domain.tax,"iva");
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.ok(r.output.includes("Regla de suficiencia jurídica"));
  assert.ok(!r.output.includes("Decreto Ley 1333"));
});

test("consulta no jurídica conserva clasificación no jurídica",()=>{
  const r=runVorixen("hola estoy como administrador",{sessionId:"v6-nonlegal"});
  assert.equal(r.runtime.status,"non_legal_passthrough");
});

process.exit(process.exitCode||0);
