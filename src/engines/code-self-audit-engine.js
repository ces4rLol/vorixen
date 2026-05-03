import fs from "fs";
import path from "path";

const REQUIRED_FILES=["package.json",".nvmrc","DEPLOY_HOSTINGER.md","deploy/nginx-vorixen.conf","scripts/check_production_env.js","src/server.js","src/core/auth.js","src/core/auth-store.js","src/pipeline/vorixen-pipeline.js","src/engines/intent-engine.js","src/engines/analysis-engine.js","src/engines/legal-concept-engine.js","src/engines/comprehension-engine.js","src/engines/decision-engine.js","src/engines/response-engine.js","src/engines/legal-output-sufficiency-engine.js","src/knowledge/legal-topic-catalog.js","tests/run-all-tests.js","tests/run-tests.js","tests/auth-sqlite-tests.js","tests/check-syntax.js"];
const PIPELINE_ORDER=["classifyIntent","detectOutputMode","analyzeInput","applyConceptOverride","buildLegalSpace","decide","enforceGovernor","assertExecutionPrecision","buildResponse"];

export function isCodeSelfAuditRequest(message){
  const text=String(message||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const asksCode=/\b(codigo|code|programa|backend|frontend|pipeline|motor|modulo|modulos|tests?|pruebas|bug|bugs|refactor|compatibilidad)\b/.test(text);
  const asksAudit=/(audita|auditar|revisa|revisar|corrige|corregir|mejora|mejorar|cuello|cuellos|self audit|autoauditoria|autoevaluacion|auto mejora|mejore su propio codigo|su propio codigo)/.test(text);
  return asksCode&&asksAudit;
}

export function runCodeSelfAudit(options={}){
  const rootDir=options.rootDir||process.cwd();
  const apply=options.apply===true;
  const files=listProjectFiles(rootDir);
  const findings=[...checkRequiredFiles(rootDir),...checkPackage(rootDir),...checkProductionConfig(rootDir),...checkServerContract(rootDir),...checkPipelineContract(rootDir),...checkResponseContract(rootDir),...checkKeywordContamination(rootDir),...checkTestCoverage(rootDir),...runSyntaxChecks(rootDir,files)];
  const score=computeScore(findings);
  const report={engine:"CODE_SELF_AUDIT_ENGINE",version:"vNext_12",mode:apply?"apply_safe_corrections":"audit_only",rootDir,scannedFiles:files.length,status:score>=90&&!findings.some(f=>f.severity==="critical")?"codebase_operational":"codebase_requires_attention",score,findings,safeCorrections:buildSafeCorrections(findings),blockedCorrections:buildBlockedCorrections(findings),compatibility:{node:">=24",moduleSystem:"ES Modules",server:"Express",principalEndpoint:"POST /chat",safeSelfModification:"disabled_by_default",productionGuard:"api_key_and_cors_hardened",testRunner:"run-all-tests"}};
  if(apply) report.applied=applySafeCorrections(rootDir,report.safeCorrections);
  return report;
}

export function formatCodeSelfAudit(report){
  const order={critical:0,high:1,medium:2,low:3,info:4};
  const findings=[...(report.findings||[])].sort((a,b)=>(order[a.severity]??9)-(order[b.severity]??9));
  const findingText=findings.length?findings.map((f,i)=>`${i+1}. [${f.severity.toUpperCase()}] ${f.code}\n   Archivo: ${f.file||"sistema"}\n   Hallazgo: ${f.message}\n   Corrección: ${f.recommendation}`).join("\n"):"No se detectaron hallazgos bloqueantes en la auditoría estática y de contrato.";
  const safe=report.safeCorrections?.length?report.safeCorrections.map((c,i)=>`${i+1}. ${c}`).join("\n"):"No hay correcciones automáticas seguras pendientes.";
  const blocked=report.blockedCorrections?.length?report.blockedCorrections.map((c,i)=>`${i+1}. ${c}`).join("\n"):"No hay correcciones que deban bloquearse por riesgo.";
  return `AUTOAUDITORÍA DE CÓDIGO VORIXEN\n\nESTADO: ${report.status}\nPUNTAJE DE COMPATIBILIDAD: ${report.score}/100\nARCHIVOS ESCANEADOS: ${report.scannedFiles}\nAMBIENTE: Node.js ${report.compatibility.node}, ${report.compatibility.moduleSystem}, ${report.compatibility.server}, endpoint ${report.compatibility.principalEndpoint}\n\nI. HALLAZGOS\n${findingText}\n\nII. CORRECCIONES AUTOMÁTICAS SEGURAS\n${safe}\n\nIII. CORRECCIONES BLOQUEADAS POR CONTROL DE PRODUCCIÓN\n${blocked}\n\nIV. REGLA SOBERANA DE AUTO-MEJORA\nVORIXEN puede auditar, localizar cuellos de botella, validar contratos internos y proponer correcciones verificables. La modificación automática del código en producción queda bloqueada por defecto: toda corrección que altere lógica jurídica, seguridad, endpoints o persistencia debe pasar por pruebas, revisión y reemplazo de release completo.\n\nV. CONCLUSIÓN\n${report.status==="codebase_operational"?"El código supera la auditoría de contrato y puede continuar con pruebas funcionales.":"El código requiere aplicar las correcciones señaladas antes de considerarse release estable."}`;
}

function listProjectFiles(rootDir){
  const out=[]; const skip=new Set(["node_modules",".git","data"]);
  function walk(dir){
    if(!fs.existsSync(dir)) return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(skip.has(entry.name)) continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(full);
      else if(/\.(js|json|html|css|md|txt|cjs)$/.test(entry.name)) out.push(normalizeRel(path.relative(rootDir,full)));
    }
  }
  walk(rootDir); return out.sort();
}

function checkRequiredFiles(rootDir){
  return REQUIRED_FILES.filter(file=>!fs.existsSync(path.join(rootDir,file))).map(file=>({severity:"critical",code:"missing_required_file",file,message:"Archivo obligatorio ausente.",recommendation:"Restaurar el archivo desde el release consolidado antes de desplegar."}));
}

function checkPackage(rootDir){
  const findings=[]; const file="package.json";
  try{
    const pkg=JSON.parse(fs.readFileSync(path.join(rootDir,file),"utf-8"));
    if(pkg.type!=="module") findings.push({severity:"high",code:"module_system_mismatch",file,message:"El proyecto debe operar como ES Modules.",recommendation:"Definir type: module para conservar compatibilidad con imports actuales."});
    for(const script of ["start","test","check","self-audit","compat"]){ if(!pkg.scripts?.[script]) findings.push({severity:"medium",code:"missing_script",file,message:`Falta script ${script}.`,recommendation:`Agregar script ${script} para despliegue y validación.`}); }
    if(!String(pkg.scripts?.test||"").includes("run-all-tests.js")) findings.push({severity:"high",code:"partial_test_runner",file,message:"npm test no ejecuta la suite completa consolidada.",recommendation:"Usar tests/run-all-tests.js como runner principal."});
    if(!String(pkg.engines?.node||"").includes(">=24")) findings.push({severity:"medium",code:"node_engine_unpinned",file,message:"No está fijado Node >=24.",recommendation:"Fijar engines.node >=24 para usar SQLite nativo de Node."});
  }catch(error){ findings.push({severity:"critical",code:"package_unreadable",file,message:error.message,recommendation:"Corregir JSON de package antes de desplegar."}); }
  return findings;
}

function checkProductionConfig(rootDir){
  const findings=[]; const file="src/core/config.js"; const text=safeRead(path.join(rootDir,file));
  if(!text.includes("unsafeApiKeys")) findings.push({severity:"high",code:"production_api_key_guard_missing",file,message:"No se detecta bloqueo de llaves inseguras en producción.",recommendation:"Bloquear dev_vorixen_key, change_this_api_key y llaves vacías en NODE_ENV=production."});
  if(!text.includes("CORS_ORIGIN no puede ser * en producción")) findings.push({severity:"medium",code:"production_cors_guard_missing",file,message:"No se detecta restricción de CORS abierto en producción.",recommendation:"Exigir CORS_ORIGIN específico en producción."});
  return findings;
}

function checkServerContract(rootDir){
  const findings=[]; const file="src/server.js"; const text=safeRead(path.join(rootDir,file));
  if(!text.includes("pathToFileURL")||!text.includes("isDirectRun")) findings.push({severity:"medium",code:"server_import_side_effect",file,message:"El servidor puede abrir puerto al ser importado por pruebas o auditoría.",recommendation:"Arrancar app.listen solo cuando src/server.js se ejecuta directamente."});
  if(!text.includes("vNext_12_required_ai_monitoring")) findings.push({severity:"low",code:"health_release_not_updated",file,message:"/health no expone el release actual.",recommendation:"Actualizar release de healthcheck."});
  return findings;
}

function checkPipelineContract(rootDir){
  const file="src/pipeline/vorixen-pipeline.js"; const text=safeRead(path.join(rootDir,file)); const findings=[];
  if(!text) return [{severity:"critical",code:"pipeline_missing",file,message:"No se pudo leer el pipeline principal.",recommendation:"Restaurar pipeline antes de ejecutar VORIXEN."}];
  let last=-1;
  for(const token of PIPELINE_ORDER){
    const index=text.indexOf(token);
    if(index===-1){findings.push({severity:"critical",code:"pipeline_stage_missing",file,message:`Falta etapa ${token}.`,recommendation:"Restaurar la secuencia soberana del pipeline."}); continue;}
    if(index<last) findings.push({severity:"high",code:"pipeline_order_violation",file,message:`La etapa ${token} aparece fuera de orden.`,recommendation:"Respetar orden: intención → salida → análisis → conceptos → espacio → decisión → gobierno → precisión → respuesta."});
    last=Math.max(last,index);
  }
  if(!text.includes("runCodeSelfAudit")||!text.includes("isCodeSelfAuditRequest")) findings.push({severity:"medium",code:"self_audit_not_integrated",file,message:"El pipeline no expone la autoauditoría de código.",recommendation:"Integrar CODE_SELF_AUDIT_ENGINE antes del flujo jurídico para no contaminarlo."});
  return findings;
}

function checkResponseContract(rootDir){
  const file="src/engines/response-engine.js"; const text=safeRead(path.join(rootDir,file)); const findings=[];
  for(const token of ["PROBLEMA JURÍDICO","MARCO NORMATIVO","JURISPRUDENCIA","CONCLUSIÓN"]){ if(!text.includes(token)) findings.push({severity:"high",code:"professional_output_contract_missing",file,message:`Falta bloque de salida profesional: ${token}.`,recommendation:"Restaurar salida jurídica profesional suficiente."}); }
  if(!text.includes("validateOutputSufficiency")) findings.push({severity:"high",code:"sufficiency_validator_missing",file,message:"La salida no pasa por validador de suficiencia.",recommendation:"Ejecutar validateOutputSufficiency antes de entregar respuesta."});
  return findings;
}

function checkKeywordContamination(rootDir){
  const findings=[];
  for(const file of ["src/engines/analysis-engine.js","src/engines/intent-engine.js","src/knowledge/legal-topic-catalog.js"]){
    const text=safeRead(path.join(rootDir,file));
    if(/\.includes\(["']ica["']\)/.test(text)) findings.push({severity:"critical",code:"unsafe_substring_domain_detection",file,message:"Detección riesgosa de ICA por substring.",recommendation:"Usar hasPhrase o inferencia estructural; nunca includes('ica')."});
    if(/\.includes\(["']iva["']\)/.test(text)) findings.push({severity:"high",code:"unsafe_substring_tax_detection",file,message:"Detección riesgosa de IVA por substring.",recommendation:"Usar límites de palabra o hasPhrase."});
  }
  return findings;
}

function checkTestCoverage(rootDir){
  const testsDir=path.join(rootDir,"tests"); const files=fs.existsSync(testsDir)?fs.readdirSync(testsDir).filter(f=>f.endsWith(".js")):[]; const findings=[];
  for(const name of ["auth-sqlite-tests.js","vnext-6-sufficiency-output-tests.js","vnext-7-code-self-audit-tests.js","vnext-8-brutal-compatibility-tests.js","vnext-9-hidden-bottleneck-tests.js","run-all-tests.js","check-syntax.js"]){ if(!files.includes(name)) findings.push({severity:"high",code:"missing_regression_test",file:`tests/${name}`,message:"Falta prueba de regresión esperada.",recommendation:"Agregar prueba para impedir reversión del módulo."}); }
  return findings;
}

function runSyntaxChecks(rootDir,files){
  const findings=[];
  const jsFiles=files.filter(f=>(f.endsWith(".js")||f.endsWith(".cjs"))&&!f.startsWith("tests/"));
  for(const file of jsFiles){
    const text=safeRead(path.join(rootDir,file));
    if(!text.trim()) findings.push({severity:"critical",code:"empty_code_file",file,message:"Archivo de código vacío.",recommendation:"Restaurar contenido antes de desplegar."});
    if(file!=="src/engines/code-self-audit-engine.js" && (text.includes("<<<<<<<")||text.includes(">>>>>>>")||text.includes("======="))) findings.push({severity:"critical",code:"merge_conflict_marker",file,message:"Marcador de conflicto de merge detectado.",recommendation:"Resolver conflicto antes de desplegar."});
    if((text.match(/export function/g)||[]).length===0 && file.startsWith("src/engines/") && !text.includes("export const")) findings.push({severity:"low",code:"engine_without_named_export",file,message:"Motor sin export nombrado evidente.",recommendation:"Verificar que el módulo exponga contrato importable."});
  }
  return findings;
}

function buildSafeCorrections(findings){
  const corrections=[];
  if(findings.some(f=>f.code==="missing_regression_test")) corrections.push("Agregar pruebas de regresión del módulo faltante.");
  if(findings.some(f=>f.code==="self_audit_not_integrated")) corrections.push("Integrar CODE_SELF_AUDIT_ENGINE al pipeline y endpoint de administración.");
  if(findings.some(f=>f.code==="missing_script")) corrections.push("Agregar scripts de auditoría no destructiva en package.json.");
  return corrections;
}

function buildBlockedCorrections(findings){
  const blocked=[];
  if(findings.some(f=>f.severity==="critical")) blocked.push("No aplicar modificaciones automáticas sobre lógica crítica mientras existan errores críticos; primero generar release limpio y probarlo.");
  blocked.push("No permitir escritura automática en src/ desde el endpoint HTTP de producción sin variable explícita y respaldo de release.");
  return blocked;
}

function applySafeCorrections(rootDir,corrections){
  const reportPath=path.join(rootDir,"data","last_code_self_audit.json");
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});
  fs.writeFileSync(reportPath,JSON.stringify({appliedAt:new Date().toISOString(),corrections},null,2));
  return {written:path.relative(rootDir,reportPath),corrections};
}

function computeScore(findings){
  let score=100;
  for(const f of findings){ if(f.severity==="critical") score-=25; else if(f.severity==="high") score-=12; else if(f.severity==="medium") score-=6; else if(f.severity==="low") score-=2; }
  return Math.max(0,score);
}

function safeRead(file){try{return fs.readFileSync(file,"utf-8");}catch{return "";}}
function normalizeRel(file){return String(file).replace(/\\/g,"/");}
