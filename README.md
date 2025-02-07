# OpenAI Compatible API for n8n

This project provides an OpenAI-compatible API interface that redirects requests to n8n webhooks, allowing applications that consume OpenAI APIs to trigger multi-agent workflows in n8n.

## Features

- OpenAI-compatible endpoints:
  - `/v1/chat/completions` - Chat completions
  - `/v1/completions` - Text completions
  - `/v1/models` - List available models
  - `/v1/models/{model}` - Get model details
- Authentication support using Bearer tokens
- Error handling following OpenAI's format
- Request validation
- Response formatting to match OpenAI's structure

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your settings:
   ```bash
   cp .env.example .env
   ```
4. Update the following environment variables in `.env`:
   - `CHAT_WEBHOOK_URL`: Your n8n webhook URL for chat completions
   - `COMPLETION_WEBHOOK_URL`: Your n8n webhook URL for text completions
   - `API_KEY`: Your secret API key for authentication
   - `PORT`: Port number for the server (default: 3001)

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Usage

### Authentication

Include your API key in requests using the Bearer token format:
```bash
curl -H "Authorization: Bearer your-api-key" ...
```

### Chat Completions

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Text Completions

```bash
curl -X POST http://localhost:3001/v1/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "prompt": "Hello!"
  }'
```

### List Models

```bash
curl http://localhost:3001/v1/models \
  -H "Authorization: Bearer your-api-key"
```

## n8n Webhook Format

Your n8n webhooks should return responses in the following format:

```json
{
  "content": "Response content here",
  "model": "model-name",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Error Handling

The API returns errors in OpenAI's format:

```json
{
  "error": {
    "message": "Error description",
    "type": "error_type",
    "code": "error_code",
    "param": "parameter_name"
  }
}
```

## Development

- Run tests: `npm test`
- Run linter: `npm run lint`

## License

MIT
# openai-like-api
