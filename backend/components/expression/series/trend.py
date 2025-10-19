import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series

# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class TrendLine(Series):
    def __init__(self, series: Series):
        """
        :param series: A Series with pivot points (non-NaN at key locations)
                       and NaN elsewhere, to connect with lines.
        """
        self.sparse_series = series
        col_name = f"TrendLine_of_{series.col_name}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame, **kwargs) -> pd.Series:
        # Ensure the underlying sparse series is calculated first
        self.sparse_series.calculate(0, df, **kwargs)

        # Use pandas' powerful built-in interpolate function.
        # 'linear' method draws straight lines between the points.
        return self.sparse_series.series.interpolate(method='linear')


# ==================================
# 2. The Pydantic Schema
# ==================================
class TrendLineModel(BaseComponent):
    """
    Linear Interpolated Trend Line.

    Creates a continuous series by connecting non-NaN points from a sparse
    series (like Fractals or Filters), filling in the gaps linearly.
    """
    type: Literal["TrendLine"] = "TrendLine"
    series: AnyExpression = Field(
        ...,
        description="Sparse Series with defined pivots (non-NaN values). Interpolation fills the rest."
    )

    def build(self) -> TrendLine:
        return TrendLine(
            series=self.series.build()
        )
