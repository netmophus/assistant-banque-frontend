import { NextRequest, NextResponse } from 'next/server';

// Route handler pour /api/pcb/gl uniquement (sans sous-chemins)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const params = new URLSearchParams();
    const date_solde = searchParams.get('date_solde');
    const classe = searchParams.get('classe');
    const code = searchParams.get('code');

    if (date_solde) params.append('date_solde', date_solde);
    if (classe) params.append('classe', classe);
    if (code) params.append('code', code);

    const fullUrl = params.toString() ? `${backendUrl}/api/pcb/gl?${params.toString()}` : `${backendUrl}/api/pcb/gl`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des comptes GL' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API /api/pcb/gl:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/pcb/gl/all`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data || { success: true });
  } catch (error: any) {
    console.error('Erreur API DELETE /api/pcb/gl:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
