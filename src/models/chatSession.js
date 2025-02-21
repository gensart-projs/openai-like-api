const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { 
        type: String, 
        required: true,
        enum: ['system', 'user', 'assistant']
    },
    content: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    metadata: {
        type: Map,
        of: String
    }
});

const chatSessionSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    title: { 
        type: String,
        default: 'Nova Conversa'
    },
    messages: [messageSchema],
    modelId: { 
        type: String, 
        required: true,
        ref: 'Model',
        index: true
    },
    userId: { 
        type: String, 
        required: true,
        index: true 
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active',
        index: true
    },
    metadata: {
        type: Map,
        of: String
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Middleware para atualizar timestamps
chatSessionSchema.pre('save', function(next) {
    const now = new Date();
    this.updatedAt = now;
    if (this.messages && this.messages.length > 0) {
        this.lastMessageAt = now;
    }
    next();
});

// Índice composto para consultas comuns
chatSessionSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });

// Método para arquivar sessão
chatSessionSchema.methods.archive = async function() {
    this.status = 'archived';
    return this.save();
};

// Método para restaurar sessão
chatSessionSchema.methods.restore = async function() {
    this.status = 'active';
    return this.save();
};

// Método para deletar sessão (soft delete)
chatSessionSchema.methods.remove = async function() {
    this.status = 'deleted';
    return this.save();
};

// Método para adicionar mensagem
chatSessionSchema.methods.addMessage = async function(role, content, metadata = {}) {
    this.messages.push({
        role,
        content,
        metadata,
        timestamp: new Date()
    });
    return this.save();
};

// Virtual para contar mensagens
chatSessionSchema.virtual('messageCount').get(function() {
    return this.messages?.length || 0;
});

// Configuração para incluir virtuals quando converter para JSON
chatSessionSchema.set('toJSON', { virtuals: true });
chatSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);