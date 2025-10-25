import pandas as pd
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.predicate import Predicate
from components.expression.series import Series

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnySeries


# ==================================
# 1. The Logic Class
# ==================================
class Trough(Predicate):
    def __init__(self, series: Series):
        """
        :param series: The Series to evaluate for local minima.
        """
        self.series = series

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        self.series.calculate(0, df, **kwargs)

        if i <= 0 or i >= len(df) - 1:
            return False  # out of bounds

        current = self.series.series.iloc[i]
        left = self.series.series.iloc[i - 1]
        right = self.series.series.iloc[i + 1]

        return current < left and current < right


# ==================================
# 2. The Pydantic Schema
# ==================================
class TroughModel(BaseComponent):
    """
    Predicate that returns True if the value of the provided series at index `i`
    is strictly less than its immediate neighbors (i-1 and i+1),
    identifying local troughs.

    Useful for detecting local troughs in smoothed trendlines,
    filtered price series, or any pivot indicator series.
    """
    type: Literal["Min"] = "Min"
    series: "AnySeries" = Field(
        ...,
        description="Series to check for local minima (pivot points)."
    )

    def build(self) -> Trough:
        return Trough(
            series=self.series.build()
        )
