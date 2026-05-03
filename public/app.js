const loginView = document.getElementById("loginView");
const chatView = document.getElementById("chatView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const userLabel = document.getElementById("userLabel");
const logoutButton = document.getElementById("logoutButton");
const chatTab = document.getElementById("chatTab");
const adminTab = document.getElementById("adminTab");
const chatPanel = document.getElementById("chatPanel");
const adminPanel = document.getElementById("adminPanel");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const createUserForm = document.getElementById("createUserForm");
const refreshUsersButton = document.getElementById("refreshUsersButton");
const usersList = document.getElementById("usersList");
const adminStatus = document.getElementById("adminStatus");

let currentUser = null;

boot();

async function boot(){
  try{
    const data = await api("/auth/me");
    showApp(data.user);
  }catch{
    showLogin();
  }
}

loginForm.addEventListener("submit", async (event)=>{
  event.preventDefault();
  loginError.textContent = "";
  try{
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
    });
    passwordInput.value = "";
    showApp(data.user);
  }catch(error){
    loginError.textContent = readableError(error);
  }
});

logoutButton.addEventListener("click", async ()=>{
  await api("/auth/logout", { method: "POST" }).catch(()=>null);
  currentUser = null;
  showLogin();
});

chatTab.addEventListener("click", ()=>showTab("chat"));
adminTab.addEventListener("click", ()=>showTab("admin"));
refreshUsersButton.addEventListener("click", loadUsers);

form.addEventListener("submit",async(event)=>{
  event.preventDefault();
  const message=input.value.trim();
  if(!message) return;
  addMessage(message,"user");
  input.value="";
  input.disabled = true;
  try{
    const data=await api("/chat",{
      method:"POST",
      body:JSON.stringify({message})
    });
    addMessage(data.result.output,"bot");
  }catch(error){
    addMessage(`Bloqueo técnico operativo\n\nMOTIVO:\n${readableError(error)}`,"bot");
  }finally{
    input.disabled = false;
    input.focus();
  }
});

createUserForm.addEventListener("submit", async (event)=>{
  event.preventDefault();
  adminStatus.textContent = "";
  try{
    await api("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("newUserEmail").value.trim(),
        password: document.getElementById("newUserPassword").value,
        role: document.getElementById("newUserRole").value
      })
    });
    createUserForm.reset();
    adminStatus.textContent = "Usuario creado.";
    await loadUsers();
  }catch(error){
    adminStatus.textContent = readableError(error);
  }
});

async function loadUsers(){
  usersList.textContent = "";
  try{
    const data = await api("/admin/users");
    for(const user of data.users) usersList.appendChild(renderUser(user));
  }catch(error){
    adminStatus.textContent = readableError(error);
  }
}

function renderUser(user){
  const row = document.createElement("div");
  row.className = "user-row";
  const info = document.createElement("div");
  info.innerHTML = `<strong></strong><span></span>`;
  info.querySelector("strong").textContent = user.email;
  info.querySelector("span").textContent = `${user.role} · ${user.active ? "activo" : "inactivo"}`;
  const actions = document.createElement("div");
  actions.className = "row-actions";

  const activeButton = document.createElement("button");
  activeButton.type = "button";
  activeButton.textContent = user.active ? "Desactivar" : "Activar";
  activeButton.addEventListener("click", async ()=>{
    await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) });
    await loadUsers();
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset";
  resetButton.addEventListener("click", async ()=>{
    const password = prompt("Nueva contraseña temporal");
    if(!password) return;
    await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ password }) });
    adminStatus.textContent = "Contraseña actualizada.";
  });

  actions.append(activeButton, resetButton);
  row.append(info, actions);
  return row;
}

function showLogin(){
  loginView.classList.remove("hidden");
  chatView.classList.add("hidden");
  messages.textContent = "";
  emailInput.focus();
}

function showApp(user){
  currentUser = user;
  userLabel.textContent = `${user.email} · ${user.role}`;
  loginView.classList.add("hidden");
  chatView.classList.remove("hidden");
  adminTab.classList.toggle("hidden", user.role !== "admin");
  showTab("chat");
}

function showTab(tab){
  const isAdmin = tab === "admin";
  chatPanel.classList.toggle("hidden", isAdmin);
  adminPanel.classList.toggle("hidden", !isAdmin);
  chatTab.classList.toggle("active", !isAdmin);
  adminTab.classList.toggle("active", isAdmin);
  if(isAdmin && currentUser?.role === "admin") loadUsers();
}

function addMessage(text,cls){
  const div=document.createElement("div");
  div.className=`msg ${cls}`;
  div.textContent=text;
  messages.appendChild(div);
  messages.scrollTop=messages.scrollHeight;
}

async function api(path, options = {}){
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(()=>({ ok:false, error:"invalid_response" }));
  if(response.status === 401 && path !== "/auth/login"){
    showLogin();
    throw new Error("Sesión requerida o expirada.");
  }
  if(!response.ok || !data.ok) throw new Error(data.detail || data.error || "Error");
  return data;
}

function readableError(error){
  const message = String(error?.message || error || "Error");
  const map = {
    auth_invalid_credentials: "Correo o contraseña inválidos.",
    auth_user_exists: "Ese correo ya existe.",
    auth_password_too_short: "La contraseña debe tener mínimo 8 caracteres.",
    controlled_ai_error: "OpenAI no pudo entregar una respuesta validada por Vorixen.",
    unauthorized: "Sesión requerida o expirada.",
    forbidden: "No tienes permisos para esta acción."
  };
  return map[message] || message;
}
