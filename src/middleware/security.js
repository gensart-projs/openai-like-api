const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bytes = require('bytes');

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: {
            message: "Too many requests, please try again later.",
            type: "rate_limit_error",
            code: "rate_limit_exceeded"
        }
    }
});

// Security headers configuration
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'"],
            connectSrc: ["'self'", "*"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true
});

// Validate request body size
const validateBodySize = (maxSize = '1mb') => {
    const maxBytes = bytes.parse(maxSize);
    
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || 0);
        if (contentLength > maxBytes) {
            return res.status(413).json({
                error: {
                    message: "Request body too large",
                    type: "invalid_request_error",
                    code: "request_too_large"
                }
            });
        }
        next();
    };
};

module.exports = {
    limiter,
    securityHeaders,
    validateBodySize
};
