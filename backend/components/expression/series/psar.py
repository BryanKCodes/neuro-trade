import pandas as pd
import pandas_ta as ta
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class PSAR(Series):
    def __init__(self):
        """
        No parameters.
        """
        col_name = "PSAR"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        # We only need the main PSAR line, which ta.psar returns directly
        psar_df = ta.psar(df['High'], df['Low'])
        # The main line is in the 'PSAR_0.02_0.2' column. We can just take the first column.
        return psar_df.iloc[:, 0]


# ==================================
# 2. The Pydantic Schema
# ==================================
class PSARModel(BaseComponent):
    """
    Parabolic Stop and Reverse (SAR).

    A trend-following indicator that highlights potential reversal points,
    typically used to set trailing stop-loss levels.
    """
    type: Literal["PSAR"] = "PSAR"

    def build(self) -> PSAR:
        return PSAR()
