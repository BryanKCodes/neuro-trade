import pandas as pd
import pandas_ta as ta
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnySeries


# ==================================
# 1. The Logic Class
# ==================================
class ATR(Series):
    def __init__(self, period: int = 14, series: Series = Price()):
        """
        :param period: The number of periods to calculate the ATR.
        :param series: The input Series on which to compute ATR. Defaults to Price("close").
                       If provided, ATR will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.period = period
        self.input_series = series
        col_name = f"ATR_{period}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        # Compute the input series first
        input_series = self.input_series.calculator(df)

        # If the series is a OHLC type (like Price()), we fallback to classical ATR
        # which uses H, L, C.
        if isinstance(self.series, Price):
            return ta.atr(df['High'], df['Low'], df['Close'], length=self.period)

        # Otherwise compute ATR as simple SMA of absolute differences,
        # to allow chaining ATR(ATR(...)) or ATR(RSI(...))
        return input_series.diff().abs().rolling(self.period).mean()


# ==================================
# 2. The Pydantic Schema
# ==================================
class ATRModel(BaseComponent):
    """
    Average True Range (ATR).

    Measures market volatility by decomposing the entire range of an asset price
    for a given period.
    """
    type: Literal["ATR"] = "ATR"
    period: int = Field(
        14,
        ge=1,
        description="Number of periods for ATR calculation. Must be ≥ 1."
    )
    series: "AnySeries" = Field(
        default_factory=lambda: PriceModel(output="close"),
        description=(
            "Input Series for ATR. Defaults to closing Price. "
            "Allows chaining (e.g. ATR(14, ATR(14)))."
        )
    )

    def build(self) -> ATR:
        return ATR(
            period=self.period,
            series=self.series.build()
        )
