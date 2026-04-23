import { NextRequest, NextResponse } from 'next/server';

// Proxy admin : GET /api/admin/subscription-requests → backend /admin/subscription-requests
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get('Authorization') || request.headers.get('authorization') || '';
    const qs = request.nextUrl.search; // preserve ?status=... & ?plan=...

    const response = await fetch(`${BACKEND_URL}/admin/subscription-requests${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(errorData, { status: response.status });
      }
      const text = await response.text().catch(() => '');
      return NextResponse.json({ detail: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('Erreur API GET /api/admin/subscription-requests:', error);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
