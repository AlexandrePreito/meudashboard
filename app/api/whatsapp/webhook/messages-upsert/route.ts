import { POST as webhookPOST } from '../route';

export const POST = webhookPOST;
export const GET = () => new Response('OK', { status: 200 });
