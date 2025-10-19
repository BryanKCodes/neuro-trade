import pandas as pd
from pydantic import Field, confloat
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class Wick(Predicate):
    def __init__(self, position: str = "top", lower_bound: float = 0.0, upper_bound: float = float("inf")):
        """
        :param position: 'top' or 'bottom'
        :param lower_bound: min ratio of wick length / total range
        :param upper_bound: max ratio of wick length / total range
        """
        if position not in ["top", "bottom"]:
            raise ValueError("Wick position must be 'top' or 'bottom'")
        self.position = position
        self.lower_bound = lower_bound
        self.upper_bound = upper_bound

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        high = df['High'].iloc[i]
        low = df['Low'].iloc[i]
        open_ = df['Open'].iloc[i]
        close = df['Close'].iloc[i]
        total_range = high - low

        # Avoid division by zero on flat candles
        if total_range == 0:
            wick_ratio = 0
        else:
            if self.position == 'top':
                candle_top = max(open_, close)
                wick_length = high - candle_top
            else:  # 'bottom'
                candle_bottom = min(open_, close)
                wick_length = candle_bottom - low

            wick_ratio = wick_length / total_range

        return self.lower_bound <= wick_ratio <= self.upper_bound


# ==================================
# 2. The Pydantic Schema
# ==================================
class WickModel(BaseComponent):
    """
    Evaluates the ratio of the upper or lower wick length to the total
    candle range, and fires True if the ratio falls within
    [lower_bound, upper_bound].
    """
    type: Literal["Wick"] = "Wick"
    position: Literal["top", "bottom"] = Field(
        "top",
        description="Which wick to measure: 'top' for upper wick, 'bottom' for lower."
    )
    lower_bound: confloat(ge=0.0, le=1.0) = Field(
        0.0,
        description="Minimum wick/total-range ratio. Must be between 0.0 and 1.0."
    )
    upper_bound: confloat(ge=0.0, le=1.0) = Field(
        1.0,
        description="Maximum wick/total-range ratio. Must be between 0.0 and 1.0."
    )

    def build(self) -> Wick:
        return Wick(
            position=self.position,
            lower_bound=self.lower_bound,
            upper_bound=self.upper_bound
        )
