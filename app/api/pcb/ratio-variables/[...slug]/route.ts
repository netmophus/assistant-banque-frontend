import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function buildBackendUrl(request: NextRequest, slug: string[]) {
  const pathname = (slug || []).join('/');

  let backendPath = `/api/pcb/ratio-variables`;
  if (pathname) {
    backendPath += `/${pathname}`;
  }

  const params_str = request.nextUrl.searchParams.toString();
  return params_str ? `${BACKEND_URL}${backendPath}?${params_str}` : `${BACKEND_URL}${backendPath}`;
}

function getAuthHeader(request: NextRequest) {
  return request.headers.get('Authorization') || request.headers.get('authorization') || '';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const url = buildBackendUrl(request, slug);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(request),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return NextResponse.json({ error: body || `Erreur ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/pcb/ratio-variables/[...slug]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const url = buildBackendUrl(request, slug);
    const body = await request.json().catch(() => ({}));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(request),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const respBody = await response.text().catch(() => '');
      return NextResponse.json({ error: respBody || `Erreur ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/ratio-variables/[...slug]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const url = buildBackendUrl(request, slug);
    const body = await request.json().catch(() => ({}));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(request),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const respBody = await response.text().catch(() => '');
      return NextResponse.json({ error: respBody || `Erreur ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PUT /api/pcb/ratio-variables/[...slug]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const url = buildBackendUrl(request, slug);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(request),
      },
    });

    if (!response.ok) {
      const respBody = await response.text().catch(() => '');
      return NextResponse.json({ error: respBody || `Erreur ${response.status}` }, { status: response.status });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API DELETE /api/pcb/ratio-variables/[...slug]:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
