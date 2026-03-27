import { NextRequest, NextResponse } from 'next/server';

// PUT /api/pcb/ratio-gestion-lines/[id] - Mettre à jour
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/ratio-gestion-lines/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData || { error: 'Erreur lors de la mise à jour' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PUT /api/pcb/ratio-gestion-lines/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/pcb/ratio-gestion-lines/[id] - Supprimer
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const response = await fetch(`${backendUrl}/api/pcb/ratio-gestion-lines/${params.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: response.status });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data || { success: true });
  } catch (error: any) {
    console.error('Erreur API DELETE /api/pcb/ratio-gestion-lines/[id]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
