const validateApiKey = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log(`[Auth Debug] Request to ${req.method} ${req.path}`);
    console.log(`[Auth Debug] Auth header present: ${!!authHeader}`);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[Auth Debug] Missing or invalid Authorization header format');
        return res.status(401).json({
            error: {
                message: "Authentication failed. Please provide a valid API key.",
                type: "invalid_request_error",
                code: "invalid_api_key"
            }
        });
    }

    const apiKey = authHeader.split(' ')[1];
    console.log(`[Auth Debug] Received API key length: ${apiKey.length}`);
    
    if (!process.env.API_KEY) {
        console.error('[Auth Debug] API_KEY environment variable is not set');
        return res.status(500).json({
            error: {
                message: "Internal server error",
                type: "server_error",
                code: "configuration_error"
            }
        });
    }

    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({
            error: {
                message: "Invalid API key provided.",
                type: "invalid_request_error",
                code: "invalid_api_key"
            }
        });
    }

    // Store the validated API key in the request object
    req.apiKey = apiKey;
    next();
};

module.exports = { validateApiKey };
