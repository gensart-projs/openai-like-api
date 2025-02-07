const express = require('express');
const axios = require('axios');
const { formatChatResponse, formatCompletionResponse, formatErrorResponse } = require('../utils/formatter');
const { validateApiKey } = require('../middleware/auth');

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

const MODELS = {
    "gpt-3.5-turbo": {
        id: "gpt-3.5-turbo",
        object: "model",
        created: 1677610602,
        owned_by: "n8n",
        permission: [],
        root: "gpt-3.5-turbo",
        parent: null
    },
    "gpt-4": {
        id: "gpt-4",
        object: "model",
        created: 1677610602,
        owned_by: "n8n",
        permission: [],
        root: "gpt-4",
        parent: null
    }
};

// List models
router.get('/models', (req, res) => {
    res.json({
        object: "list",
        data: Object.values(MODELS)
    });
});

// Retrieve model
router.get('/models/:model', (req, res) => {
    const model = MODELS[req.params.model];
    if (!model) {
        return res.status(404).json(formatErrorResponse({
            message: "The model does not exist",
            type: "invalid_request_error",
            code: "model_not_found"
        }));
    }
    res.json(model);
});

// Chat completions
router.post('/chat/completions', async (req, res) => {
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

        console.log('[Chat Debug] Forwarding request to n8n webhook:', process.env.CHAT_WEBHOOK_URL);
        try {
            console.log('[Chat Debug] Attempting n8n webhook request...');
            let response;
            try {
                response = await axios.post(process.env.CHAT_WEBHOOK_URL, {
                    ...req.body,
                    webhook_type: "chat"
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000, // 30 seconds to account for longer processing times
                    validateStatus: false,
                    maxRedirects: 0
                });
                console.log('[Chat Debug] N8N webhook responded with status:', response.status);
            } catch (error) {
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    console.log('[Chat Debug] Request timed out, returning workflow confirmation');
                    // Use the formatter for consistent response format
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
            res.json(formatChatResponse(response.data));
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
});

// Text completions
router.post('/completions', async (req, res) => {
    try {
        if (!req.body.prompt) {
            return res.status(400).json(formatErrorResponse({
                message: "prompt is required",
                type: "invalid_request_error",
                param: "prompt"
            }));
        }

        console.log('[Completion Debug] Forwarding request to n8n webhook:', process.env.COMPLETION_WEBHOOK_URL);
        try {
            console.log('[Completion Debug] Attempting n8n webhook request...');
            let response;
            try {
                response = await axios.post(process.env.COMPLETION_WEBHOOK_URL, {
                    ...req.body,
                    webhook_type: "completion"
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000, // 30 seconds to account for longer processing times
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
