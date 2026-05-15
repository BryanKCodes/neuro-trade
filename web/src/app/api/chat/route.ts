import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { message } = await req.json();

  let reply = "Sorry I didn't understand that.";
  if (message.startsWith('/prompt ')) {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}api/chat`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: message }),
    });

    const data = await res.json();
    reply = data.reply;
  }

  // Dummy JSON strategy
  /*
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
        exit: { type: "FalsePredicate" },
      },
    ],
  };
  */

  const strategyJson = {
    "rules": [
      {
        "trade": "long",
        "filter": {
          "type": "Threshold",
          "below": { "type": "Number", "value": 25 },
          "above": { "type": "ADX", "period": 14, "output": "adx" }
        },
        "entry": {
          "type": "And",
          "predicates": [
            {
              "type": "Threshold",
              "below": { "type": "EMA", "period": 50 },
              "above": { "type": "EMA", "period": 20 }
            },
            {
              "type": "Crossover",
              "first": { "type": "RSI", "period": 14 },
              "second": { "type": "Number", "value": 50 },
              "direction": "above"
            }
          ]
        },
        "exit": {
          "type": "Or",
          "predicates": [
            {
              "type": "Crossover",
              "first": { "type": "EMA", "period": 20 },
              "second": { "type": "EMA", "period": 50 },
              "direction": "below"
            },
            {
              "type": "Threshold",
              "below": { "type": "RSI", "period": 14 },
              "above": { "type": "Number", "value": 40 }
            }
          ]
        },
        "stop_loss": {
          "type": "Static",
          "expression": {
            "type": "Subtract",
            "left": { "type": "Price", "output": "close" },
            "right": {
              "type": "Multiply",
              "left": { "type": "Number", "value": 2.0 },
              "right": { "type": "ATR", "period": 14 }
            }
          }
        },
        "take_profit": {
          "type": "Static",
          "expression": {
            "type": "Add",
            "left": { "type": "Price", "output": "close" },
            "right": {
              "type": "Multiply",
              "left": { "type": "Number", "value": 3.0 },
              "right": { "type": "ATR", "period": 14 }
            }
          }
        },
        "sizing": {
          "type": "Divide",
          "left": {
            "type": "Multiply",
            "left": { "type": "Cash" },
            "right": { "type": "Number", "value": 0.95 }
          },
          "right": { "type": "Price", "output": "close" }
        }
      }
    ]
  }

  return NextResponse.json({
    reply: reply,
    strategy: strategyJson,
  });
}
