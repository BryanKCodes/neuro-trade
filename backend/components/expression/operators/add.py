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
class Add(Expression):
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
            return left_result + right_result
        return None


# ==================================
# 2. The Pydantic Schema
# ==================================
class AddModel(BaseComponent):
    """
    Addition Expression.

    Evaluates to the sum of two Expression values at the same index.
    Can combine static numbers, indicators, or even other operators.
    """
    type: Literal["Add"] = "Add"
    left: "AnyExpression" = Field(
        ...,
        description="Left-hand side of the addition operation."
    )
    right: "AnyExpression" = Field(
        ...,
        description="Right-hand side of the addition operation."
    )

    def build(self) -> Add:
        return Add(
            left=self.left.build(),
            right=self.right.build()
        )

