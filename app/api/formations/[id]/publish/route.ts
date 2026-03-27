import { NextRequest, NextResponse } from 'next/server';

// Route proxy Next.js (App Router): /api/formations/[id]/publish
//
// Rôle:
// - Publie une formation (draft -> published) côté backend.
// - Supporte des options de génération IA via query params:
//   - auto_generate_content=true: génère le contenu des chapitres (`contenu_genere`).
//   - auto_generate_qcm=true: génère les questions QCM par module (`questions_qcm`).
// - Le token est relayé via le header Authorization.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formationId } = await params;
    const authHeader = request.headers.get('Authorization');
    const searchParams = request.nextUrl.searchParams;
    const autoGenerateContent = searchParams.get('auto_generate_content') === 'true';
    const autoGenerateQCM = searchParams.get('auto_generate_qcm') === 'true';

    let url = `${BACKEND_URL}/formations/${formationId}/publish`;
    const queryParams = new URLSearchParams();
    if (autoGenerateContent) queryParams.append('auto_generate_content', 'true');
    if (autoGenerateQCM) queryParams.append('auto_generate_qcm', 'true');
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de la publication de la formation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/formations/[id]/publish:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

