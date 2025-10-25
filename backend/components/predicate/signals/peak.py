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
class Peak(Predicate):
    def __init__(self, series: Series):
        """
        :param series: The Series to evaluate for local maxima.
        """
        self.series = series

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        # Ensure the underlying series is calculated
        self.series.calculate(0, df, **kwargs)

        if i <= 0 or i >= len(df) - 1:
            return False  # out of bounds

        current = self.series.series.iloc[i]
        left = self.series.series.iloc[i - 1]
        right = self.series.series.iloc[i + 1]

        return current > left and current > right


# ==================================
# 2. The Pydantic Schema
# ==================================
class PeakModel(BaseComponent):
    """
    Predicate that returns True if the value of the provided series at index `i`
    is strictly greater than its immediate neighbors (i-1 and i+1),
    identifying local peaks.

    Useful for detecting local peaks in smoothed trendlines,
    filtered price series, or any pivot indicator series.
    """
    type: Literal["Max"] = "Max"
    series: "AnySeries" = Field(
        ...,
        description="Series to check for local maxima (pivot points)."
    )

    def build(self) -> Peak:
        return Peak(
            series=self.series.build()
        )
