# Documentação - Chat com IA e WhatsApp

## Índice
1. [Visão Geral](#visão-geral)
2. [Chat com IA (Interface Web)](#chat-com-ia-interface-web)
3. [Chat via WhatsApp](#chat-via-whatsapp)
4. [Arquitetura e Componentes](#arquitetura-e-componentes)
5. [Limites e Quotas](#limites-e-quotas)
6. [Comandos e Funcionalidades](#comandos-e-funcionalidades)
7. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O sistema MeuDashboard oferece duas formas de interação com a Inteligência Artificial:

1. **Chat com IA (Interface Web)**: Chat integrado nas telas Power BI, acessível diretamente na interface web do sistema
2. **Chat via WhatsApp**: Assistente IA disponível via WhatsApp, permitindo consultas aos dados diretamente pelo celular

Ambos os sistemas utilizam a API Claude (Anthropic) para processar perguntas em linguagem natural e executar consultas DAX no Power BI para buscar dados em tempo real.

---

## Chat com IA (Interface Web)

### Localização
- **Rota**: `/tela/[id]` - Integrado nas telas Power BI
- **API**: `/api/ai/chat` (POST)

### Funcionalidades

#### 1. **Integração com Telas Power BI**
- O chat está disponível em cada tela do Power BI
- Automaticamente identifica a conexão e dataset associados à tela
- Usa o contexto do modelo de dados configurado para a conexão

#### 2. **Histórico de Conversação**
- Mantém histórico das últimas 20 mensagens por conversa
- Cada conversa é vinculada a uma tela específica (`screen_id`)
- Histórico é carregado automaticamente ao abrir o chat

#### 3. **Sugestões Inteligentes**
- Após cada resposta, o sistema oferece 4 sugestões de perguntas relacionadas
- Sugestões são extraídas automaticamente da resposta da IA
- Formato: `[SUGESTOES]...[/SUGESTOES]`

#### 4. **Execução de Consultas DAX**
- A IA pode executar queries DAX automaticamente quando necessário
- Consultas são executadas diretamente no Power BI via API
- Resultados são formatados e apresentados de forma humanizada

### Fluxo de Funcionamento

```
1. Usuário envia mensagem
   ↓
2. Sistema verifica limites diários
   ↓
3. Busca ou cria conversa (conversation_id)
   ↓
4. Carrega histórico (últimas 20 mensagens)
   ↓
5. Busca contexto do modelo de dados
   ↓
6. Envia para Claude com histórico + contexto
   ↓
7. Claude pode executar queries DAX (tool calls)
   ↓
8. Resposta formatada com sugestões
   ↓
9. Salva mensagens no banco
   ↓
10. Atualiza contador de uso diário
```

### Estrutura de Dados

#### Tabela: `ai_conversations`
```sql
- id (UUID)
- company_group_id (UUID)
- user_id (UUID)
- screen_id (UUID, nullable)
- title (string)
- created_at (timestamp)
```

#### Tabela: `ai_messages`
```sql
- id (UUID)
- conversation_id (UUID)
- role ('user' | 'assistant')
- content (text)
- created_at (timestamp)
```

### Limites e Validações

#### Limite de Mensagens Diárias
- Configurado por desenvolvedor: `max_chat_messages_per_day`
- Padrão: 1000 mensagens/dia
- Contagem: Todas as mensagens do grupo no dia atual
- Resposta quando excedido: HTTP 429 com mensagem de erro

#### Limite de Perguntas Diárias
- Configurado por plano: `max_ai_questions_per_day`
- Padrão: 50 perguntas/dia
- Contagem: Registro na tabela `ai_usage`
- Resposta quando excedido: HTTP 429

### Modelos de IA Utilizados

- **Modelo Principal**: `claude-sonnet-4-20250514` (quando há tools/DAX)
- **Modelo Rápido**: `claude-haiku-3-5-20241022` (quando não há tools)
- **Max Tokens**: 1024 tokens por resposta

### System Prompt

O sistema utiliza um prompt detalhado que inclui:
- Personalidade do assistente (amigável, direto, prestativo)
- Regras de período padrão (mês atual quando não especificado)
- Formatação para WhatsApp (negrito, itálico, emojis)
- Regras para dados e análises
- Sugestões obrigatórias (sempre 4 sugestões)
- Contexto do modelo de dados (estrutura de tabelas, medidas, etc.)

---

## Chat via WhatsApp

### Localização
- **Webhook**: `/api/whatsapp/webhook` (POST)
- **Integração**: Evolution API (WhatsApp Business)

### Funcionalidades

#### 1. **Autenticação de Números**
- Apenas números autorizados podem usar o assistente
- Tabela: `whatsapp_authorized_numbers`
- Campos: `phone_number`, `company_group_id`, `instance_id`, `name`

#### 2. **Seleção de Agente/Dataset**
- Quando há múltiplos datasets configurados, o usuário escolhe qual usar
- Sistema lista opções numeradas (1️⃣, 2️⃣, 3️⃣...)
- Seleção é salva em `whatsapp_user_selections`
- Comando `/trocar` para mudar de agente

#### 3. **Respostas em Áudio**
- Se o usuário enviar áudio com transcrição, a resposta será em áudio
- Geração de áudio via OpenAI TTS (tts-1-hd, voice: shimmer)
- Formatação especial do texto para fala natural
- Envio via Evolution API como PTT (Push to Talk)

#### 4. **Histórico de Conversação**
- Mantém histórico das últimas 10 mensagens
- Filtrado por `company_group_id` do número autorizado
- Histórico é usado para contexto nas respostas

#### 5. **Controle de Duplicidade**
- Verifica `external_id` antes de processar mensagens
- Evita processar a mesma mensagem duas vezes
- Baseado no ID da mensagem do WhatsApp

### Fluxo de Funcionamento

```
1. Webhook recebe mensagem do WhatsApp
   ↓
2. Verifica se número é autorizado
   ↓
3. Verifica duplicidade (external_id)
   ↓
4. Verifica limites diários/mensais
   ↓
5. Busca instância WhatsApp conectada
   ↓
6. Verifica se há múltiplos datasets
   ↓
7. Se múltiplos: mostra menu de seleção
   ↓
8. Se seleção prévia: usa dataset escolhido
   ↓
9. Atualiza authorizedNumber para grupo correto
   ↓
10. Salva mensagem incoming (com grupo correto)
    ↓
11. Busca histórico (filtrado por grupo)
    ↓
12. Busca contexto do modelo de dados
    ↓
13. Envia para Claude com histórico + contexto
    ↓
14. Claude pode executar queries DAX
    ↓
15. Resposta formatada para WhatsApp
    ↓
16. Se áudio: gera e envia áudio
    ↓
17. Se texto: divide se > 2000 caracteres
    ↓
18. Salva mensagem outgoing
```

### Estrutura de Dados

#### Tabela: `whatsapp_authorized_numbers`
```sql
- id (UUID)
- phone_number (string)
- name (string)
- company_group_id (UUID)
- instance_id (UUID, nullable)
- is_active (boolean)
- created_at (timestamp)
```

#### Tabela: `whatsapp_messages`
```sql
- id (UUID)
- company_group_id (UUID)
- phone_number (string)
- message_content (text)
- direction ('incoming' | 'outgoing')
- sender_name (string)
- external_id (string, nullable) - ID da mensagem WhatsApp
- instance_id (UUID, nullable)
- authorized_number_id (UUID, nullable)
- archived (boolean, default: false)
- created_at (timestamp)
```

#### Tabela: `whatsapp_user_selections`
```sql
- phone_number (string, unique)
- company_group_id (UUID)
- selected_connection_id (UUID)
- selected_dataset_id (UUID)
- updated_at (timestamp)
```

### Comandos Disponíveis

#### `/ajuda` ou `ajuda`
Mostra lista de comandos e exemplos de perguntas.

#### `/limpar` ou `limpar`
- Arquiva todas as mensagens do número
- Remove seleção de dataset
- Permite começar conversa do zero

#### `/trocar` ou `trocar`
- Remove seleção atual de dataset
- Mostra menu de seleção novamente
- Permite escolher outro agente/dataset

#### `/status` ou `status`
Mostra informações sobre:
- Usuário e grupo
- Agente/dataset selecionado
- Status da conexão
- Instância WhatsApp

### Limites e Validações

#### Limite de Mensagens WhatsApp Diárias
- Configurado por desenvolvedor: `max_chat_messages_per_day`
- Padrão: 1000 mensagens/dia
- Contagem: Mensagens `outgoing` do grupo no dia atual
- Resposta quando excedido: Mensagem de erro via WhatsApp

#### Limite de Mensagens WhatsApp Mensais
- Configurado por plano: `max_whatsapp_messages_per_month`
- Padrão: 100 mensagens/mês
- Contagem: Mensagens `outgoing` do grupo no mês atual
- Resposta quando excedido: HTTP 200 com status `limit_reached`

### Tratamento de Mensagens Longas

- Mensagens > 2000 caracteres são divididas automaticamente
- Divisão por parágrafos quando possível
- Cada parte é enviada separadamente
- Prefixo: `📄 Parte X/Y` quando dividido
- Delay de 1.5s entre partes

### Formatação de Texto para Áudio

O sistema formata o texto antes de gerar áudio:
- Remove emojis
- Remove linhas decorativas
- Formata valores monetários (R$ 1.234,56 → "um mil duzentos e trinta e quatro reais e cinquenta e seis centavos")
- Formata porcentagens (15,5% → "quinze vírgula cinco por cento")
- Formata números grandes (1.000.000 → "um milhão")
- Limita a 4000 caracteres

### Modelos de IA Utilizados

- **Modelo Principal**: `claude-sonnet-4-20250514`
- **Max Tokens**: 1200 tokens por resposta
- **Retry**: Até 3 tentativas com backoff exponencial

### System Prompt (WhatsApp)

Similar ao chat web, mas adaptado para WhatsApp:
- Formatação específica para WhatsApp (negrito, itálico)
- Regras de período padrão
- Memória de conversas anteriores
- Sugestões contextuais
- Data e hora atual (Brasília)

---

## Arquitetura e Componentes

### APIs Principais

#### `/api/ai/chat` (POST)
**Chat com IA - Interface Web**

**Request Body:**
```json
{
  "message": "Qual o faturamento do mês?",
  "conversation_id": "uuid-opcional",
  "screen_id": "uuid-opcional"
}
```

**Response:**
```json
{
  "response": "Resposta da IA...",
  "suggestions": ["Sugestão 1", "Sugestão 2", ...],
  "conversation_id": "uuid",
  "used_tokens": 1234
}
```

#### `/api/whatsapp/webhook` (POST)
**Webhook WhatsApp - Evolution API**

**Request Body:**
```json
{
  "event": "messages.upsert",
  "instance": "nome-instancia",
  "data": {
    "key": {
      "id": "external-id",
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false
    },
    "message": {
      "conversation": "Texto da mensagem"
    }
  }
}
```

**Response:**
```json
{
  "status": "success",
  "sent": true,
  "reason": "message_processed"
}
```

### Funções Auxiliares

#### `executeDaxQuery(connectionId, datasetId, query, supabase)`
Executa uma query DAX no Power BI e retorna os resultados.

**Fluxo:**
1. Busca credenciais da conexão
2. Obtém token OAuth2 do Azure AD
3. Executa query via Power BI REST API
4. Retorna resultados formatados

#### `getModelContext(supabase, connectionId)`
Busca o contexto do modelo de dados configurado para uma conexão.

**Retorna:**
- Primeiros 8000 caracteres do `context_content`
- Apenas contextos ativos (`is_active = true`)

#### `formatTextForSpeech(text)`
Formata texto para geração de áudio TTS.

**Transformações:**
- Remove emojis
- Formata valores monetários
- Formata porcentagens
- Formata números grandes
- Limpa espaços e quebras de linha

#### `generateAudio(text)`
Gera áudio MP3 a partir de texto usando OpenAI TTS.

**Configuração:**
- Modelo: `tts-1-hd`
- Voz: `shimmer`
- Formato: `mp3`
- Velocidade: `1.0`
- Limite: 4000 caracteres

#### `sendWhatsAppMessage(instance, phone, message)`
Envia mensagem de texto via Evolution API.

**Endpoint:** `/message/sendText/{instance_name}`

#### `sendWhatsAppAudio(instance, phone, audioBase64)`
Envia áudio via Evolution API.

**Endpoint:** `/message/sendWhatsAppAudio/{instance_name}` ou `/message/sendMedia/{instance_name}`

---

## Limites e Quotas

### Por Desenvolvedor

| Recurso | Campo | Padrão |
|---------|-------|--------|
| Mensagens Chat IA/dia | `max_chat_messages_per_day` | 1000 |
| Mensagens WhatsApp/dia | `max_chat_messages_per_day` | 1000 |

### Por Plano (Legado)

| Recurso | Campo | Padrão |
|---------|-------|--------|
| Perguntas IA/dia | `max_ai_questions_per_day` | 50 |
| Mensagens WhatsApp/mês | `max_whatsapp_messages_per_month` | 100 |

### Contagem de Uso

#### Chat IA (Web)
- Conta todas as mensagens do grupo no dia
- Tabela: `ai_messages`
- Filtro: `conversation_id IN (conversas do grupo)`

#### Chat WhatsApp
- **Diário**: Mensagens `outgoing` do grupo no dia
- **Mensal**: Mensagens `outgoing` do grupo no mês
- Tabela: `whatsapp_messages`

---

## Comandos e Funcionalidades

### Chat Web

#### Sugestões Automáticas
- Aparecem após cada resposta
- 4 sugestões relacionadas ao tema
- Clicáveis para enviar automaticamente
- Formato extraído de `[SUGESTOES]...[/SUGESTOES]`

#### Histórico Persistente
- Mantido por conversa (`conversation_id`)
- Últimas 20 mensagens carregadas
- Vinculado à tela (`screen_id`)

### Chat WhatsApp

#### Seleção de Agente
Quando há múltiplos datasets:
1. Sistema lista opções numeradas
2. Usuário digita o número (1, 2, 3...)
3. Seleção é salva
4. Próximas mensagens usam o dataset escolhido

#### Respostas em Áudio
- Ativado quando usuário envia áudio
- Geração automática via OpenAI TTS
- Enviado como PTT (Push to Talk)
- Fallback para texto se falhar

#### Comandos Especiais
- `/ajuda` - Lista comandos
- `/limpar` - Limpa histórico
- `/trocar` - Troca de agente
- `/status` - Status da conexão

---

## Troubleshooting

### Problemas Comuns

#### Chat Web não responde
1. Verificar se há conexão Power BI configurada
2. Verificar se há contexto do modelo de dados
3. Verificar limites diários
4. Verificar logs do console do navegador

#### WhatsApp não responde
1. Verificar se número está autorizado
2. Verificar se instância WhatsApp está conectada
3. Verificar limites diários/mensais
4. Verificar logs do webhook

#### Respostas incorretas
1. Verificar contexto do modelo de dados
2. Verificar se dataset está atualizado
3. Verificar se medidas DAX estão corretas
4. Reformular pergunta de forma mais específica

#### Limite atingido
1. Verificar contagem atual vs limite
2. Aguardar reset (meia-noite para diário, primeiro dia do mês para mensal)
3. Contatar administrador para aumentar limite

### Logs e Debug

#### Chat Web
- Logs no console do navegador
- Logs no servidor (console.log)
- Verificar Network tab para requests

#### WhatsApp
- Logs detalhados no webhook
- Console logs com prefixos:
  - `[Webhook]` - Processamento geral
  - `[Claude Retry]` - Tentativas de retry
  - `[generateAudio]` - Geração de áudio
  - `[sendWhatsAppAudio]` - Envio de áudio

### Validações Importantes

#### Duplicidade (WhatsApp)
- Verifica `external_id` antes de processar
- Evita processar mesma mensagem duas vezes
- Log: `[Webhook] Mensagem já processada, ignorando`

#### Grupo Correto (WhatsApp)
- `authorizedNumber` é atualizado quando há seleção
- Mensagens são salvas com `company_group_id` correto
- Histórico é filtrado por grupo específico

---

## Exemplos de Uso

### Chat Web

**Pergunta:**
```
Qual o faturamento do mês?
```

**Resposta:**
```
📊 No mês de dezembro de 2024, o faturamento total foi de **R$ 125.450,00**

Este valor representa um crescimento de 15% em relação ao mês anterior.

[SUGESTOES]
- Comparar com mês anterior
- Ver por filial
- Top 10 produtos
- Detalhes por vendedor
[/SUGESTOES]
```

### Chat WhatsApp

**Pergunta:**
```
Qual o faturamento?
```

**Resposta:**
```
📊 *Faturamento de Dezembro de 2024*

O faturamento total foi de *R$ 125.450,00*

📈 Crescimento de 15% vs mês anterior

💡 *Posso analisar:*
1️⃣ Comparar com mês anterior
2️⃣ Ver por filial
3️⃣ Top 10 produtos
```

---

## Segurança

### Autenticação

#### Chat Web
- Requer autenticação JWT
- Validação via `getAuthUser()`
- Verifica permissões do usuário

#### WhatsApp
- Apenas números autorizados
- Validação via `whatsapp_authorized_numbers`
- Verifica `is_active = true`

### Isolamento de Dados

- Cada grupo (`company_group_id`) tem dados isolados
- Histórico filtrado por grupo
- Contextos específicos por conexão
- Limites aplicados por grupo

### Controle de Duplicidade

- WhatsApp: Verifica `external_id` antes de processar
- Evita processar mesma mensagem múltiplas vezes
- Logs de mensagens ignoradas

---

## Melhorias Futuras

### Planejadas
- [ ] Suporte a imagens no WhatsApp
- [ ] Exportação de conversas
- [ ] Análise de sentimento
- [ ] Respostas mais contextuais
- [ ] Integração com mais canais (Telegram, etc.)

### Em Consideração
- [ ] Chat em tempo real (WebSocket)
- [ ] Notificações push
- [ ] Respostas com gráficos
- [ ] Agendamento de consultas
- [ ] Múltiplos idiomas

---

**Última atualização:** Dezembro 2024  
**Versão do documento:** 1.0
