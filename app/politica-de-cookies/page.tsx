import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de Cookies do MeuDashboard - Informações sobre os cookies utilizados na plataforma.',
};

export default function PoliticaDeCookiesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
            ← Voltar ao site
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Cookies</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: março de 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">O que são cookies</h2>
            <p>
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou celular) quando você visita um site. Eles permitem que a Plataforma reconheça seu dispositivo, lembre suas preferências e melhore sua experiência de uso. Os cookies podem ser próprios (definidos por nós) ou de terceiros (definidos por outros serviços).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Cookies utilizados pelo MeuDashboard</h2>
            <p>
              Utilizamos os seguintes cookies em nossa Plataforma:
            </p>
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">auth-token</h3>
                <p className="text-slate-600 text-sm mt-1">
                  <strong>Finalidade:</strong> Autenticação e manutenção da sessão do usuário logado.<br />
                  <strong>Tipo:</strong> Essencial — necessário para o funcionamento da Plataforma.<br />
                  <strong>Duração:</strong> Sessão ou conforme configuração de segurança.
                </p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">x-subdomain</h3>
                <p className="text-slate-600 text-sm mt-1">
                  <strong>Finalidade:</strong> Detecção e identificação do subdomínio quando o usuário acessa a Plataforma por URL personalizada (ex.: cliente.meudashboard.org).<br />
                  <strong>Tipo:</strong> Essencial — necessário para o roteamento correto em ambiente multi-tenant.<br />
                  <strong>Duração:</strong> Até 1 hora.
                </p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">theme-color</h3>
                <p className="text-slate-600 text-sm mt-1">
                  <strong>Finalidade:</strong> Armazenar a preferência visual do usuário (tema claro ou escuro, cor primária personalizada).<br />
                  <strong>Tipo:</strong> Funcional — melhora a experiência, mas não é indispensável.<br />
                  <strong>Duração:</strong> Persistente, conforme preferência do usuário.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Cookies de terceiros</h2>
            <p>
              Podemos utilizar serviços de terceiros que definem seus próprios cookies, como o Vercel Analytics (quando habilitado), para análise de uso e desempenho do site. Esses cookies estão sujeitos às políticas de privacidade dos respectivos provedores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Como gerenciar ou desativar cookies</h2>
            <p>
              Você pode configurar seu navegador para bloquear ou excluir cookies. As opções geralmente estão em &quot;Configurações&quot;, &quot;Privacidade&quot; ou &quot;Preferências&quot;. Cada navegador possui instruções específicas: Chrome, Firefox, Safari, Edge e outros oferecem controles para gerenciar cookies. Observe que bloquear todos os cookies pode afetar o funcionamento de diversos sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Impacto de desativar cookies essenciais</h2>
            <p>
              Se você desativar os cookies essenciais (auth-token e x-subdomain), não será possível manter sua sessão logada nem acessar a Plataforma por subdomínios personalizados. O MeuDashboard depende desses cookies para autenticação e roteamento. A desativação de cookies funcionais (como theme-color) não impede o uso da Plataforma, mas pode afetar preferências salvas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Alterações</h2>
            <p>
              Esta política pode ser atualizada para refletir mudanças nos cookies utilizados. A data da última atualização consta no topo desta página. Recomendamos a leitura periódica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Contato</h2>
            <p>
              Para dúvidas sobre cookies ou privacidade: contato@vion.com.br
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Voltar ao início
          </Link>
        </div>
      </footer>
    </div>
  );
}
