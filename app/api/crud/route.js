import { NextResponse } from 'next/server';

export async function POST(request) {
  const gasUrl = process.env.GAS_URL;
  const secret = process.env.DASHBOARD_SECRET;
  if (!gasUrl || !secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  const body = await request.json();
  const gasBody = JSON.stringify({ ...body, key: secret });

  try {
    // GAS /exec redirects POST → follow manually to preserve method
    let res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: gasBody,
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) {
        res = await fetch(location, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: gasBody,
        });
      }
    }
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: 'GAS returned non-JSON', detail: text.substring(0, 300) });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
