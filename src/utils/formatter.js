const formatChatResponse = (n8nResponse) => {
    const timestamp = Math.floor(Date.now() / 1000);
    
    return {
        id: `chatcmpl-${timestamp}-${Math.random().toString(36).substring(7)}`,
        object: "chat.completion",
        created: timestamp,
        model: n8nResponse.model || "n8n-default",
        choices: [{
            index: 0,
            message: {
                role: "assistant",
                content: n8nResponse.content || n8nResponse.response || ""
            },
            finish_reason: "stop"
        }],
        usage: n8nResponse.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        }
    };
};

const formatCompletionResponse = (n8nResponse) => {
    const timestamp = Math.floor(Date.now() / 1000);
    
    return {
        id: `cmpl-${timestamp}-${Math.random().toString(36).substring(7)}`,
        object: "text_completion",
        created: timestamp,
        model: n8nResponse.model || "n8n-default",
        choices: [{
            text: n8nResponse.content || n8nResponse.response || "",
            index: 0,
            finish_reason: "stop"
        }],
        usage: n8nResponse.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        }
    };
};

const formatErrorResponse = (error) => {
    return {
        error: {
            message: error.message || "An error occurred during the request.",
            type: error.type || "api_error",
            code: error.code || "internal_error",
            param: error.param,
            ...(error.details && { details: error.details })
        }
    };
};

module.exports = {
    formatChatResponse,
    formatCompletionResponse,
    formatErrorResponse
};
