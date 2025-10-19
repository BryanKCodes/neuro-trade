import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression import Expression
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class Crossover(Predicate):
    def __init__(self, first: Expression, second: Expression, direction: str = 'above'):
        """
        :param first: The first Expression (typically the faster indicator).
        :param second: The second Expression (typically the slower indicator).
        :param direction: 'above', 'below', or 'any'.
        """
        self.first = first
        self.second = second
        if direction not in ['above', 'below', 'any']:
            raise ValueError("Crossover direction must be 'above', 'below', or 'any'")
        self.direction = direction

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        if i < 1:
            return False

        # Calculate values for previous and current bars
        val1_prev = self.first.calculate(i - 1, df, **kwargs)
        val2_prev = self.second.calculate(i - 1, df, **kwargs)
        val1_now = self.first.calculate(i, df, **kwargs)
        val2_now = self.second.calculate(i, df, **kwargs)

        # Define the conditions for each type of cross
        crossed_above = val1_prev < val2_prev and val1_now >= val2_now
        crossed_below = val1_prev > val2_prev and val1_now <= val2_now

        # Return the result based on the specified direction
        if self.direction == 'above':
            return crossed_above
        elif self.direction == 'below':
            return crossed_below
        else:  # 'any'
            return crossed_above or crossed_below


# ==================================
# 2. The Pydantic Schema
# ==================================
class CrossoverModel(BaseComponent):
    """
    Predicate that detects when one Expression crosses over another.

    Detects when one expression crosses over another, indicating a potential shift
    in trend or signal. Commonly used in strategies like moving average crossovers
    or indicator threshold breaches.

    Allows specifying direction:
    - 'above'  → True when first crosses above second.
    - 'below'  → True when first crosses below second.
    - 'any'    → True on any cross (either direction).
    """
    type: Literal["Crossover"] = "Crossover"
    first: "AnyExpression" = Field(
        ...,
        description="The first expression (e.g. fast MA). Often the faster-moving series."
    )
    second: "AnyExpression" = Field(
        ...,
        description="The second expression (e.g. slow MA). Often the slower-moving series."
    )
    direction: Literal["above", "below", "any"] = Field(
        "any",
        description="Direction of crossover: 'above', 'below', or 'any'. Defaults to 'any'."
    )

    def build(self) -> Crossover:
        return Crossover(
            first=self.first.build(),
            second=self.second.build(),
            direction=self.direction
        )
