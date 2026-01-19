import { NextResponse } from 'next/server';

export async function POST() {
  // Apenas confirma recebimento, não processa
  return NextResponse.json({ status: 'ignored', reason: 'chats-update' });
}

export async function GET() {
  return new Response('OK', { status: 200 });
}
