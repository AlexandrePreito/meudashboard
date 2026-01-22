import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.text();
  
  const response = await fetch('https://www.meudashboard.org/api/whatsapp/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}

export async function GET() {
  return Response.json({ status: 'ok', message: 'Redirect to main webhook' });
}
