import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/resend';
import crypto from 'crypto';

/**
 * POST /api/auth/forgot-password
 * Envia email com link para redefinir senha
 *
 * Body:
 * - email: string
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar usuário pelo email
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    // Sempre retornar sucesso (por segurança, não revelar se o email existe)
    if (fetchError || !user) {
      console.log('[forgot-password] Email não encontrado:', email);
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá as instruções em instantes.',
      });
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    // Salvar token na tabela users
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: token,
        reset_token_expires: expiresAt,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[forgot-password] Erro ao salvar token:', updateError);
      return NextResponse.json(
        { error: 'Erro interno. Tente novamente.' },
        { status: 500 }
      );
    }

    // Determinar a URL base (suportar subdomínios)
    const host = request.headers.get('host') || 'meudashboard.org';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;

    // Enviar email
    const userName = user.name || 'Usuário';

    await sendEmail({
      to: user.email,
      subject: 'Redefinir sua senha — MeuDashboard',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:480px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); padding:32px; text-align:center;">
              <h1 style="color:#ffffff; font-size:20px; font-weight:700; margin:0;">MeuDashboard</h1>
            </div>

            <!-- Content -->
            <div style="padding:32px;">
              <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 8px 0;">
                Olá, <strong>${userName}</strong>!
              </p>
              <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 24px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
              </p>

              <!-- CTA Button -->
              <div style="text-align:center; margin:32px 0;">
                <a href="${resetUrl}" style="background:#3b82f6; color:#ffffff; padding:14px 32px; border-radius:12px; font-size:14px; font-weight:600; text-decoration:none; display:inline-block;">
                  Redefinir minha senha
                </a>
              </div>

              <p style="color:#94a3b8; font-size:12px; line-height:1.6; margin:0 0 16px 0;">
                Este link é válido por <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este email.
              </p>

              <!-- Fallback link -->
              <div style="background:#f8fafc; border-radius:8px; padding:12px; margin-top:16px;">
                <p style="color:#94a3b8; font-size:11px; margin:0 0 4px 0;">Caso o botão não funcione, copie e cole este link:</p>
                <p style="color:#3b82f6; font-size:11px; word-break:break-all; margin:0;">${resetUrl}</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding:20px 32px; border-top:1px solid #f1f5f9; text-align:center;">
              <p style="color:#cbd5e1; font-size:11px; margin:0;">
                © ${new Date().getFullYear()} MeuDashboard — Ambiente seguro com criptografia
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[forgot-password] Email enviado para: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá as instruções em instantes.',
    });
  } catch (error: unknown) {
    console.error('[forgot-password] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
