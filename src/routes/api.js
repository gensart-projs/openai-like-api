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

        console.log('[Chat Debug] Forwarding request to n8n webhook');
        const response = await axios.post(process.env.CHAT_WEBHOOK_URL, {
            ...req.body,
            webhook_type: "chat"
        });

        console.log('[Chat Debug] Successfully received response from n8n');
        res.json(formatChatResponse(response.data));
    } catch (error) {
        console.error('[Chat Debug] Error:', error.message);
        if (error.response) {
            console.error('[Chat Debug] Response status:', error.response.status);
            console.error('[Chat Debug] Response data:', error.response.data);
        }
        res.status(500).json(formatErrorResponse({
            message: "Error processing chat completion request",
            type: "api_error"
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

        const response = await axios.post(process.env.COMPLETION_WEBHOOK_URL, {
            ...req.body,
            webhook_type: "completion"
        });

        res.json(formatCompletionResponse(response.data));
    } catch (error) {
        console.error('Completion error:', error);
        res.status(500).json(formatErrorResponse({
            message: "Error processing completion request",
            type: "api_error"
        }));
    }
});

module.exports = router;
