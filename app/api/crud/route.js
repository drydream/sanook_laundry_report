import { NextResponse } from 'next/server';

export async function POST(request) {
  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  const body = await request.json();
  const params = new URLSearchParams({
    action: body.action || '',
    sheet: body.sheet || '',
    date: body.date || '',
    moneyIn: String(body.moneyIn ?? ''),
    description: body.description || '',
    moneyOut: String(body.moneyOut ?? ''),
    hundred: String(body.hundred ?? ''),
    fifty: String(body.fifty ?? ''),
    twenty: String(body.twenty ?? ''),
    row: String(body.row ?? ''),
  });
  try {
    const res = await fetch(`${gasUrl}?${params.toString()}`);
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: 'GAS error', detail: text.substring(0, 300) });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
