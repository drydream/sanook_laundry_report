import { NextResponse } from 'next/server';

export async function POST(request) {
  const gasUrl = process.env.GAS_URL;
  const secret = process.env.DASHBOARD_SECRET;
  if (!gasUrl || !secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  const body = await request.json();
  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, key: secret }),
    redirect: 'follow',
  });
  const data = await res.json();
  return NextResponse.json(data);
}
