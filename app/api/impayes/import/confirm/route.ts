import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const fullUrl = `${backendUrl}/impayes/import/confirm`;

    // Récupérer le FormData de la requête
    const formData = await request.formData();

    // Créer un nouveau FormData pour le backend
    const backendFormData = new FormData();
    
    // Copier tous les champs du FormData
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        backendFormData.append(key, value);
      } else {
        backendFormData.append(key, value as string);
      }
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        // Ne pas définir Content-Type, le navigateur le fera automatiquement avec le boundary
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Erreur ${response.status}: ${errorText || 'Erreur API'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/impayes/import/confirm:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

