import { NextResponse } from 'next/server';
import { getTickers } from '@/scripts/tickers';

export const revalidate = 86400; // Revalidate once per day

export async function GET() {
  try {
    const tickers = await getTickers();
    return NextResponse.json(tickers);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickers' },
      { status: 500 }
    );
  }
}