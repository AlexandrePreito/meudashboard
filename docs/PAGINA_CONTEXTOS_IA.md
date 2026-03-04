# Página Contextos da IA

**URL:** `/assistente-ia/contextos`

## Visão geral

A página **Contextos da IA** permite configurar as documentações que alimentam o assistente de inteligência artificial do sistema. São dois tipos de contexto por dataset:

1. **Documentação para Chat** — usada pela IA para responder perguntas dos usuários
2. **Base de DAX** — base completa de medidas e colunas para a tela de Treinamento

## Fluxo de uso

### 1. Seleção de dataset

- No topo da página, um dropdown lista os datasets disponíveis do grupo ativo
- O grupo vem do menu lateral (`activeGroup`) ou do primeiro grupo do usuário
- Ao trocar o dataset, os contextos são recarregados automaticamente

### 2. Documentação para Chat (arquivo .md)

- **Importar:** botão "Importar" ou "Atualizar" abre o modal
- **Formas de entrada:**
  - Arrastar e soltar arquivo `.md`
  - Selecionar arquivo via botão
  - Colar o texto diretamente no textarea
- **Validação:** o parser extrai seções (BASE, MEDIDAS, TABELAS, QUERIES, EXEMPLOS) e exibe estatísticas
- **Salvar:** só é possível se não houver erros de parsing
- **Download:** botão para baixar o prompt `prompt-documentacao-chat.md` (template para gerar a documentação no Claude + MCP Power BI)

### 3. Base de DAX (arquivo .json)

- **Importar:** botão "Importar" ou "Atualizar" abre o modal
- **Formas de entrada:**
  - Arrastar e soltar arquivo `.json`
  - Selecionar arquivo via botão
  - Colar o JSON no textarea
- **Formato esperado:** `{"modelo": "...", "medidas": [...], "colunas": [...]}`
- **Validação:** o JSON é parseado e exibe contagem de medidas e colunas
- **Salvar:** só é possível se o JSON for válido
- **Download:** botão para baixar o prompt `prompt-extrair-dax.md` (template para extrair DAX no Claude + MCP Power BI)

### 4. Ações por contexto

- **Download:** baixa o contexto salvo (`.md` para chat, `.json` para DAX)
- **Excluir:** remove o contexto após confirmação

## APIs utilizadas

| Endpoint | Método | Uso |
|---------|--------|-----|
| `/api/user/groups` | GET | Listar grupos do usuário (fallback quando não há grupo ativo) |
| `/api/assistente-ia/datasets` | GET | Listar datasets do grupo (`group_id`) |
| `/api/assistente-ia/context` | GET | Listar contextos por `datasetId` e `group_id` |
| `/api/assistente-ia/context` | GET | Buscar contexto por `id` (com conteúdo completo para download) |
| `/api/assistente-ia/context` | POST | Salvar novo contexto (chat ou dax) |
| `/api/assistente-ia/context` | DELETE | Excluir contexto por `id` |

## Permissões

- **FeatureGate:** exige feature `ai` habilitada
- **PermissionGuard:** verifica permissão de acesso ao assistente IA
- **Grupo:** contextos são filtrados por `company_group_id` (grupo do usuário, developer ou master)

## Estrutura de dados

### Documentação Chat (parseada)

- `base` — texto da seção BASE
- `medidas` — array de medidas (nome, descrição, fórmula, etc.)
- `tabelas` — tabelas com colunas
- `queries` — exemplos de perguntas e respostas
- `exemplos` — exemplos de uso

### Base de DAX (JSON)

- `modelo` — nome do modelo
- `medidas` — array de medidas
- `colunas` — array de colunas/tabelas

## Tabela de armazenamento

- `ai_model_contexts` — armazena `context_type` ('chat' | 'dax'), `context_content`, seções parseadas e `company_group_id`

## Botão "Como usar"

O modal de ajuda exibe o passo a passo para gerar cada tipo de documentação:

1. **Documentação Chat:** baixar prompt → executar no Claude + MCP Power BI → importar o `.md` gerado
2. **Base de DAX:** baixar prompt → executar no Claude + MCP Power BI → importar o `.json` gerado
