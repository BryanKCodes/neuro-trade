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
class Divide(Expression):
    def __init__(self, left: Expression, right: Expression):
        """
        :param left: The numerator Expression.
        :param right: The denominator Expression.
        """
        self.left = left
        self.right = right

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> Optional[float]:
        left_result = self.left.calculate(i, df, **kwargs)
        right_result = self.right.calculate(i, df, **kwargs)
        if left_result is not None and right_result is not None:
            return left_result / right_result
        return None


# ==================================
# 2. The Pydantic Schema
# ==================================
class DivideModel(BaseComponent):
    """
    Division Expression.

    Evaluates to the quotient of two Expression values at the same index.
    Useful for building ratios or normalizing indicators.
    """
    type: Literal["Divide"] = "Divide"
    left: AnyExpression = Field(
        ...,
        description="Numerator of the division operation."
    )
    right: AnyExpression = Field(
        ...,
        description="Denominator of the division operation. Ensure it does not evaluate to zero."
    )

    def build(self) -> Divide:
        return Divide(
            left=self.left.build(),
            right=self.right.build()
        )
