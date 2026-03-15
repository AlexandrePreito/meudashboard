'use client';

import { useState, type ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Monitor,
  Eye,
  ListOrdered,
  Shield,
  Database,
  Settings,
  BookOpen,
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
    question: 'Preciso configurar RLS para todos os usuários?',
    answer:
      'Não. Se o toggle de RLS estiver desativado, o usuário vê todos os dados sem filtros. O RLS é opcional e serve para restringir dados por linha (ex: filial, região).',
  },
  {
    question: 'Qual a diferença entre acesso a telas/páginas e RLS?',
    answer:
      'O acesso a telas e páginas controla QUAIS relatórios e páginas o usuário pode abrir. O RLS controla QUAIS DADOS aparecem dentro das páginas. São complementares: você pode dar acesso a uma tela mas filtrar os dados por filial.',
  },
  {
    question: 'Posso ter vários tipos de filtro RLS ao mesmo tempo?',
    answer:
      'Sim! Você pode configurar Filial, Região, Vendedor e quantos tipos quiser. Cada tipo gera linhas separadas na tabela RLS_Acesso com o Tipo_Filtro correspondente.',
  },
  {
    question: 'O que acontece se eu remover o RLS do Power BI mas esquecer no sistema?',
    answer:
      'O sistema detecta automaticamente o erro e desabilita o RLS na tela. Na próxima vez que o usuário acessar, funcionará normalmente sem filtros.',
  },
  {
    question: 'Preciso publicar o relatório de novo após mudar os filtros?',
    answer:
      'Não. Os filtros são atualizados via tabela RLS_Acesso que o Power BI consulta automaticamente. Só precisa republicar se mudar a estrutura das roles ou relacionamentos.',
  },
  {
    question: 'Como testo se o RLS está funcionando?',
    answer:
      'No Power BI Desktop: Modelagem → Exibir como Funções → selecione a role e digite o e-mail do usuário. No MeuDashboard: faça login com a conta do usuário e verifique os dados exibidos.',
  },
  {
    question: 'O que é USERPRINCIPALNAME()?',
    answer:
      'É uma função DAX que retorna o e-mail do usuário logado. Quando o MeuDashboard gera o token de embed, ele envia o e-mail do usuário, e o Power BI usa essa função para filtrar os dados.',
  },
  {
    question: 'Páginas ocultas no Power BI são afetadas pelo controle de acesso?',
    answer:
      'Sim. O sistema controla tanto páginas visíveis quanto ocultas. Se uma página está oculta no Power BI e é acessada via indicadores/botões, o controle de acesso funciona normalmente.',
  },
];

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
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold flex-shrink-0 border-2 shadow-sm ${stepColors[color] || stepColors.blue}`}
      >
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
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  function goToStep(step: number) {
    if (step >= 0 && step < TOTAL_STEPS) {
      if (step > currentStep) {
        setCompletedSteps((prev) => {
          const next = new Set(prev);
          next.add(currentStep);
          return next;
        });
      }
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const steps: StepItem[] = [
    {
      icon: Monitor,
      color: 'blue',
      title: 'Entender o controle de acesso',
      subtitle: 'Como funciona o sistema de telas e páginas',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            No MeuDashboard existem <strong>3 níveis</strong> de controle de acesso:
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="blue">
              <strong>Telas</strong> — quais relatórios Power BI o usuário pode acessar.
            </SubStep>
            <SubStep n={2} color="blue">
              <strong>Páginas</strong> — dentro de cada relatório, quais páginas são visíveis.
            </SubStep>
            <SubStep n={3} color="blue">
              <strong>RLS (Row-Level Security)</strong> — quais DADOS o usuário pode ver dentro das
              páginas.
            </SubStep>
          </div>

          <InfoBox>
            Sem nenhuma configuração, o usuário tem acesso a todas as telas e todos os dados do
            grupo.
          </InfoBox>

          <Tip>
            Configure de cima para baixo: primeiro as telas, depois as páginas, e por último o RLS.
          </Tip>
        </div>
      ),
    },

    {
      icon: Eye,
      color: 'emerald',
      title: 'Configurar acesso a telas e páginas',
      subtitle: 'Controle o que cada usuário pode ver',
      content: (
        <div className="space-y-5">
          <div className="space-y-3">
            <SubStep n={1} color="emerald">
              Acesse a página de <strong>Usuários</strong> no menu lateral.
            </SubStep>
            <SubStep n={2} color="emerald">
              Encontre o usuário e clique em <strong>&quot;Configurar Telas&quot;</strong>.
            </SubStep>
            <SubStep n={3} color="emerald">
              Na aba <strong>&quot;Acesso&quot;</strong>, marque/desmarque as telas que o usuário pode
              acessar.
            </SubStep>
            <SubStep n={4} color="emerald">
              Para controle fino, clique na <strong>seta</strong> ao lado da tela para expandir as{' '}
              <strong>páginas</strong>.
            </SubStep>
            <SubStep n={5} color="emerald">
              Marque/desmarque as páginas específicas que o usuário pode ver.
            </SubStep>
            <SubStep n={6} color="emerald">
              Clique em <strong>&quot;Salvar acesso&quot;</strong>.
            </SubStep>
          </div>

          <InfoBox>
            Se você não configurar nenhuma restrição, o usuário tem acesso a todas as telas e
            páginas do grupo.
          </InfoBox>

          <Tip>
            Páginas ocultas no Power BI (usadas com indicadores/botões) também são controladas. O
            sistema permite a navegação por indicadores mesmo em páginas ocultas.
          </Tip>
        </div>
      ),
    },

    {
      icon: ListOrdered,
      color: 'indigo',
      title: 'Definir a ordem das telas',
      subtitle: 'Escolha qual tela aparece primeiro',
      content: (
        <div className="space-y-5">
          <div className="space-y-3">
            <SubStep n={1} color="indigo">
              No modal &quot;Configurar Telas&quot;, vá para a aba <strong>&quot;Ordem&quot;</strong>.
            </SubStep>
            <SubStep n={2} color="indigo">
              <strong>Arraste</strong> as telas para a posição desejada.
            </SubStep>
            <SubStep n={3} color="indigo">
              A <strong>primeira tela</strong> da lista será exibida quando o usuário fizer login.
            </SubStep>
            <SubStep n={4} color="indigo">
              Clique em <strong>&quot;Salvar ordem&quot;</strong>.
            </SubStep>
          </div>

          <Tip>
            A ordem só aparece para telas que o usuário tem acesso. Configure o acesso primeiro na
            aba anterior.
          </Tip>
        </div>
      ),
    },

    {
      icon: Shield,
      color: 'orange',
      title: 'Configurar RLS no Power BI Desktop',
      subtitle: 'Crie as roles e regras no modelo',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            RLS (Row-Level Security) filtra os dados no nível de linha. Cada usuário vê apenas os
            dados que tem permissão.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="orange">
              Abra o <strong>Power BI Desktop</strong> e abra seu relatório.
            </SubStep>
            <SubStep n={2} color="orange">
              No menu superior, vá em <strong>Modelagem → Gerenciar Funções</strong> (ou &quot;Manage
              Roles&quot;).
            </SubStep>
            <SubStep n={3} color="orange">
              Clique em <strong>&quot;+ Novo&quot;</strong> para criar uma role. Nomeie como{' '}
              <strong>RLS_Email</strong>.
            </SubStep>
            <SubStep n={4} color="orange">
              Selecione a tabela <strong>RLS_Acesso</strong> (será criada no próximo passo).
            </SubStep>
            <SubStep n={5} color="orange">
              Na coluna <strong>Email</strong>, adicione a regra DAX:
              <div className="mt-2">
                <CopyBox text="[Email] = USERPRINCIPALNAME()" />
              </div>
            </SubStep>
            <SubStep n={6} color="orange">
              <div>
                <p>
                  Se você vai ter mais de uma tabela RLS (ex: RLS_Filial e RLS_Regiao), adicione a
                  regra <strong>[Email] = USERPRINCIPALNAME()</strong> em <strong>cada uma delas</strong>{' '}
                  dentro da mesma role.
                </p>
                <p className="text-gray-500 mt-1.5">
                  A role RLS_Email deve ter a regra aplicada em todas as tabelas RLS para que o
                  filtro funcione corretamente.
                </p>
              </div>
            </SubStep>
            <SubStep n={7} color="orange">
              Clique em <strong>&quot;Salvar&quot;</strong>.
            </SubStep>
          </div>

          <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200/80 rounded-2xl shadow-sm">
            <p className="text-sm font-semibold text-slate-800 mb-3">Resumo visual:</p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Funções</span>
                <span className="font-medium text-slate-800">RLS_Email</span>
              </div>
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Tabelas</span>
                <span className="font-medium text-slate-800">RLS_Acesso</span>
              </div>
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Regras</span>
                <code className="text-slate-700 font-mono text-xs">[Email] = USERPRINCIPALNAME()</code>
              </div>
            </div>
          </div>

          <Warning>
            A role deve ser criada ANTES de publicar o relatório. Se já publicou, crie a role, salve
            e publique novamente.
          </Warning>

          <Tip>
            O nome da role (ex: RLS_Email) precisa ser exatamente o mesmo que você vai configurar
            no sistema no Passo 6.
          </Tip>
        </div>
      ),
    },

    {
      icon: Database,
      color: 'pink',
      title: 'Importar tabelas RLS no Power BI',
      subtitle: 'Crie uma consulta por tipo de filtro e relacione com seu modelo',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Agora vamos importar os dados de filtro do MeuDashboard para o Power BI. Você vai criar{' '}
            <strong>uma consulta separada para cada tipo de filtro</strong> (ex: Filial, Região) e
            relacionar cada uma com a tabela de dimensão correspondente no seu modelo.
          </p>

          <InfoBox>
            Se você configurou apenas um tipo de filtro (ex: só Filial), basta criar uma consulta. Se
            tem Filial <strong>e</strong> Região, crie duas consultas — uma para cada tipo.
          </InfoBox>

          <div className="p-5 bg-gradient-to-br from-pink-50 to-rose-50/50 border-2 border-pink-200/80 rounded-2xl">
            <p className="text-sm font-bold text-pink-800 mb-3">Parte A — Obter o código M</p>
            <div className="space-y-3">
              <SubStep n={1} color="pink">
                Na página de <strong>Usuários</strong>, clique em <strong>&quot;Configurar Telas&quot;</strong> de
                qualquer usuário do grupo.
              </SubStep>
              <SubStep n={2} color="pink">
                Vá para a aba <strong>&quot;Integração&quot;</strong>.
              </SubStep>
              <SubStep n={3} color="pink">
                Clique em <strong>&quot;Gerar Chave de API&quot;</strong> (se ainda não gerou).
              </SubStep>
              <SubStep n={4} color="pink">
                Clique em <strong>&quot;Copiar Código M&quot;</strong>. Guarde esse código — você vai usar
                mais de uma vez.
              </SubStep>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50/50 border-2 border-indigo-200/80 rounded-2xl">
            <p className="text-sm font-bold text-indigo-800 mb-3">
              Parte B — Criar a primeira consulta (ex: RLS_Filial)
            </p>
            <div className="space-y-3">
              <SubStep n={1} color="indigo">
                No Power BI Desktop, vá em <strong>Página Inicial → Obter Dados → Consulta em Branco</strong>.
              </SubStep>
              <SubStep n={2} color="indigo">
                No Editor do Power Query, clique em <strong>&quot;Editor Avançado&quot;</strong>.
              </SubStep>
              <SubStep n={3} color="indigo">
                <strong>Apague</strong> todo o conteúdo e <strong>cole</strong> o código M copiado na Parte A.
              </SubStep>
              <SubStep n={4} color="indigo">
                Clique em <strong>OK</strong>. Se pedir autenticação, selecione <strong>&quot;Anônimo&quot;</strong>{' '}
                e clique em Conectar.
              </SubStep>
              <SubStep n={5} color="indigo">
                Agora você verá a tabela com 3 colunas: <strong>Email</strong>, <strong>Tipo_Filtro</strong> e{' '}
                <strong>Valor_Filtro</strong>.
              </SubStep>
              <SubStep n={6} color="indigo">
                <div>
                  <p>
                    Filtre a coluna <strong>Tipo_Filtro</strong> para mostrar apenas <strong>&quot;Filial&quot;</strong>:
                  </p>
                  <p className="text-gray-500 mt-1">
                    Clique na seta ▼ no cabeçalho da coluna Tipo_Filtro → desmarque tudo → marque apenas
                    &quot;Filial&quot; → OK.
                  </p>
                </div>
              </SubStep>
              <SubStep n={7} color="indigo">
                Renomeie a consulta para <strong>&quot;RLS_Filial&quot;</strong> (painel direito → campo Nome).
              </SubStep>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200/80 rounded-2xl">
            <p className="text-sm font-semibold text-slate-800 mb-3">Resultado da consulta RLS_Filial:</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Tipo_Filtro</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Valor_Filtro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">usuario@empresa.com</td>
                    <td className="px-4 py-2 text-slate-600">Filial</td>
                    <td className="px-4 py-2 font-medium text-pink-700">01</td>
                  </tr>
                  <tr className="border-t border-slate-100 bg-slate-50/50">
                    <td className="px-4 py-2 text-slate-600">usuario@empresa.com</td>
                    <td className="px-4 py-2 text-slate-600">Filial</td>
                    <td className="px-4 py-2 font-medium text-pink-700">02</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50/50 border-2 border-orange-200/80 rounded-2xl">
            <p className="text-sm font-bold text-orange-800 mb-3">
              Parte C — Criar consultas adicionais (se tiver mais tipos)
            </p>
            <p className="text-[13px] text-orange-700 mb-3">
              Se você configurou outros filtros além de Filial (ex: Região, Vendedor), repita o processo
              para cada tipo:
            </p>
            <div className="space-y-3">
              <SubStep n={1} color="orange">
                No Power Query, <strong>clique com o botão direito</strong> na consulta RLS_Filial e
                selecione <strong>&quot;Duplicar&quot;</strong>.
              </SubStep>
              <SubStep n={2} color="orange">
                Na consulta duplicada, <strong>altere o filtro</strong> de Tipo_Filtro: em vez de
                &quot;Filial&quot;, selecione <strong>&quot;Regiao&quot;</strong> (ou o nome do seu filtro).
              </SubStep>
              <SubStep n={3} color="orange">
                Renomeie para <strong>&quot;RLS_Regiao&quot;</strong>.
              </SubStep>
              <SubStep n={4} color="orange">
                Repita para cada tipo de filtro adicional (ex: RLS_Vendedor, RLS_Grupo, etc.).
              </SubStep>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/50 border-2 border-emerald-200/80 rounded-2xl">
            <p className="text-sm font-bold text-emerald-800 mb-3">
              Parte D — Criar relacionamentos no modelo
            </p>
            <p className="text-[13px] text-emerald-700 mb-3">
              Cada tabela RLS precisa ser relacionada com a tabela de dimensão correspondente no seu
              modelo:
            </p>
            <div className="space-y-3">
              <SubStep n={1} color="emerald">
                Feche o Power Query (<strong>Fechar e Aplicar</strong>).
              </SubStep>
              <SubStep n={2} color="emerald">
                Vá para a visão de <strong>Modelo</strong> (ícone no menu lateral esquerdo do Power BI
                Desktop).
              </SubStep>
              <SubStep n={3} color="emerald">
                <div>
                  <p>
                    Arraste a coluna <strong>Valor_Filtro</strong> da tabela <strong>RLS_Filial</strong> até
                    a coluna de código da filial na sua <strong>tabela de Filiais</strong> (ou tabela de
                    fatos).
                  </p>
                  <p className="text-gray-500 mt-1.5">
                    Exemplo: RLS_Filial[Valor_Filtro] → Filiais[Codigo_Filial]
                  </p>
                </div>
              </SubStep>
              <SubStep n={4} color="emerald">
                <div>
                  <p>
                    Se tiver RLS_Regiao, arraste <strong>Valor_Filtro</strong> da tabela RLS_Regiao até
                    a coluna correspondente na <strong>tabela de Regiões</strong>.
                  </p>
                  <p className="text-gray-500 mt-1.5">
                    Exemplo: RLS_Regiao[Valor_Filtro] → Regioes[Nome_Regiao]
                  </p>
                </div>
              </SubStep>
              <SubStep n={5} color="emerald">
                Repita para cada tabela RLS adicional.
              </SubStep>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200/80 rounded-2xl">
            <p className="text-sm font-semibold text-slate-800 mb-4">
              Exemplo de modelo com relacionamentos:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[13px]">
                <div className="px-3 py-2 bg-pink-100 border border-pink-200 rounded-xl font-medium text-pink-800 flex-shrink-0">
                  RLS_Filial
                </div>
                <div className="flex-1 border-t-2 border-dashed border-slate-300 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[11px] text-slate-500">
                    Valor_Filtro = Codigo
                  </span>
                </div>
                <div className="px-3 py-2 bg-blue-100 border border-blue-200 rounded-xl font-medium text-blue-800 flex-shrink-0">
                  Tabela Filiais
                </div>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <div className="px-3 py-2 bg-orange-100 border border-orange-200 rounded-xl font-medium text-orange-800 flex-shrink-0">
                  RLS_Regiao
                </div>
                <div className="flex-1 border-t-2 border-dashed border-slate-300 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[11px] text-slate-500">
                    Valor_Filtro = Nome
                  </span>
                </div>
                <div className="px-3 py-2 bg-indigo-100 border border-indigo-200 rounded-xl font-medium text-indigo-800 flex-shrink-0">
                  Tabela Regiões
                </div>
              </div>
            </div>
          </div>

          <Tip>
            O <strong>Valor_Filtro</strong> na tabela RLS precisa ter os mesmos valores que existem na sua
            tabela de dimensão. Se a filial no modelo é &quot;01&quot;, o filtro no sistema também deve ser
            &quot;01&quot; (e não &quot;Filial 01&quot;).
          </Tip>

          <Warning>
            Após criar as consultas e relacionamentos, <strong>publique o relatório novamente</strong> no
            Power BI Service para que as mudanças entrem em vigor.
          </Warning>
        </div>
      ),
    },

    {
      icon: Settings,
      color: 'cyan',
      title: 'Ativar RLS no sistema',
      subtitle: 'Configure os filtros por usuário',
      content: (
        <div className="space-y-5">
          <div className="space-y-3">
            <SubStep n={1} color="cyan">
              Na página de <strong>Usuários</strong>, clique em <strong>&quot;Configurar Telas&quot;</strong>{' '}
              do usuário.
            </SubStep>
            <SubStep n={2} color="cyan">
              Vá para a aba <strong>&quot;RLS&quot;</strong>.
            </SubStep>
            <SubStep n={3} color="cyan">
              Ative o toggle <strong>&quot;Habilitar RLS para este usuário&quot;</strong>.
            </SubStep>
            <SubStep n={4} color="cyan">
              Na seção <strong>&quot;RLS por tela&quot;</strong>, selecione a tela e ative o RLS.
            </SubStep>
            <SubStep n={5} color="cyan">
              No campo <strong>&quot;Nome da Role&quot;</strong>, digite exatamente o nome que criou no
              Power BI (ex: <strong>RLS_Email</strong>).
            </SubStep>
            <SubStep n={6} color="cyan">
              Na seção <strong>&quot;Filtros de Acesso&quot;</strong>, adicione os filtros: clique em{' '}
              <strong>&quot;+ Adicionar&quot;</strong> e nomeie o filtro (ex: Filial, Região, Vendedor);
              adicione os <strong>valores</strong> que o usuário pode ver (ex: 01, 02, SUL).
            </SubStep>
            <SubStep n={7} color="cyan">
              Clique em <strong>&quot;Salvar RLS&quot;</strong>.
            </SubStep>
          </div>

          <div className="p-6 bg-gradient-to-br from-cyan-50 to-slate-50 border-2 border-cyan-200/80 rounded-2xl shadow-sm">
            <p className="text-sm font-semibold text-slate-800 mb-3">Exemplo de configuração:</p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Filtro</span>
                <span className="font-medium text-slate-800">Filial</span>
              </div>
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Valores</span>
                <span className="font-medium text-slate-800">01, 02</span>
              </div>
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Filtro</span>
                <span className="font-medium text-slate-800">Região</span>
              </div>
              <div className="flex justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <span className="text-slate-500">Valores</span>
                <span className="font-medium text-slate-800">SUL, SUDESTE</span>
              </div>
            </div>
          </div>

          <InfoBox>
            O nome do filtro deve corresponder exatamente ao nome da coluna Tipo_Filtro na tabela
            RLS_Acesso. Se criou &quot;Filial&quot; no sistema, a tabela terá &quot;Filial&quot; como Tipo_Filtro.
          </InfoBox>

          <Tip>
            Para testar, faça login com o usuário configurado e verifique se ele vê apenas os dados
            permitidos.
          </Tip>
        </div>
      ),
    },
  ];

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

  return (
    <div className="min-h-screen pb-16 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
      <div className="mb-10">
        <a
          href="/dev/usuarios"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-5 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para Usuários
        </a>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-4 ring-white">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Como configurar RLS e acesso a telas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Siga na ordem para configurar corretamente</p>
          </div>
        </div>
      </div>

      <div className="flex gap-10">
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4 px-1">
              Etapas
            </p>
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
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isComplete
                        ? 'bg-emerald-500 text-white shadow-md'
                        : isActive
                          ? `${colorMap[step.color]} shadow-sm`
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <p
                    className={`text-[13px] font-medium truncate ${isActive ? 'text-slate-900' : 'text-slate-600'}`}
                  >
                    {step.title}
                  </p>
                </button>
              );
            })}
            <div className="mt-6 px-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                <span>Progresso</span>
                <span className="font-semibold">
                  {completedSteps.size}/{TOTAL_STEPS}
                </span>
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

        <div className="flex-1 min-w-0 max-w-3xl">
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

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${colorMap[currentStepData.color]}`}
                >
                  <currentStepData.icon size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Passo {currentStep + 1} de {TOTAL_STEPS}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">
                    {currentStepData.title}
                  </h2>
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

          <div className="mt-14">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <HelpCircle size={16} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Perguntas Frequentes</h3>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-[13px] font-medium text-slate-800 pr-4">
                      {faq.question}
                    </span>
                    {expandedFaq === index ? (
                      <ChevronUp size={18} className="text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                    )}
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

export default function TutorialRlsPage() {
  return (
    <MainLayout>
      <TutorialContent />
    </MainLayout>
  );
}
