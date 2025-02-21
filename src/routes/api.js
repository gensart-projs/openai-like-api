const express = require('express');
const axios = require('axios');
const { formatChatResponse, formatCompletionResponse, formatErrorResponse } = require('../utils/formatter');
const { validateApiKey } = require('../middleware/auth');
const Model = require('../models/model');
const sessionMiddleware = require('../middleware/session');

const router = express.Router();

// Public routes that don't require authentication
router.get('/config', (req, res) => {
    console.log('[Config Debug] Accessing config endpoint');
    console.log('[Config Debug] API Key available:', !!process.env.API_KEY);
    console.log('[Config Debug] API Key length:', process.env.API_KEY?.length);
    res.json({
        apiKey: process.env.API_KEY
    });
});

// Apply authentication middleware to all routes except /config
router.use((req, res, next) => {
    if (req.path !== '/config') {
        return validateApiKey(req, res, next);
    }
    next();
});

// List available models
router.get('/models', async (req, res) => {
    try {
        const models = await Model.find({ isActive: true });
        const formattedModels = models.map(model => ({
            id: model.slug,
            object: "model",
            created: Math.floor(model.createdAt.getTime() / 1000),
            owned_by: "custom",
            permission: [],
            root: model.slug,
            parent: null
        }));

        res.json({
            object: "list",
            data: formattedModels
        });
    } catch (error) {
        console.error('[Models Debug] Error:', error);
        res.status(500).json(formatErrorResponse({
            message: "Failed to retrieve models",
            type: "api_error",
            code: "internal_error"
        }));
    }
});

// Retrieve specific model
router.get('/models/:model', async (req, res) => {
    try {
        const model = await Model.findOne({ slug: req.params.model, isActive: true });
        if (!model) {
            return res.status(404).json(formatErrorResponse({
                message: "The model does not exist",
                type: "invalid_request_error",
                code: "model_not_found"
            }));
        }

        res.json({
            id: model.slug,
            object: "model",
            created: Math.floor(model.createdAt.getTime() / 1000),
            owned_by: "custom",
            permission: [],
            root: model.slug,
            parent: null
        });
    } catch (error) {
        console.error('[Model Debug] Error:', error);
        res.status(500).json(formatErrorResponse({
            message: "Failed to retrieve model",
            type: "api_error",
            code: "internal_error"
        }));
    }
});

// Chat completions with session management
router.post('/chat/completions', 
    sessionMiddleware.validateSession,
    sessionMiddleware.handleContext,
    async (req, res, next) => {
        try {
            console.log('[Chat Debug] Received chat completion request');
            console.log('[Chat Debug] Auth header:', req.header('Authorization')?.substring(0, 15) + '...');
            console.log('[Chat Debug] Messages array length:', req.body.messages?.length);

            if (!req.body.messages || !Array.isArray(req.body.messages)) {
                console.log('[Chat Debug] Invalid messages format');
                return res.status(400).json(formatErrorResponse({
                    message: "messages is required and must be an array",
                    type: "invalid_request_error",
                    param: "messages"
                }));
            }

            // Get model configuration
            const model = await Model.findOne({ slug: req.body.model, isActive: true });
            if (!model) {
                return res.status(404).json(formatErrorResponse({
                    message: "The model does not exist or is not active",
                    type: "invalid_request_error",
                    code: "model_not_found"
                }));
            }

            console.log('[Chat Debug] Using webhook URL:', model.chatWebhookUrl);
            try {
                console.log('[Chat Debug] Attempting n8n webhook request...');
                let response;
                try {
                    response = await axios.post(model.chatWebhookUrl, {
                        ...req.body,
                        webhook_type: "chat",
                        sessionId: req.session.sessionId,
                        userId: req.user.id
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000,
                        validateStatus: false,
                        maxRedirects: 0
                    });
                    console.log('[Chat Debug] N8N webhook responded with status:', response.status);
                } catch (error) {
                    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                        console.log('[Chat Debug] Request timed out, returning workflow confirmation');
                        return res.status(202).json(formatChatResponse({
                            model: req.body.model,
                            content: "Your message has been received and the workflow has started processing. This may take up to 25 seconds to complete. Please check back shortly for the full response."
                        }));
                    }
                    throw error;
                }

                console.log('[Chat Debug] N8N response data:', JSON.stringify(response.data).substring(0, 200));

                if (response.status !== 200) {
                    throw new Error(`N8N webhook returned status ${response.status}`);
                }

                console.log('[Chat Debug] Processing n8n response');
                // Store response data for session middleware
                res.locals.responseData = response.data;
                
                // Format and send response
                res.json(formatChatResponse(response.data));

                // Update session after sending response
                next();
            } catch (webhookError) {
                console.error('[Chat Debug] Webhook Error:', webhookError.message);
                if (webhookError.code === 'ECONNREFUSED') {
                    res.status(503).json(formatErrorResponse({
                        message: "N8N webhook service is unavailable",
                        type: "api_error",
                        code: "service_unavailable"
                    }));
                } else if (webhookError.code === 'ETIMEDOUT') {
                    res.status(504).json(formatErrorResponse({
                        message: "N8N webhook request timed out",
                        type: "api_error",
                        code: "gateway_timeout"
                    }));
                } else {
                    res.status(502).json(formatErrorResponse({
                        message: "Error communicating with N8N webhook",
                        type: "api_error",
                        code: "bad_gateway"
                    }));
                }
            }
        } catch (error) {
            console.error('[Chat Debug] General Error:', error.message);
            res.status(500).json(formatErrorResponse({
                message: "Internal server error",
                type: "api_error",
                code: "internal_error"
            }));
        }
    },
    sessionMiddleware.updateSession
);

// Text completions (without session management)
router.post('/completions', async (req, res) => {
    try {
        if (!req.body.prompt) {
            return res.status(400).json(formatErrorResponse({
                message: "prompt is required",
                type: "invalid_request_error",
                param: "prompt"
            }));
        }

        if (!req.body.model) {
            return res.status(400).json(formatErrorResponse({
                message: "model is required",
                type: "invalid_request_error",
                param: "model"
            }));
        }

        // Get model configuration
        const model = await Model.findOne({ slug: req.body.model, isActive: true });
        if (!model) {
            return res.status(404).json(formatErrorResponse({
                message: "The model does not exist or is not active",
                type: "invalid_request_error",
                code: "model_not_found"
            }));
        }

        console.log('[Completion Debug] Using webhook URL:', model.completionsWebhookUrl);
        try {
            console.log('[Completion Debug] Attempting n8n webhook request...');
            let response;
            try {
                response = await axios.post(model.completionsWebhookUrl, {
                    ...req.body,
                    webhook_type: "completion",
                    userId: req.user.id
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000,
                    validateStatus: false,
                    maxRedirects: 0
                });
                console.log('[Completion Debug] N8N webhook responded with status:', response.status);
            } catch (error) {
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    console.log('[Completion Debug] Request timed out, returning workflow confirmation');
                    return res.status(202).json(formatCompletionResponse({
                        model: req.body.model,
                        content: "Your prompt has been received and the workflow has started processing. This may take up to 25 seconds to complete. Please check back shortly for the full response."
                    }));
                }
                throw error;
            }

            console.log('[Completion Debug] N8N response data:', JSON.stringify(response.data).substring(0, 200));

            if (response.status !== 200) {
                throw new Error(`N8N webhook returned status ${response.status}`);
            }

            console.log('[Completion Debug] Processing n8n response');
            res.json(formatCompletionResponse(response.data));
        } catch (webhookError) {
            console.error('[Completion Debug] Webhook Error:', webhookError.message);
            if (webhookError.code === 'ECONNREFUSED') {
                res.status(503).json(formatErrorResponse({
                    message: "N8N webhook service is unavailable",
                    type: "api_error",
                    code: "service_unavailable"
                }));
            } else if (webhookError.code === 'ETIMEDOUT') {
                res.status(504).json(formatErrorResponse({
                    message: "N8N webhook request timed out",
                    type: "api_error",
                    code: "gateway_timeout"
                }));
            } else {
                res.status(502).json(formatErrorResponse({
                    message: "Error communicating with N8N webhook",
                    type: "api_error",
                    code: "bad_gateway"
                }));
            }
        }
    } catch (error) {
        console.error('[Completion Debug] General Error:', error.message);
        res.status(500).json(formatErrorResponse({
            message: "Internal server error",
            type: "api_error",
            code: "internal_error"
        }));
    }
});

module.exports = router;
