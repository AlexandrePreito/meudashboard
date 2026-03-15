# Documentação: Usuários e Configuração de Telas (Acesso, RLS)

Este documento descreve a gestão de usuários, o controle de acesso a telas e páginas do Power BI, e a configuração de **Row-Level Security (RLS)** no MeuDashboard.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Página de usuários (Developer)](#2-página-de-usuários-developer)
3. [Modal "Configurar Telas"](#3-modal-configurar-telas)
4. [Acesso no player (usuário final)](#4-acesso-no-player-usuário-final)
5. [RLS: conceitos e fluxo](#5-rls-conceitos-e-fluxo)
6. [Tabelas e APIs de referência](#6-tabelas-e-apis-de-referência)

---

## 1. Visão geral

### Papéis e permissões

| Papel        | Onde atua | O que configura |
|-------------|------------|------------------|
| **Master**  | Sistema todo | Qualquer grupo; não precisa de `developer_id`. |
| **Developer** | Grupos vinculados ao seu `developer_id` | Usuários, telas, acesso, RLS, apresentação, integração. |
| **Admin / Viewer / User** | Grupo em que está | Apenas consumo: vê telas e relatórios conforme configurado. |

Usuários finais pertencem a um **grupo** (`company_group`) e têm **telas** (relatórios Power BI) disponíveis. O developer define:

- **Quais telas** o usuário pode acessar.
- **Quais páginas** de cada relatório o usuário pode ver (controle fino por página).
- **Ordem** das telas para esse usuário.
- **Modo apresentação (TV)**: quais páginas e por quanto tempo.
- **RLS**: segurança por linha no Power BI (por tela e por filtros dinâmicos: Filial, Região, Vendedor, etc.).

---

## 2. Página de usuários (Developer)

**Rota:** `/dev/usuarios`

**O que faz:**

- Lista usuários do developer (ou todos, se master).
- Permite criar, editar e excluir usuários do grupo.
- Para cada usuário: **Editar** (dados, grupo, role, ativo, IA, refresh) e **Configurar Telas** (abre o modal unificado).

### Dados do usuário (edição)

- Email, nome, senha (opcional na edição).
- Grupo (company_group).
- Role: `admin`, `viewer`, `user`, `developer`, `master`.
- Ativo / inativo.
- Permissões: **Usar IA** (`can_use_ai`), **Atualizar dados** (`can_refresh`).

### Botão "Configurar Telas"

Abre o **ScreenConfigModal** com o usuário selecionado. Todas as configurações de telas, acesso, ordem, apresentação, RLS e integração são feitas nesse modal.

---

## 3. Modal "Configurar Telas"

**Componente:** `app/dev/usuarios/ScreenConfigModal.tsx`

**Props:** `userId`, `groupId`, `userName`, `userEmail`, `onClose`, `onSaved`.

O modal tem **5 abas**:

---

### 3.1 Aba **Acesso**

Define **quais telas** o usuário pode ver e **quais páginas** de cada relatório estão liberadas.

- **Nível 1 – Telas:** checkboxes por tela do grupo. Sem configuração explícita, o usuário tem acesso a **todas** as telas do grupo.
- **Nível 2 – Páginas:** ao expandir uma tela, carrega as páginas do relatório Power BI e permite marcar/desmarcar cada página. Só páginas permitidas aparecem no player para esse usuário.

**Salvar:**

1. `POST /api/powerbi/screens/set-user-screens` — envia a lista de `screen_ids` permitidos.
2. Para cada tela expandida com configuração de páginas: `POST /api/dev/users/page-access` — envia `user_id`, `screen_id`, `group_id`, `pages` (array com `page_name`, `display_name`, `is_allowed`).

**Regra:** Se não houver registros em `user_screen_page_access` para aquele usuário/tela, o sistema trata como **todas as páginas permitidas**.

---

### 3.2 Aba **Ordem**

Define a **ordem das telas** para esse usuário (ex.: ordem no dashboard ou na navegação).

- Lista com drag-and-drop.
- Salva via `POST /api/dev/users/screen-order` com `user_id`, `group_id`, `screens` (array com `screen_id`, `display_order`).

---

### 3.3 Aba **Apresentação**

Configura o **modo TV/apresentação** para uma tela escolhida:

- Tela (select).
- **Modo apresentação** (toggle).
- Por página: habilitar/desabilitar, ordem de exibição, duração em segundos.

Salva em `POST /api/dev/users/presentation` com `user_id`, `group_id`, `screen_id`, `presentation_mode`, `pages` (com `page_name`, `is_enabled`, `display_order`, `duration_seconds`).

No player, ao iniciar a apresentação, as páginas são filtradas também pelas **páginas permitidas** (aba Acesso).

---

### 3.4 Aba **RLS**

Configurações de **Row-Level Security** em duas partes:

#### A) RLS por tela (Power BI Embed)

- **Tela:** escolhe a tela.
- **Ativar RLS:** sim/não.
- **Nome da role:** nome da role RLS configurada no Power BI Desktop (ex.: `RLS_Email`).

Quando ativo, o token de embed é gerado com **identities** usando o e-mail do usuário logado. O Power BI aplica as regras RLS com base nesse usuário.

Salva em `POST /api/dev/screens/rls` (campos na tabela `powerbi_dashboard_screens`: `rls_enabled`, `rls_role_name`).

#### B) Filtros de acesso (RLS dinâmicos)

Permite definir **filtros por tipo** (ex.: Filial, Região, Vendedor) e os **valores** que esse usuário pode ver. Esses dados são consumidos pelo Power BI (tabela RLS, função RPC, etc.).

- Cada filtro tem um **nome** (ex.: Filial, Regiao) e uma lista de **valores** (ex.: 01, 02, SUL).
- É possível adicionar vários tipos e vários valores por tipo.
- O nome do filtro deve corresponder à coluna na tabela RLS do modelo Power BI.

Salva em `POST /api/dev/users/rls-companies` com `user_id`, `group_id`, `user_email`, `filters` (objeto `{ "Filial": ["01","02"], "Regiao": ["SUL"] }`).

---

### 3.5 Aba **Integração**

Gera a **chave de API** do grupo e o **código M (Power Query)** para o Power BI Desktop consumir os dados RLS via Supabase RPC.

- **Chave de API:** gerar, regenerar, ativar/desativar, copiar.
- **Código M:** chama a RPC `get_rls_data` no Supabase passando a chave; retorna tabela com colunas **Email**, **Tipo_Filtro**, **Valor_Filtro** para o developer criar relacionamentos e regras RLS no modelo.

O botão **Salvar** do modal não aparece nesta aba (apenas configuração de integração).

---

## 4. Acesso no player (usuário final)

**Rota:** `/tela/[id]` — página onde o relatório Power BI é exibido.

### 4.1 Telas permitidas

- O usuário só obtém embed token para telas em que tem acesso (lista de `screen_ids` definida na aba Acesso).
- Se tentar acessar uma tela sem permissão, a API de embed pode retornar 403; o sistema pode redirecionar para a primeira tela da ordem do usuário.

### 4.2 Páginas permitidas

Após o relatório carregar (`loaded`):

1. O player chama `GET /api/user/page-access?screen_id={id}` (usuário logado).
2. Se a resposta tiver `has_custom_config: true` e `allowed_pages` não vazio:
   - A navegação nativa do Power BI é ocultada (`pageNavigation: { visible: false }`).
   - É exibida uma **barra de navegação customizada** apenas com as páginas permitidas.
   - Se a página ativa não estiver permitida, o relatório navega para a primeira página permitida.
3. Se não houver restrição (`has_custom_config: false` ou `allowed_pages` vazio), o comportamento padrão do relatório é mantido.

### 4.3 Modo apresentação (TV)

Ao iniciar a apresentação, o player:

- Obtém as páginas do relatório e a configuração salva de apresentação.
- Chama novamente `/api/user/page-access?screen_id={id}` e **filtra** as páginas da apresentação pelas páginas permitidas para esse usuário.
- Só exibe no ciclo de apresentação as páginas que estão permitidas e habilitadas na config de apresentação.

---

## 5. RLS: conceitos e fluxo

### 5.1 RLS no embed (por tela)

- Na tabela `powerbi_dashboard_screens`: `rls_enabled`, `rls_role_name`.
- Na geração do token (`/api/powerbi/embed`): se a tela tiver RLS ativo e houver `dataset_id`, o token é gerado com `identities` usando o **e-mail do usuário logado** e a role configurada.
- O Power BI aplica as regras RLS do modelo (ex.: `[Email] = USERPRINCIPALNAME()`) com base nessa identidade.

### 5.2 RLS dinâmicos (filtros: Filial, Região, etc.)

- Os valores por usuário ficam na tabela **`rls_user_companies`**: `user_id`, `company_group_id`, `user_email`, `company_code` (valor do filtro), `filter_type` (ex.: Filial, Regiao, Vendedor).
- A função RPC **`get_rls_data`** no Supabase retorna esses dados (por exemplo `user_email`, `filter_type`, `filter_value`) usando a **chave de API** do grupo.
- No Power BI Desktop, o developer usa o **código M** da aba Integração para importar essa tabela, criar colunas/relacionamentos e regras RLS (ex.: filtrar por `Tipo_Filtro` e `Valor_Filtro`).
- Assim, o mesmo modelo pode ter vários tipos de filtro (filial, região, vendedor) e o usuário vê apenas as linhas permitidas conforme configurado no modal RLS.

### 5.3 Resumo do fluxo RLS

1. Developer configura na aba RLS: por tela (role no embed) e filtros dinâmicos (tipos e valores por usuário).
2. Dados dinâmicos ficam em `rls_user_companies` e são expostos via `get_rls_data(p_api_key)`.
3. Power BI Desktop importa via código M, monta o modelo e as regras RLS.
4. No navegador, o usuário abre a tela; o embed envia identidade (e-mail) quando a tela tem RLS ativo; o Power BI aplica as regras e mostra apenas os dados permitidos.

---

## 6. Tabelas e APIs de referência

### Tabelas principais (Supabase)

| Tabela | Uso |
|--------|-----|
| `user_screen_page_access` | Acesso por página: `user_id`, `screen_id`, `company_group_id`, `page_name`, `display_name`, `is_allowed`. Sem registros = todas as páginas permitidas. |
| `rls_user_companies` | Filtros RLS por usuário: `user_id`, `company_group_id`, `user_email`, `company_code`, `filter_type`. |
| `powerbi_dashboard_screens` | Por tela: `rls_enabled`, `rls_role_name` (e demais campos da tela). |
| `rls_api_keys` | Uma chave por grupo para a RPC `get_rls_data`. |

### APIs – Developer (autenticado + developer ou master)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/api/dev/users/page-access?user_id=&screen_id=&group_id=` | Listar páginas configuradas para um usuário numa tela. |
| POST | `/api/dev/users/page-access` | Salvar acesso por página (`user_id`, `screen_id`, `group_id`, `pages`). |
| GET | `/api/dev/users/rls-companies?user_id=&group_id=` | Listar filtros RLS do usuário (`filters`: `{ "Filial": ["01","02"], ... }`). |
| POST | `/api/dev/users/rls-companies` | Salvar filtros RLS (`user_id`, `group_id`, `user_email`, `filters`). |
| GET/POST | `/api/dev/screens/rls` | Ler/gravar RLS da tela (`rls_enabled`, `rls_role_name`). |
| GET/POST | `/api/dev/rls-api-key` | Gerar/gerenciar chave de API do grupo (Integração). |
| POST | `/api/powerbi/screens/set-user-screens` | Definir telas do usuário (`group_id`, `user_id`, `screen_ids`). |
| GET | `/api/powerbi/screens/user-screen-ids?group_id=&user_id=` | Listar IDs das telas com acesso. Vazio = todas. |

### APIs – Usuário logado (player)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/api/user/page-access?screen_id=` | Páginas permitidas na tela para o usuário atual. Retorno: `has_custom_config`, `allowed_pages`. |
| GET | `/api/user/presentation?group_id=&screen_id=` | Configuração de apresentação (modo TV) para o usuário. |

### Integração Power BI (público / código M)

- **RPC Supabase:** `get_rls_data(p_api_key)` — retorna linhas com `user_email`, `filter_type`, `filter_value` para o grupo dono da chave.
- O código M (aba Integração) chama essa RPC e monta a tabela com colunas **Email**, **Tipo_Filtro**, **Valor_Filtro** para uso no modelo e RLS.

---

*Documento gerado para o MeuDashboard — foco em usuários, configuração de telas, acesso por página e RLS.*
