import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Política de Privacidade do MeuDashboard - Conformidade com a LGPD (Lei 13.709/2018).',
};

export default function PoliticaDePrivacidadePage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: março de 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <p>
              A Vion Business Intelligence LTDA, operadora do MeuDashboard, está comprometida com a proteção dos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Esta política descreve como coletamos, utilizamos, armazenamos e protegemos suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Dados Pessoais Coletados</h2>
            <p>
              Coletamos dados que você nos fornece diretamente: nome completo, endereço de e-mail, telefone (quando necessário para integração com WhatsApp), senha (armazenada de forma criptografada) e dados de perfil da conta. Também coletamos dados de uso da Plataforma, como logs de acesso, endereço IP, tipo de navegador e ações realizadas no sistema, para fins de segurança e melhoria do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Finalidade do Tratamento</h2>
            <p>
              Os dados são tratados para prestar o serviço de dashboards Power BI, gerenciar sua conta, processar pagamentos, enviar comunicações sobre o serviço, responder a solicitações de suporte, garantir a segurança da Plataforma e cumprir obrigações legais. Não utilizamos seus dados para finalidades incompatíveis com essas descritas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Base Legal</h2>
            <p>
              O tratamento baseia-se na execução de contrato (prestação do serviço), no consentimento (quando solicitado para finalidades específicas), no legítimo interesse (segurança, melhoria do produto) e no cumprimento de obrigação legal, conforme previsto no art. 7º da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Compartilhamento de Dados</h2>
            <p>
              Podemos compartilhar dados com prestadores de serviço essenciais à operação: Supabase (banco de dados e autenticação), Vercel (hospedagem), Resend (envio de e-mails), Microsoft Power BI (exibição de dashboards) e provedores da API do WhatsApp (integração de mensagens). Esses prestadores são contratados com cláusulas de confidencialidade e processamento de dados em conformidade com a LGPD. Não vendemos nem alugamos seus dados a terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              Utilizamos cookies e tecnologias similares para autenticação, preferências de sessão e funcionamento da Plataforma. Detalhes sobre os cookies utilizados estão descritos em nossa Política de Cookies, disponível em /politica-de-cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Armazenamento e Segurança</h2>
            <p>
              Os dados são armazenados em servidores com criptografia em trânsito (TLS/SSL) e em repouso. As senhas são tratadas com algoritmos de hash (bcrypt) e nunca armazenadas em texto plano. Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Direitos do Titular</h2>
            <p>
              Nos termos da LGPD, você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou desatualizados; solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; solicitar a portabilidade dos dados; revogar o consentimento; e obter informações sobre com quem compartilhamos seus dados. Para exercer esses direitos, entre em contato pelo e-mail contato@vion.com.br.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Retenção de Dados</h2>
            <p>
              Mantemos os dados pelo tempo necessário para cumprir as finalidades descritas e para atender a obrigações legais, regulatórias ou de auditoria. Após o encerramento da conta, os dados podem ser mantidos por período adicional para fins legais ou excluídos conforme solicitação do titular, respeitando os prazos legais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Transferência Internacional</h2>
            <p>
              Alguns prestadores de serviço podem processar dados em servidores localizados fora do Brasil. Nesses casos, garantimos que haja adequado nível de proteção ou que sejam adotadas cláusulas contratuais padrão ou outros mecanismos previstos na LGPD para transferências internacionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Encarregado de Proteção de Dados (DPO)</h2>
            <p>
              Para questões relacionadas à proteção de dados pessoais, você pode contatar nosso Encarregado de Proteção de Dados pelo e-mail contato@vion.com.br.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Alterações na Política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas por e-mail ou aviso na Plataforma. A data da última atualização consta no topo deste documento. Recomendamos a leitura periódica desta política.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Contato</h2>
            <p>
              Vion Business Intelligence LTDA — CNPJ 34.620.940/0001-03<br />
              Endereço: AV T7, Quadra R34, Anexo 1E, Sala 1219, Anexo B - Setor Oeste<br />
              E-mail: contato@vion.com.br | Site: https://meudashboard.org
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
