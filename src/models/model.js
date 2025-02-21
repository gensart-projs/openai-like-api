const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true }, // Identificador único do modelo (ex: "custom-gpt-1")
    name: { type: String, required: true }, // Nome de exibição do modelo
    description: { type: String },
    chatWebhookUrl: { type: String, required: true }, // Endpoint n8n para chat
    completionsWebhookUrl: { type: String, required: true }, // Endpoint n8n para completions
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware para atualizar o updatedAt antes de salvar
modelSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Middleware para atualizar o updatedAt antes de atualizar
modelSchema.pre('findOneAndUpdate', function(next) {
    this._update.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Model', modelSchema);