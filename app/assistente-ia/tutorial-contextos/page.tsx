'use client';

import { useState, type ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Download,
  Settings,
  Plug,
  FileText,
  TestTube,
  Upload,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Check,
  Copy,
  Brain,
  Zap,
  Database
} from 'lucide-react';

/* ─────────────────── types ─────────────────── */

interface StepItem {
  icon: any;
  color: string;
  title: string;
  subtitle: string;
  content: ReactNode;
}

interface FAQItem { question: string; answer: string }

/* ─────────────────── constants ─────────────────── */

const TOTAL_STEPS = 7;

const faqs: FAQItem[] = [
  {
    question: 'Preciso de plano pago no Claude?',
    answer: 'O Claude Desktop funciona com conta gratuita, mas o plano pago (Pro) oferece mais mensagens e acesso a modelos mais avançados. Recomendamos o plano Pro para gerar documentações completas, pois o processo pode usar muitas mensagens.'
  },
  {
    question: 'O MCP funciona só com Power BI Desktop?',
    answer: 'O MCP local (powerbi-modeling-mcp) precisa do Power BI Desktop aberto no Windows. Para modelos publicados no Fabric/Service, existe o MCP remoto da Microsoft, mas a configuração é diferente e não é coberta neste tutorial.'
  },
  {
    question: 'Preciso instalar o VS Code?',
    answer: 'Não é obrigatório, mas é o caminho mais fácil. O VS Code tem a extensão oficial do Power BI MCP que instala o executável automaticamente. Sem o VS Code, você precisaria baixar o executável manualmente do GitHub da Microsoft.'
  },
  {
    question: 'O Claude tem acesso aos meus dados?',
    answer: 'O MCP roda localmente na sua máquina. O Claude vê a estrutura do modelo (tabelas, medidas, colunas) e pode executar queries DAX. Os dados são processados localmente — apenas os resultados das queries que você pede são enviados ao Claude durante a conversa.'
  },
  {
    question: 'Posso usar o ChatGPT em vez do Claude?',
    answer: 'O MCP da Microsoft funciona com qualquer cliente MCP compatível. Porém, o Claude Desktop tem suporte nativo a MCP e é o que recomendamos por ser o mais fácil de configurar e o que testamos.'
  },
  {
    question: 'A documentação gerada precisa ser revisada?',
    answer: 'Sim! Sempre revise os valores, medidas e exemplos gerados. A IA pode cometer erros em fórmulas DAX ou interpretar mal uma regra de negócio. O passo de teste (Passo 5) serve exatamente para isso — não pule!'
  },
  {
    question: 'Posso gerar documentação para vários datasets?',
    answer: 'Sim. Repita o processo para cada dataset/modelo. Cada um terá sua própria documentação de chat (.md) e base de DAX (.json) independentes.'
  },
  {
    question: 'O que são as medidas QA_?',
    answer: 'São medidas DAX criadas pelo Claude com prefixo QA_ (Query Assistant), otimizadas para o assistente de IA responder perguntas. Elas são adicionais — não alteram nem substituem as medidas existentes do seu modelo. Exemplos: QA_Faturamento, QA_Top1_Produto_Nome, QA_Variacao_MoM.'
  },
  {
    question: 'O ícone de martelo/plug não apareceu no Claude Desktop',
    answer: 'Certifique-se de que: (1) o Power BI Desktop está aberto com um relatório carregado, (2) você fechou completamente o Claude Desktop (não só minimizou — feche pela bandeja do sistema) e reabriu, (3) o caminho do executável no JSON está correto com barras duplas \\\\.'
  },
  {
    question: 'O processo todo demora quanto?',
    answer: 'Depende do tamanho do modelo. Para um modelo médio (20-50 medidas, 10 tabelas): instalação ~15 min, geração da documentação de chat ~20-30 min, extração DAX ~5-10 min, testes ~10-15 min. Total: cerca de 1 hora na primeira vez.'
  }
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

function ExtLink({ href, children, outline, claude }: { href: string; children: ReactNode; outline?: boolean; claude?: boolean }) {
  const baseClasses = 'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200';
  const variantClasses = claude
    ? 'bg-[#da7756] hover:bg-[#c96a4a] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
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

function InternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {children}
    </a>
  );
}

const stepColors: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  pink: 'bg-pink-50 text-pink-600 border-pink-100',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
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

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden mt-3 shadow-lg">
      {title && (
        <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 text-xs text-slate-400 font-mono">
          {title}
        </div>
      )}
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all z-10 shadow-sm"
      >
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
      <pre className="p-4 pr-24 text-[12px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{children}</pre>
    </div>
  );
}

function PhaseCard({ phase, title, description, color }: { phase: number; title: string; description: string; color: string }) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const badgeColors: Record<string, string> = {
    orange: 'bg-orange-200 text-orange-800',
    blue: 'bg-blue-200 text-blue-800',
    emerald: 'bg-emerald-200 text-emerald-800',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${colors[color]}`}>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${badgeColors[color]}`}>
        Fase {phase}
      </span>
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="text-[12px] opacity-80 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ─────────────────── main component ─────────────────── */

function TutorialContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [mcpPath, setMcpPath] = useState('');

  function goToStep(step: number) {
    if (step >= 0 && step < TOTAL_STEPS) {
      if (step > currentStep) {
        setCompletedSteps(prev => { const n = new Set(prev); n.add(currentStep); return n; });
      }
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ─── Steps ─── */

  const steps: StepItem[] = [
    // ───── 1 — Instalar Claude Desktop ─────
    {
      icon: Download,
      color: 'blue',
      title: 'Instalar o Claude Desktop',
      subtitle: 'Baixe e instale o app do Claude no seu computador',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            O <strong>Claude Desktop</strong> é o aplicativo que roda no seu computador e permite conectar
            diretamente ao Power BI via MCP. Ele é gratuito para baixar.
          </p>

          <ExtLink href="https://claude.ai/download" claude>
            Baixar Claude Desktop
          </ExtLink>

          <div className="space-y-3">
            <SubStep n={1} color="blue">
              Acesse <strong>claude.ai/download</strong> e baixe a versão para <strong>Windows</strong>.
            </SubStep>
            <SubStep n={2} color="blue">
              Execute o instalador (.exe) e siga as instruções. A instalação é bem rápida.
            </SubStep>
            <SubStep n={3} color="blue">
              Abra o Claude Desktop pelo <strong>menu Iniciar</strong> do Windows.
            </SubStep>
            <SubStep n={4} color="blue">
              Faça login com sua conta do Claude. Se não tiver, crie uma gratuitamente em <strong>claude.ai</strong>.
            </SubStep>
          </div>

          <Tip>
            Recomendamos o plano <strong>Pro</strong> do Claude para gerar documentações completas.
            O plano gratuito tem limite de mensagens e pode não ser suficiente para o processo inteiro —
            mas funciona para testar se tudo está conectado.
          </Tip>

          <div className="p-4 bg-gray-50/80 border border-gray-200/60 rounded-2xl">
            <p className="text-[13px] text-gray-600 leading-relaxed">
              <strong>Requisitos mínimos:</strong> Windows 10 (build 19041+) ou Windows 11.
              O instalador é um arquivo .exe padrão — não precisa de permissões especiais.
            </p>
          </div>
        </div>
      ),
    },

    // ───── 2 — Instalar MCP via VS Code ─────
    {
      icon: Plug,
      color: 'purple',
      title: 'Instalar o MCP do Power BI',
      subtitle: 'Instale o servidor MCP da Microsoft pelo VS Code',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            O <strong>MCP</strong> (Model Context Protocol) é a &quot;ponte&quot; que permite o Claude conversar com o Power BI Desktop.
            A forma mais fácil de instalar é pela extensão do <strong>VS Code</strong>.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="purple">
              <div>
                <p>Se ainda não tem o VS Code, baixe e instale:</p>
                <div className="mt-2">
                  <ExtLink href="https://code.visualstudio.com/download" outline>
                    Baixar VS Code (gratuito)
                  </ExtLink>
                </div>
              </div>
            </SubStep>
            <SubStep n={2} color="purple">
              Abra o VS Code e vá em <strong>Extensões</strong> (atalho: <strong>Ctrl+Shift+X</strong>).
            </SubStep>
            <SubStep n={3} color="purple">
              Pesquise por <strong>&quot;Power BI Modeling MCP Server&quot;</strong> (da Microsoft) e clique em <strong>Instalar</strong>.
            </SubStep>
            <SubStep n={4} color="purple">
              <div>
                <p>Após instalar, localize o <strong>executável</strong>. Ele fica na pasta de extensões do VS Code:</p>
                <CodeBlock title="Caminho do executável">{`C:\\Users\\SEU_USUARIO\\.vscode\\extensions\\analysis-services.powerbi-modeling-mcp-X.X.X-win32-x64\\server\\powerbi-modeling-mcp.exe`}</CodeBlock>
                <p className="text-xs text-gray-500 mt-2">
                  Substitua <strong>SEU_USUARIO</strong> pelo seu nome de usuário do Windows e <strong>X.X.X</strong> pela versão instalada (ex: 0.1.9).
                </p>
              </div>
            </SubStep>
          </div>

          <Tip>
            <strong>Como encontrar o caminho:</strong> Abra o Explorador de Arquivos e navegue até{' '}
            <code className="text-xs bg-amber-100/80 px-1.5 py-0.5 rounded">C:\Users\SEU_USUARIO\.vscode\extensions\</code>{' '}
            e procure a pasta que começa com <strong>analysis-services.powerbi-modeling-mcp</strong>. Dentro dela, abra <strong>server</strong> — lá está o .exe.
          </Tip>

          <InfoBox>
            O VS Code é usado <strong>apenas para instalar</strong> a extensão. Depois de configurar o MCP no Claude Desktop (próximo passo),
            você não precisa manter o VS Code aberto.
          </InfoBox>
        </div>
      ),
    },

    // ───── 3 — Configurar MCP no Claude ─────
    {
      icon: Settings,
      color: 'emerald',
      title: 'Conectar MCP ao Claude Desktop',
      subtitle: 'Configure o Claude para se comunicar com o Power BI',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Agora vamos dizer ao Claude Desktop onde está o servidor MCP para ele conseguir &quot;conversar&quot; com o Power BI.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="emerald">
              <div>
                <p>No Claude Desktop, acesse:</p>
                <p className="mt-1 text-[13px]">
                  Menu <strong>☰</strong> → <strong>Configurações</strong> (ou Settings) → <strong>Desenvolvedor</strong> (Developer) → <strong>Editar Configuração</strong> (Edit Config)
                </p>
              </div>
            </SubStep>
            <SubStep n={2} color="emerald">
              <div className="space-y-4">
                <p>Isso abre o arquivo <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">claude_desktop_config.json</code>. Cole o caminho do executável abaixo e copie a configuração gerada:</p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Caminho completo do powerbi-modeling-mcp.exe no seu PC:</label>
                  <input
                    type="text"
                    value={mcpPath}
                    onChange={(e) => setMcpPath(e.target.value)}
                    placeholder="C:\Users\SEU_USUARIO\.vscode\extensions\analysis-services.powerbi-modeling-mcp-0.1.9-win32-x64\server\powerbi-modeling-mcp.exe"
                    className="w-full px-4 py-2.5 text-[13px] font-mono border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>
                {mcpPath.trim() ? (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 mb-2">Configuração gerada — copie e cole no arquivo:</p>
                    <CodeBlock title="claude_desktop_config.json">{`{
  "mcpServers": {
    "powerbi-modeling-mcp": {
      "command": "${mcpPath.trim().replace(/\\/g, '\\\\')}",
      "args": ["--start"],
      "type": "stdio"
    }
  }
}`}</CodeBlock>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Cole o caminho acima para gerar a configuração automaticamente. O caminho está no Passo 2.
                  </p>
                )}
              </div>
            </SubStep>
            <SubStep n={3} color="emerald">
              <div>
                <p><strong>Salve o arquivo</strong> (Ctrl+S) e <strong>feche completamente</strong> o Claude Desktop.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Importante: não basta minimizar. Clique com botão direito no ícone do Claude na <strong>bandeja do sistema</strong> (ao lado do relógio) e clique em &quot;Sair&quot; / &quot;Quit&quot;.
                </p>
              </div>
            </SubStep>
            <SubStep n={4} color="emerald">
              <div>
                <p>Agora abra o <strong>Power BI Desktop</strong> com um relatório carregado.</p>
              </div>
            </SubStep>
            <SubStep n={5} color="emerald">
              <div>
                <p>Reabra o Claude Desktop. Você deverá ver um <strong>ícone de martelo 🔨</strong> ou <strong>plug 🔌</strong> na barra de chat.</p>
                <p className="text-emerald-700 font-medium text-[13px] mt-1">Isso confirma que o MCP está conectado!</p>
              </div>
            </SubStep>
          </div>

          <div className="p-5 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl">
            <p className="text-sm font-semibold text-emerald-800 mb-2">Teste rápido</p>
            <p className="text-[13px] text-emerald-700">
              Para confirmar que está funcionando, envie esta mensagem no Claude:
            </p>
            <CopyBox text="Liste as tabelas do modelo conectado" />
            <p className="text-xs text-emerald-600 mt-2">
              Se aparecer a lista de tabelas do seu relatório, está tudo certo!
            </p>
          </div>

          <Warning>
            Se o ícone não aparecer: (1) Verifique se o caminho do .exe está correto no JSON,
            (2) Verifique se usou barras duplas \\\\, (3) O Power BI Desktop precisa estar aberto com um modelo carregado,
            (4) Feche e reabra o Claude Desktop completamente.
          </Warning>
        </div>
      ),
    },

    // ───── 4 — Gerar Documentação de Chat ─────
    {
      icon: FileText,
      color: 'orange',
      title: 'Gerar Documentação para Chat',
      subtitle: 'Use o prompt para gerar a documentação do assistente IA',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Com o Claude conectado ao Power BI, vamos gerar a <strong>documentação principal</strong> —
            a que ensina o assistente IA a responder perguntas dos usuários sobre seus dados.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="orange">
              <div>
                <p>Vá até a página de <strong>Contextos da IA</strong> e clique no botão de download (ícone ⬇) na seção &quot;Documentação para Chat&quot; para baixar o prompt.</p>
                <div className="mt-2">
                  <InternalLink href="/assistente-ia/contextos">
                    <Download size={14} />
                    Abrir Contextos da IA
                  </InternalLink>
                </div>
                <p className="text-xs text-gray-500 mt-2">Isso baixa o arquivo <code className="bg-gray-100 px-1.5 py-0.5 rounded">prompt-documentacao-chat.md</code></p>
              </div>
            </SubStep>
            <SubStep n={2} color="orange">
              Certifique-se de que o <strong>Power BI Desktop</strong> está aberto com o relatório que deseja documentar.
            </SubStep>
            <SubStep n={3} color="orange">
              No <strong>Claude Desktop</strong>, inicie uma <strong>nova conversa</strong> e cole todo o conteúdo do prompt baixado.
            </SubStep>
            <SubStep n={4} color="orange">
              <div>
                <p>O Claude vai executar <strong>3 fases automaticamente</strong>:</p>
                <div className="mt-3 space-y-2">
                  <PhaseCard
                    phase={1}
                    title="Análise e Criação de Medidas QA_"
                    description="Analisa o modelo, cria medidas otimizadas com prefixo QA_ (ex: QA_Faturamento, QA_Top1_Produto_Nome) e testa cada uma"
                    color="orange"
                  />
                  <PhaseCard
                    phase={2}
                    title="Validação com 20+ Perguntas"
                    description="Simula perguntas de usuários (faturamento, rankings, comparativos) e valida se as respostas estão corretas"
                    color="blue"
                  />
                  <PhaseCard
                    phase={3}
                    title="Geração da Documentação"
                    description="Gera o arquivo .md no formato correto com seções BASE, MEDIDAS, TABELAS, QUERIES e EXEMPLOS"
                    color="emerald"
                  />
                </div>
              </div>
            </SubStep>
            <SubStep n={5} color="orange">
              Quando o Claude terminar todas as fases, <strong>copie toda a documentação gerada</strong> (o bloco markdown) e salve num arquivo <strong>.md</strong> no seu computador.
            </SubStep>
          </div>

          <div className="p-5 bg-orange-50/80 border border-orange-200/60 rounded-2xl">
            <p className="text-sm font-semibold text-orange-800 mb-2">O que são medidas QA_?</p>
            <p className="text-[13px] text-orange-700 leading-relaxed">
              São medidas DAX <strong>adicionais</strong> que o Claude cria no seu modelo com prefixo QA_ (Query Assistant).
              Elas são otimizadas para o assistente IA responder perguntas. Por exemplo:{' '}
              <code className="bg-orange-100/80 px-1 rounded text-xs">QA_Faturamento</code>,{' '}
              <code className="bg-orange-100/80 px-1 rounded text-xs">QA_Top1_Produto_Nome</code>,{' '}
              <code className="bg-orange-100/80 px-1 rounded text-xs">QA_Variacao_MoM</code>.
              <br /><br />
              <strong>Elas não alteram</strong> suas medidas existentes — são apenas novas medidas adicionadas ao modelo.
            </p>
          </div>

          <Tip>
            O processo completo pode demorar <strong>20-40 minutos</strong> dependendo do tamanho do modelo.
            Deixe o Claude trabalhar — ele fará várias consultas ao Power BI automaticamente.
            Se a conversa ficar longa, ele pode pedir para continuar em uma nova mensagem.
          </Tip>

          <Warning>
            <strong>Não interrompa o processo no meio.</strong> Se o Claude parar antes de terminar as 3 fases
            (por limite de mensagens do plano gratuito, por exemplo), envie &quot;continue&quot; para ele retomar.
          </Warning>
        </div>
      ),
    },

    // ───── 5 — Testar a documentação ─────
    {
      icon: TestTube,
      color: 'pink',
      title: 'Testar a Documentação',
      subtitle: 'Valide se o assistente responde corretamente',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Antes de importar no sistema, <strong>teste a documentação</strong> fazendo perguntas ao Claude como se fosse um usuário final.
            Este passo é crítico para garantir que as respostas estão corretas.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="pink">
              <div>
                <p>No Claude Desktop, abra uma <strong>nova conversa</strong>.</p>
                <p className="text-xs text-gray-500 mt-1">Importante: nova conversa, não a mesma usada para gerar a documentação.</p>
              </div>
            </SubStep>
            <SubStep n={2} color="pink">
              <div>
                <p>Cole a documentação gerada como <strong>primeira mensagem</strong> e adicione no início:</p>
                <CopyBox text="Você é um assistente de BI. Use a documentação abaixo para responder perguntas. Aqui está a documentação:" />
              </div>
            </SubStep>
            <SubStep n={3} color="pink">
              <div>
                <p>Faça pelo menos <strong>10 perguntas</strong> variadas. Exemplos:</p>
                <div className="mt-2 space-y-1.5 text-[13px]">
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Qual o faturamento total?&quot;</p>
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Qual o produto mais vendido?&quot;</p>
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Quem mais vendeu este mês?&quot;</p>
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Top 10 clientes&quot;</p>
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Como estão as vendas comparado ao mês passado?&quot;</p>
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Vendas por filial&quot;</p>
                  <p className="bg-pink-50/50 rounded-xl px-3 py-2.5">&quot;Qual dia da semana vende mais?&quot;</p>
                </div>
              </div>
            </SubStep>
            <SubStep n={4} color="pink">
              <strong>Compare as respostas</strong> com os dados reais do Power BI. Abra o relatório e verifique se os valores batem.
            </SubStep>
            <SubStep n={5} color="pink">
              <div>
                <p>Se algo estiver errado:</p>
                <p className="text-[13px] text-gray-600 mt-1">
                  Volte à conversa original (Passo 4) e peça ao Claude para <strong>corrigir a medida</strong> ou
                  <strong> ajustar a documentação</strong>. Exemplo: &quot;A medida QA_Faturamento está retornando valor errado, ajuste para usar a coluna Vendas[ValorTotal] em vez de Vendas[Valor]&quot;.
                </p>
              </div>
            </SubStep>
          </div>

          <Warning>
            <strong>Não pule este passo!</strong> Uma documentação com valores errados faz o assistente IA
            dar respostas incorretas aos usuários. Invista 10-15 minutos testando — vale a pena.
          </Warning>
        </div>
      ),
    },

    // ───── 6 — Gerar Base de DAX ─────
    {
      icon: Database,
      color: 'indigo',
      title: 'Extrair Base de DAX',
      subtitle: 'Gere o JSON com todas as medidas e colunas (opcional)',
      content: (
        <div className="space-y-5">
          <InfoBox>
            Este passo é <strong>opcional</strong> mas recomendado. A Base de DAX é usada na tela de <strong>Treinamento</strong>
            da IA e permite uma experiência mais completa.
          </InfoBox>

          <div className="space-y-3">
            <SubStep n={1} color="indigo">
              <div>
                <p>Na página de Contextos da IA, clique no botão de download (ícone ⬇) da seção &quot;Base de DAX&quot;.</p>
                <p className="text-xs text-gray-500 mt-1">Isso baixa o arquivo <code className="bg-gray-100 px-1.5 py-0.5 rounded">prompt-extrair-dax.md</code></p>
              </div>
            </SubStep>
            <SubStep n={2} color="indigo">
              Com o <strong>Power BI Desktop aberto</strong>, vá ao Claude Desktop e <strong>inicie uma nova conversa</strong>.
            </SubStep>
            <SubStep n={3} color="indigo">
              Cole o conteúdo do prompt e envie. O Claude vai automaticamente:
            </SubStep>
          </div>

          <div className="space-y-2 ml-11">
            <div className="flex items-start gap-2 bg-indigo-50/50 rounded-xl px-3 py-2.5">
              <span className="text-indigo-600 font-bold text-xs mt-0.5">→</span>
              <p className="text-[13px]">Listar <strong>todas as medidas</strong> com suas fórmulas DAX completas</p>
            </div>
            <div className="flex items-start gap-2 bg-indigo-50/50 rounded-xl px-3 py-2.5">
              <span className="text-indigo-600 font-bold text-xs mt-0.5">→</span>
              <p className="text-[13px]">Listar <strong>colunas das tabelas de dimensão</strong> com tipos e valores de exemplo</p>
            </div>
            <div className="flex items-start gap-2 bg-indigo-50/50 rounded-xl px-3 py-2.5">
              <span className="text-indigo-600 font-bold text-xs mt-0.5">→</span>
              <p className="text-[13px]">Gerar o <strong>JSON completo</strong> no formato que o sistema espera</p>
            </div>
          </div>

          <div className="space-y-3 mt-3">
            <SubStep n={4} color="indigo">
              Copie o JSON gerado e salve num arquivo <strong>.json</strong>.
            </SubStep>
          </div>

          <div className="p-4 bg-indigo-50/60 border border-indigo-200/40 rounded-2xl">
            <p className="text-[13px] text-indigo-700 leading-relaxed">
              <strong>Formato esperado:</strong> O JSON deve ter a estrutura{' '}
              <code className="bg-indigo-100/80 px-1 rounded text-xs">{`{"modelo": "...", "medidas": [...], "colunas": [...]}`}</code>.
              O sistema valida o formato automaticamente ao importar.
            </p>
          </div>

          <Tip>
            A extração de DAX é bem mais rápida — geralmente <strong>5-10 minutos</strong>.
            Se o modelo for muito grande, o Claude pode dividir em partes.
          </Tip>
        </div>
      ),
    },

    // ───── 7 — Importar no MeuDashboard ─────
    {
      icon: Upload,
      color: 'cyan',
      title: 'Importar no MeuDashboard',
      subtitle: 'Coloque as documentações no sistema',
      content: (
        <div className="space-y-5">
          <p className="text-gray-600 leading-relaxed">
            Agora que você tem os arquivos gerados e testados, vamos importá-los no MeuDashboard para ativar o assistente IA.
          </p>

          <div className="space-y-3">
            <SubStep n={1} color="cyan">
              <div>
                <p>Acesse a página de <strong>Contextos da IA</strong>:</p>
                <div className="mt-2">
                  <InternalLink href="/assistente-ia/contextos">
                    <Upload size={14} />
                    Abrir Contextos da IA
                  </InternalLink>
                </div>
              </div>
            </SubStep>
            <SubStep n={2} color="cyan">
              No dropdown do topo da página, selecione o <strong>dataset</strong> correspondente ao modelo que você documentou.
            </SubStep>
            <SubStep n={3} color="cyan">
              <div>
                <p>Na seção <strong>&quot;Documentação para Chat&quot;</strong>:</p>
                <p className="text-[13px] text-gray-600 mt-1.5">
                  Clique em <strong>&quot;Importar&quot;</strong> → arraste o arquivo <strong>.md</strong> que você gerou e testou
                  (ou clique para selecionar, ou cole o conteúdo diretamente).
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  O sistema vai validar o formato automaticamente, mostrando quantas medidas, tabelas, queries e exemplos foram encontrados.
                </p>
              </div>
            </SubStep>
            <SubStep n={4} color="cyan">
              <div>
                <p>Na seção <strong>&quot;Base de DAX&quot;</strong> (se gerou no passo anterior):</p>
                <p className="text-[13px] text-gray-600 mt-1.5">
                  Clique em <strong>&quot;Importar&quot;</strong> → arraste o arquivo <strong>.json</strong> ou cole o conteúdo.
                </p>
              </div>
            </SubStep>
            <SubStep n={5} color="cyan">
              Se não houver erros de validação, clique em <strong>&quot;Salvar&quot;</strong> em cada seção.
            </SubStep>
          </div>

          {/* Success */}
          <div className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl text-center shadow-inner">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <p className="text-xl font-bold text-emerald-900">Configuração completa!</p>
            <p className="text-sm text-emerald-700 mt-2">
              O assistente IA do MeuDashboard está pronto para responder perguntas sobre seus dados.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/assistente-ia/contextos"
              className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              Ver Contextos da IA
            </a>
            <a
              href="/assistente-ia"
              className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all"
            >
              Testar o Assistente IA
            </a>
          </div>

          <InfoBox>
            Sempre que o modelo do Power BI mudar significativamente (novas medidas, novas tabelas, mudança de estrutura),
            recomendamos <strong>regerar a documentação</strong> repetindo os passos 4 a 7 para manter o assistente atualizado.
          </InfoBox>
        </div>
      ),
    },
  ];

  /* ─── color maps ─── */

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };
  const dotColorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
  };

  const currentStepData = steps[currentStep];

  /* ─── render ─── */

  return (
    <div className="min-h-screen pb-16 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
      {/* Header */}
      <div className="mb-10">
        <a
          href="/assistente-ia/contextos"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-5 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para Contextos
        </a>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-4 ring-white">
            <Brain size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Como Configurar a IA</h1>
            <p className="text-sm text-slate-500 mt-0.5">Guia completo: Claude Desktop + MCP Power BI + Documentação</p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="p-5 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border-2 border-purple-200/60 rounded-2xl mb-10 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-purple-100/80 flex items-center justify-center">
            <Zap size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800 mb-1">O que você vai fazer neste tutorial:</p>
            <p className="text-[13px] text-purple-700 leading-relaxed">
              Instalar o <strong>Claude Desktop</strong> → Conectar ao <strong>Power BI</strong> via MCP →
              Gerar <strong>documentação inteligente</strong> com medidas otimizadas →
              Testar com perguntas reais → Importar no <strong>MeuDashboard</strong>.
              Tempo estimado: <strong>~1 hora</strong> na primeira vez.
            </p>
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

export default function TutorialContextosPage() {
  return (
    <MainLayout>
      <TutorialContent />
    </MainLayout>
  );
}
