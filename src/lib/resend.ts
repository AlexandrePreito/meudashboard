import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: 'MeuDashboard <noreply@meudashboard.org>',
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[resend] Erro ao enviar email:', error);
    throw new Error(error.message || 'Erro ao enviar email');
  }

  return data;
}
