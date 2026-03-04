'use client';

import { useEffect, useState, type ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useMenu, type CompanyGroup } from '@/contexts/MenuContext';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Shield,
  Key,
  Users,
  Settings,
  AlertTriangle,
  Lightbulb,
  Link as LinkIcon,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Loader2,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

/* ─────────────────── types ─────────────────── */

interface StepItem {
  icon: any;
  color: string;
  title: string;
  subtitle: string;
  content: ReactNode;
}

interface FAQItem {
  question: string;
  answer: string;
}

/* ─────────────────── constants ─────────────────── */

const TOTAL_STEPS = 6;

const faqs: FAQItem[] = [
  {
    question: 'Minha conta do Power BI é gratuita, consigo usar?',
    answer: 'Contas gratuitas geralmente não têm acesso ao Portal de Administração do Power BI. Você precisa que alguém com papel de Administrador do Fabric ou Administrador Global do Microsoft 365 habilite as permissões. Acesse admin.microsoft.com para verificar ou peça ao admin da sua organização.'
  },
  {
    question: 'Não encontro "Configurações de locatário" no Portal de Admin',
    answer: 'Essa opção só aparece para administradores. Acesse admin.microsoft.com → Usuários → Usuários ativos → clique no seu nome → Gerenciar funções → ative "Administrador do Fabric". Depois acesse novamente o Portal de Admin do Power BI.'
  },
  {
    question: 'Preciso criar um Grupo de Segurança?',
    answer: 'Sim. A Microsoft recomenda usar grupos de segurança para controlar quais aplicativos têm acesso às APIs do Power BI. Sem ele, a configuração pode não funcionar corretamente.'
  },
  {
    question: 'Criei a conexão mas não aparece na tabela',
    answer: 'Verifique se selecionou o grupo correto ao criar a conexão. Se selecionou "Compartilhada", a conexão aparece para todos os grupos. Se selecionou um grupo específico, só aparece quando aquele grupo está selecionado no menu superior. Tente recarregar a página.'
  },
  {
    question: 'Posso usar o mesmo app Azure para vários workspaces?',
    answer: 'Sim! Crie uma conexão diferente para cada workspace, mas pode usar o mesmo Tenant ID, Client ID e Client Secret. Só mude o Workspace ID.'
  },
  {
    question: 'O Client Secret expirou, o que faço?',
    answer: 'Acesse o portal do Azure, vá até o registro do seu aplicativo, clique em "Certificados e segredos", crie um novo segredo e atualize na conexão do MeuDashboard.'
  },
  {
    question: 'O que é Tenant ID?',
    answer: 'É o identificador único da sua organização no Azure/Microsoft 365. Você encontra no portal do Azure em Microsoft Entra ID → Visão Geral, campo "ID do diretório (locatário)".'
  },
  {
    question: 'O Workspace ID é o mesmo que Group ID?',
    answer: 'Sim! No Power BI, "workspace" e "group" são a mesma coisa. O ID que aparece na URL do workspace é o que você precisa.'
  }
];

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ─────────────────── small UI pieces ─────────────────── */

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50/50 border border-amber-200/70 rounded-2xl mt-5 shadow-sm">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100/80 flex items-center justify-center">
        <Lightbulb size={18} className="text-amber-600" />
      </div>
      <p className="text-[13px] leading-relaxed text-amber-900">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 p-4 bg-gradient-to-br from-red-50 to-rose-50/50 border border-red-200/70 rounded-2xl mt-5 shadow-sm">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-100/80 flex items-center justify-center">
        <AlertTriangle size={18} className="text-red-600" />
      </div>
      <p className="text-[13px] leading-relaxed text-red-900">{children}</p>
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/70 rounded-2xl shadow-sm">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100/80 flex items-center justify-center">
        <HelpCircle size={18} className="text-blue-600" />
      </div>
      <p className="text-[13px] leading-relaxed text-blue-900">{children}</p>
    </div>
  );
}

function ExtLink({ href, children, outline, powerbi }: { href: string; children: ReactNode; outline?: boolean; powerbi?: boolean }) {
  const baseClasses = 'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200';
  const variantClasses = powerbi
    ? 'bg-[#F2C811] hover:bg-[#e6b80a] text-gray-900 shadow-md hover:shadow-lg hover:-translate-y-0.5'
    : outline
      ? 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${baseClasses} ${variantClasses}`}>
      {children}
      <ExternalLink size={14} />
    </a>
  );
}

const stepColors: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  pink: 'bg-pink-50 text-pink-600 border-pink-100',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
};

function SubStep({ n, color, children }: { n: number; color: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 p-4 bg-white/90 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-200/80 transition-all duration-200">
      <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold flex-shrink-0 border-2 shadow-sm ${stepColors[color] || stepColors.blue}`}>
        {n}
      </div>
      <div className="text-[13.5px] text-gray-700 leading-relaxed flex-1">{children}</div>
    </div>
  );
}

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl shadow-inner">
      <code className="text-[13px] text-slate-700 font-mono break-all">{text}</code>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 flex-shrink-0 transition-all shadow-sm"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
}

/* ─────────────────── main component ─────────────────── */

function TutorialContent() {
  const { groups: menuGroups, developer, user, loadGroups } = useMenu();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Form — only last step
  const [connectionName, setConnectionName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<CompanyGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const isDeveloper = !!user?.is_developer || !!developer?.id;

  // Auto-complete current step when advancing
  function goToStep(step: number) {
    if (step >= 0 && step < TOTAL_STEPS) {
      if (step > currentStep) {
        setCompletedSteps(prev => {
          const next = new Set(prev);
          next.add(currentStep);
          return next;
        });
      }
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Load groups for connection form
  useEffect(() => {
    async function load() {
      if (menuGroups.length > 0) {
        setAvailableGroups(menuGroups);
        return;
      }
      setGroupsLoading(true);
      try {
        await loadGroups();
        const resp = await fetch('/api/user/groups');
        if (resp.ok) {
          const data = await resp.json();
          setAvailableGroups((data.groups || []) as CompanyGroup[]);
        }
      } catch { /* silent */ } finally {
        setGroupsLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuGroups]);

  // Create connection
  async function handleCreate() {
    setCreateError('');
    if (!connectionName.trim()) return setCreateError('Informe o nome da conexão.');
    if (!tenantId.trim() || !clientId.trim() || !clientSecret.trim() || !workspaceId.trim())
      return setCreateError('Preencha todos os campos.');
    if (!uuidRegex.test(tenantId.trim())) return setCreateError('Tenant ID inválido — use o formato UUID.');
    if (!uuidRegex.test(clientId.trim())) return setCreateError('Client ID inválido — use o formato UUID.');
    if (!uuidRegex.test(workspaceId.trim())) return setCreateError('Workspace ID inválido — use o formato UUID.');
    if (!selectedGroupId) return setCreateError('Selecione um grupo.');

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: connectionName.trim(),
        tenant_id: tenantId.trim(),
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        workspace_id: workspaceId.trim(),
        show_page_navigation: true,
      };
      if (selectedGroupId === 'shared') {
        body.company_group_id = null;
        body.developer_id = developer?.id || null;
      } else {
        body.company_group_id = selectedGroupId;
      }

      const res = await fetch('/api/powerbi/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setCreateError(data.error || 'Não foi possível criar a conexão.');

      setCreateSuccess(true);
      setCompletedSteps(prev => { const n = new Set(prev); n.add(currentStep); return n; });
    } catch {
      setCreateError('Erro inesperado. Tente novamente.');
    } finally {
      setCreating(false);
    }
  }

  /* ─── Steps ─── */

  const steps: StepItem[] = [
    // 1 — Registrar App
    {
      icon: Shield,
      color: 'blue',
      title: 'Registrar Aplicativo no Azure',
      subtitle: 'Crie um app no portal do Azure',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            O primeiro passo é criar um <strong>registro de aplicativo</strong> no Azure.
            Ele gera as credenciais que o MeuDashboard usará para acessar seus relatórios.
          </p>

          <ExtLink href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade">
            Abrir Portal do Azure
          </ExtLink>

          <div className="space-y-3">
            <SubStep n={1} color="blue">
              Na barra superior do Azure, busque por <strong>"Registros de aplicativo"</strong> e abra a página.
            </SubStep>
            <SubStep n={2} color="blue">
              Clique em <strong>"+ Novo registro"</strong>.
            </SubStep>
            <SubStep n={3} color="blue">
              <div className="space-y-1.5">
                <p><strong>Nome:</strong> MeuDashboard</p>
                <p><strong>Tipo de conta:</strong> Somente locatário único <span className="text-gray-400">(primeira opção, já vem selecionada)</span></p>
                <p><strong>URI de Redirecionamento:</strong> Deixe em branco</p>
              </div>
            </SubStep>
            <SubStep n={4} color="blue">
              Clique em <strong>"Registrar"</strong>. Você será levado para a página de Visão Geral.
            </SubStep>
          </div>

          {/* Visual do Azure */}
          <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200/80 rounded-2xl shadow-sm">
            <p className="text-sm font-semibold text-slate-800 mb-4">Na tela de Visão Geral você verá:</p>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Nome de exibição</span>
                <span className="font-mono text-slate-800 font-medium">MeuDashboard</span>
              </div>
              <div className="flex justify-between gap-4 bg-blue-50/80 border-2 border-blue-200 rounded-xl px-4 py-3">
                <span className="text-slate-600">ID do aplicativo (cliente)</span>
                <span className="font-mono text-blue-700 font-semibold">← Client ID</span>
              </div>
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">ID do Objeto</span>
                <span className="text-slate-400 text-xs">não precisa copiar</span>
              </div>
              <div className="flex justify-between gap-4 bg-purple-50/80 border-2 border-purple-200 rounded-xl px-4 py-3">
                <span className="text-slate-600">ID do diretório (locatário)</span>
                <span className="font-mono text-purple-700 font-semibold">← Tenant ID</span>
              </div>
            </div>
          </div>

          <Tip>
            Guarde o <strong>Client ID</strong> e o <strong>Tenant ID</strong> — você vai usá-los no último passo.
            Essa tela pode ser acessada depois em Registros de aplicativo → seu app.
          </Tip>
        </div>
      ),
    },

    // 2 — Client Secret
    {
      icon: Key,
      color: 'emerald',
      title: 'Criar o Client Secret (Senha)',
      subtitle: 'Gere a senha do aplicativo',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Ainda no seu aplicativo no Azure, vamos gerar uma <strong>senha</strong> que o MeuDashboard usará para autenticar.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="emerald">
              No menu lateral esquerdo do aplicativo, clique em <strong>"Certificados e segredos"</strong>.
            </SubStep>
            <SubStep n={2} color="emerald">
              Na aba "Segredos do cliente", clique em <strong>"+ Novo segredo do cliente"</strong>.
            </SubStep>
            <SubStep n={3} color="emerald">
              <div className="space-y-1.5">
                <p><strong>Descrição:</strong> MeuDashboard</p>
                <p><strong>Validade:</strong> 730 dias / 24 meses <span className="text-gray-400">(recomendado)</span></p>
              </div>
            </SubStep>
            <SubStep n={4} color="emerald">
              Clique em <strong>"Adicionar"</strong>.
            </SubStep>
            <SubStep n={5} color="emerald">
              <strong>Copie imediatamente</strong> o conteúdo da coluna <strong>"Valor"</strong>. Este é o seu <strong>Client Secret</strong>.
            </SubStep>
          </div>

          <Tip>
            Não confunda <strong>"Valor"</strong> com <strong>"ID secreto"</strong> que aparece ao lado.
            O que você precisa é a coluna <strong>"Valor"</strong>.
          </Tip>
        </div>
      ),
    },

    // 3 — Grupo de Segurança
    {
      icon: Users,
      color: 'indigo',
      title: 'Criar Grupo de Segurança',
      subtitle: 'Adicione o app a um grupo no Azure',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            O Power BI exige que o aplicativo esteja num <strong>Grupo de Segurança</strong> para conceder permissões.
          </p>

          <ExtLink href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupsManagementMenuBlade/AllGroups">
            Abrir Grupos no Azure
          </ExtLink>

          <div className="space-y-3">
            <SubStep n={1} color="indigo">
              No Azure, pesquise por <strong>"Grupos"</strong> na barra superior.
            </SubStep>
            <SubStep n={2} color="indigo">
              Clique em <strong>"+ Novo grupo"</strong>.
            </SubStep>
            <SubStep n={3} color="indigo">
              <div className="space-y-1.5">
                <p><strong>Tipo de grupo:</strong> Segurança</p>
                <p><strong>Nome:</strong> MeuDashboard Service Principals</p>
                <p><strong>Descrição:</strong> Grupo para acesso ao Power BI via Service Principal</p>
              </div>
            </SubStep>
            <SubStep n={4} color="indigo">
              Em <strong>"Membros"</strong>, clique em <strong>"Adicionar membros"</strong>.
            </SubStep>
            <SubStep n={5} color="indigo">
              Pesquise por <strong>"MeuDashboard"</strong> (nome do app do Passo 1), selecione e confirme.
            </SubStep>
            <SubStep n={6} color="indigo">
              Clique em <strong>"Criar"</strong>.
            </SubStep>
          </div>

          <Tip>Anote o nome do grupo — você vai precisar dele no próximo passo.</Tip>
        </div>
      ),
    },

    // 4 — Habilitar no Power BI
    {
      icon: Settings,
      color: 'orange',
      title: 'Habilitar no Power BI Admin',
      subtitle: 'Autorize o app a usar as APIs do Power BI',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Agora precisamos <strong>autorizar</strong> o Power BI a aceitar conexões do seu aplicativo.
          </p>

          <ExtLink href="https://app.powerbi.com/admin-portal/tenantSettings" powerbi>
            Abrir Portal de Admin do Power BI
          </ExtLink>

          {/* Troubleshooting */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-200/80 rounded-2xl shadow-sm">
            <p className="text-sm font-bold text-amber-900 mb-2">
              Não apareceu "Configurações de locatário"?
            </p>
            <p className="text-[13px] text-amber-800 leading-relaxed">
              Se você só vê "Configurações de capacidade" e <strong>não aparece</strong> "Configurações de locatário"
              no menu lateral, sua conta não tem permissão de Administrador.
            </p>
            <p className="text-[13px] text-amber-700 mt-2 leading-relaxed">
              Para resolver: acesse <strong>admin.microsoft.com</strong> → Usuários → Usuários ativos →
              clique no seu nome → Gerenciar funções → ative <strong>"Administrador do Fabric"</strong>.
            </p>
            <div className="mt-4">
              <ExtLink href="https://admin.microsoft.com" outline>
                Abrir Microsoft 365 Admin
              </ExtLink>
            </div>
          </div>

          <div className="space-y-3">
            <SubStep n={1} color="orange">
              No menu lateral, clique em <strong>"Configurações de locatário"</strong>.
            </SubStep>
            <SubStep n={2} color="orange">
              <div>
                <p>Use <strong>Ctrl+F</strong> (ou Cmd+F no Mac) e pesquise por:</p>
                <div className="mt-2">
                  <CopyBox text="Os principais serviços podem chamar as APIs públicas do Fabric" />
                </div>
              </div>
            </SubStep>
            <SubStep n={3} color="orange">
              Clique na opção para expandir e ative o toggle para <strong>"Habilitado"</strong>.
            </SubStep>
            <SubStep n={4} color="orange">
              <div>
                <p className="text-orange-700 font-medium">
                  Selecione "Grupos de segurança específicos" e adicione o grupo
                  <strong> "MeuDashboard Service Principals"</strong> do passo anterior.
                </p>
                <p className="text-gray-500 mt-1.5 text-xs">
                  Não aplique para "Toda a organização" — use o grupo para maior controle.
                </p>
              </div>
            </SubStep>
            <SubStep n={5} color="orange">
              Clique em <strong>"Aplicar"</strong>.
            </SubStep>
          </div>

          <Tip>As mudanças podem levar alguns minutos para entrar em vigor.</Tip>
        </div>
      ),
    },

    // 5 — Workspace
    {
      icon: Users,
      color: 'pink',
      title: 'Adicionar App ao Workspace',
      subtitle: 'Dê acesso ao app no workspace do Power BI',
      content: (
        <div className="space-y-5">
          <InfoBox>
            <strong>Somente os workspaces</strong> em que você adicionar o aplicativo serão integrados.
            Se você tem relatórios em vários workspaces, repita este passo para cada um.
          </InfoBox>

          <ExtLink href="https://app.powerbi.com" powerbi>
            Abrir Power BI Service
          </ExtLink>

          <div className="space-y-3">
            <SubStep n={1} color="pink">
              Abra o <strong>workspace</strong> onde estão seus relatórios.
            </SubStep>
            <SubStep n={2} color="pink">
              Clique nos <strong>três pontinhos (⋯)</strong> do workspace → <strong>"Gerenciar acesso"</strong>.
            </SubStep>
            <SubStep n={3} color="pink">
              Clique em <strong>"+ Adicionar pessoas ou grupos"</strong>.
            </SubStep>
            <SubStep n={4} color="pink">
              Pesquise por <strong>"MeuDashboard"</strong> (nome do app do Passo 1) e selecione.
            </SubStep>
            <SubStep n={5} color="pink">
              Defina como <strong>"Membro"</strong> ou "Admin" e clique em <strong>"Adicionar"</strong>.
            </SubStep>
          </div>

          {/* Workspace ID */}
          <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50/50 border-2 border-pink-200/80 rounded-2xl shadow-sm">
            <p className="text-sm font-bold text-pink-800 mb-2">Como encontrar o Workspace ID?</p>
            <p className="text-[13px] text-pink-700 mb-3">
              Abra o workspace no Power BI e olhe a URL:
            </p>
            <div className="bg-white border-2 border-pink-100 rounded-xl px-4 py-3 font-mono text-[13px] text-slate-600 break-all shadow-inner">
              https://app.powerbi.com/groups/<strong className="text-pink-600">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</strong>/list
            </div>
            <p className="text-xs text-pink-600 mt-2">
              O trecho em destaque é o <strong>Workspace ID</strong>. Copie para o próximo passo.
            </p>
          </div>

          <Tip>
            O "Meu Workspace" pessoal <strong>não funciona</strong> com Service Principal.
            Use um workspace separado.
          </Tip>
        </div>
      ),
    },

    // 6 — Criar Conexão
    {
      icon: LinkIcon,
      color: 'cyan',
      title: 'Criar Conexão',
      subtitle: 'Preencha os dados e finalize',
      content: (
        <div className="space-y-5">
          {!createSuccess ? (
            <>
              <p className="text-gray-600 leading-relaxed">
                Preencha os dados que você coletou nos passos anteriores.
              </p>

              <div className="space-y-5">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Conexão</label>
                  <input
                    type="text"
                    value={connectionName}
                    onChange={e => setConnectionName(e.target.value)}
                    placeholder="Ex: Workspace Vendas"
                    className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                {/* Tenant ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tenant ID
                    <span className="font-normal text-slate-400 ml-1">(ID do diretório / locatário)</span>
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                {/* Client ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client ID
                    <span className="font-normal text-slate-400 ml-1">(ID do aplicativo / cliente)</span>
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                {/* Client Secret */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client Secret</label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder="Cole o valor do segredo"
                      className="w-full h-12 px-4 pr-12 border-2 border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Workspace ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Workspace ID</label>
                  <input
                    type="text"
                    value={workspaceId}
                    onChange={e => setWorkspaceId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                {/* Grupo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Grupo</label>
                  <select
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className="w-full h-12 px-4 border-2 border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all hover:bg-white"
                  >
                    <option value="">Selecione um grupo</option>
                    {isDeveloper && <option value="shared">Compartilhada (todos os grupos)</option>}
                    {availableGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {groupsLoading && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> Carregando...
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 h-14 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                >
                  {creating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  {creating ? 'Criando conexão...' : 'Criar Conexão'}
                </button>

                {createError && (
                  <p className="text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
                    {createError}
                  </p>
                )}
              </div>

              <Warning>
                Se a conexão falhar: (1) Verifique se os IDs estão corretos, (2) O Service Principal foi habilitado no Power BI (Passo 4),
                (3) O app foi adicionado como Membro do workspace (Passo 5), (4) Aguarde alguns minutos se acabou de configurar.
              </Warning>
            </>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl text-center shadow-inner">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
                <p className="text-xl font-bold text-emerald-900">Conexão criada com sucesso!</p>
                <p className="text-sm text-emerald-700 mt-2">
                  Agora você pode importar seus relatórios do Power BI.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/powerbi/conexoes"
                  className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
                  Ver minhas conexões
                </a>
                <a
                  href="/powerbi/relatorios"
                  className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all"
                >
                  Importar relatórios
                </a>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  /* ─── color maps ─── */

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };
  const dotColorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
  };

  const currentStepData = steps[currentStep];

  /* ─── render ─── */

  return (
    <div className="min-h-screen pb-16 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
      {/* Header */}
      <div className="mb-10">
        <a
          href="/powerbi/conexoes"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-5 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para Conexões
        </a>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-4 ring-white">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Como Conectar ao Power BI</h1>
            <p className="text-sm text-slate-500 mt-0.5">Siga na ordem para não pular nenhuma etapa</p>
          </div>
        </div>
      </div>

      <div className="flex gap-10">
        {/* ─── Sidebar ─── */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4 px-1">Etapas</p>

            {steps.map((step, index) => {
              const isActive = currentStep === index;
              const isComplete = completedSteps.has(index);
              return (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-white shadow-lg border-2 border-slate-200 ring-2 ring-blue-500/20'
                      : 'hover:bg-white/80 hover:shadow-md border-2 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isComplete
                      ? 'bg-emerald-500 text-white shadow-md'
                      : isActive ? `${colorMap[step.color]} shadow-sm` : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isComplete ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  <p className={`text-[13px] font-medium truncate ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                    {step.title}
                  </p>
                </button>
              );
            })}

            {/* Progress */}
            <div className="mt-6 px-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                <span>Progresso</span>
                <span className="font-semibold">{completedSteps.size}/{TOTAL_STEPS}</span>
              </div>
              <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                  style={{ width: `${(completedSteps.size / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 min-w-0 max-w-3xl">
          {/* Mobile dots */}
          <div className="lg:hidden flex items-center gap-2 mb-5 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                  completedSteps.has(index)
                    ? 'bg-emerald-500 text-white'
                    : currentStep === index
                      ? `${dotColorMap[step.color]} text-white shadow-md`
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {completedSteps.has(index) ? <CheckCircle2 size={14} /> : index + 1}
              </button>
            ))}
          </div>

          {/* Step card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${colorMap[currentStepData.color]}`}>
                  <currentStepData.icon size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Passo {currentStep + 1} de {TOTAL_STEPS}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{currentStepData.title}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{currentStepData.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-7">{currentStepData.content}</div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/30 flex items-center justify-end gap-3">
              <button
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              {currentStep < TOTAL_STEPS - 1 && (
                <button
                  onClick={() => goToStep(currentStep + 1)}
                  className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
                  Próximo
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <HelpCircle size={16} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Perguntas Frequentes</h3>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-[13px] font-medium text-slate-800 pr-4">{faq.question}</span>
                    {expandedFaq === index
                      ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" />
                      : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                    }
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-5 pt-0">
                      <p className="text-[13px] text-slate-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── page export ─────────────────── */

export default function TutorialConexaoPage() {
  return (
    <MainLayout>
      <TutorialContent />
    </MainLayout>
  );
}
