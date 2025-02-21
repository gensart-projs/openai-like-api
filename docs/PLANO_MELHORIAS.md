# Plano de Melhorias do Chat

## 1. Sistema de Modelos Customizados com Endpoints n8n

### Objetivo
Implementar um sistema administrativo para cadastro de modelos customizados, onde cada modelo terá seus próprios endpoints n8n para chat e completions.

### Modificações Necessárias

1. **Modelo de Dados para Modelos Customizados**
```javascript
const modelSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true }, // Identificador único do modelo (ex: "gpt-custom-1")
    name: { type: String, required: true }, // Nome de exibição do modelo
    description: { type: String },
    chatWebhookUrl: { type: String, required: true }, // Endpoint n8n para chat
    completionsWebhookUrl: { type: String, required: true }, // Endpoint n8n para completions
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
```

2. **Interface Administrativa de Modelos**
- `POST /admin/models` - Criar novo modelo com seus endpoints
- `GET /admin/models` - Listar todos os modelos cadastrados
- `PUT /admin/models/:id` - Atualizar configuração do modelo
- `DELETE /admin/models/:id` - Desativar/remover modelo

3. **Modificações na API OpenAI Compatível**
- `/v1/models` agora retorna a lista de modelos cadastrados no sistema
- `/v1/chat/completions` usa o webhook configurado para chat do modelo selecionado
- `/v1/completions` usa o webhook configurado para completions do modelo selecionado

4. **Validações e Tratamentos**
- Validar existência e ativação do modelo requisitado
- Validar URLs dos webhooks durante cadastro
- Implementar fallback para caso de falha nos webhooks
- Logging detalhado das chamadas e respostas

## 2. Sistema de Sessões de Chat com MongoDB

### Objetivo
Implementar persistência de sessões de chat com interface similar ao ChatGPT, incluindo seleção dos modelos cadastrados e autenticação por senha.

### Modificações Necessárias

1. **Atualização dos Modelos de Dados**

```javascript
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Senha hasheada
    createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    title: { type: String },
    messages: [messageSchema],
    modelId: { type: String, required: true }, // Referência ao modelo customizado
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
```

2. **Sistema de Autenticação**
- Implementar registro de usuários com senha
- Criar sistema de login com JWT
- Proteger rotas do chat e administrativas

3. **Novas Rotas**
- Autenticação:
  - `POST /auth/register` - Registro de usuário
  - `POST /auth/login` - Login de usuário
  - `POST /auth/logout` - Logout de usuário

- Sessões (protegidas por autenticação):
  - `POST /sessions` - Criar nova sessão
  - `GET /sessions` - Listar sessões do usuário
  - `GET /sessions/:id` - Obter detalhes da sessão
  - `PUT /sessions/:id` - Atualizar sessão
  - `DELETE /sessions/:id` - Remover sessão

4. **Interface Web**
- Implementar layout similar ao ChatGPT
- Adicionar seletor de modelos cadastrados
- Implementar sistema de login/registro
- Adicionar gestão de múltiplas conversas
- Implementar histórico persistente por usuário

## 3. Integração de Sessões com n8n

### Objetivo
Implementar sistema de identificação de sessões na comunicação com os webhooks n8n.

### Modificações Necessárias

1. **Atualização do Payload do n8n**
```javascript
{
    messages: [...],
    sessionId: "session-uuid",
    webhook_type: "chat|completion",
    model: "modelo-customizado-id",
    userId: "user-id"
}
```

2. **Middleware de Sessão**
- Criar middleware para validação e gestão de sessões
- Implementar lógica de criação automática de sessões
- Adicionar tratamento de continuidade de contexto
- Validar permissões do usuário para o modelo selecionado

## Cronograma Sugerido

1. **Fase 1 - Setup Inicial** (3-4 dias)
   - Configuração do MongoDB
   - Implementação dos modelos de dados
   - Setup do sistema de autenticação
   - Setup da área administrativa básica

2. **Fase 2 - Sistema de Modelos** (3-4 dias)
   - Implementação do CRUD de modelos
   - Atualização da API OpenAI compatível
   - Interface administrativa de modelos
   - Testes de integração

3. **Fase 3 - Sistema de Sessões** (4-5 dias)
   - Implementação do backend de sessões
   - Desenvolvimento da interface web com autenticação
   - Implementação do seletor de modelos
   - Testes de usabilidade

4. **Fase 4 - Integração** (2-3 dias)
   - Implementação da comunicação com n8n
   - Testes end-to-end
   - Documentação

## Considerações Técnicas

1. **Banco de Dados**
   - Utilizar MongoDB para alta performance em operações de leitura
   - Implementar índices apropriados para consultas frequentes
   - Considerar TTL para limpeza automática de sessões antigas

2. **Segurança**
   - Implementar autenticação robusta para área administrativa e chat
   - Utilizar bcrypt para hash de senhas
   - Implementar JWT para gestão de sessões de usuário
   - Validar inputs em todas as rotas
   - Implementar rate limiting por usuário/sessão

3. **Performance**
   - Implementar caching de sessões frequentes
   - Otimizar consultas ao MongoDB
   - Considerar implementação de websockets para atualizações em tempo real

4. **Gestão de Modelos**
   - Implementar versionamento de modelos
   - Permitir testes de webhooks no administrativo
   - Monitoramento de uso por modelo
   - Sistema de backup de configurações