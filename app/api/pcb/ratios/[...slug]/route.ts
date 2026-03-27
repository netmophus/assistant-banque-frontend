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

    let backendPath = `/api/pcb/ratios`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

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
      return NextResponse.json(
        { error: `Erreur ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API GET /api/pcb/ratios/[...slug]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const pathname = slug.join('/');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    let backendPath = `/api/pcb/ratios`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erreur ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API POST /api/pcb/ratios/[...slug]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const pathname = slug.join('/');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    let backendPath = `/api/pcb/ratios`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erreur ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PUT /api/pcb/ratios/[...slug]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const pathname = slug.join('/');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    let backendPath = `/api/pcb/ratios`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erreur ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erreur API PATCH /api/pcb/ratios/[...slug]:', error);
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

    let backendPath = `/api/pcb/ratios`;
    if (pathname) {
      backendPath += `/${pathname}`;
    }

    const response = await fetch(`${backendUrl}${backendPath}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erreur ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data || { success: true });
  } catch (error: any) {
    console.error('Erreur API DELETE /api/pcb/ratios/[...slug]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
