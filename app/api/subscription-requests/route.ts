import { NextRequest, NextResponse } from 'next/server';

// Proxy public (pas d'auth) : /api/subscription-requests → backend FastAPI
// Formulaire de demande d'abonnement soumis depuis /tarifs
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/subscription-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          errorData || { detail: `Erreur ${response.status}` },
          { status: response.status },
        );
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { detail: text || `Erreur ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erreur serveur inconnue';
    console.error('Erreur API POST /api/subscription-requests:', error);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
