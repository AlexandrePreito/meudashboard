# MeuDashboard - Documentação do Sistema

## Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Anthropic Claude AI
- Power BI Embedded
- Evolution API (WhatsApp)

## Estrutura de Pastas
- /src/components - Componentes React
- /src/lib - Configurações (Supabase, Auth, etc)
- /src/hooks - Hooks customizados
- /src/types - Tipagens TypeScript
- /src/services - Chamadas de API
- /src/contexts - Contextos React (Auth, Theme)
- /app - Rotas Next.js (App Router)
- /app/api - API Routes

## Banco de Dados (Supabase)

### Tabelas Principais
1. users - Usuários do sistema
2. company_groups - Grupos de empresas (multi-tenant)
3. companies - Empresas
4. user_group_membership - Vínculo usuário-grupo
5. powerbi_connections - Conexões Power BI
6. powerbi_reports - Relatórios Power BI
7. powerbi_dashboard_screens - Telas do dashboard
8. ai_conversations - Conversas com IA
9. ai_messages - Mensagens da IA
10. whatsapp_instances - Instâncias WhatsApp

## Autenticação
- JWT com cookies httpOnly
- Verificação via Supabase RPC
- Middleware de proteção de rotas

## Integrações
- Power BI: OAuth 2.0 Client Credentials
- Claude AI: claude-sonnet-4-20250514
- WhatsApp: Evolution API

## Commits Importantes
- feat: projeto inicial Next.js criado
- feat: estrutura de pastas e configuração Supabase
- feat: layout principal com Sidebar, Header e página inicial

---
Última atualização: Janeiro 2025

