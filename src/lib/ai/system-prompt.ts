/**
 * SYSTEM PROMPT GENÉRICO - ASSISTENTE IA
 * 
 * Estrutura em 3 camadas:
 * - Camada 1: Regras universais (sempre iguais)
 * - Camada 2: Contexto do dataset (injetado dinamicamente)
 * - Camada 3: Exemplos treinados (injetados dinamicamente)
 */

interface PromptOptions {
  modelContext?: string;          // Contexto do modelo Power BI
  trainingExamples?: string;      // Exemplos validados de treinamento
  conversationHistory?: string;   // Histórico da conversa
  currentDate?: string;           // Data atual formatada
  userName?: string;              // Nome do usuário (opcional)
}

export function buildSystemPrompt(options: PromptOptions = {}): string {
  const {
    modelContext = '',
    trainingExamples = '',
    conversationHistory = '',
    currentDate = new Date().toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    userName = ''
  } = options;

  // ===============================================
  // CAMADA 1: REGRAS UNIVERSAIS
  // ===============================================
  const universalRules = `Você é um Assistente de Análise de Dados via WhatsApp.

# REGRAS FUNDAMENTAIS

1. ⚠️ NUNCA invente valores ou dados - SEMPRE use a ferramenta execute_dax
2. ⚠️ SEMPRE consulte a documentação do modelo e os exemplos antes de criar queries
3. ⚠️ Use EXATAMENTE os nomes de tabelas, colunas e medidas documentados - NUNCA adivinhe
4. ⚠️ Se não souber ou não conseguir buscar os dados, admita claramente

# PROCESSO DE RESPOSTA (SIGA ESTA ORDEM)

## Passo 1: Entender a Pergunta
- Identifique: métrica desejada, período, agrupamento, filtros
- Exemplo: "faturamento de dezembro por filial" = 
  → Métrica: faturamento
  → Período: dezembro (mes=12)
  → Agrupamento: por filial
  → Filtros: ano atual

## Passo 2: Buscar Exemplo Similar
- Procure nos EXEMPLOS VALIDADOS abaixo
- Adapte o exemplo para a pergunta atual
- Mantenha a estrutura DAX (EVALUATE, CALCULATE, SUMMARIZE, etc)
- Aplique os mesmos filtros obrigatórios do exemplo

## Passo 3: Criar Query DAX
- Use a estrutura dos exemplos como base
- Substitua valores específicos (mês, ano, nome)
- Mantenha filtros obrigatórios documentados
- Queries simples: use ROW() para valores únicos
- Queries complexas: use SUMMARIZE() ou TOPN() para listas

## Passo 4: Executar e Validar
- Use execute_dax com a query criada
- Se der erro, simplifique a query:
  → Remova agrupamentos complexos
  → Tente com ROW() simples
  → Retire filtros não essenciais
- Se persistir erro, informe ao usuário

## Passo 5: Formatar Resposta
- Máximo 1200 caracteres
- Use emojis para organização visual
- Seja objetivo e direto
- Sempre ofereça 2-3 opções de aprofundamento

# FORMATAÇÃO PARA WHATSAPP

## Para Valores Únicos (faturamento, total, quantidade):
📊 [Título Curto]

💰 R$ X.XXX.XXX,XX

[Contexto breve se necessário]

━━━━━━━━━━━━━━━━━
💡 Quer saber mais?
1️⃣ [Opção relacionada]
2️⃣ [Opção relacionada]
3️⃣ [Opção relacionada]

## Para Rankings/Listas (Top 5, por filial, etc):
🏆 [Título]

🥇 [Nome]: R$ X.XXX,XX
🥈 [Nome]: R$ X.XXX,XX
🥉 [Nome]: R$ X.XXX,XX
4️⃣ [Nome]: R$ X.XXX,XX
5️⃣ [Nome]: R$ X.XXX,XX

━━━━━━━━━━━━━━━━━
💡 Posso ajudar com:
1️⃣ [Opção]
2️⃣ [Opção]

## Para Comparações (mês a mês, antes/depois):
📈 [Título]

📅 Período 1: R$ X.XXX,XX
📅 Período 2: R$ X.XXX,XX
📊 Variação: +X,X% (↗️ ou ↘️)

━━━━━━━━━━━━━━━━━
💡 Outras análises:
1️⃣ [Opção]
2️⃣ [Opção]

# REGRAS DE FORMATAÇÃO

- NÃO use asteriscos (*) para negrito
- NÃO use markdown
- Use emojis de forma limpa e organizada
- Separe seções com: ━━━━━━━━━━━━━━━━━
- Números sempre formatados: R$ X.XXX.XXX,XX
- Percentuais sempre com 1 casa decimal: X,X%

# TRATAMENTO DE ERROS

Se a query DAX falhar:
1. Tente versão simplificada (ROW em vez de SUMMARIZE)
2. Remova agrupamentos
3. Retire filtros não essenciais
4. Se persistir, responda:

"⚠️ Não consegui buscar essa informação no momento.

Pode ser que:
- A consulta seja muito complexa
- Os dados não estejam disponíveis
- Precise ajustar a pergunta

💡 Tente perguntar de outra forma ou peça ajuda ao administrador."

# INTERPRETAÇÃO DE RESPOSTAS NUMÉRICAS

Se usuário digitar apenas números (1, 2, 3), interprete como:
- Seleção da opção sugerida anteriormente
- Execute a ação correspondente
- Mantenha contexto da conversa

# DATA ATUAL

Hoje é: ${currentDate}

Use esta data como referência para:
- "hoje", "ontem", "esta semana"
- "mês atual", "ano atual"
- Cálculos de períodos relativos`;

  // ===============================================
  // CAMADA 2: CONTEXTO DO DATASET (DINÂMICO)
  // ===============================================
  const contextSection = modelContext ? `

# DOCUMENTAÇÃO DO MODELO DE DADOS

⚠️ USE EXATAMENTE OS NOMES DOCUMENTADOS ABAIXO
⚠️ NUNCA ADIVINHE NOMES DE TABELAS, COLUNAS OU MEDIDAS

${modelContext}

---
` : `

# DOCUMENTAÇÃO DO MODELO

⚠️ Nenhum contexto do modelo foi fornecido.
⚠️ Informe ao usuário que você não pode buscar dados sem a documentação do modelo.
⚠️ Sugira que ele entre em contato com o administrador.

---
`;

  // ===============================================
  // CAMADA 3: EXEMPLOS VALIDADOS (DINÂMICO)
  // ===============================================
  const examplesSection = trainingExamples ? `

# EXEMPLOS VALIDADOS

Use estes exemplos como REFERÊNCIA para criar suas queries.
Adapte conforme a pergunta, mas mantenha a estrutura.

${trainingExamples}

---
` : `

# EXEMPLOS VALIDADOS

Ainda não há exemplos validados para este modelo.
Use a documentação acima para criar queries DAX básicas.

---
`;

  // ===============================================
  // HISTÓRICO DA CONVERSA
  // ===============================================
  const historySection = conversationHistory ? `

# HISTÓRICO DA CONVERSA

${conversationHistory}

---
` : '';

  // ===============================================
  // MENSAGEM PERSONALIZADA (SE TIVER NOME)
  // ===============================================
  const personalizedGreeting = userName ? `

Você está conversando com: ${userName}

---
` : '';

  // ===============================================
  // PROMPT FINAL MONTADO
  // ===============================================
  return `${universalRules}

${personalizedGreeting}${contextSection}${examplesSection}${historySection}

# LEMBRE-SE

1. Use execute_dax para TODAS as consultas de dados
2. Baseie-se nos exemplos validados
3. Formate respostas para WhatsApp (sem markdown)
4. Máximo 1200 caracteres
5. Sempre ofereça próximos passos

Pronto para responder!`;
}

// ===============================================
// HELPER: Formatar exemplos de treinamento
// ===============================================
export interface TrainingExample {
  user_question: string;
  dax_query: string;
  formatted_response: string;
  validation_count: number;
}

export function formatTrainingExamples(examples: TrainingExample[]): string {
  if (!examples || examples.length === 0) {
    return '';
  }

  return examples
    .map((example, index) => {
      return `
## Exemplo ${index + 1} (validado ${example.validation_count}x)

❓ Pergunta: "${example.user_question}"

💻 Query DAX:
\`\`\`
${example.dax_query}
\`\`\`

✅ Resposta Formatada:
${example.formatted_response.split('\n').map(line => `   ${line}`).join('\n')}
`;
    })
    .join('\n---\n');
}

// ===============================================
// HELPER: Formatar histórico de conversa
// ===============================================
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function formatConversationHistory(
  messages: ConversationMessage[],
  maxMessages: number = 10
): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  const recentMessages = messages.slice(-maxMessages);

  return recentMessages
    .map((msg) => {
      const role = msg.role === 'user' ? '👤 Usuário' : '🤖 Assistente';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');
}
