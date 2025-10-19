import pandas as pd
from typing import Literal

from ai import BaseComponent
from components.expression import Expression


# ==================================
# 1. The Logic Class
# ==================================
class StopLoss(Expression):
    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        return kwargs.get('stop_loss')


# ==================================
# 2. The Pydantic Schema
# ==================================
class StopLossModel(BaseComponent):
    """
    Retrieves the current stop loss value of the created trade from context during execution.
    Useful for rules or expressions that depend on dynamically computed stop losses.
    """
    type: Literal["StopLoss"] = "StopLoss"

    def build(self) -> StopLoss:
        return StopLoss()
