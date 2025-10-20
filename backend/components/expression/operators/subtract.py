import pandas as pd
from pydantic import Field
from typing import Literal, Optional, TYPE_CHECKING

from ai import BaseComponent
from components.expression import Expression


# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnyExpression


# ==================================
# 1. The Logic Class
# ==================================
class Subtract(Expression):
    def __init__(self, left: Expression, right: Expression):
        """
        :param left: The minuend Expression (value from which to subtract).
        :param right: The subtrahend Expression (value to subtract).
        """
        self.left = left
        self.right = right

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> Optional[float]:
        left_result = self.left.calculate(i, df, **kwargs)
        right_result = self.right.calculate(i, df, **kwargs)
        if left_result is not None and right_result is not None:
            return left_result - right_result
        return None


# ==================================
# 2. The Pydantic Schema
# ==================================
class SubtractModel(BaseComponent):
    """
    Subtraction Expression.

    Evaluates to the difference between two Expression values at the same index.
    Can be used to compute spreads or target-based differences like
    `Price - StopLoss`.
    """
    type: Literal["Subtract"] = "Subtract"
    left: "AnyExpression" = Field(
        ...,
        description="Minuend: the Expression to subtract from."
    )
    right: "AnyExpression" = Field(
        ...,
        description="Subtrahend: the Expression to subtract."
    )

    def build(self) -> Subtract:
        return Subtract(
            left=self.left.build(),
            right=self.right.build()
        )
