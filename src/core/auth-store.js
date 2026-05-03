import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

let db = null;
const PASSWORD_KEY_LENGTH = 64;

export function initAuthStore(){
  const database = getDb();
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);
  seedInitialAdmin();
  return true;
}

export function createUser({ email, password, role = "user" } = {}){
  const normalizedEmail = normalizeEmail(email);
  assertPassword(password);
  const normalizedRole = role === "admin" ? "admin" : "user";
  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password_hash: hashPassword(password),
    role: normalizedRole,
    active: 1,
    created_at: now,
    updated_at: now
  };
  try{
    getDb().prepare("INSERT INTO users (id,email,password_hash,role,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run(user.id,user.email,user.password_hash,user.role,user.active,user.created_at,user.updated_at);
  }catch(error){
    if(String(error.message||"").toLowerCase().includes("unique")) throw new Error("auth_user_exists");
    throw error;
  }
  return publicUser(user);
}

export function listUsers(){
  return getDb().prepare("SELECT id,email,role,active,created_at,updated_at FROM users ORDER BY created_at ASC").all().map(publicUser);
}

export function updateUser(id, patch = {}){
  const current = getDb().prepare("SELECT * FROM users WHERE id=?").get(id);
  if(!current) throw new Error("auth_user_not_found");
  const role = patch.role ? (patch.role === "admin" ? "admin" : "user") : current.role;
  const active = typeof patch.active === "boolean" ? (patch.active ? 1 : 0) : current.active;
  const passwordHash = patch.password ? hashPassword(assertPassword(patch.password)) : current.password_hash;
  const updatedAt = new Date().toISOString();
  getDb().prepare("UPDATE users SET role=?, active=?, password_hash=?, updated_at=? WHERE id=?")
    .run(role,active,passwordHash,updatedAt,id);
  return publicUser(getDb().prepare("SELECT * FROM users WHERE id=?").get(id));
}

export function authenticateUser(email, password){
  const normalizedEmail = normalizeEmail(email);
  const user = getDb().prepare("SELECT * FROM users WHERE email=?").get(normalizedEmail);
  if(!user || user.active !== 1 || !verifyPassword(password, user.password_hash)) throw new Error("auth_invalid_credentials");
  return publicUser(user);
}

export function createSession(userId){
  const user = getDb().prepare("SELECT * FROM users WHERE id=? AND active=1").get(userId);
  if(!user) throw new Error("auth_user_not_found");
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000).toISOString();
  getDb().prepare("INSERT INTO sessions (token_hash,user_id,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?)")
    .run(tokenHash,userId,expiresAt,now.toISOString(),now.toISOString());
  return { token, expiresAt };
}

export function getUserBySessionToken(token){
  if(!token) return null;
  deleteExpiredSessions();
  const row = getDb().prepare(`
    SELECT users.id,users.email,users.role,users.active,users.created_at,users.updated_at,sessions.token_hash
    FROM sessions
    JOIN users ON users.id=sessions.user_id
    WHERE sessions.token_hash=? AND sessions.expires_at>? AND users.active=1
  `).get(hashSessionToken(token), new Date().toISOString());
  if(!row) return null;
  getDb().prepare("UPDATE sessions SET last_seen_at=? WHERE token_hash=?").run(new Date().toISOString(), row.token_hash);
  return publicUser(row);
}

export function deleteSession(token){
  if(!token) return false;
  getDb().prepare("DELETE FROM sessions WHERE token_hash=?").run(hashSessionToken(token));
  return true;
}

export function closeAuthStoreForTests(){
  if(db){
    db.close();
    db = null;
  }
}

function getDb(){
  if(db) return db;
  const file = path.resolve(config.authDbFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  return db;
}

function seedInitialAdmin(){
  if(!config.adminEmail || !config.adminPassword) return;
  const email = normalizeEmail(config.adminEmail);
  const existing = getDb().prepare("SELECT id FROM users WHERE email=?").get(email);
  if(existing) return;
  createUser({ email, password: config.adminPassword, role: "admin" });
}

function deleteExpiredSessions(){
  getDb().prepare("DELETE FROM sessions WHERE expires_at<=?").run(new Date().toISOString());
}

function normalizeEmail(email){
  const normalized = String(email||"").trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new Error("auth_invalid_email");
  return normalized;
}

function assertPassword(password){
  const value = String(password||"");
  if(value.length < 8) throw new Error("auth_password_too_short");
  return value;
}

function hashPassword(password){
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

function verifyPassword(password, stored){
  const [scheme,saltHex,keyHex] = String(stored||"").split("$");
  if(scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(String(password||""), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashSessionToken(token){
  return crypto.createHmac("sha256", config.sessionSecret || "test_session_secret").update(String(token||"")).digest("hex");
}

function publicUser(user){
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    active: user.active === true || user.active === 1,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}
