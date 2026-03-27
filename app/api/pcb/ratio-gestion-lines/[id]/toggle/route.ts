import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/pcb/ratio-gestion-lines/[id]/toggle?is_active=true|false
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';

    const isActive = request.nextUrl.searchParams.get('is_active');
    const qs = isActive !== null ? `?is_active=${encodeURIComponent(isActive)}` : '';

    const response = await fetch(`${backendUrl}/api/pcb/ratio-gestion-lines/${id}/toggle${qs}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erreur lors du basculement' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PATCH /api/pcb/ratio-gestion-lines/[id]/toggle:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
