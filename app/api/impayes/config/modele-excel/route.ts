import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const fullUrl = `${backendUrl}/impayes/config/modele-excel`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Erreur ${response.status}: ${errorText || 'Erreur API'}` },
        { status: response.status }
      );
    }

    // Retourner le fichier Excel directement
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modele_impayes.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Erreur API GET /api/impayes/config/modele-excel:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

