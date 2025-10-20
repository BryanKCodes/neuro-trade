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
class Fractal(Series):
    def __init__(self, period: int = 2, output: str = 'high', series: Series = Price()):
        """
        :param period: Number of bars to look back and ahead to confirm a fractal.
        :param output: Whether to return 'high' fractals or 'low' fractals.
        :param series: The input Series on which to compute fractal pivots. Defaults to Price("close").
                       If provided, Fractal will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        if output not in ['high', 'low']:
            raise ValueError("Fractal type must be 'high' or 'low'")
        self.period = period
        self.output = output
        self.input_series = series
        col_name = f"Fractal_{output}_{period}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        result = pd.Series([None] * len(df), index=df.index)

        for i in range(self.period, len(df) - self.period):
            left = data.iloc[i - self.period:i]
            right = data.iloc[i+1:i+self.period+1]

            if self.output == 'high':
                if data.iloc[i] > left.max() and data.iloc[i] > right.max():
                    result.iloc[i] = data.iloc[i]
            else:
                if data.iloc[i] < left.min() and data.iloc[i] < right.min():
                    result.iloc[i] = data.iloc[i]

        return result


# ==================================
# 2. The Pydantic Schema
# ==================================
class FractalModel(BaseComponent):
    """
    Fractal indicator.

    Identifies local highs or lows in a given series by comparing the current value
    to values on either side, highlighting potential turning points.

    Can be applied to any Series, such as price, RSI, or moving averages, enabling
    detection of structural highs/lows across different indicators.
    """
    type: Literal["Fractal"] = "Fractal"
    period: int = Field(
        2,
        ge=1,
        description="Number of bars to check on each side for a fractal. Must be ≥ 1."
    )
    output: Literal["high", "low"] = Field(
        ...,
        description="Return type: 'high' to detect peaks, 'low' to detect troughs."
    )
    series: "AnySeries" = Field(
        default_factory=lambda: PriceModel(output="close"),
        description="Input Series for fractal detection. Defaults to closing Price."
    )

    def build(self) -> Fractal:
        return Fractal(
            period=self.period,
            output=self.output,
            series=self.series.build()
        )
