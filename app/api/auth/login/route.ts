import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha sao obrigatorios' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Buscar usuario com todos os campos necessarios
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, password_hash, is_master, status, developer_id, is_developer_user')
      .eq('email', email.toLowerCase().trim())
      .single();

    console.log('Usuario encontrado:', user ? 'SIM' : 'NAO', user?.email);

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

    console.log('Status do usuario:', user.status);

    // Verificar senha
    console.log('Verificando senha...');
    console.log('Password hash existe:', !!user.password_hash);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Senha valida:', isValidPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Criar token JWT
    const tokenData = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.is_master ? 'master' : 'user',
      groupId: null,
      developerId: user.developer_id,
      isDeveloperUser: user.is_developer_user || false,
    };

    const token = jwt.sign(tokenData, jwtSecret, { expiresIn: '7d' });

    // Buscar developer info para tema
    let developerInfo = null;
    let membershipData = null;
    
    if (!user.is_master && !user.is_developer_user) {
      // Usuario comum: buscar developer do grupo
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group:company_groups(developer_id, primary_color, use_developer_colors)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      membershipData = membership?.company_group;
      
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
        role: user.is_master ? 'master' : 'user',
        groupId: null,
        developerId: user.developer_id,
        isDeveloperUser: user.is_developer_user || false,
        developer: developerInfo,
        group: membershipData,
      },
    });

    // Setar cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
