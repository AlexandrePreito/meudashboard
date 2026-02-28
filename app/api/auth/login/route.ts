import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha sao obrigatorios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar usuario com todos os campos necessarios
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, password_hash, is_master, status, developer_id, is_developer_user')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se usuario esta ativo
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Usuario inativo. Entre em contato com o administrador.' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    const subdomain = request.headers.get('x-subdomain');
    if (subdomain) {
      const { data: subDev } = await supabase
        .from('developers')
        .select('id')
        .eq('subdomain', subdomain.toLowerCase())
        .eq('subdomain_enabled', true)
        .eq('subdomain_approved', true)
        .single();

      if (subDev) {
        const isOwner = user.developer_id === subDev.id;
        if (!isOwner) {
          const { data: groups } = await supabase
            .from('company_groups')
            .select('id')
            .eq('developer_id', subDev.id);
          const groupIdsDev = groups?.map(g => g.id) || [];
          const { data: membership } = await supabase
            .from('user_group_membership')
            .select('company_group_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('company_group_id', groupIdsDev.length ? groupIdsDev : ['00000000-0000-0000-0000-000000000000']);
          if (!membership || membership.length === 0) {
            return NextResponse.json(
              { error: 'Você não tem acesso a esta área' },
              { status: 403 }
            );
          }
        }
      }
    }

    // Verificar se está usando senha padrão "123456"
    const isDefaultPassword = await bcrypt.compare('123456', user.password_hash);
    const needsPasswordChange = isDefaultPassword;

    // Verificar se é admin de algum grupo
    let userRole = user.is_master ? 'master' : 'user';
    let groupIds: string[] = [];

    if (!user.is_master && !user.is_developer_user) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      groupIds = memberships?.map(m => m.company_group_id) || [];
      
      if (memberships?.some(m => m.role === 'admin')) {
        userRole = 'admin';
      }
    }

    // Criar token JWT
    const tokenData = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: userRole,
      groupId: null,
      developerId: user.developer_id,
      isDeveloperUser: user.is_developer_user || false,
      groupIds: groupIds,
    };

    const token = await createToken(tokenData as any);

    // Buscar developer info para tema
    let developerInfo = null;
    let membershipData: { developer_id?: string; primary_color?: string; use_developer_colors?: boolean } | null = null;
    
    if (!user.is_master && !user.is_developer_user) {
      // Usuario comum: buscar developer do grupo
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group:company_groups(developer_id, primary_color, use_developer_colors)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      const companyGroup = membership?.company_group;
      membershipData = Array.isArray(companyGroup) ? companyGroup[0] : companyGroup ?? null;
      
      if (membershipData?.developer_id) {
        const { data: devData } = await supabase
          .from('developers')
          .select('primary_color')
          .eq('id', membershipData.developer_id)
          .single();
        developerInfo = devData;
      }
    } else if (user.is_developer_user && user.developer_id) {
      // Desenvolvedor: buscar sua propria info
      const { data: devData } = await supabase
        .from('developers')
        .select('primary_color')
        .eq('id', user.developer_id)
        .single();
      developerInfo = devData;
    }

    // Criar resposta com cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: userRole,
        groupId: null,
        developerId: user.developer_id,
        isDeveloperUser: user.is_developer_user || false,
        groupIds: groupIds,
        developer: developerInfo,
        group: membershipData,
        needsPasswordChange: needsPasswordChange,
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
