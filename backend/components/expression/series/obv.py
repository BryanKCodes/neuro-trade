import pandas as pd
import pandas_ta as ta
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class OBV(Series):
    def __init__(self):
        """
        No parameters
        """
        col_name = "OBV"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        return ta.obv(df['Close'], df['Volume'])


# ==================================
# 2. The Pydantic Schema
# ==================================
class OBVModel(BaseComponent):
    """
    On-Balance Volume (OBV).

    Uses cumulative volume flow to predict changes in stock price,
    tracking whether volume is flowing into or out of a security.
    """
    type: Literal["OBV"] = "OBV"

    def build(self) -> OBV:
        return OBV()
