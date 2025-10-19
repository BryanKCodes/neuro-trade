import pandas as pd
from pydantic import Field, confloat
import numpy as np
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel

# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class ZigZag(Series):
    def __init__(self, threshold: float = 5.0, series: Series = Price()):
        """
        :param threshold: Minimum % move to register a new pivot, e.g. 5.0 for 5%.
        :param series: The input Series on which to compute ZigZag swing pivots. Defaults to Price("close").
                       If provided, ZigZag will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.threshold = threshold / 100.0
        self.input_series = series
        col_name = f"ZigZag_{threshold}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        pivots = [np.nan] * len(df)

        last_pivot_value = data.iloc[0]
        trend = None

        for i in range(1, len(df)):
            change = (data.iloc[i] - last_pivot_value) / last_pivot_value

            if trend is None:
                if abs(change) >= self.threshold:
                    trend = 'up' if change > 0 else 'down'
                    last_pivot_value = data.iloc[i]
                    pivots[i] = data.iloc[i]
            elif trend == 'up':
                if data.iloc[i] > last_pivot_value:
                    last_pivot_value = data.iloc[i]
                    pivots[i] = data.iloc[i]
                elif (data.iloc[i] - last_pivot_value) / last_pivot_value <= -self.threshold:
                    trend = 'down'
                    last_pivot_value = data.iloc[i]
                    pivots[i] = data.iloc[i]
            elif trend == 'down':
                if data.iloc[i] < last_pivot_value:
                    last_pivot_value = data.iloc[i]
                    pivots[i] = data.iloc[i]
                elif (data.iloc[i] - last_pivot_value) / last_pivot_value >= self.threshold:
                    trend = 'up'
                    last_pivot_value = data.iloc[i]
                    pivots[i] = data.iloc[i]

        return pd.Series(pivots, index=df.index)


# ==================================
# 2. The Pydantic Schema
# ==================================
class ZigZagModel(BaseComponent):
    """
    ZigZag Indicator.

    Highlights significant changes by filtering out movements smaller than a
    specified percentage, useful for identifying swings and trend shifts.

    Can be applied to any Series, such as closing price, RSI, or EMA,
    enabling detection of structural swings across various indicators.
    """
    type: Literal["ZigZag"] = "ZigZag"
    threshold: confloat(ge=0.0) = Field(
        5.0,
        description="Minimum percentage move required to register a new pivot. Must be ≥ 0.0."
    )
    series: "AnyExpression" = Field(
        default_factory=lambda: PriceModel(),
        description="Input Series to apply the ZigZag filter to. Defaults to Price('close')."
    )

    def build(self) -> ZigZag:
        return ZigZag(
            threshold=self.threshold,
            series=self.series.build()
        )
