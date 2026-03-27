import { NextRequest, NextResponse } from 'next/server';

// Route proxy Next.js (App Router): /api/formations/[id]/assigned-departments
//
// Rôle:
// - GET: récupère la liste des départements affectés à une formation.
// - Utilisé par l'UI pour pré-cocher les départements lors de l'ouverture de la modale d'affectation.
// - Le token est relayé via le header Authorization.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formationId } = await params;
    const authHeader = request.headers.get('Authorization');
    const response = await fetch(`${BACKEND_URL}/formations/${formationId}/assigned-departments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de la récupération des départements affectés' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/formations/[id]/assigned-departments:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

