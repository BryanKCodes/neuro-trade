import numpy as np
import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression import Expression

# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class Static(Expression):
    def __init__(self, expression: Expression) -> None:
        self.memo = {}
        self.expression = expression

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        trade_uid = kwargs.get('trade_uid')
        if not trade_uid:
            return np.nan

        value = self.memo.get(trade_uid, -1)
        if value == -1:
            self.memo[trade_uid] = self.expression.calculate(i, df, **kwargs)

        return self.memo[trade_uid]

    def __str__(self) -> str:
        return f"Static({self.expression})"


# ==================================
# 2. The Pydantic Schema
# ==================================
class StaticModel(BaseComponent):
    """
    Static is an expression wrapper that "locks in" the result of a sub-expression
    the first time it's evaluated.

    It's useful for values that should remain constant after a trade is created — such as
    stop loss, take profit, or position sizing — ensuring they don’t change as market data evolves.

    Without `Static`, expressions using live indicators like Price, RSI, or ATR will update
    every bar. Wrapping them with `Static` freezes their value at trade entry.

    Example:
        Static(Subtract(Price(), Multiply(Number(0.05), Price())))

    By design, StopLoss and TakeProfit logic in this framework is evaluated only once at
    trade creation, so `Static` enforces that constraint.

    Avoid using `Static` in dynamic strategies like trailing stops, where the value should
    recalculate on each bar.

    Counterexample:
        Subtract(Price(), Multiply(Number(0.05), ATR()))  # recalculates with every bar
    """
    type: Literal["Static"] = "Static"
    expression: AnyExpression = Field(
        ...,
        description="The inner expression to evaluate and memoize on trade creation."
    )

    def build(self) -> Static:
        return Static(
            expression=self.expression.build()
        )
