import pandas as pd
from typing import Literal

from ai import BaseComponent
from components.expression import Expression


# ==================================
# 1. The Logic Class
# ==================================
class NoneExpression(Expression):
    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> None:
        return None


# ==================================
# 2. The Pydantic Schema
# ==================================
class NoneExpressionModel(BaseComponent):
    """
    Expression that always returns None
    """
    type: Literal["NoneExpression"] = "NoneExpression"

    def build(self) -> NoneExpression:
        return NoneExpression()
