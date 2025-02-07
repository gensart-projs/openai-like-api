const formatChatResponse = (n8nResponse) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = {
        id: `chatcmpl-${Math.random().toString(36).substring(2, 12)}`,
        object: "chat.completion",
        created: timestamp,
        model: n8nResponse.model || "gpt-3.5-turbo",
        choices: [{
            index: 0,
            message: {
                role: "assistant",
                content: n8nResponse.content || n8nResponse.response || n8nResponse.choices?.[0]?.message?.content || ""
            },
            finish_reason: "stop"
        }],
        usage: n8nResponse.usage || {
            prompt_tokens: 0,
            completion_tokens: n8nResponse.content?.length || 0,
            total_tokens: n8nResponse.content?.length || 0
        }
    };

    // Return as array if the input was an array
    return Array.isArray(n8nResponse) ? [response] : response;
};

const formatCompletionResponse = (n8nResponse) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = {
        id: `cmpl-${Math.random().toString(36).substring(2, 12)}`,
        object: "text_completion",
        created: timestamp,
        model: n8nResponse.model || "gpt-3.5-turbo",
        choices: [{
            text: n8nResponse.content || n8nResponse.response || n8nResponse.choices?.[0]?.text || "",
            index: 0,
            finish_reason: "stop"
        }],
        usage: n8nResponse.usage || {
            prompt_tokens: 0,
            completion_tokens: n8nResponse.content?.length || 0,
            total_tokens: n8nResponse.content?.length || 0
        }
    };

    // Return as array if the input was an array
    return Array.isArray(n8nResponse) ? [response] : response;
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
