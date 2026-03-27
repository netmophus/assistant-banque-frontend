import { NextRequest, NextResponse } from 'next/server';

// GET /api/pcb/reports - Récupérer les rapports
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const search = request.nextUrl.search || '';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    
    const response = await fetch(`${backendUrl}/api/pcb/reports${search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des rapports' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API /api/pcb/reports:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
