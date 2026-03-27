import { NextRequest, NextResponse } from 'next/server';

// Route proxy Next.js (App Router): /api/formations/[id]
//
// Rôle:
// - Permet au frontend d'appeler le backend FastAPI sans exposer directement l'URL.
// - GET: récupérer une formation complète (modules/chapitres/parties, contenu généré, QCM).
// - PUT: mettre à jour une formation (souvent en brouillon pendant la saisie).
// - Le token est relayé via le header Authorization.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formationId } = await params;
    const authHeader = request.headers.get('Authorization');
    const response = await fetch(`${BACKEND_URL}/formations/${formationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de la récupération de la formation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/formations/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formationId } = await params;
    const authHeader = request.headers.get('Authorization');
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/formations/${formationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de la mise à jour de la formation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PUT /api/formations/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

