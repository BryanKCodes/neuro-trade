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
          "type": "TruePredicate"
        },
        "entry": {
          "type": "Or",
          "predicates": [
            {
              "type": "Crossover",
              "first": {
                "type": "Price"
              },
              "second": {
                "type": "Add",
                "left": {
                  "type": "EMA",
                  "period": 20
                },
                "right": {
                  "type": "ATR",
                  "period": 14
                }
              }
            },
            {
              "type": "Threshold",
              "below": {
                "type": "Subtract",
                "left": {
                  "type": "EMA",
                  "period": 100
                },
                "right": {
                  "type": "EMA",
                  "period": 200
                }
              },
              "above": {
                "type": "Number",
                "value": 0
              }
            }
          ]
        },
        "stop_loss": {
          "type": "Subtract",
          "left": {
            "type": "Price"
          },
          "right": {
            "type": "Multiply",
            "left": {
              "type": "ATR",
              "period": 14
            },
            "right": {
              "type": "Number",
              "value": 3.0
            }
          }
        },
        "take_profit": {
          "type": "Add",
          "left": {
            "type": "Price"
          },
          "right": {
            "type": "Multiply",
            "left": {
              "type": "ATR",
              "period": 14
            },
            "right": {
              "type": "Number",
              "value": 3.0
            }
          }
        },
        "sizing": {
          "type": "Divide",
          "left": {
            "type": "Multiply",
            "left": {
              "type": "Number",
              "value": 0.02
            },
            "right": {
              "type": "Cash"
            }
          },
          "right": {
            "type": "ATR",
            "period": 14
          }
        },
        "exit": {
          "type": "FalsePredicate"
        }
      }
    ]
  }

  return NextResponse.json({
    reply: reply,
    strategy: strategyJson,
  });
}
