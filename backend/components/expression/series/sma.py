import pandas as pd
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel


# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class SMA(Series):
    def __init__(self, period: int = 14, series: Series = Price()):
        """
        :param period: Number of periods over which to average.
        :param series: The input Series on which to compute SMA. Defaults to Price("close").
                       If provided, SMA will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.period = period
        self.input_series = series
        col_name = f"SMA_{period}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        return data.rolling(window=self.period).mean()


# ==================================
# 2. The Pydantic Schema
# ==================================
class SMAModel(BaseComponent):
    """
    Simple Moving Average (SMA).

    Calculates the unweighted mean of the previous n values,
    useful for smoothing data and identifying trends.
    """
    type: Literal["SMA"] = "SMA"
    period: conint(ge=1) = Field(
        14,
        description="Number of periods to average over. Must be ≥ 1."
    )
    series: AnyExpression = Field(
        default_factory=lambda: PriceModel(),
        description="Input Series to compute the SMA on. Defaults to closing price."
    )

    def build(self) -> SMA:
        return SMA(
            period=self.period,
            series=self.series.build()
        )
