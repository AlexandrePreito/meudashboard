import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('group_id') as string;
    const uploadType = formData.get('type') as string; // 'developer' ou 'group'

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou SVG.' }, { status: 400 });
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Gerar nome único baseado no tipo
    let fileName: string;
    if (uploadType === 'developer') {
      const developerId = await getUserDeveloperId(user.id);
      if (!developerId) {
        return NextResponse.json({ error: 'Usuario nao e desenvolvedor' }, { status: 403 });
      }
      const ext = file.name.split('.').pop();
      fileName = `dev_${developerId}_${Date.now()}.${ext}`;
    } else {
      const ext = file.name.split('.').pop();
      fileName = `${groupId || 'temp'}_${Date.now()}.${ext}`;
    }

    // Converter para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Erro no upload:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: data.path
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
