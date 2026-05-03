import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";
function test(name,fn){try{fn(); console.log(`PASS vNext ${name}`);}catch(err){console.error(`FAIL vNext ${name}`); console.error(err); process.exitCode=1;}}

test("2016 no aplica regla posterior Ley 1819 art 342",()=>{
  const r=runVorixen("cuál era la base gravable del ICA en 2016");
  assert.equal(r.runtime.status,"ready_for_legal_execution");
  assert.equal(r.analysis.topic.id,"ica_base_gravable_before_2017");
  assert.ok(!r.runtime.normReference.includes("Ley 1819 de 2016, artículo 342"));
  assert.ok(r.output.includes("antes de 2017"));
});

test("2017 posterior activa Ley 1819 y ET 28",()=>{
  const r=runVorixen("cuál es la base gravable del ICA después de 2017");
  assert.equal(r.analysis.topic.id,"ica_base_gravable_after_2017");
  assert.ok(r.runtime.normReference.includes("Ley 1819 de 2016, artículo 342"));
  assert.ok(r.runtime.normReference.includes("Estatuto Tributario, artículo 28"));
});

test("articulo 745 ET activa duda probatoria",()=>{
  const r=runVorixen("explícame el artículo 745 del Estatuto Tributario aplicado a ICA");
  assert.equal(r.runtime.status,"ready_for_legal_execution");
  assert.equal(r.analysis.topic.id,"tax_doubt_favors_taxpayer");
  assert.ok(r.output.includes("Estatuto Tributario, artículo 745"));
});

test("typos base gravable yca despuez 2017 no bloquean",()=>{
  const r=runVorixen("cual es la bawse grabable del yca despuez de 2017");
  assert.notEqual(r.runtime.status,"blocked_by_governance");
  assert.equal(r.analysis.topic.id,"ica_base_gravable_after_2017");
});

test("firmeza extrae vencimiento y notificación",()=>{
  const r=runVorixen("la declaración ICA 2021 venció el 29 de abril de 2022 y el requerimiento fue notificado el 26 de mayo de 2025");
  assert.equal(r.analysis.topic.id,"tax_firmness");
  assert.ok(r.analysis.providedFacts.includes("due_date_present"));
  assert.ok(r.analysis.providedFacts.includes("notification_date_present"));
  assert.notEqual(r.runtime.triggeringFact.includes("notification_date_present"), false);
});

test("certificación contable sin datos suficientes queda en intake",()=>{
  const r=runVorixen("haz certificación contable de base gravable ICA 2021 Arauca");
  assert.equal(r.runtime.status,"intake_required");
  assert.ok(r.output.includes("Completar requisito de entrada obligatorio"));
});

test("renta activa artículo 26 y no usa ICA",()=>{
  const r=runVorixen("cómo se depura la renta líquida conforme al artículo 26 del Estatuto Tributario");
  assert.equal(r.analysis.topic.id,"income_tax_net_taxable_income");
  assert.ok(r.runtime.normReference.includes("Estatuto Tributario, artículo 26"));
  assert.ok(!r.runtime.normReference.includes("ICA posterior"));
});
process.exit(process.exitCode||0);
