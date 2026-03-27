import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const pathname = slug.join('/');
    const searchParams = request.nextUrl.searchParams;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Construire l'URL du backend
    let backendPath = `/api/pcb/gl`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

    // Ajouter les query params
    const params_str = searchParams.toString();
    const fullUrl = params_str ? `${backendUrl}${backendPath}?${params_str}` : `${backendUrl}${backendPath}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/pcb/gl/[...slug]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const pathname = slug.join('/');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Construire l'URL du backend
    let backendPath = `/api/pcb/gl`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

    const fullUrl = `${backendUrl}${backendPath}`;

    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
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

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data || { success: true });
  } catch (error: any) {
    console.error('Erreur API DELETE /api/pcb/gl/[...slug]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
