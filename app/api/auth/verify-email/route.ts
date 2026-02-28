import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email e código são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: verification, error } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !verification) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
    }

    const { data: freePlan } = await supabase
      .from('developer_plans')
      .select('id')
      .eq('name', 'Free')
      .eq('is_active', true)
      .single();

    if (!freePlan) {
      return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 });
    }

    const baseSlug = verification.company_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let finalSlug = baseSlug;
    let slugSuffix = 0;
    while (true) {
      const { data: existingSlug } = await supabase
        .from('developers')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();
      if (!existingSlug) break;
      slugSuffix++;
      finalSlug = `${baseSlug}-${slugSuffix}`;
    }

    const { data: newDeveloper, error: devError } = await supabase
      .from('developers')
      .insert({
        name: verification.company_name,
        slug: finalSlug,
        email: verification.email,
        phone: verification.phone ?? null,
        plan_id: freePlan.id,
        status: 'active',
        self_registered: true,
        registered_at: new Date().toISOString(),
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
      })
      .select('id, name, slug')
      .single();

    if (devError || !newDeveloper) {
      console.error('[verify-email] Erro ao criar developer:', devError);
      return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
    }

    const { data: newGroup } = await supabase
      .from('company_groups')
      .insert({
        name: verification.company_name,
        slug: finalSlug,
        developer_id: newDeveloper.id,
        status: 'active',
      })
      .select('id')
      .single();

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: verification.email,
        full_name: verification.full_name,
        password_hash: verification.password_hash,
        phone: verification.phone ?? null,
        is_master: false,
        is_developer_user: true,
        developer_id: newDeveloper.id,
        status: 'active',
        self_registered: true,
        onboarding_completed: false,
      })
      .select('id, email, full_name')
      .single();

    if (userError || !newUser) {
      console.error('[verify-email] Erro ao criar usuário:', userError);
      await supabase.from('developers').delete().eq('id', newDeveloper.id);
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }

    await supabase.from('developer_users').insert({
      developer_id: newDeveloper.id,
      user_id: newUser.id,
      role: 'owner',
      is_active: true,
    });

    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    const tokenData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.full_name,
      role: 'developer',
      groupId: newGroup?.id ?? null,
      developerId: newDeveloper.id,
      isDeveloperUser: true,
      groupIds: newGroup ? [newGroup.id] : [],
    };

    const token = await createToken(tokenData as any);

    const response = NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.full_name,
        role: 'developer',
        developerId: newDeveloper.id,
        isDeveloperUser: true,
      },
    });

    const host = request.headers.get('host') || '';
    const cookieOptions: { httpOnly: boolean; secure: boolean; sameSite: 'lax'; maxAge: number; path: string; domain?: string } = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };
    if (process.env.NODE_ENV === 'production') {
      if (host.includes('meudashboard.com')) {
        cookieOptions.domain = '.meudashboard.com';
      } else {
        cookieOptions.domain = '.meudashboard.org';
      }
    }
    response.cookies.set('auth-token', token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('[verify-email] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
