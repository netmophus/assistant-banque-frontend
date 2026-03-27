import { NextRequest, NextResponse } from 'next/server';

// POST /api/pcb/reports/generate - Générer un rapport
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type_rapport = searchParams.get('type_rapport');
    const section = searchParams.get('section');
    const date_cloture = searchParams.get('date_cloture');
    const date_realisation = searchParams.get('date_realisation');
    const date_debut = searchParams.get('date_debut');
    const include_ia = searchParams.get('include_ia') === 'true';

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    const params = new URLSearchParams();
    if (type_rapport) params.append('type_rapport', type_rapport);
    if (section) params.append('section', section);
    if (date_cloture) params.append('date_cloture', date_cloture);
    if (date_realisation) params.append('date_realisation', date_realisation);
    if (date_debut) params.append('date_debut', date_debut);
    if (include_ia) params.append('include_ia', 'true');

    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/reports/generate?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de la génération du rapport' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/reports/generate:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
