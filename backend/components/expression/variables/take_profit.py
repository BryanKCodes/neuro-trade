import pandas as pd
from typing import Literal, Optional

from ai import BaseComponent
from components.expression import Expression


# ==================================
# 1. The Logic Class
# ==================================
class TakeProfit(Expression):
    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> Optional[float]:
        return kwargs.get('take_profit')


# ==================================
# 2. The Pydantic Schema
# ==================================
class TakeProfitModel(BaseComponent):
    type: Literal["StopLoss"] = "StopLoss"

    def build(self) -> TakeProfit:
        return TakeProfit()
