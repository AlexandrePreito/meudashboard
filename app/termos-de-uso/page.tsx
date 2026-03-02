import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de Uso da plataforma MeuDashboard - Dashboards Power BI embeddados multi-tenant.',
};

export default function TermosDeUsoPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Termos de Uso</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: março de 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Definições</h2>
            <p>
              Para fins destes Termos de Uso, consideram-se as seguintes definições: <strong>Plataforma</strong> refere-se ao MeuDashboard, serviço de software como serviço (SaaS) operado pela Vion Business Intelligence LTDA; <strong>Usuário</strong> é toda pessoa física ou jurídica que utiliza a Plataforma; <strong>Desenvolvedor</strong> é o usuário que contrata planos, configura dashboards e gerencia a conta; <strong>Viewer</strong> é o usuário final que visualiza os dashboards Power BI; <strong>Planos</strong> são as modalidades de assinatura oferecidas (Free, Starter, Pro, Enterprise).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar o MeuDashboard, você declara ter lido, compreendido e aceitado integralmente estes Termos de Uso. Caso não concorde com qualquer disposição, não utilize a Plataforma. O uso continuado constitui aceitação tácita das alterações publicadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Descrição do Serviço</h2>
            <p>
              O MeuDashboard é uma plataforma SaaS que permite hospedar, publicar e compartilhar dashboards Power BI de forma embeddada em ambiente multi-tenant. O serviço inclui integração com WhatsApp para consulta de dados via assistente de IA, alertas automáticos de métricas, controle de acesso por usuários e grupos, monitoramento de atualizações e suporte a subdomínios personalizados para cada desenvolvedor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Planos e Assinaturas</h2>
            <p>
              A Plataforma oferece os planos Free, Starter, Pro e Enterprise. O plano Free possui limitações de uso definidas no momento da contratação. Os planos pagos (Starter, Pro, Enterprise) são cobrados conforme a tabela vigente e podem ser alterados mediante aviso prévio. A assinatura renova-se automaticamente até o cancelamento pelo usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Cadastro e Responsabilidades do Usuário</h2>
            <p>
              O cadastro exige informações verdadeiras e atualizadas. O usuário é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta. É vedado compartilhar credenciais, utilizar a Plataforma para fins ilícitos ou que violem direitos de terceiros. O desenvolvedor responde pelos dados e conteúdos que publica e pela conduta dos viewers vinculados à sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Propriedade Intelectual</h2>
            <p>
              O software, marcas, logotipos e demais elementos da Plataforma são de propriedade da Vion Business Intelligence LTDA ou de seus licenciadores. O usuário mantém a propriedade sobre seus dados e relatórios Power BI. Ao utilizar o serviço, o usuário concede à Vion licença não exclusiva para processar e exibir seus dados exclusivamente para fins de prestação do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Uso Aceitável e Proibições</h2>
            <p>
              É proibido utilizar a Plataforma para distribuir malware, realizar ataques, violar leis ou regulamentos, infringir direitos de terceiros, fazer engenharia reversa ou tentar acessar áreas restritas do sistema. O descumprimento pode resultar em suspensão ou encerramento imediato da conta, sem prejuízo de medidas legais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Limitação de Responsabilidade</h2>
            <p>
              A Vion Business Intelligence LTDA não se responsabiliza por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso ou da impossibilidade de uso da Plataforma. A responsabilidade total está limitada ao valor pago pelo usuário nos últimos 12 meses. A Plataforma depende de serviços de terceiros (Microsoft Power BI, provedores de infraestrutura) e a Vion não responde por falhas ou indisponibilidades desses serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Disponibilidade do Serviço</h2>
            <p>
              A Plataforma é oferecida &quot;como está&quot;, sem garantia de disponibilidade ininterrupta. Não há SLA (Acordo de Nível de Serviço) garantido nos planos padrão. A Vion envidará esforços razoáveis para manter o serviço operacional, mas não se compromete com uptime específico. Manutenções programadas serão comunicadas quando possível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Cancelamento e Encerramento de Conta</h2>
            <p>
              O usuário pode cancelar sua assinatura a qualquer momento através das configurações da conta. O cancelamento não gera reembolso de valores já pagos. A Vion reserva-se o direito de encerrar ou suspender contas em caso de violação destes Termos, inadimplência ou por decisão comercial, mediante aviso quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Subdomínios Personalizados</h2>
            <p>
              A Plataforma oferece a funcionalidade de subdomínios personalizados, permitindo que desenvolvedores disponibilizem seus dashboards em URLs exclusivas (ex.: cliente.meudashboard.org). O uso dessa funcionalidade está sujeito aos mesmos Termos e à política de nomes de subdomínio da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Modificações nos Termos</h2>
            <p>
              A Vion pode alterar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas por e-mail ou aviso na Plataforma com antecedência mínima de 30 dias. O uso continuado após a vigência das alterações constitui aceitação. Caso não concorde, o usuário deve encerrar sua conta antes da data de vigência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">13. Legislação Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias, fica eleito o foro da comarca de Goiânia/GO, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">14. Vigência</h2>
            <p>
              Estes Termos entram em vigor em março de 2026 e permanecem válidos até que sejam substituídos por nova versão.
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
