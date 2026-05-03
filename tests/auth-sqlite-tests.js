import assert from "assert";
import fs from "fs";
import path from "path";
import { config } from "../src/core/config.js";
import { authenticateUser, closeAuthStoreForTests, createSession, createUser, getUserBySessionToken, initAuthStore, listUsers, updateUser } from "../src/core/auth-store.js";

let pass = 0;
function ok(name, fn){
  try{ fn(); pass++; console.log(`PASS auth ${name}`); }
  catch(error){ console.error(`FAIL auth ${name}`); console.error(error); process.exit(1); }
}

const previous = { ...config };
const dbFile = path.resolve("data/test_auth.sqlite");
fs.rmSync(dbFile, { force: true });
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

Object.assign(config, {
  authDbFile: dbFile,
  sessionSecret: "test_session_secret_32_chars_minimum",
  adminEmail: "admin@vorixen.com",
  adminPassword: "AdminPassword123",
  sessionTtlDays: 7
});

closeAuthStoreForTests();
initAuthStore();

ok("seed admin inicial desde configuración", ()=>{
  const users = listUsers();
  assert.equal(users.length, 1);
  assert.equal(users[0].email, "admin@vorixen.com");
  assert.equal(users[0].role, "admin");
  assert.equal("password_hash" in users[0], false);
});

ok("login correcto crea sesión recuperable", ()=>{
  const user = authenticateUser("ADMIN@VORIXEN.COM", "AdminPassword123");
  const session = createSession(user.id);
  const sessionUser = getUserBySessionToken(session.token);
  assert.equal(sessionUser.email, "admin@vorixen.com");
  assert.equal(sessionUser.role, "admin");
});

ok("login incorrecto se rechaza", ()=>{
  assert.throws(()=>authenticateUser("admin@vorixen.com", "wrong-password"), /auth_invalid_credentials/);
});

ok("admin crea usuario y puede desactivarlo", ()=>{
  const user = createUser({ email:"cliente@vorixen.com", password:"Cliente12345", role:"user" });
  assert.equal(user.role, "user");
  const disabled = updateUser(user.id, { active:false });
  assert.equal(disabled.active, false);
  assert.throws(()=>authenticateUser("cliente@vorixen.com", "Cliente12345"), /auth_invalid_credentials/);
});

closeAuthStoreForTests();
fs.rmSync(dbFile, { force: true });
Object.assign(config, previous);
console.log(`PASS auth-sqlite-tests ${pass}/4`);
