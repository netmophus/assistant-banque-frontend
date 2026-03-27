import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const searchParams = request.nextUrl.searchParams;

    let url = `${BACKEND_URL}/impayes/messages/history?`;
    searchParams.forEach((value, key) => {
      url += `${key}=${encodeURIComponent(value)}&`;
    });
    url = url.slice(0, -1); // Remove last &

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
        errorData || { error: 'Erreur lors du chargement de l\'historique' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/impayes/messages/history:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

