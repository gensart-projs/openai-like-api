// State Management
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let currentSession = null;
let models = [];
let isProcessing = false;
let socket = null;
let typingTimeout = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatInterface = document.getElementById('chatInterface');
const messagesList = document.getElementById('messagesList');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const modelSelect = document.getElementById('modelSelect');
const chatList = document.getElementById('chatList');
const welcomeMessage = document.getElementById('welcomeMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const userDisplay = document.getElementById('userDisplay');
const chatTitle = document.getElementById('chatTitle');
const editTitleModal = new bootstrap.Modal(document.getElementById('editTitleModal'));

// WebSocket Setup
function setupWebSocket() {
    if (socket) {
        socket.disconnect();
    }

    socket = io(window.location.origin, {
        auth: { token: authToken }
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        if (error.message === 'Authentication error') {
            handleLogout();
        }
    });

    // Session Events
    socket.on('session:updated', (session) => {
        if (currentSession && session.sessionId === currentSession.sessionId) {
            currentSession = session;
            renderSession();
        }
    });

    socket.on('session:created', (session) => {
        loadSessions();
    });

    socket.on('session:deleted', ({ sessionId }) => {
        if (currentSession && sessionId === currentSession.sessionId) {
            currentSession = null;
            renderSession();
        }
        loadSessions();
    });

    socket.on('session:archived', ({ sessionId }) => {
        if (currentSession && sessionId === currentSession.sessionId) {
            loadSession(sessionId);
        }
        loadSessions();
    });

    // Message Events
    socket.on('message:new', (message) => {
        if (currentSession && message.sessionId === currentSession.sessionId) {
            appendMessage(message);
        }
    });

    // Typing Events
    socket.on('user:typing', ({ userId, isTyping }) => {
        updateTypingIndicator(userId, isTyping);
    });

    // Error Events
    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        showError(error.message);
    });
}

// Event Listeners
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('newChatBtn').addEventListener('click', handleNewChat);
messageForm.addEventListener('submit', handleMessageSubmit);
document.getElementById('editTitleBtn').addEventListener('click', () => {
    document.getElementById('titleInput').value = chatTitle.textContent;
    editTitleModal.show();
});
document.getElementById('saveTitleBtn').addEventListener('click', handleTitleUpdate);
document.getElementById('clearChatBtn').addEventListener('click', handleClearChat);

// Typing indicator and textarea auto-resize
messageInput.addEventListener('input', () => {
    if (currentSession) {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        socket.emit('user:typing', { 
            sessionId: currentSession.sessionId,
            isTyping: true 
        });
        
        typingTimeout = setTimeout(() => {
            socket.emit('user:typing', { 
                sessionId: currentSession.sessionId,
                isTyping: false 
            });
        }, 1000);
    }

    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
    const maxHeight = 200;
    if (messageInput.scrollHeight > maxHeight) {
        messageInput.style.height = maxHeight + 'px';
        messageInput.style.overflowY = 'auto';
    } else {
        messageInput.style.overflowY = 'hidden';
    }
});

// Initialize
checkAuth();

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            })
        });

        if (!response.ok) throw new Error('Login falhou');

        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        currentUser = document.getElementById('username').value;
        setupWebSocket();
        showChatInterface();
        initializeChat();
    } catch (error) {
        showError('Erro ao fazer login: ' + error.message);
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    if (socket) {
        socket.disconnect();
    }
    localStorage.removeItem('authToken');
    currentUser = null;
    currentSession = null;
    showLoginScreen();
}

async function checkAuth() {
    if (!authToken) {
        showLoginScreen();
        return;
    }

    try {
        const response = await fetch('/auth/verify', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Token inválido');

        const data = await response.json();
        currentUser = data.username;
        setupWebSocket();
        showChatInterface();
        initializeChat();
    } catch (error) {
        handleLogout();
    }
}

// Chat Initialization
async function initializeChat() {
    userDisplay.textContent = currentUser;
    await loadModels();
    await loadSessions();
}

async function loadModels() {
    try {
        const response = await fetch('/v1/models', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar modelos');

        const data = await response.json();
        models = data.data;

        modelSelect.innerHTML = `
            <option value="">Selecione o modelo...</option>
            ${models.map(model => `
                <option value="${model.id}">${model.id}</option>
            `).join('')}
        `;
    } catch (error) {
        console.error('Erro ao carregar modelos:', error);
    }
}

async function loadSessions() {
    try {
        const response = await fetch('/sessions?status=active', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar sessões');

        const data = await response.json();
        renderChatList(data.sessions);
    } catch (error) {
        console.error('Erro ao carregar sessões:', error);
    }
}

// Chat Management
async function handleNewChat() {
    const model = modelSelect.value;
    if (!model) {
        alert('Selecione um modelo primeiro');
        return;
    }

    showLoading();
    try {
        const response = await fetch('/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model })
        });

        if (!response.ok) throw new Error('Falha ao criar sessão');

        const session = await response.json();
        await loadSessions();
        await loadSession(session.sessionId);
    } catch (error) {
        console.error('Erro ao criar nova sessão:', error);
        alert('Erro ao criar nova conversa');
    } finally {
        hideLoading();
    }
}

async function loadSession(sessionId) {
    showLoading();
    try {
        const response = await fetch(`/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar sessão');

        currentSession = await response.json();
        socket.emit('join:session', sessionId);
        renderSession();
        highlightCurrentSession();
    } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        alert('Erro ao carregar conversa');
    } finally {
        hideLoading();
    }
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    if (isProcessing || !messageInput.value.trim()) return;

    if (!currentSession) {
        await handleNewChat();
        if (!currentSession) return;
    }

    const message = messageInput.value.trim();
    messageInput.value = '';
    isProcessing = true;

    try {
        // Adiciona mensagem do usuário à interface
        appendMessage({
            role: 'user',
            content: message
        });

        // Envia mensagem para a API
        const response = await fetch('/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentSession.modelId,
                messages: [{ role: 'user', content: message }],
                sessionId: currentSession.sessionId
            })
        });

        if (!response.ok) throw new Error('Falha ao enviar mensagem');

        const data = await response.json();
        
        // Adiciona resposta do assistente à interface
        if (data.choices && data.choices[0]) {
            appendMessage(data.choices[0].message);
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showError('Erro ao enviar mensagem');
    } finally {
        isProcessing = false;
        messageInput.style.height = 'auto';
    }
}

async function handleTitleUpdate() {
    if (!currentSession) return;

    const newTitle = document.getElementById('titleInput').value.trim();
    if (!newTitle) return;

    try {
        const response = await fetch(`/sessions/${currentSession.sessionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: newTitle })
        });

        if (!response.ok) throw new Error('Falha ao atualizar título');

        editTitleModal.hide();
    } catch (error) {
        console.error('Erro ao atualizar título:', error);
        showError('Erro ao atualizar título');
    }
}

async function handleClearChat() {
    if (!currentSession || !confirm('Tem certeza que deseja limpar esta conversa?')) return;

    try {
        const response = await fetch(`/sessions/${currentSession.sessionId}/messages`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Falha ao limpar conversa');
    } catch (error) {
        console.error('Erro ao limpar conversa:', error);
        showError('Erro ao limpar conversa');
    }
}

// Render Functions
function renderChatList(sessions) {
    chatList.innerHTML = sessions.map(session => `
        <div class="chat-item ${currentSession?.sessionId === session.sessionId ? 'active' : ''}"
             onclick="loadSession('${session.sessionId}')">
            <div class="chat-item-title">${session.title}</div>
            <div class="chat-item-meta">
                ${new Date(session.lastMessageAt).toLocaleString()}
            </div>
        </div>
    `).join('');
}

function renderSession() {
    if (!currentSession) {
        welcomeMessage.style.display = 'block';
        messagesList.style.display = 'none';
        return;
    }

    welcomeMessage.style.display = 'none';
    messagesList.style.display = 'block';
    chatTitle.textContent = currentSession.title;

    // Agrupa mensagens por papel
    let messageGroups = [];
    let currentGroup = null;

    currentSession.messages.forEach(message => {
        if (!currentGroup || currentGroup.role !== message.role) {
            currentGroup = {
                role: message.role,
                messages: [message]
            };
            messageGroups.push(currentGroup);
        } else {
            currentGroup.messages.push(message);
        }
    });

    messagesList.innerHTML = messageGroups.map(group => `
        <div class="message-group">
            ${group.messages.map(message => `
                <div class="message ${message.role}">
                    <div class="message-content">
                        ${renderMessageContent(message.content)}
                    </div>
                    <div class="message-metadata">
                        ${new Date(message.timestamp).toLocaleString()}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');

    scrollToBottom();
}

function renderMessageContent(content) {
    // Sanitize and render markdown
    return DOMPurify.sanitize(marked.parse(content));
}

function appendMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message-group';
    messageElement.innerHTML = `
        <div class="message ${message.role}">
            <div class="message-content">
                ${renderMessageContent(message.content)}
            </div>
            <div class="message-metadata">
                ${new Date().toLocaleString()}
            </div>
        </div>
    `;
    messagesList.appendChild(messageElement);
    scrollToBottom();
}

// Typing Indicator
function updateTypingIndicator(userId, isTyping) {
    const existingIndicator = document.getElementById(`typing-${userId}`);
    if (isTyping && !existingIndicator) {
        const indicator = document.createElement('div');
        indicator.id = `typing-${userId}`;
        indicator.className = 'typing-indicator message-group';
        indicator.innerHTML = `
            <div class="message assistant typing">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesList.appendChild(indicator);
        scrollToBottom();
    } else if (!isTyping && existingIndicator) {
        existingIndicator.remove();
    }
}

// UI Helper Functions
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    chatInterface.classList.add('d-none');
}

function showChatInterface() {
    loginScreen.style.display = 'none';
    chatInterface.classList.remove('d-none');
}

function showLoading() {
    loadingIndicator.style.display = 'block';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    alert(message);
}

function scrollToBottom() {
    // Ensure the messages container scrolls to the bottom
    messagesList.scrollTop = messagesList.scrollHeight;
}

function highlightCurrentSession() {
    // Highlight the current session from the chat list
    const sessionItems = document.querySelectorAll('.chat-item');
    sessionItems.forEach(item => {
        if (item.onclick && item.textContent.includes(currentSession?.title)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}
