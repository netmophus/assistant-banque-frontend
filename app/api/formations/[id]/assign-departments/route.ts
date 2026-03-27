import { NextRequest, NextResponse } from 'next/server';

// Route proxy Next.js (App Router): /api/formations/[id]/assign-departments
//
// Rôle:
// - Permet à un admin d'affecter une formation (généralement publiée) à des départements.
// - POST body attendu: { formation_id, department_ids: string[] }
// - Le token est relayé via le header Authorization.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formationId } = await params;
    const authHeader = request.headers.get('Authorization');
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/formations/${formationId}/assign-departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de l\'affectation de la formation aux départements' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/formations/[id]/assign-departments:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

