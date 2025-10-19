import pandas as pd
import pandas_ta as ta
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression.series.base import Series


# ==================================
# 1. The Logic Class
# ==================================
class MFI(Series):
    def __init__(self, period: int = 14):
        """
        :param period: The period over which to calculate MFI.
        """
        self.period = period
        col_name = f"MFI_{period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        return ta.mfi(df['High'], df['Low'], df['Close'], df['Volume'], length=self.period)


# ==================================
# 2. The Pydantic Schema
# ==================================
class MFIModel(BaseComponent):
    """
    Money Flow Index (MFI).

    Combines price and volume data to identify overbought or oversold conditions
    in an asset, similar to RSI but volume-weighted.
    """
    type: Literal["MFI"] = "MFI"
    period: conint(ge=1) = Field(
        14,
        description="Lookback period used to compute the MFI. Must be ≥ 1."
    )

    def build(self) -> MFI:
        return MFI(
            period=self.period
        )
