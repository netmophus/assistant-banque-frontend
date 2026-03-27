import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const searchParams = request.nextUrl.searchParams;
    const dateActuelle = searchParams.get('date_actuelle');
    const datePrecedente = searchParams.get('date_precedente');

    if (!dateActuelle) {
      return NextResponse.json(
        { error: 'Le paramètre date_actuelle est requis' },
        { status: 400 }
      );
    }

    let url = `${BACKEND_URL}/impayes/statistiques/comparaison?date_actuelle=${dateActuelle}`;
    if (datePrecedente) {
      url += `&date_precedente=${datePrecedente}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors du chargement de la comparaison' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/impayes/statistiques/comparaison:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

