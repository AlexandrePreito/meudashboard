# Documentação Completa - Sistema de Assistente IA

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Telas](#estrutura-de-telas)
3. [Funcionalidades por Tela](#funcionalidades-por-tela)
4. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
5. [APIs e Integrações](#apis-e-integrações)
6. [Permissões e Acessos](#permissões-e-acessos)

---

## 🎯 Visão Geral

O sistema de Assistente IA é uma solução integrada que permite aos usuários interagir com dados do Power BI através de perguntas em linguagem natural via WhatsApp. O sistema utiliza a API da Anthropic (Claude) para processar perguntas e gerar consultas DAX automaticamente.

### Principais Características:
- **Respostas Automáticas**: Gera consultas DAX a partir de perguntas em português
- **Treinamento Contínuo**: Sistema aprende com exemplos validados pelos usuários
- **Integração Power BI**: Conecta-se diretamente aos datasets do Power BI
- **Gestão de Contextos**: Documentação estruturada sobre os modelos de dados
- **Monitoramento**: Acompanhamento de perguntas não respondidas e estatísticas

---

## 📱 Estrutura de Telas

### Rotas Disponíveis:

```
/assistente-ia
├── /pendentes          - Perguntas não respondidas
├── /consulta/nova      - Montar consulta DAX visualmente
├── /treinar            - Lista de exemplos de treinamento
├── /treinar/novo       - Criar novo exemplo de treinamento
├── /treinar/[id]       - Editar exemplo existente
├── /contextos          - Gerenciar contextos/documentação
└── /evolucao           - Estatísticas e evolução do sistema
```

---

## 🖥️ Funcionalidades por Tela

### 1. **Perguntas Pendentes** (`/assistente-ia/pendentes`)

**Função**: Visualizar e gerenciar perguntas que o assistente não conseguiu responder.

**Características**:
- **Cards de Estatísticas**: 
  - Total de perguntas
  - Pendentes (amarelo)
  - Resolvidas (verde)
  - Ignoradas (vermelho)
- **Filtros**:
  - Busca por texto
  - Filtro por status (pendente/resolvida/ignorada)
- **Ações por Pergunta**:
  - **Ensinar Resposta**: Redireciona para `/assistente-ia/consulta/nova` com a pergunta pré-preenchida
  - **Ignorar**: Marca a pergunta como ignorada
- **Informações Exibidas**:
  - Pergunta do usuário
  - Número de usuários que fizeram a mesma pergunta
  - Número de tentativas
  - Última vez que foi perguntada
  - Mensagem de erro (se houver)
  - Prioridade (Alta/Média/Baixa) baseada no score

**Permissões**: Apenas usuários com role `developer`, `admin` ou `manager` (não `viewer` ou `operator`)

---

### 2. **Montar Consulta** (`/assistente-ia/consulta/nova`)

**Função**: Interface visual para construir consultas DAX sem escrever código.

**Características**:

#### **Seção Superior**:
- **Dataset Power BI**: Seletor de dataset
- **Tags**: Campo para adicionar tags com dropdown de sugestões
  - 45 sugestões pré-definidas (vendas, faturamento, estoque, etc.)
  - Tags ordenadas alfabeticamente
  - Chips removíveis com `#` antes do nome
  - Filtro inteligente por texto digitado

#### **Card da Pergunta**:
- Input para a pergunta do usuário
- Pré-preenchido quando vem de "Ensinar Resposta"

#### **Grid de 4 Cards**:

**Card 1: O que você quer ver? (Medida)**
- Dropdown com medidas categorizadas
- Categorias expansíveis (Vendas, Produtos, etc.)
- Descrição de cada medida
- Ícone de calculadora

**Card 2: Agrupar por (Opcional)**
- Adicionar múltiplos agrupadores
- Chips removíveis
- Dropdown com opções disponíveis
- Ícone de camadas

**Card 3: Filtrar por (Opcional)**
- Adicionar múltiplos filtros
- Operadores: =, !=, >, <, >=, <=, contém
- Valores sugeridos para campos conhecidos
- Ícone de filtro

**Card 4: Opções**
- **Ordenar**: Maior → Menor / Menor → Maior
- **Limite**: Todos, Top 5, Top 10, Top 20 (padrão: Todos)
- Ícone de configurações

#### **Seção Inferior**:
- **DAX Gerado**: Preview da query DAX gerada
- **Botão Executar**: Executa a query e exibe resultados
- **Botão Salvar**: 
  - Se há pergunta na URL: "Salvar Treinamento" (salva como exemplo)
  - Caso contrário: "Salvar" (salva consulta)

**Funcionalidades**:
- Geração automática de DAX baseada nas seleções
- Execução de queries no Power BI
- Visualização de resultados em tabela
- Cópia do DAX para clipboard
- Salvamento como exemplo de treinamento

---

### 3. **Treinar IA** (`/assistente-ia/treinar`)

**Função**: Gerenciar exemplos de treinamento que ensinam o assistente a responder perguntas.

**Características**:
- **Lista de Exemplos**: Tabela com todos os exemplos cadastrados
- **Filtros**:
  - Busca por pergunta ou resposta
  - Filtro por tags/categorias
- **Informações Exibidas**:
  - Pergunta do usuário
  - Tags associadas
  - Número de validações
  - Grupo/empresa
  - Data de criação
- **Ações**:
  - **Editar**: Abre página de edição
  - **Excluir**: Remove o exemplo
  - **Adicionar DAX**: Redireciona para `/assistente-ia/consulta/nova`

**Permissões**: Apenas usuários com role diferente de `viewer` ou `operator`

---

### 4. **Novo Exemplo de Treinamento** (`/assistente-ia/treinar/novo`)

**Função**: Criar um novo exemplo de treinamento através de um fluxo guiado em 4 passos.

**Fluxo de 4 Passos**:

#### **Passo 1: Pergunta**
- Input para a pergunta do usuário
- Seletor de Dataset Power BI
- Pré-preenchido se vier de "Ensinar Resposta"
- Dicas para boas perguntas

#### **Passo 2: Testar com IA**
- Botão "Testar com a IA"
- A IA gera automaticamente:
  - Query DAX
  - Resposta formatada para WhatsApp
- Exibe resultado do teste
- Mostra tempo de execução
- Permite continuar para ajustar

#### **Passo 3: Ajustar**
- **Editor de DAX**: Textarea para editar a query
- **Editor de Resposta**: Textarea para formatar resposta WhatsApp
- **Templates DAX**: Sugestões de queries comuns
- **Preview WhatsApp**: Visualização de como ficará a resposta
- **Explorador de Modelo**: Navegar tabelas e colunas do dataset
- **Card 4: Opções**:
  - **Limite**: 10, 20, 50, 100 (padrão: 10)
  - **Tags**: Input para adicionar tags customizadas
    - Enter para adicionar
    - Chips removíveis
    - Sugestões rápidas: vendas, estoque, financeiro, filial, cliente

#### **Passo 4: Finalizar**
- Resumo da pergunta e resposta
- Seleção de tags (categorias pré-definidas)
- Tags adicionadas no passo 3 são exibidas
- Botão "Salvar Exemplo"

**Funcionalidades Especiais**:
- Se vem de pergunta pendente, marca automaticamente como resolvida
- Validação de campos obrigatórios
- Salvamento no banco de dados
- Redirecionamento para lista após salvar

---

### 5. **Editar Exemplo** (`/assistente-ia/treinar/[id]`)

**Função**: Editar um exemplo de treinamento existente.

**Características**:
- Carrega dados do exemplo selecionado
- Mesma interface do "Novo Exemplo"
- Permite atualizar:
  - Pergunta
  - Query DAX
  - Resposta formatada
  - Tags
  - Dataset

---

### 6. **Contextos** (`/assistente-ia/contextos`)

**Função**: Gerenciar documentação sobre os modelos de dados do Power BI.

**Características**:
- **Lista de Contextos**: Todos os contextos cadastrados
- **Criar/Editar Contexto**:
  - Nome do contexto
  - Nome do dataset (opcional)
  - Conteúdo (markdown)
- **Visualizar**: Preview do conteúdo
- **Busca**: Filtrar contextos por nome
- **Ativar/Desativar**: Toggle para ativar/desativar contextos

**Uso**:
- Os contextos são usados pela IA para entender a estrutura dos dados
- Contêm informações sobre:
  - Tabelas e colunas
  - Medidas disponíveis
  - Agrupadores conhecidos
  - Filtros comuns
  - Descrições e fórmulas

**Formato**:
- Markdown estruturado
- Seções por tabela
- Lista de colunas com tipos de dados
- Medidas com fórmulas e descrições

---

### 7. **Evolução** (`/assistente-ia/evolucao`)

**Função**: Visualizar estatísticas e evolução do sistema.

**Características**:
- **Filtros Temporais**:
  - Seleção de mês e ano
  - Visualização diária ou mensal
- **Métricas Exibidas**:
  - Total de perguntas feitas
  - Perguntas respondidas com sucesso
  - Perguntas que falharam
  - Taxa de sucesso (%)
- **Gráficos**:
  - Gráfico de barras diário (1-31)
  - Gráfico de barras mensal (Jan-Dez)
  - Cores diferenciadas por tipo de métrica
- **Cards de Resumo**:
  - Total geral
  - Taxa de sucesso
  - Tendências

---

## 🔄 Fluxo de Funcionamento

### Fluxo Principal: Pergunta → Resposta

```
1. Usuário faz pergunta via WhatsApp
   ↓
2. Sistema recebe pergunta e busca contexto do dataset
   ↓
3. IA (Claude) processa pergunta + contexto
   ↓
4. IA gera query DAX
   ↓
5. Sistema executa DAX no Power BI
   ↓
6. Sistema formata resultado para WhatsApp
   ↓
7. Resposta enviada ao usuário
```

### Fluxo de Treinamento

```
1. Pergunta não respondida aparece em "Pendentes"
   ↓
2. Usuário clica em "Ensinar Resposta"
   ↓
3. Redireciona para "Montar Consulta" com pergunta pré-preenchida
   ↓
4. Usuário monta consulta visualmente OU
   Usuário vai para "Novo Exemplo" e testa com IA
   ↓
5. Usuário ajusta DAX e resposta
   ↓
6. Salva como exemplo de treinamento
   ↓
7. Sistema aprende com o exemplo
   ↓
8. Próximas perguntas similares são respondidas automaticamente
```

### Fluxo de Montagem Visual de Consulta

```
1. Seleciona Dataset
   ↓
2. Sistema carrega metadados (medidas, agrupadores, filtros)
   ↓
3. Usuário seleciona:
   - Medida (obrigatório)
   - Agrupadores (opcional)
   - Filtros (opcional)
   - Opções (ordenar, limitar)
   ↓
4. Sistema gera DAX automaticamente
   ↓
5. Usuário pode executar para testar
   ↓
6. Usuário salva como treinamento (se veio de pendente)
```

---

## 🔌 APIs e Integrações

### APIs Internas

#### **`/api/assistente-ia/questions`**
- **GET**: Lista perguntas não respondidas
  - Parâmetros: `status`, `search`, `limit`, `offset`
  - Retorna: Lista de perguntas com estatísticas

#### **`/api/assistente-ia/questions/[id]`**
- **POST**: Marca pergunta como ignorada ou resolvida
  - Body: `{ status: 'ignored' | 'resolved' }`

#### **`/api/assistente-ia/training`**
- **GET**: Lista exemplos de treinamento
- **POST**: Cria novo exemplo
  - Body: `{ user_question, dax_query, formatted_response, tags, dataset_id, unanswered_question_id }`

#### **`/api/assistente-ia/training/test`**
- **POST**: Testa pergunta com IA
  - Body: `{ question, dataset_id, company_group_id }`
  - Retorna: DAX gerado, resposta formatada, resultado da execução

#### **`/api/assistente-ia/datasets`**
- **GET**: Lista datasets disponíveis do grupo
  - Retorna: Lista de datasets com nomes e IDs

#### **`/api/assistente-ia/model-metadata`**
- **GET**: Extrai metadados do modelo (medidas, agrupadores, filtros)
  - Parâmetro: `dataset_id`
  - Retorna: `{ measures, groupers, filters }`

#### **`/api/assistente-ia/model-structure`**
- **GET**: Extrai estrutura do modelo (tabelas e colunas)
  - Parâmetro: `dataset_id`
  - Retorna: `{ tables: [{ name, columns: [{ name, dataType }] }] }`

#### **`/api/assistente-ia/execute-dax`**
- **POST**: Executa query DAX no Power BI
  - Body: `{ dataset_id, dax_query, company_group_id }`
  - Retorna: Resultados da query

#### **`/api/assistente-ia/stats`**
- **GET**: Estatísticas de uso
  - Parâmetros: `month`, `year`, `view` (day/month)
  - Retorna: Estatísticas diárias/mensais

#### **`/api/ai/contexts`**
- **GET**: Lista contextos/documentação
- **POST**: Cria novo contexto
- **PUT**: Atualiza contexto existente

### Integrações Externas

#### **Power BI REST API**
- Autenticação: OAuth 2.0 Client Credentials Flow
- Endpoints utilizados:
  - `/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/executeQueries`
  - `/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/tables`
  - `/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/tables/{tableName}/columns`

#### **Anthropic Claude API**
- Modelo: `claude-sonnet-4-20250514`
- Função: Gerar queries DAX a partir de perguntas em português
- Contexto: Documentação do modelo de dados + pergunta do usuário

#### **Supabase**
- Banco de dados principal
- Tabelas utilizadas:
  - `ai_training_examples`: Exemplos de treinamento
  - `ai_unanswered_questions`: Perguntas não respondidas
  - `ai_model_contexts`: Documentação dos modelos
  - `powerbi_connections`: Conexões Power BI
  - `powerbi_reports`: Relatórios/Datasets
  - `company_groups`: Grupos/empresas

---

## 🔐 Permissões e Acessos

### Roles e Permissões

#### **Developer**
- ✅ Acesso total a todas as funcionalidades
- ✅ Pode ver perguntas de todos os grupos

#### **Admin / Manager**
- ✅ Acesso total a todas as funcionalidades
- ✅ Pode ver perguntas apenas do seu grupo

#### **Viewer / Operator**
- ❌ Sem acesso ao módulo de Assistente IA
- ❌ Bloqueado em todas as rotas

### Proteção de Rotas

Todas as páginas utilizam o componente `PermissionGuard` que:
1. Verifica se o usuário está autenticado
2. Verifica se o usuário tem permissão (role adequado)
3. Redireciona para login ou exibe mensagem de erro se não autorizado

---

## 📊 Estrutura de Dados

### Exemplo de Treinamento
```typescript
{
  id: string;
  user_question: string;        // Pergunta do usuário
  dax_query: string;            // Query DAX gerada
  formatted_response: string;   // Resposta formatada para WhatsApp
  tags: string[];               // Tags/categorias
  category: string;             // Categoria principal
  dataset_id: string;           // ID do dataset Power BI
  connection_id: string;        // ID da conexão Power BI
  company_group_id: string;     // ID do grupo/empresa
  is_validated: boolean;        // Se foi validado
  validation_count: number;     // Número de validações
  created_at: string;           // Data de criação
  created_by: string;           // ID do usuário criador
}
```

### Pergunta Não Respondida
```typescript
{
  id: string;
  user_question: string;         // Pergunta feita
  phone_number: string;         // Número do WhatsApp
  priority_score: number;       // Score de prioridade
  user_count: number;           // Quantos usuários fizeram
  attempt_count: number;        // Quantas tentativas
  last_asked_at: string;        // Última vez perguntada
  error_message: string;        // Mensagem de erro (se houver)
  status: 'pending' | 'resolved' | 'ignored';
  training_example_id: string;  // ID do exemplo criado (se resolvida)
}
```

### Contexto de Modelo
```typescript
{
  id: string;
  context_name: string;         // Nome do contexto
  dataset_name: string;         // Nome do dataset
  context_content: string;       // Conteúdo em markdown
  connection_id: string;        // ID da conexão Power BI
  dataset_id: string;           // ID do dataset Power BI
  is_active: boolean;           // Se está ativo
  created_at: string;
  updated_at: string;
}
```

---

## 🎨 Interface e UX

### Design System
- **Cores**: Gradientes suaves (azul, verde, roxo, laranja)
- **Cards**: Bordas arredondadas, sombras suaves
- **Ícones**: Lucide React
- **Tipografia**: Sistema padrão do Next.js
- **Responsividade**: Mobile-first, grid adaptativo

### Componentes Reutilizáveis
- `MainLayout`: Layout principal com menu
- `PermissionGuard`: Proteção de rotas
- `QuestionCard`: Card de pergunta pendente
- `Button`: Botão estilizado
- `LoadingSpinner`: Indicador de carregamento

---

## 🔧 Tecnologias Utilizadas

- **Frontend**: Next.js 16 (App Router), React, TypeScript
- **Estilização**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **IA**: Anthropic Claude API
- **Power BI**: REST API
- **Autenticação**: Supabase Auth
- **Notificações**: Hook customizado `useNotification`

---

## 📝 Notas Importantes

1. **Contextos são essenciais**: A IA precisa de documentação estruturada sobre o modelo de dados para funcionar bem
2. **Treinamento contínuo**: Quanto mais exemplos validados, melhor a IA fica
3. **Tags ajudam na organização**: Use tags consistentes para facilitar busca e categorização
4. **Validação é importante**: Sempre teste as queries antes de salvar como exemplo
5. **Monitoramento**: Acompanhe a evolução através da tela de estatísticas

---

## 🚀 Melhorias Futuras Sugeridas

- [ ] Autocomplete inteligente no campo de pergunta
- [ ] Sugestões de perguntas baseadas em histórico
- [ ] Exportação de relatórios de uso
- [ ] Integração com mais canais (Telegram, Teams)
- [ ] Dashboard de métricas em tempo real
- [ ] Sistema de feedback dos usuários
- [ ] Versionamento de exemplos de treinamento
- [ ] Testes A/B de diferentes respostas

---

**Última atualização**: Janeiro 2025
**Versão**: 1.0
