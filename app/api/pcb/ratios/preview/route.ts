import { NextRequest, NextResponse } from 'next/server';

// GET /api/pcb/ratios/preview - Prévisualiser les ratios calculés à une date
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/pcb/ratios/preview${request.nextUrl.search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(errorData || { error: 'Erreur preview ratios' }, { status: response.status });
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: text || 'Erreur preview ratios' }, { status: response.status });
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    const text = await response.text();
    return new NextResponse(text, { status: response.status });
  } catch (error: any) {
    console.error('Erreur API GET /api/pcb/ratios/preview:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
