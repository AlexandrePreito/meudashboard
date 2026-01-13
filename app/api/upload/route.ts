import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo nao permitido' }, { status: 400 });
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Max 2MB' }, { status: 400 });
    }

    // Criar cliente Supabase com service role para upload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gerar nome unico para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Erro no upload:', error);
      return NextResponse.json({ error: 'Erro ao fazer upload: ' + error.message }, { status: 500 });
    }

    // Obter URL publica
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: fileName
    });
  } catch (error: any) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
