const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { validateApiKey } = require('./middleware/auth');
const { limiter, securityHeaders, validateBodySize } = require('./middleware/security');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const websocketService = require('./services/websocket');
const path = require('path');
require('dotenv').config();

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(limiter);

// Body parsing middleware with size validation
app.use(express.json({ limit: '1mb' }));
app.use(validateBodySize('1mb'));

// Static files middleware
app.use('/chat', express.static(path.join(__dirname, 'public/chat')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Auth routes (não protegidas)
app.use('/auth', authRoutes);

// API routes under /v1 (protegidas por API key)
app.use('/v1', apiRoutes);

// Admin API routes (protegidas por JWT)
app.use('/admin/api', (req, res, next) => {
    if (!req.headers.authorization?.startsWith('Bearer ')) {
        return res.status(401).json({
            error: {
                message: "Authentication required",
                type: "auth_error",
                code: "unauthorized"
            }
        });
    }
    next();
}, adminRoutes);

// Session routes (protegidas por API key)
app.use('/sessions', sessionRoutes);

// Redirect admin interface requests
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Redirect chat interface requests
app.get('/chat*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/chat/index.html'));
});

// MongoDB connection configuration
const mongoConfig = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50
};

// Handle MongoDB credentials
let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/memoryapp';
if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
    mongoUri = mongoUri.replace('mongodb://', `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@`);
}

let server;

// Start server function with proper error handling and reconnection
async function startServer() {
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }

    try {
        // Connect to MongoDB
        await mongoose.connect(mongoUri, mongoConfig);
        console.log('Successfully connected to MongoDB');

        // Create HTTP server
        server = http.createServer(app);
        
        // Initialize WebSocket service
        websocketService.initialize(server);

        // Start listening
        const PORT = process.env.PORT || 3001;
        await new Promise((resolve, reject) => {
            server.listen(PORT, () => {
                console.log(`OpenAI compatible API server running on port ${PORT}`);
                console.log(`Admin interface available at http://localhost:${PORT}/admin`);
                console.log(`Chat interface available at http://localhost:${PORT}/chat`);
                console.log('WebSocket server initialized');
                resolve();
            });
            server.once('error', reject);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        console.log('Retrying in 5 seconds...');
        setTimeout(startServer, 5000);
    }
}

// MongoDB connection event handlers
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    startServer();
});

// Graceful shutdown handlers
async function shutdown(signal) {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    try {
        if (server) {
            console.log('Closing HTTP server...');
            await new Promise(resolve => server.close(resolve));
        }

        if (mongoose.connection.readyState !== 0) {
            console.log('Closing MongoDB connection...');
            await mongoose.connection.close();
        }

        console.log('Graceful shutdown completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle various shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Don't expose error details in production
    const message = process.env.NODE_ENV === 'production' 
        ? "An unexpected error occurred." 
        : err.message;

    res.status(500).json({
        error: {
            message,
            type: "api_error",
            code: "internal_error"
        }
    });
});

// Handle 404
app.use((req, res) => {
    // Return JSON for API routes, HTML for others
    if (req.path.startsWith('/v1/') || req.path.startsWith('/admin/api/')) {
        return res.status(404).json({
            error: {
                message: "Invalid API route.",
                type: "invalid_request_error",
                code: "route_not_found"
            }
        });
    }
    
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// Start the server
startServer();
