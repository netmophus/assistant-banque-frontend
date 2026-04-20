import { NextRequest, NextResponse } from 'next/server';

// POST /api/pcb/ratios/analyse - Calcule les ratios + génère une analyse IA
export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const body = await request.text();

    const response = await fetch(`${backendUrl}/api/pcb/ratios/analyse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(errorData || { error: 'Erreur analyse IA ratios' }, { status: response.status });
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: text || 'Erreur analyse IA ratios' }, { status: response.status });
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    const text = await response.text();
    return new NextResponse(text, { status: response.status });
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/ratios/analyse:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
