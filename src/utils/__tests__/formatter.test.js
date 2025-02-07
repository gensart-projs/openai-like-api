const { formatChatResponse, formatCompletionResponse, formatErrorResponse } = require('../formatter');

describe('Formatter Utils', () => {
    describe('formatChatResponse', () => {
        it('should format n8n response to OpenAI chat completion format', () => {
            const n8nResponse = {
                content: "Hello, world!",
                model: "test-model",
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            const result = formatChatResponse(n8nResponse);

            expect(result.object).toBe("chat.completion");
            expect(result.model).toBe("test-model");
            expect(result.choices[0].message.content).toBe("Hello, world!");
            expect(result.usage).toEqual(n8nResponse.usage);
        });

        it('should handle minimal n8n response', () => {
            const result = formatChatResponse({});

            expect(result.object).toBe("chat.completion");
            expect(result.model).toBe("n8n-default");
            expect(result.choices[0].message.content).toBe("");
            expect(result.usage).toEqual({
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            });
        });
    });

    describe('formatCompletionResponse', () => {
        it('should format n8n response to OpenAI completion format', () => {
            const n8nResponse = {
                content: "Hello, world!",
                model: "test-model",
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            const result = formatCompletionResponse(n8nResponse);

            expect(result.object).toBe("text_completion");
            expect(result.model).toBe("test-model");
            expect(result.choices[0].text).toBe("Hello, world!");
            expect(result.usage).toEqual(n8nResponse.usage);
        });
    });

    describe('formatErrorResponse', () => {
        it('should format error with all fields', () => {
            const error = {
                message: "Test error",
                type: "test_error",
                code: "test_code",
                param: "test_param",
                details: { additional: "info" }
            };

            const result = formatErrorResponse(error);

            expect(result.error).toEqual(error);
        });

        it('should handle minimal error', () => {
            const result = formatErrorResponse({});

            expect(result.error.message).toBe("An error occurred during the request.");
            expect(result.error.type).toBe("api_error");
            expect(result.error.code).toBe("internal_error");
        });
    });
});
