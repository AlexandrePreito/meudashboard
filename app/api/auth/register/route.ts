import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/email';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, phone, password, company_name } = await request.json();

    if (!full_name || !email || !password || !company_name) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json(
        { error: 'Telefone inválido' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (company_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nome da empresa deve ter pelo menos 2 caracteres' },
        { status: 400 }
      );
    }

    const emailNormalized = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalized)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailNormalized)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado. Faça login.' },
        { status: 409 }
      );
    }

    const code = generateCode();
    const passwordHash = await bcrypt.hash(password, 10);

    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', emailNormalized);

    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        email: emailNormalized,
        code,
        full_name: full_name.trim(),
        company_name: company_name.trim(),
        password_hash: passwordHash,
        phone: phone.replace(/\D/g, ''),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('[register] Erro ao salvar verificação:', insertError);
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }

    const sent = await sendVerificationEmail(emailNormalized, code, full_name.trim());
    if (!sent) {
      return NextResponse.json(
        { error: 'Erro ao enviar email de verificação. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Código de verificação enviado para seu email',
      email: emailNormalized,
    });
  } catch (error: any) {
    console.error('[register] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
