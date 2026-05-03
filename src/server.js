import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { config,validateConfig } from "./core/config.js";
import { clearSessionCookie, logoutRequest, requireAdminOrApiKey, requireAuthOrApiKey, requireSession, setSessionCookie } from "./core/auth.js";
import { authenticateUser, createSession, createUser, initAuthStore, listUsers, updateUser } from "./core/auth-store.js";
import { runVorixenControlled, runCodeSelfAudit } from "./pipeline/vorixen-pipeline.js";
import { getMemory } from "./memory/memory-engine.js";
import { getOpenAIMetrics } from "./ai/openai-monitor.js";

validateConfig();
initAuthStore();
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const projectRoot=path.resolve(__dirname,"..");
const app=express();

app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:config.corsOrigin==="*"?true:config.corsOrigin,credentials:true}));
app.use(express.json({limit:"1mb"}));
app.use(morgan(config.nodeEnv==="production"?"combined":"dev"));
app.use(express.static(path.join(__dirname,"../public")));

app.get("/health",(req,res)=>res.json({ok:true,service:"vorixen",status:"running",env:config.nodeEnv,release:"vNext_12_required_ai_monitoring",aiControl:config.enableAIControl,requireAI:config.requireAI,openaiConfigured:Boolean(config.openaiApiKey),openaiModel:config.openaiModel}));

app.post("/auth/login",(req,res)=>{
  try{
    const user=authenticateUser(req.body?.email,req.body?.password);
    const session=createSession(user.id);
    setSessionCookie(res,session.token);
    res.json({ok:true,user,expiresAt:session.expiresAt});
  }catch(error){
    const status=error.message==="auth_invalid_credentials"?401:400;
    res.status(status).json({ok:false,error:error.message});
  }
});

app.post("/auth/logout",(req,res)=>{
  logoutRequest(req);
  clearSessionCookie(res);
  res.json({ok:true});
});

app.get("/auth/me",requireSession,(req,res)=>res.json({ok:true,user:req.authUser}));

app.get("/admin/users",requireAdminOrApiKey,(req,res)=>res.json({ok:true,users:listUsers()}));

app.post("/admin/users",requireAdminOrApiKey,(req,res)=>{
  try{
    const user=createUser({email:req.body?.email,password:req.body?.password,role:req.body?.role});
    res.status(201).json({ok:true,user});
  }catch(error){
    res.status(400).json({ok:false,error:error.message});
  }
});

app.patch("/admin/users/:id",requireAdminOrApiKey,(req,res)=>{
  try{
    const user=updateUser(req.params.id,{active:req.body?.active,password:req.body?.password,role:req.body?.role});
    res.json({ok:true,user});
  }catch(error){
    res.status(error.message==="auth_user_not_found"?404:400).json({ok:false,error:error.message});
  }
});

app.post("/chat",requireAuthOrApiKey,async (req,res)=>{
  try{
    const message=req.body?.message||"";
    const sessionId=req.authUser?.id?`user:${req.authUser.id}`:(req.body?.sessionId||req.headers["x-session-id"]||"api");
    const useAI=config.nodeEnv!=="test"||req.body?.useAI===true;
    if(!message.trim()) return res.status(400).json({ok:false,error:"message_required"});
    const result=await runVorixenControlled(message,{sessionId,rootDir:projectRoot,useAI});
    res.json({ok:true,result});
  }catch(error){
    sendControlledError(res,error);
  }
});

app.post("/admin/self-audit",requireAdminOrApiKey,(req,res)=>{
  try{
    const apply=req.body?.apply===true && process.env.ALLOW_SELF_AUDIT_WRITE==="true";
    const audit=runCodeSelfAudit({rootDir:projectRoot,apply});
    res.json({ok:true,audit});
  }catch(error){
    res.status(500).json({ok:false,error:error.message});
  }
});

app.get("/admin/ai-health",requireAdminOrApiKey,(req,res)=>res.json({ok:true,openai:getOpenAIMetrics()}));
app.get("/memory",requireAdminOrApiKey,(req,res)=>res.json({ok:true,memory:getMemory()}));
app.use((req,res)=>res.status(404).json({ok:false,error:"not_found"}));
let server = null;
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if(isDirectRun){
  server=app.listen(config.port,config.host,()=>console.log(`VORIXEN running on ${config.host}:${config.port}`));
}
export { app, server };

function sendControlledError(res,error){
  const message=error?.message||"internal_error";
  if(message.startsWith("required_ai_")){
    return res.status(503).json({ok:false,error:"controlled_ai_error",detail:message});
  }
  res.status(500).json({ok:false,error:message});
}
