import { NextRequest, NextResponse } from 'next/server';

// POST /api/pcb/reports/:id/analyser-ia
// Déclenche l'analyse IA sur un rapport existant. Peut prendre 30-60 secondes.
export const maxDuration = 120; // secondes (si déployé sur Vercel Pro/Enterprise)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/reports/${encodeURIComponent(id)}/analyser-ia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(errorData || { error: 'Erreur analyse IA' }, { status: response.status });
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: text || 'Erreur analyse IA' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/reports/[id]/analyser-ia:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
