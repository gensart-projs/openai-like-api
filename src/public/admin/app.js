// State management
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let models = [];

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const mainContent = document.getElementById('mainContent');
const userInfo = document.getElementById('userInfo');
const username = document.getElementById('username');
const modelList = document.getElementById('modelList');
const modelForm = document.getElementById('modelForm');
const modelModal = new bootstrap.Modal(document.getElementById('modelModal'));
const testResultModal = new bootstrap.Modal(document.getElementById('testResultModal'));

// Event Listeners
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('modelForm').addEventListener('submit', (e) => e.preventDefault());

// Initialize
checkAuth();

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('Login failed');

        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        currentUser = username;
        showMainContent();
        loadModels();
    } catch (error) {
        showError('Login falhou: ' + error.message);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showLoginForm();
}

async function checkAuth() {
    if (!authToken) {
        showLoginForm();
        return;
    }

    try {
        const response = await fetch('/auth/verify', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Token inválido');

        const data = await response.json();
        currentUser = data.username;
        showMainContent();
        loadModels();
    } catch (error) {
        handleLogout();
    }
}

// Model Management Functions
async function loadModels() {
    try {
        const response = await fetch('/admin/models', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar modelos');

        models = await response.json();
        renderModelList();
    } catch (error) {
        showError('Erro ao carregar modelos: ' + error.message);
    }
}

function renderModelList() {
    modelList.innerHTML = models.map(model => `
        <tr>
            <td>${model.slug}</td>
            <td>${model.name}</td>
            <td>${model.description || '-'}</td>
            <td>
                <span class="badge ${model.isActive ? 'badge-active' : 'badge-inactive'}">
                    ${model.isActive ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editModel('${model._id}')">
                        Editar
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteModel('${model._id}')">
                        Excluir
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function saveModel() {
    const modelId = document.getElementById('modelId').value;
    const modelData = {
        slug: document.getElementById('modelSlug').value,
        name: document.getElementById('modelName').value,
        description: document.getElementById('modelDescription').value,
        chatWebhookUrl: document.getElementById('chatWebhookUrl').value,
        completionsWebhookUrl: document.getElementById('completionsWebhookUrl').value,
        isActive: document.getElementById('modelActive').checked
    };

    try {
        const url = modelId ? `/admin/models/${modelId}` : '/admin/models';
        const method = modelId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(modelData)
        });

        if (!response.ok) throw new Error('Falha ao salvar modelo');

        modelModal.hide();
        loadModels();
        showSuccess('Modelo salvo com sucesso!');
    } catch (error) {
        showError('Erro ao salvar modelo: ' + error.message);
    }
}

async function editModel(id) {
    const model = models.find(m => m._id === id);
    if (!model) return;

    document.getElementById('modelId').value = model._id;
    document.getElementById('modelSlug').value = model.slug;
    document.getElementById('modelName').value = model.name;
    document.getElementById('modelDescription').value = model.description || '';
    document.getElementById('chatWebhookUrl').value = model.chatWebhookUrl;
    document.getElementById('completionsWebhookUrl').value = model.completionsWebhookUrl;
    document.getElementById('modelActive').checked = model.isActive;

    document.getElementById('modelModalTitle').textContent = 'Editar Modelo';
    modelModal.show();
}

async function deleteModel(id) {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
        const response = await fetch(`/admin/models/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Falha ao excluir modelo');

        loadModels();
        showSuccess('Modelo excluído com sucesso!');
    } catch (error) {
        showError('Erro ao excluir modelo: ' + error.message);
    }
}

async function testWebhook(type) {
    const modelId = document.getElementById('modelId').value;
    const webhookUrl = type === 'chat' 
        ? document.getElementById('chatWebhookUrl').value
        : document.getElementById('completionsWebhookUrl').value;

    if (!webhookUrl) {
        showError('URL do webhook não informada');
        return;
    }

    try {
        const response = await fetch(`/admin/models/${modelId || 'test'}/test?type=${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ webhookUrl })
        });

        const result = await response.json();
        document.getElementById('testResult').textContent = JSON.stringify(result, null, 2);
        testResultModal.show();
    } catch (error) {
        showError('Erro ao testar webhook: ' + error.message);
    }
}

// UI Helper Functions
function showMainContent() {
    loginContainer.style.display = 'none';
    mainContent.style.display = 'block';
    username.textContent = currentUser;
}

function showLoginForm() {
    loginContainer.style.display = 'block';
    mainContent.style.display = 'none';
    document.getElementById('loginForm').reset();
}

function showError(message) {
    // Implementar toast ou alert para mostrar erro
    alert(message);
}

function showSuccess(message) {
    // Implementar toast ou alert para mostrar sucesso
    alert(message);
}

// Modal Reset
document.getElementById('modelModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('modelForm').reset();
    document.getElementById('modelId').value = '';
    document.getElementById('modelModalTitle').textContent = 'Novo Modelo';
});