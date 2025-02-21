const express = require('express');
const router = express.Router();
const Model = require('../models/model');

// List all models
router.get('/models', async (req, res) => {
    try {
        const models = await Model.find().sort({ createdAt: -1 });
        res.json(models);
    } catch (error) {
        console.error('Error listing models:', error);
        res.status(500).json({ error: 'Error retrieving models' });
    }
});

// Get a specific model
router.get('/models/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    } catch (error) {
        console.error('Error getting model:', error);
        res.status(500).json({ error: 'Error retrieving model' });
    }
});

// Create a new model
router.post('/models', async (req, res) => {
    try {
        const { slug, name, description, chatWebhookUrl, completionsWebhookUrl } = req.body;

        // Validate required fields
        if (!slug || !name || !chatWebhookUrl || !completionsWebhookUrl) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                required: ['slug', 'name', 'chatWebhookUrl', 'completionsWebhookUrl'] 
            });
        }

        // Validate webhook URLs
        try {
            new URL(chatWebhookUrl);
            new URL(completionsWebhookUrl);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid webhook URL format' });
        }

        // Check if slug is already in use
        const existingModel = await Model.findOne({ slug });
        if (existingModel) {
            return res.status(409).json({ error: 'Model with this slug already exists' });
        }

        const model = new Model({
            slug,
            name,
            description,
            chatWebhookUrl,
            completionsWebhookUrl
        });

        await model.save();
        res.status(201).json(model);
    } catch (error) {
        console.error('Error creating model:', error);
        res.status(500).json({ error: 'Error creating model' });
    }
});

// Update a model
router.put('/models/:id', async (req, res) => {
    try {
        const { name, description, chatWebhookUrl, completionsWebhookUrl, isActive } = req.body;
        const updateData = {};

        // Build update object with only provided fields
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (chatWebhookUrl) {
            try {
                new URL(chatWebhookUrl);
                updateData.chatWebhookUrl = chatWebhookUrl;
            } catch (error) {
                return res.status(400).json({ error: 'Invalid chat webhook URL format' });
            }
        }
        if (completionsWebhookUrl) {
            try {
                new URL(completionsWebhookUrl);
                updateData.completionsWebhookUrl = completionsWebhookUrl;
            } catch (error) {
                return res.status(400).json({ error: 'Invalid completions webhook URL format' });
            }
        }
        if (isActive !== undefined) updateData.isActive = isActive;

        const model = await Model.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        res.json(model);
    } catch (error) {
        console.error('Error updating model:', error);
        res.status(500).json({ error: 'Error updating model' });
    }
});

// Delete a model
router.delete('/models/:id', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        // Soft delete by setting isActive to false
        model.isActive = false;
        await model.save();

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting model:', error);
        res.status(500).json({ error: 'Error deleting model' });
    }
});

// Test webhook endpoints
router.post('/models/:id/test', async (req, res) => {
    try {
        const model = await Model.findById(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        const { type } = req.query;
        if (!['chat', 'completions'].includes(type)) {
            return res.status(400).json({ error: 'Invalid test type. Use "chat" or "completions"' });
        }

        const webhookUrl = type === 'chat' ? model.chatWebhookUrl : model.completionsWebhookUrl;
        const testPayload = type === 'chat' ? {
            messages: [{ role: "user", content: "Test message" }],
            webhook_type: "chat"
        } : {
            prompt: "Test prompt",
            webhook_type: "completion"
        };

        try {
            const response = await axios.post(webhookUrl, testPayload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });

            res.json({
                success: true,
                statusCode: response.status,
                responseData: response.data
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                details: {
                    code: error.code,
                    status: error.response?.status,
                    data: error.response?.data
                }
            });
        }
    } catch (error) {
        console.error('Error testing webhook:', error);
        res.status(500).json({ error: 'Error testing webhook' });
    }
});

module.exports = router;
