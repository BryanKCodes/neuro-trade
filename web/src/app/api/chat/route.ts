import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { message } = await req.json();

  // This is your fixed dummy JSON strategy
  const strategyJson = {
    rules: [
      {
        trade: "long",
        filter: { type: "TruePredicate" },
        entry: {
          type: "Or",
          predicates: [
            {
              type: "Crossover",
              first: { type: "Price" },
              second: {
                type: "Add",
                left: { type: "EMA", period: 20 },
                right: { type: "ATR", period: 14 },
              },
            },
            {
              type: "Threshold",
              below: {
                type: "Subtract",
                left: { type: "EMA", period: 100 },
                right: { type: "EMA", period: 200 },
              },
              above: { type: "Number", value: 0 },
            },
          ],
        },
        stop_loss: {
          type: "Subtract",
          left: { type: "Price" },
          right: {
            type: "Multiply",
            left: { type: "ATR", period: 14 },
            right: { type: "Number", value: 3.0 },
          },
        },
        take_profit: {
          type: "Add",
          left: { type: "Price" },
          right: {
            type: "Multiply",
            left: { type: "ATR", period: 14 },
            right: { type: "Number", value: 3.0 },
          },
        },
        sizing: {
          type: "Divide",
          left: {
            type: "Multiply",
            left: { type: "Number", value: 0.02 },
            right: { type: "Cash" },
          },
          right: { type: "ATR", period: 14 },
        },
        exit: { type: "NonePredicate" },
      },
    ],
  };

  return NextResponse.json({
    reply: `Here's your dummy strategy for testing, based on: "${message}"`,
    strategy: strategyJson,
  });
}
