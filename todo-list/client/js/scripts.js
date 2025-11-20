/* scripts.js
   - Conecta com backend (porta 8005)
   - Fornece: registerUser, loginUser, createTask, fetchTasks, updateTask, deleteTask, logout, isAuthenticated
*/

const API_BASE = 'http://127.0.0.1:8005'; // troque caso use outra porta

// ------------------- Autenticação -------------------
async function registerUser({ email, password, name }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao registrar');
  return data;
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Login falhou');
  // supondo que o backend retorna { access_token: "...", token_type: "bearer" }
  const token = data.access_token || data.token || data.accessToken;
  if (!token) throw new Error('Token não recebido');
  localStorage.setItem('token', token);
  // redireciona para dashboard
  window.location.href = '../dashboard/index.html';
}

// ------------------- Token helpers -------------------
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
function isAuthenticated() {
  return !!localStorage.getItem('token');
}
function logout() {
  localStorage.removeItem('token');
  window.location.href = '../login/index.html';
}

// ------------------- Tarefas (CRUD) -------------------
async function fetchTasks() {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders());
  const res = await fetch(`${API_BASE}/tasks`, { headers });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) { logout(); }
    throw new Error(data.message || 'Erro ao obter tarefas');
  }
  return data;
}

async function createTask({ title, description }) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders());
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao criar tarefa');
  return data;
}

async function updateTask(id, payload) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders());
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao atualizar tarefa');
  return data;
}

async function deleteTask(id) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders());
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const data = await res.json().catch(()=>({}));
    throw new Error(data.message || 'Erro ao apagar tarefa');
  }
  return true;
}

// ------------------- Render / atualização da UI -------------------
async function refreshTasks() {
  const list = document.getElementById('tasksList');
  if (!list) return;
  list.innerHTML = '<p>Carregando...</p>';
  try {
    const tasks = await fetchTasks();
    if (!Array.isArray(tasks)) {
      list.innerHTML = '<p>Nenhuma tarefa encontrada</p>';
      return;
    }
    if (tasks.length === 0) {
      list.innerHTML = '<p>Nenhuma tarefa criada ainda</p>';
      return;
    }
    list.innerHTML = '';
    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.dataset.id = task.id || task._id || task.taskId || '';

      const meta = document.createElement('div');
      meta.className = 'meta';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = task.title || task.name || 'Sem título';
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = task.description || '';

      meta.appendChild(title);
      meta.appendChild(desc);

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn edit';
      editBtn.title = 'Editar';
      editBtn.innerHTML = '✎';
      editBtn.onclick = async () => {
        const newTitle = prompt('Editar título', task.title);
        if (newTitle === null) return;
        const newDesc = prompt('Editar descrição', task.description || '');
        try {
          await updateTask(item.dataset.id, { title: newTitle, description: newDesc });
          await refreshTasks();
        } catch (err) {
          alert(err.message || 'Erro ao editar');
        }
      };

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn del';
      delBtn.title = 'Excluir';
      delBtn.innerHTML = '🗑';
      delBtn.onclick = async () => {
        if (!confirm('Deseja excluir esta tarefa?')) return;
        try {
          await deleteTask(item.dataset.id);
          await refreshTasks();
        } catch (err) {
          alert(err.message || 'Erro ao excluir');
        }
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      item.appendChild(meta);
      item.appendChild(actions);
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = `<p>Erro: ${err.message || 'falha'}</p>`;
    if (err.message && err.message.toLowerCase().includes('token')) {
      logout();
    }
  }
}
