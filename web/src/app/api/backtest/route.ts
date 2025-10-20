import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}api/backtest`;
  const body = await request.json();
  console.log("Backtest request body:", body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("Backtest response data:", data);
  return NextResponse.json(data);
}
