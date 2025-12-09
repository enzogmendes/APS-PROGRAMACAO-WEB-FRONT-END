/* ------------------------------------------------------------
   scripts.js

   - Conecta com backend (porta 8005)
   - Disponibiliza funções de:
     registerUser, loginUser, createTask,
     fetchTasks, updateTask, deleteTask,
     logout, isAuthenticated, refreshTasks
-------------------------------------------------------------*/

const API_BASE = 'http://127.0.0.1:8005'; // Altere se o backend usar outra porta



/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */

/**
 * Registra um novo usuário
 */
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

/**
 * Login do usuário — salva token no localStorage
 */
async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.detail || data.message || 'Login falhou');

  // Suporte a múltiplos formatos de retorno do backend
  const token = data.access_token || data.token || data.accessToken;
  if (!token) throw new Error('Token não recebido');

  // Salva token localmente
  localStorage.setItem('token', token);

  // Redireciona para o dashboard
  window.location.href = '../dashboard/index.html';
}



/* ============================================================
   HELPERS DE TOKEN E AUTENTICAÇÃO
   ============================================================ */

/**
 * Retorna cabeçalhos com Authorization caso exista token
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Verifica se há token salvo (usuário logado)
 */
function isAuthenticated() {
  return !!localStorage.getItem('token');
}

/**
 * Remove token e retorna ao login
 */
function logout() {
  localStorage.removeItem('token');
  window.location.href = '../login/index.html';
}



/* ============================================================
   CRUD DE TAREFAS
   ============================================================ */

/**
 * Busca todas as tarefas do usuário autenticado
 */
async function fetchTasks() {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    getAuthHeaders()
  );

  const res = await fetch(`${API_BASE}/tasks`, { headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) logout(); // token inválido
    throw new Error(data.message || 'Erro ao obter tarefas');
  }

  return data;
}

/**
 * Cria nova tarefa
 */
async function createTask({ title, description }) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    getAuthHeaders()
  );

  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description })
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Erro ao criar tarefa');

  return data;
}

/**
 * Atualiza uma tarefa pelo id
 */
async function updateTask(id, payload) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    getAuthHeaders()
  );

  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao atualizar tarefa');

  return data;
}

/**
 * Exclui tarefa pelo id
 */
async function deleteTask(id) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    getAuthHeaders()
  );

  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Erro ao apagar tarefa');
  }

  return true;
}



/* ============================================================
   RENDERIZAÇÃO / ATUALIZAÇÃO DA UI
   ============================================================ */

/**
 * Atualiza a lista exibida das tarefas
 */
async function refreshTasks() {
  const list = document.getElementById('tasksList');
  if (!list) return;

  list.innerHTML = '<p>Carregando...</p>';

  try {
    const tasks = await fetchTasks();

    // Verifica estrutura da resposta
    if (!Array.isArray(tasks)) {
      list.innerHTML = '<p>Nenhuma tarefa encontrada</p>';
      return;
    }

    // Nenhuma tarefa criada ainda
    if (tasks.length === 0) {
      list.innerHTML = '<p>Nenhuma tarefa criada ainda</p>';
      return;
    }

    // Limpa antes de renderizar
    list.innerHTML = '';

    // Renderiza cada tarefa individualmente
    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';

      // ID pode vir com nomes diferentes dependendo do backend
      item.dataset.id = task.id || task._id || task.taskId || '';

      /* --------------------------
         METADADOS DA TAREFA
      --------------------------- */
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


      /* --------------------------
         AÇÕES (editar / deletar)
      --------------------------- */
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      // Botão Editar
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn edit';
      editBtn.title = 'Editar';
      editBtn.innerHTML = '✎';

      editBtn.onclick = async () => {
        const newTitle = prompt('Editar título', task.title);
        if (newTitle === null) return;

        const newDesc = prompt('Editar descrição', task.description || '');

        try {
          await updateTask(item.dataset.id, {
            title: newTitle,
            description: newDesc
          });
          await refreshTasks();
        } catch (err) {
          alert(err.message || 'Erro ao editar');
        }
      };

      // Botão Deletar
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

      /* --------------------------
         Monta o item e adiciona à lista
      --------------------------- */
      item.appendChild(meta);
      item.appendChild(actions);
      list.appendChild(item);
    });

  } catch (err) {
    list.innerHTML = `<p>Erro: ${err.message || 'falha'}</p>`;

    // Se erro estiver relacionado ao token → desloga
    if (err.message && err.message.toLowerCase().includes('token')) {
      logout();
    }
  }
}
