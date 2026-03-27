import { NextRequest, NextResponse } from 'next/server';

// GET /api/pcb/ratio-gestion-lines - Récupérer les ratios de gestion
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const search = request.nextUrl.search || '';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/ratio-gestion-lines${search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des ratios de gestion' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API /api/pcb/ratio-gestion-lines:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/pcb/ratio-gestion-lines - Créer un ratio de gestion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const search = request.nextUrl.search || '';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/ratio-gestion-lines${search}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData || { error: 'Erreur lors de la création' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/ratio-gestion-lines:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
