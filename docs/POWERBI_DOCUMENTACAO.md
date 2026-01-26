# Documentação - Módulo Power BI

## Índice
1. [Dashboard Power BI (`/powerbi`)](#dashboard-power-bi)
2. [Ordem de Atualização (`/powerbi/ordem-atualizacao`)](#ordem-de-atualização)

---

## Dashboard Power BI

**URL:** `/powerbi`

### Descrição
Página de monitoramento e gerenciamento de recursos do Power BI, incluindo modelos semânticos (datasets) e fluxos de dados (dataflows). Exibe status de atualização em tempo real, saúde geral do sistema e permite ações de atualização manual.

### Permissões
- **Acesso:** Apenas usuários com perfil `master`, `developer` ou `admin`
- **Filtro:** Dados são filtrados pelo grupo ativo selecionado no menu lateral

### Funcionalidades Principais

#### 1. Cards de Resumo Geral
Exibe 4 métricas principais:
- **Saúde Geral:** Percentual de recursos atualizados (verde ≥80%, amarelo ≥50%, vermelho <50%)
- **Atualizados:** Quantidade de recursos com status "Atualizado"
- **Com Falha:** Quantidade de recursos que falharam na última atualização
- **Desatualizados:** Quantidade de recursos sem atualização há mais de 24 horas

#### 2. Cards de Estatísticas por Tipo
- **Modelos Semânticos:** Total, OK, Falha, Antigo
- **Fluxos de Dados:** Total, OK, Falha, Antigo

#### 3. Lista Detalhada com Tabs
Permite alternar entre:
- **Modelos Semânticos (Datasets):** Lista todos os datasets do grupo
- **Fluxos de Dados (Dataflows):** Lista todos os dataflows do grupo

Cada item exibe:
- Ícone de status (✓ Atualizado, ⚠ Desatualizado, ✗ Falhou, ⏳ Atualizando)
- Nome do recurso
- Workspace
- Tempo desde última atualização
- Badge de status
- Botões de ação:
  - **Histórico:** Abre modal com histórico de atualizações
  - **Atualizar:** Dispara atualização manual do recurso

#### 4. Modal de Histórico
Ao clicar no ícone de histórico, exibe:
- Lista de atualizações recentes
- Data/hora de início e fim
- Duração da atualização
- Status de cada atualização (Sucesso, Falhou, Em andamento)

#### 5. Modal de Nova Tela
Permite criar novas telas do dashboard:
- **Grupo:** Seleção do grupo da empresa
- **Título:** Nome da tela
- **Relatório Power BI:** Seleção do relatório a ser exibido
- **Ícone:** Seleção de ícone visual (12 opções disponíveis)
- **Tela Ativa:** Checkbox para ativar/desativar
- **Tela Inicial:** Checkbox para definir como tela padrão
- **Usuários com Acesso:** Lista de usuários com permissão específica (opcional)

### Status dos Recursos

#### Status Possíveis:
- **Atualizado (Verde):** Última atualização bem-sucedida há menos de 24 horas
- **Desatualizado (Amarelo):** Sem atualização há mais de 24 horas
- **Falhou (Vermelho):** Última atualização falhou
- **Atualizando (Azul):** Atualização em andamento
- **Desconhecido (Cinza):** Status não identificado

### APIs Utilizadas

- `GET /api/powerbi/datasets/status?group_id={groupId}` - Busca status dos datasets
- `GET /api/powerbi/dataflows/status?group_id={groupId}` - Busca status dos dataflows
- `GET /api/powerbi/health` - Busca métricas gerais de saúde
- `POST /api/powerbi/refresh` - Dispara atualização manual
- `GET /api/powerbi/refresh?dataset_id={id}&connection_id={id}` - Busca histórico de atualizações
- `GET /api/powerbi/reports?group_id={groupId}` - Lista relatórios do grupo
- `GET /api/user/groups` - Lista grupos do usuário
- `GET /api/dev/groups/{groupId}/users` - Lista usuários do grupo
- `POST /api/dev/groups/{groupId}/screens` - Cria nova tela

### Comportamento

1. **Carregamento Inicial:**
   - Verifica permissões do usuário
   - Carrega dados do grupo ativo
   - Busca métricas de saúde

2. **Atualização Automática:**
   - Dados são atualizados quando o grupo ativo muda
   - Botão "Atualizar" recarrega todos os dados

3. **Atualização Manual:**
   - Ao clicar em "Atualizar" em um dataset, dispara refresh no Power BI
   - Aguarda 2 segundos e recarrega os dados
   - Status é atualizado em tempo real

---

## Ordem de Atualização

**URL:** `/powerbi/ordem-atualizacao`

### Descrição
Página para configurar a ordem sequencial de atualização de datasets e dataflows do Power BI. Permite definir a sequência, agendar atualizações automáticas e executar atualizações manuais em ordem.

### Permissões
- **Acesso:** Apenas usuários com perfil `master`, `developer` ou `admin`
- **Filtro:** Configuração é específica para cada grupo

### Funcionalidades Principais

#### 1. Lista de Itens Ordenados
Exibe todos os datasets e dataflows do grupo em ordem de atualização:
- **Número de Ordem:** Indicador visual da posição (1, 2, 3...)
- **Tipo:** Badge indicando "Modelo Semântico" ou "Fluxo de Dados"
- **Nome:** Nome do recurso
- **ID:** ID do dataset ou dataflow (formato monoespaçado)
- **Status:** Ícone indicando estado atual (idle, refreshing, success, error)

#### 2. Drag and Drop
- **Arrastar e Soltar:** Permite reorganizar a ordem dos itens
- **Feedback Visual:** Item sendo arrastado fica semi-transparente
- **Indicador de Mudanças:** Botão "Salvar Ordem" fica habilitado após alterações

#### 3. Ações por Item
Cada item possui 3 botões de ação:
- **Agendar (Relógio):** Abre modal para configurar agendamento automático
  - Verde se já possui agendamento configurado
  - Cinza se não possui agendamento
- **Atualizar Agora (Play):** Dispara atualização manual do item
  - Mostra spinner durante atualização
  - Aguarda conclusão (polling a cada 5 segundos, máximo 10 minutos)
- **Remover (Lixeira):** Remove o item da lista de atualização

#### 4. Botões Principais
- **Atualizar Todos:** Executa atualização sequencial de todos os itens na ordem definida
  - Processa um item por vez
  - Continua mesmo se algum item falhar
  - Mostra progresso em tempo real
- **Salvar Ordem:** Salva a ordem atual dos itens
  - Desabilitado se não houver mudanças
  - Persiste a configuração no banco de dados

#### 5. Modal de Agendamento
Ao clicar no botão de agendamento, permite configurar:
- **Ativar Agendamento:** Toggle para habilitar/desabilitar
- **Dias da Semana:** Seleção de dias (Dom, Seg, Ter, Qua, Qui, Sex, Sáb)
- **Horários:** Múltiplos horários podem ser configurados
  - Adicionar novos horários
  - Remover horários existentes
  - Formato: HH:MM (24 horas)

#### 6. Painel Lateral de Detalhes
Ao clicar em um item, abre painel lateral com:
- **Informações Básicas:**
  - Nome do recurso
  - Tipo (Dataflow ou Dataset)
  - ID completo
  - Nome da conexão
- **Agendamento Power BI:**
  - Status (Ativo/Inativo)
  - Horários configurados
  - Dias da semana
  - Fuso horário
- **Histórico de Atualização:**
  - Últimas 3 atualizações
  - Status de cada atualização
  - Data/hora de início e fim
  - Tipo de atualização (Manual/Automática)
- **Informações Adicionais:**
  - Configurado por
  - Data de criação
  - Data de modificação
  - Se é atualizável

### Fluxo de Atualização

1. **Atualização Individual:**
   - Dispara refresh via API do Power BI
   - Inicia polling a cada 5 segundos
   - Aguarda status "Completed" ou "Success"
   - Timeout de 10 minutos
   - Atualiza status visual em tempo real

2. **Atualização Sequencial (Todos):**
   - Processa itens na ordem definida
   - Aguarda conclusão de cada item antes do próximo
   - Continua mesmo se algum falhar
   - Mostra progresso individual

### APIs Utilizadas

- `GET /api/powerbi/refresh-order?group_id={groupId}` - Busca ordem configurada
- `POST /api/powerbi/refresh-order` - Salva ordem de atualização
- `GET /api/powerbi/refresh-schedules?group_id={groupId}` - Busca agendamentos
- `POST /api/powerbi/refresh-schedules` - Salva agendamento
- `POST /api/powerbi/refresh` - Dispara atualização
- `GET /api/powerbi/refresh?dataset_id={id}&connection_id={id}` - Verifica status
- `GET /api/powerbi/refresh?dataflow_id={id}&connection_id={id}` - Verifica status
- `GET /api/powerbi/item-details?type={type}&id={id}&connection_id={id}` - Busca detalhes

### Estrutura de Dados

#### RefreshItem
```typescript
{
  id: string;
  name: string;
  type: 'dataset' | 'dataflow';
  dataset_id?: string;
  dataflow_id?: string;
  connection_id?: string;
  order: number;
  status?: 'idle' | 'refreshing' | 'success' | 'error';
  lastRefresh?: string;
  errorMessage?: string;
}
```

#### Schedule
```typescript
{
  enabled: boolean;
  times: string[]; // ['06:00', '18:00']
  days: number[]; // [1, 2, 3, 4, 5] (Seg-Sex)
}
```

### Comportamento

1. **Carregamento Inicial:**
   - Verifica permissões
   - Carrega ordem configurada do grupo
   - Se não houver ordem, busca datasets e dataflows automaticamente
   - Carrega agendamentos existentes

2. **Ordem Padrão:**
   - Se não houver ordem configurada, lista:
     1. Dataflows primeiro (ordem por `refresh_order` se existir)
     2. Datasets depois (ordem alfabética)

3. **Persistência:**
   - Ordem é salva na tabela `powerbi_refresh_order`
   - Agendamentos são salvos na tabela `powerbi_refresh_schedules`
   - Configuração é específica por grupo

4. **Validação:**
   - Não permite salvar ordem vazia
   - Valida que todos os itens têm `connection_id`
   - Verifica permissões antes de salvar

### Casos de Uso

1. **Configurar Ordem de Dependências:**
   - Dataflows devem atualizar antes dos datasets que dependem deles
   - Organize na ordem correta de dependências

2. **Agendamento Automático:**
   - Configure horários de atualização automática
   - Múltiplos horários por dia são suportados
   - Diferentes dias da semana podem ter diferentes horários

3. **Atualização Manual em Lote:**
   - Use "Atualizar Todos" para executar atualização completa
   - Útil após manutenções ou correções

4. **Monitoramento:**
   - Use o painel de detalhes para verificar status
   - Histórico mostra últimas atualizações
   - Agendamento do Power BI é exibido separadamente

### Observações Importantes

- **Tempo de Atualização:** Atualizações podem levar de segundos a vários minutos
- **Timeout:** Atualizações individuais têm timeout de 10 minutos
- **Falhas:** Se um item falhar, a atualização sequencial continua com os próximos
- **Agendamento:** Agendamentos são executados pelo sistema de cron jobs (não pela interface)
- **Permissões:** Usuários só veem itens dos grupos aos quais têm acesso

---

## Melhorias Futuras Sugeridas

1. **Dashboard:**
   - Notificações em tempo real de atualizações
   - Gráficos de histórico de saúde
   - Exportação de relatórios de status

2. **Ordem de Atualização:**
   - Validação de dependências entre itens
   - Visualização de grafo de dependências
   - Logs detalhados de execução
   - Notificações de falhas por email

---

**Última atualização:** Janeiro 2025
