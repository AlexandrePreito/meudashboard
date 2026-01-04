/**
 * API Route - Grupos de Empresas do Usuário
 * 
 * Endpoint GET que retorna os grupos de empresas disponíveis para o usuário autenticado.
 * 
 * Processo:
 * 1. Verifica autenticação do usuário
 * 2. Se for master: retorna todos os grupos ativos
 * 3. Se não for master: retorna apenas os grupos onde o usuário tem membership ativo
 * 4. Retorna lista de grupos com id, name e slug
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Obtém o usuário autenticado
    const user = await getAuthUser();

    // Se não autenticado, retorna 401
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    let groups: Array<{ id: string; name: string; slug: string }> = [];

    // Se o usuário for master, busca TODOS os grupos ativos
    if (user.is_master) {
      const { data, error } = await supabase
        .from('company_groups')
        .select('id, name, slug')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Erro ao buscar grupos (master):', error);
        return NextResponse.json(
          { error: 'Erro ao buscar grupos' },
          { status: 500 }
        );
      }

      groups = data || [];
    } else {
      // Se não for master, busca através da tabela user_group_membership
      const { data, error } = await supabase
        .from('user_group_membership')
        .select(`
          company_group:company_groups (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao buscar grupos (membership):', error);
        return NextResponse.json(
          { error: 'Erro ao buscar grupos' },
          { status: 500 }
        );
      }

      // Extrai os grupos do resultado do join
      groups = (data || [])
        .map((item: any) => item.company_group)
        .filter((group: any) => group !== null);
    }

    // Retorna os grupos
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}



