const ChatSession = require('../models/chatSession');
const Model = require('../models/model');

/**
 * Middleware para gerenciamento de sessões de chat
 */
const sessionMiddleware = {
    
    /**
     * Verifica e carrega uma sessão existente ou cria uma nova
     */
    async validateSession(req, res, next) {
        try {
            const { sessionId } = req.body;
            let session;

            if (sessionId) {
                // Tenta carregar sessão existente
                session = await ChatSession.findOne({ 
                    sessionId,
                    status: { $ne: 'deleted' }
                });

                if (!session) {
                    return res.status(404).json({
                        error: {
                            message: "Sessão não encontrada",
                            type: "invalid_request_error",
                            code: "session_not_found"
                        }
                    });
                }

                // Verifica se o usuário tem acesso à sessão
                if (session.userId !== req.user.id) {
                    return res.status(403).json({
                        error: {
                            message: "Acesso negado a esta sessão",
                            type: "invalid_request_error",
                            code: "session_access_denied"
                        }
                    });
                }
            } else {
                // Cria nova sessão
                const { model } = req.body;
                if (!model) {
                    return res.status(400).json({
                        error: {
                            message: "Modelo é obrigatório para nova sessão",
                            type: "invalid_request_error",
                            code: "model_required"
                        }
                    });
                }

                // Verifica se o modelo existe e está ativo
                const modelDoc = await Model.findOne({ slug: model, isActive: true });
                if (!modelDoc) {
                    return res.status(404).json({
                        error: {
                            message: "Modelo não encontrado ou inativo",
                            type: "invalid_request_error",
                            code: "model_not_found"
                        }
                    });
                }

                // Cria nova sessão
                session = new ChatSession({
                    sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: req.user.id,
                    modelId: model,
                    title: 'Nova Conversa'
                });
                await session.save();
            }

            // Anexa a sessão ao request
            req.session = session;
            next();
        } catch (error) {
            console.error('Erro no middleware de sessão:', error);
            res.status(500).json({
                error: {
                    message: "Erro ao processar sessão",
                    type: "api_error",
                    code: "session_error"
                }
            });
        }
    },

    /**
     * Gerencia o contexto da conversação
     */
    async handleContext(req, res, next) {
        try {
            const session = req.session;
            const { messages } = req.body;

            if (!Array.isArray(messages)) {
                return res.status(400).json({
                    error: {
                        message: "Messages deve ser um array",
                        type: "invalid_request_error",
                        code: "invalid_messages"
                    }
                });
            }

            // Se há mensagens anteriores na sessão, mantém o contexto
            if (session.messages && session.messages.length > 0) {
                // Limita o contexto às últimas N mensagens para evitar tokens excessivos
                const contextLimit = 10;
                const contextMessages = session.messages.slice(-contextLimit);
                
                // Adiciona mensagens do contexto antes das novas mensagens
                req.body.messages = [...contextMessages, ...messages];
            }

            // Atualiza a sessão com as novas mensagens
            session.messages.push(...messages);
            await session.save();

            next();
        } catch (error) {
            console.error('Erro ao processar contexto:', error);
            res.status(500).json({
                error: {
                    message: "Erro ao processar contexto da conversação",
                    type: "api_error",
                    code: "context_error"
                }
            });
        }
    },

    /**
     * Atualiza a sessão após receber resposta
     */
    async updateSession(req, res, next) {
        const session = req.session;
        const responseData = res.locals.responseData;

        if (responseData && responseData.choices && responseData.choices[0]) {
            try {
                // Adiciona a resposta ao histórico da sessão
                const assistantMessage = responseData.choices[0].message || {
                    role: 'assistant',
                    content: responseData.choices[0].text // para completions
                };

                await session.addMessage(
                    assistantMessage.role,
                    assistantMessage.content
                );

                // Atualiza o título se for a primeira interação
                if (session.messages.length <= 2 && session.title === 'Nova Conversa') {
                    // Gera título baseado na primeira mensagem do usuário
                    const userMessage = session.messages.find(m => m.role === 'user');
                    if (userMessage) {
                        session.title = userMessage.content.substring(0, 50) + (userMessage.content.length > 50 ? '...' : '');
                        await session.save();
                    }
                }

                next();
            } catch (error) {
                console.error('Erro ao atualizar sessão:', error);
                // Continua mesmo se houver erro ao atualizar a sessão
                next();
            }
        } else {
            next();
        }
    }
};

module.exports = sessionMiddleware;
