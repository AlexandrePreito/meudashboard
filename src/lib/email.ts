import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, code: string, name: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[email] RESEND_API_KEY não configurado');
      return false;
    }

    const { error } = await resend.emails.send({
      from: 'MeuDashboard <noreply@meudashboard.org>',
      to: email,
      subject: `${code} - Código de verificação MeuDashboard`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
  <!-- Header azul -->
  <div style="background: linear-gradient(135deg, #2563EB, #1D4ED8); padding: 24px 32px; border-radius: 16px 16px 0 0;">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; vertical-align: middle;">
          <span style="color: white; font-size: 16px; font-weight: bold;">M</span>
        </td>
        <td style="padding-left: 10px;">
          <span style="color: white; font-size: 18px; font-weight: bold;">MeuDashboard</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Conteúdo -->
  <div style="padding: 32px;">
    <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 4px 0;">Olá, ${name}! 👋</h2>
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
      Obrigado por se cadastrar no MeuDashboard. Use o código abaixo para confirmar seu email e ativar sua conta:
    </p>

    <!-- Código -->
    <div style="background: linear-gradient(135deg, #F9FAFB, #EFF6FF); border: 2px solid #BFDBFE; border-radius: 16px; padding: 28px 24px; text-align: center; margin: 0 0 24px 0;">
      <p style="color: #9CA3AF; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin: 0 0 12px 0;">Seu código de verificação</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #2563EB;">
        ${code}
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin: 12px 0 0 0;">
        ⏱ Este código expira em <strong style="color: #6B7280;">15 minutos</strong>
      </p>
    </div>

    <!-- Aviso -->
    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 18px; margin: 0 0 24px 0;">
      <p style="color: #92400E; font-size: 12px; margin: 0; line-height: 1.5;">
        💡 Se você não criou uma conta no MeuDashboard, ignore este email. Nenhuma ação será tomada.
      </p>
    </div>

    <!-- Separator -->
    <div style="border-top: 1px solid #F3F4F6; padding-top: 20px;">
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
        Este é um email automático do <strong>MeuDashboard</strong>.<br />
        Não responda a este email.
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background: #F9FAFB; padding: 16px 32px; border-radius: 0 0 16px 16px; border-top: 1px solid #F3F4F6;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td><span style="color: #D1D5DB; font-size: 12px;">meudashboard.org</span></td>
        <td style="text-align: right;"><span style="color: #D1D5DB; font-size: 12px;">© 2026 MeuDashboard</span></td>
      </tr>
    </table>
  </div>
</div>
      `,
    });

    if (error) {
      console.error('[email] Erro ao enviar:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Erro:', err);
    return false;
  }
}
