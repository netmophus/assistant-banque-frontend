import { NextRequest, NextResponse } from 'next/server';

// POST /api/pcb/generation-auto — Upload balance GL Excel → bilan + CR auto
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader =
      request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const formData = await request.formData();

    const response = await fetch(`${backendUrl}/api/pcb/generation-auto`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        // Pas de Content-Type : fetch le set automatiquement avec le boundary multipart
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          errorData || { error: `Erreur ${response.status}` },
          { status: response.status },
        );
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { error: text || `Erreur ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('Erreur API POST /api/pcb/generation-auto:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
