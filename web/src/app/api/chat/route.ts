export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  let upstream: Response;
  try {
    upstream = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch {
    const errEvent =
      `data: ${JSON.stringify({ type: "error", data: "AI service unreachable." })}\n\n` +
      `data: ${JSON.stringify({ type: "done" })}\n\n`;
    return new Response(errEvent, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  // Pass the SSE stream straight through to the browser.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
