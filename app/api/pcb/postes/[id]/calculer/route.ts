import { NextRequest, NextResponse } from 'next/server';

// POST /api/pcb/postes/[id]/calculer - Calculer le solde d'un poste
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const date_solde = searchParams.get('date_solde');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    
    // Construire l'URL avec query params
    let backendPath = `/api/pcb/postes/${id}/calculer`;
    if (date_solde) {
      backendPath += `?date_solde=${encodeURIComponent(date_solde)}`;
    }
    
    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors du calcul' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/postes/[id]/calculer:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

