const express = require('express');
const router = express.Router();
const ChatSession = require('../models/chatSession');
const Model = require('../models/model');
const { validateApiKey } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(validateApiKey);

// GET: Retrieve a list of active sessions
router.get('/', async (req, res) => {
    try {
        const { status = 'active', page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const sessions = await ChatSession.find({
            userId: req.user.id,
            status: status
        })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-messages'); // Exclude messages for performance

        const total = await ChatSession.countDocuments({
            userId: req.user.id,
            status: status
        });

        res.json({
            sessions,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({
            error: {
                message: "Failed to retrieve sessions",
                type: "api_error",
                code: "internal_error"
            }
        });
    }
});

// GET: Retrieve details for a specific session
router.get('/:sessionId', async (req, res) => {
    try {
        const session = await ChatSession.findOne({
            sessionId: req.params.sessionId,
            userId: req.user.id,
            status: { $ne: 'deleted' }
        });

        if (!session) {
            return res.status(404).json({
                error: {
                    message: "Session not found",
                    type: "invalid_request_error",
                    code: "session_not_found"
                }
            });
        }

        res.json(session);
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({
            error: {
                message: "Failed to retrieve session",
                type: "api_error",
                code: "internal_error"
            }
        });
    }
});

// POST: Create a new session
router.post('/', async (req, res) => {
    try {
        const { model, title } = req.body;

        if (!model) {
            return res.status(400).json({
                error: {
                    message: "Model is required",
                    type: "invalid_request_error",
                    code: "model_required"
                }
            });
        }

        // Verify model exists and is active
        const modelDoc = await Model.findOne({ slug: model, isActive: true });
        if (!modelDoc) {
            return res.status(404).json({
                error: {
                    message: "Model not found or inactive",
                    type: "invalid_request_error",
                    code: "model_not_found"
                }
            });
        }

        const session = new ChatSession({
            sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: req.user.id,
            modelId: model,
            title: title || 'New Chat',
            status: 'active'
        });

        await session.save();
        res.status(201).json(session);
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            error: {
                message: "Failed to create session",
                type: "api_error",
                code: "internal_error"
            }
        });
    }
});

// PUT: Update a session
router.put('/:sessionId', async (req, res) => {
    try {
        const { title, status } = req.body;
        const updates = {};

        if (title) updates.title = title;
        if (status && ['active', 'archived'].includes(status)) {
            updates.status = status;
        }

        const session = await ChatSession.findOneAndUpdate(
            {
                sessionId: req.params.sessionId,
                userId: req.user.id,
                status: { $ne: 'deleted' }
            },
            updates,
            { new: true }
        );

        if (!session) {
            return res.status(404).json({
                error: {
                    message: "Session not found",
                    type: "invalid_request_error",
                    code: "session_not_found"
                }
            });
        }

        res.json(session);
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({
            error: {
                message: "Failed to update session",
                type: "api_error",
                code: "internal_error"
            }
        });
    }
});

// DELETE: Clear messages from a session
router.delete('/:sessionId/messages', async (req, res) => {
    try {
        const session = await ChatSession.findOne({
            sessionId: req.params.sessionId,
            userId: req.user.id,
            status: { $ne: 'deleted' }
        });

        if (!session) {
            return res.status(404).json({
                error: {
                    message: "Session not found",
                    type: "invalid_request_error",
                    code: "session_not_found"
                }
            });
        }

        session.messages = [];
        await session.save();

        res.status(204).send();
    } catch (error) {
        console.error('Error clearing messages:', error);
        res.status(500).json({
            error: {
                message: "Failed to clear messages",
                type: "api_error",
                code: "internal_error"
            }
        });
    }
});

// DELETE: Delete (archive) a session
router.delete('/:sessionId', async (req, res) => {
    try {
        const session = await ChatSession.findOne({
            sessionId: req.params.sessionId,
            userId: req.user.id,
            status: { $ne: 'deleted' }
        });

        if (!session) {
            return res.status(404).json({
                error: {
                    message: "Session not found",
                    type: "invalid_request_error",
                    code: "session_not_found"
                }
            });
        }

        session.status = 'deleted';
        await session.save();

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({
            error: {
                message: "Failed to delete session",
                type: "api_error",
                code: "internal_error"
            }
        });
    }
});

module.exports = router;
