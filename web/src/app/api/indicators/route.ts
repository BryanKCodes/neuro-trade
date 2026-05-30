import { NextResponse } from "next/server";

export async function GET() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}api/indicators/meta`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();
  return NextResponse.json(data);
}
