import { NextRequest, NextResponse } from 'next/server';

// PUT /api/pcb/ratios/[id] - Mettre à jour un ratio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { id } = await params;
    
    const response = await fetch(`${backendUrl}/api/pcb/ratios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { error: 'Erreur lors de la mise à jour' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PUT /api/pcb/ratios/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/pcb/ratios/[id] - Supprimer un ratio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { id } = await params;
    
    const response = await fetch(`${backendUrl}/api/pcb/ratios/${id}`, {
      method: 'DELETE',
      headers: {
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
    console.error('Erreur API DELETE /api/pcb/ratios/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PATCH /api/pcb/ratios/[id]/toggle - Basculer l'état actif du ratio
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const pathname = request.nextUrl.pathname;
    const { id } = await params;
    
    // Vérifier si c'est un toggle
    if (pathname.includes('toggle')) {
      const response = await fetch(`${backendUrl}/api/pcb/ratios/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Erreur lors du basculement' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Endpoint non trouvé' }, { status: 404 });
  } catch (error: any) {
    console.error('Erreur API PATCH /api/pcb/ratios/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
