const express = require('express');
const { validateApiKey } = require('./middleware/auth');
const { limiter, securityHeaders, validateBodySize } = require('./middleware/security');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(limiter);

// Body parsing middleware with size validation
app.use(express.json({ limit: '100kb' }));
app.use(validateBodySize('100kb'));

// Use authentication middleware for all /v1 routes
app.use('/v1', validateApiKey);

// Mount API routes under /v1
app.use('/v1', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: {
            message: "An unexpected error occurred.",
            type: "api_error",
            code: "internal_error"
        }
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: "Invalid API route.",
            type: "invalid_request_error",
            code: "route_not_found"
        }
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`OpenAI compatible API server running on port ${PORT}`);
    if (process.env.NODE_ENV === 'development') {
        console.log(`Debug mode: Requests to n8n webhooks will be sent to:
        - Chat: ${process.env.CHAT_WEBHOOK_URL}
        - Completion: ${process.env.COMPLETION_WEBHOOK_URL}`);
    }
});
