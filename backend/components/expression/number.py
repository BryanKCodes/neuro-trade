import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression import Expression


# ==================================
# 1. The Logic Class
# ==================================
class Number(Expression):
    def __init__(self, value: float):
        """
        :param value: The constant numerical value to return during calculation.
        """
        self.value = value

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        return self.value


# ==================================
# 2. The Pydantic Schema
# ==================================
class NumberModel(BaseComponent):
    """
    Represents a constant numerical value as an Expression.

    Encapsulates a fixed constant value for use in calculations or
    as a scalar in composite Expressions (e.g. RSI > 50, EMA * 2).

    Useful for combining with other Expressions in operations such as
    crossover, addition, or multiplication, where a fixed scalar is needed.
    """
    type: Literal["Number"] = "Number"
    value: float = Field(
        ...,
        description="The constant numerical value to return. Can be any float."
    )

    def build(self) -> Number:
        return Number(
            value=self.value
        )
