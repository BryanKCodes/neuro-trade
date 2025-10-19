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
class Multiply(Expression):
    def __init__(self, left: Expression, right: Expression):
        """
        :param left: The left Expression operand.
        :param right: The right Expression operand.
        """
        self.left = left
        self.right = right

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> Optional[float]:
        left_result = self.left.calculate(i, df, **kwargs)
        right_result = self.right.calculate(i, df, **kwargs)
        if left_result is not None and right_result is not None:
            return left_result * right_result
        return None


# ==================================
# 2. The Pydantic Schema
# ==================================
class MultiplyModel(BaseComponent):
    """
    Multiplication Expression.

    Evaluates to the product of two Expression values at the same index.
    Often used to scale indicator outputs, e.g. multiplying ATR by 1.5.
    """
    type: Literal["Multiply"] = "Multiply"
    left: AnyExpression = Field(
        ...,
        description="Left-hand side of the multiplication operation."
    )
    right: AnyExpression = Field(
        ...,
        description="Right-hand side of the multiplication operation."
    )

    def build(self) -> Multiply:
        return Multiply(
            left=self.left.build(),
            right=self.right.build()
        )
