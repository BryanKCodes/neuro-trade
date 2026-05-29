import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}api/data/preview`;
  const body = await request.json();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
