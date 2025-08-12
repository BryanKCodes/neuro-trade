import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/*
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
*/

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const systemPrompt = `
You are an expert AI assistant specialized ONLY in financial investment strategies and backtesting. 
- If the user's message is NOT about trading, investing, or financial strategies, politely say you can only assist with those topics.
- If the user's message asks to build or validate a strategy, generate or validate the JSON DSL accordingly using the provided specification.
- Otherwise, respond normally but related to finance and investments.
`;

    /*
    // Compose messages in OpenAI chat format
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
        ],
        temperature: 0.3,
    });

    const reply = chatCompletion.choices[0].message?.content || "Sorry, no response.";

    return NextResponse.json({ reply });
    */

    const snippet = message.split(" ").slice(0, 10).join(" ") + (message.split(" ").length > 10 ? "..." : "");

    return NextResponse.json({ reply: `You said: ${snippet}` });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
