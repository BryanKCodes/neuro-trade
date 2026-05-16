import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      {
        reply: "The AI service is unreachable. Make sure the backend is running.",
        strategy: null,
        error: "fetch failed",
      },
      { status: 503 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        reply: "The AI service returned an error. Please try again.",
        strategy: null,
        error: `HTTP ${res.status}`,
      },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
