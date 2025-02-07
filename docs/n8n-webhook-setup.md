# n8n Webhook Setup Guide

This guide explains how to set up n8n webhooks to work with the OpenAI-compatible API.

## Webhook Response Format

Your n8n workflows should format their responses to match the following structure:

```json
{
  "content": "The response text goes here",
  "model": "The model name used (e.g., gpt-3.5-turbo)",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "total_tokens": 579
  }
}
```

## Setup Instructions

1. In n8n, create two separate workflows:
   - One for chat completions
   - One for text completions

2. Add a Webhook node as the trigger for each workflow:
   - Chat completions webhook: `/webhook/chat`
   - Text completions webhook: `/webhook/completion`

3. Configure the Webhook nodes:
   - Method: POST
   - Authentication: None (API uses Bearer token authentication)
   - Response Mode: "Last Node"

4. Structure your workflow to:
   1. Receive the incoming request
   2. Process the request according to your requirements
   3. Format the response as shown above

## Example Workflows

### Chat Completions Webhook

The incoming request will have this format:
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "webhook_type": "chat"
}
```

Your workflow should:
1. Extract messages from the request
2. Process them through your custom logic
3. Return response in the specified format

### Text Completions Webhook

The incoming request will have this format:
```json
{
  "model": "gpt-3.5-turbo",
  "prompt": "Once upon a time",
  "webhook_type": "completion"
}
```

Your workflow should:
1. Extract the prompt from the request
2. Process it through your custom logic
3. Return response in the specified format

## Error Handling

If your workflow encounters an error, return an error response:

```json
{
  "error": {
    "message": "Description of what went wrong",
    "type": "error_type",
    "code": "error_code"
  }
}
```

## Testing Your Webhooks

Use the test endpoints in the API to verify your webhooks:

```bash
# Test chat completions
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'

# Test text completions
curl -X POST http://localhost:3001/v1/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "prompt": "Once upon a time"
  }'
```

## Best Practices

1. **Validation**: Validate incoming requests before processing
2. **Error Handling**: Implement proper error handling in your workflows
3. **Logging**: Add logging nodes to track requests and errors
4. **Timeouts**: Set appropriate timeout values for your workflows
5. **Rate Limiting**: Consider implementing rate limiting in n8n if needed
6. **Security**: Only expose necessary data in webhook responses
