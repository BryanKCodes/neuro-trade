import pandas as pd
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
class WillR(Series):
    def __init__(self, period: int = 14, series: Series = Price()):
        """
        :param period: Number of periods to use in the calculation.
        :param series: The input Series on which to compute WillR. Defaults to Price("close").
                       If provided, WillR will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.period = period
        self.input_series = series
        col_name = f"WILLR_{period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        highest_high = data.rolling(self.period).max()
        lowest_low = data.rolling(self.period).min()
        return -100 * (highest_high - data) / (highest_high - lowest_low)


# ==================================
# 2. The Pydantic Schema
# ==================================
class WillRModel(BaseComponent):
    """
    Williams %R.

    A momentum indicator measuring overbought and oversold levels,
    similar to the stochastic oscillator but on a -100 to 0 scale.
    """
    type: Literal["WillR"] = "WillR"
    period: int = Field(
        14,
        ge=1,
        description="Lookback period for the Williams %R. Must be ≥ 1."
    )
    series: AnySeries = Field(
        default_factory=lambda: PriceModel(output="close"),
        description="Series to compute %R from. Defaults to closing price."
    )

    def build(self) -> WillR:
        return WillR(
            period=self.period,
            series=self.series.build()
        )
