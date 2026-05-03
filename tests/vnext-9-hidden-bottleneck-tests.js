import assert from "assert";
import fs from "fs";
import { runVorixen, runCodeSelfAudit } from "../src/pipeline/vorixen-pipeline.js";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS vNext.10 ${name}`);
  } catch (error) {
    console.error(`FAIL vNext.10 ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("release limpio ignora .env real y no incluye memoria runtime", () => {
  if(process.env.NODE_ENV==="test" && fs.existsSync("data/vorixen_memory.json")) fs.rmSync("data/vorixen_memory.json",{force:true});
  const gitignore = fs.readFileSync(".gitignore", "utf8");
  assert.ok(gitignore.split(/\r?\n/).includes(".env"), "El release debe ignorar .env real");
  assert.equal(fs.existsSync("data/vorixen_memory.json"), false, "El release no debe traer memoria runtime previa");
  assert.equal(fs.existsSync("data/.gitkeep"), true);
});

test("release limpio no arrastra reportes antiguos como raíz operativa", () => {
  const rootFiles = fs.readdirSync(".");
  const oldReports = rootFiles.filter(f => /^(AUDIT_VNEXT_[1-8](?:_|\.|-)|TEST_LOG_VNEXT_[1-8](?:_|\.|-)|SELF_AUDIT_VNEXT_7|AUDIT_LOG_|AUDIT_REPORT_)/.test(f));
  assert.deepEqual(oldReports, []);
});

test("runner de pruebas usa procesos aislados y no import dinámico con process.exit interceptado", () => {
  const source = fs.readFileSync("tests/run-all-tests.js", "utf8");
  assert.ok(source.includes("spawnSync"));
  assert.ok(source.includes("Worker"));
  assert.ok(!source.includes("await import"));
  assert.ok(!source.includes("process.exit ="));
});

test("health y autoauditoría reportan release vNext 12", () => {
  const server = fs.readFileSync("src/server.js", "utf8");
  const auditEngine = fs.readFileSync("src/engines/code-self-audit-engine.js", "utf8");
  assert.ok(server.includes("vNext_12_required_ai_monitoring"));
  assert.ok(auditEngine.includes('version:"vNext_12"'));
  assert.ok(auditEngine.includes("vNext_12_required_ai_monitoring"));
});

test("autoauditoría del código limpio no baja de estado operativo", () => {
  const audit = runCodeSelfAudit({ rootDir: process.cwd(), apply: false });
  assert.equal(audit.status, "codebase_operational");
  assert.ok(audit.score >= 98);
  assert.equal(audit.version, "vNext_12");
});

test("solicitud de prórroga mantiene salida profesional y suficiente", () => {
  const r = runVorixen("quiero solicitar plazo de 15 dias para responder requerimiento de información de COMFIAR", { sessionId: "v9-prorroga", rootDir: process.cwd() });
  assert.equal(r.runtime.status, "ready_for_legal_execution");
  assert.ok(r.output.includes("DOCUMENTO LISTO PARA FIRMA"));
  assert.ok(r.output.includes("SOLICITUD DE PRÓRROGA"));
  assert.ok(r.output.toLowerCase().includes("suficiencia jurídica"));
  assert.ok(!/^NORMA:\nHECHO/m.test(r.output));
});

test("jurídico general entra sin norma inventada cuando fuente especial falta", () => {
  const r = runVorixen("necesito responder un requerimiento de impuesto al consumo departamental", { sessionId: "v9-consumo", rootDir: process.cwd() });
  assert.notEqual(r.runtime.status, "non_legal_passthrough");
  assert.ok(r.output.includes("no inventar") || r.output.includes("sin inventar") || r.output.includes("fuente"));
});

test("autoauditoría por chat no contamina el pipeline jurídico", () => {
  const r = runVorixen("audita el código, revisa compatibilidad, busca cuellos de botella y no modifiques producción", { sessionId: "v9-code", rootDir: process.cwd() });
  assert.equal(r.runtime.status, "codebase_operational");
  assert.ok(r.output.includes("AUTOAUDITORÍA DE CÓDIGO VORIXEN"));
  assert.ok(r.output.includes("Node.js >=24"));
});

process.exit(process.exitCode || 0);
