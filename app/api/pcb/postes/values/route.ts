import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const search = request.nextUrl.search || '';

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/postes/values${search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => '');

    if (!response.ok) {
      return NextResponse.json(
        typeof data === 'object' ? data : { error: String(data || `Erreur ${response.status}`) },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/pcb/postes/values:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
