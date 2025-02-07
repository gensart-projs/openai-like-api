# Plano da Plataforma - API Compatível OpenAI para n8n

## Objetivo
Criar uma interface de API compatível com a OpenAI que redireciona requisições para webhooks do n8n, permitindo que aplicações que consomem APIs OpenAI possam ativar fluxos multi-agents no n8n.

## Arquitetura

### Endpoints Principais
- `/v1/chat/completions` - Chat completions
- `/v1/completions` - Text completions
- `/v1/models` - Listagem de modelos
- `/v1/models/{model}` - Informações de modelo específico

### Componentes
1. **API Gateway**
   - Autenticação e validação de requests
   - Formatação de respostas no padrão OpenAI
   - Gerenciamento de rotas

2. **n8n Integration**
   - Webhooks para diferentes tipos de completions
   - Transformação de dados entre formatos

### Fluxo de Dados
1. Cliente faz requisição no formato OpenAI
2. API valida e processa a requisição
3. Webhook do n8n é chamado com os dados necessários
4. Resposta do n8n é formatada no padrão OpenAI
5. Cliente recebe resposta compatível

## Tecnologias
- Node.js + Express
- Axios para comunicação com n8n
- Middlewares personalizados para autenticação e validação
