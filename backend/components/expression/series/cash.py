import pandas as pd
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class Cash(Series):
    def __init__(self):
        """
        No parameters.
        """
        col_name = f"Cash"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        return df["Cash"]


# ==================================
# 2. The Pydantic Schema
# ==================================
class CashModel(BaseComponent):
    """
    Cash (or Equity) series.

    Returns the portfolio value over time, typically shifted by 1 bar to ensure
    trades are based on available capital before the current bar closes.
    """
    type: Literal["Cash"] = "Cash"

    def build(self) -> Cash:
        return Cash()
