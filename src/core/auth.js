import { config } from "./config.js";
import { deleteSession, getUserBySessionToken } from "./auth-store.js";

export function requireApiKey(req,res,next){
  if(config.nodeEnv==="test") return next();
  if(!config.apiKey) return res.status(500).json({ok:false,error:"server_api_key_not_configured"});
  if(!hasValidApiKey(req)) return res.status(401).json({ok:false,error:"unauthorized"});
  next();
}

export function requireAuthOrApiKey(req,res,next){
  if(hasValidApiKey(req)){
    req.authMode = "api_key";
    return next();
  }
  const user = getUserBySessionToken(getSessionToken(req));
  if(!user) return res.status(401).json({ok:false,error:"unauthorized"});
  req.authUser = user;
  req.authMode = "session";
  next();
}

export function requireAdminOrApiKey(req,res,next){
  if(hasValidApiKey(req)){
    req.authMode = "api_key";
    return next();
  }
  const user = getUserBySessionToken(getSessionToken(req));
  if(!user) return res.status(401).json({ok:false,error:"unauthorized"});
  if(user.role !== "admin") return res.status(403).json({ok:false,error:"forbidden"});
  req.authUser = user;
  req.authMode = "session";
  next();
}

export function requireSession(req,res,next){
  const user = getUserBySessionToken(getSessionToken(req));
  if(!user) return res.status(401).json({ok:false,error:"unauthorized"});
  req.authUser = user;
  req.authMode = "session";
  next();
}

export function logoutRequest(req){
  return deleteSession(getSessionToken(req));
}

export function setSessionCookie(res, token){
  const maxAge = Math.max(1, config.sessionTtlDays) * 24 * 60 * 60;
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${config.sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`);
}

export function clearSessionCookie(res){
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${config.sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export function hasValidApiKey(req){
  const provided=req.headers["x-api-key"]||req.query.api_key;
  return Boolean(config.apiKey && provided && provided === config.apiKey);
}

export function getSessionToken(req){
  const cookies = parseCookies(req.headers?.cookie || "");
  return cookies[config.sessionCookieName] || "";
}

function parseCookies(header){
  const cookies = {};
  for(const part of String(header||"").split(";")){
    const index = part.indexOf("=");
    if(index === -1) continue;
    const key = part.slice(0,index).trim();
    const value = part.slice(index+1).trim();
    if(key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}
