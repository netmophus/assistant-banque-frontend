import { NextRequest, NextResponse } from 'next/server';

// Proxy admin : PATCH /api/admin/subscription-requests/{id}/status
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader =
      request.headers.get('Authorization') || request.headers.get('authorization') || '';
    const body = await request.json();

    const response = await fetch(
      `${BACKEND_URL}/admin/subscription-requests/${id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
      },
    );

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(errorData, { status: response.status });
      }
      return NextResponse.json(
        { detail: `Erreur ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
