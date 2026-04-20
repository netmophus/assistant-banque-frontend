import { NextRequest, NextResponse } from 'next/server';

// POST /api/pcb/reports/import — Upload d'un Excel de bilan (multipart/form-data)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    // Récupère le multipart du client
    const formData = await request.formData();

    const response = await fetch(`${backendUrl}/api/pcb/reports/import`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        // PAS de Content-Type : fetch le set automatiquement avec le boundary multipart
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          errorData || { error: `Erreur import ${response.status}` },
          { status: response.status },
        );
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: text || `Erreur import ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/reports/import:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
