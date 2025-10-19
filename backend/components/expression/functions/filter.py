import pandas as pd
from pydantic import Field
import numpy as np
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.expression.series import Series
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnySeries, AnyPredicate


# ==================================
# 1. The Logic Class
# ==================================
class Filter(Series):
    def __init__(self, series: Series, predicate: Predicate):
        """
        :param series: The source Series to take values from.
        :param predicate: The Predicate to use as the filter condition.
        """
        self.source_series = series
        self.predicate = predicate
        # Create a descriptive column name for caching
        col_name = f"Filtered_{series.col_name}_on_{predicate.__class__.__name__}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame, **kwargs) -> pd.Series:
        # --- Step 1: Build the boolean mask using a loop ---
        # This is necessary because the predicate's condition is index-dependent.
        bool_mask_list = []
        for i in range(len(df)):
            # For each row, call the predicate's condition method with the specific index 'i'
            # and pass through any other context from kwargs.
            is_true = self.predicate.condition(i, df, **kwargs)
            bool_mask_list.append(is_true)

        # Convert the list of booleans into a pandas Series
        bool_mask = pd.Series(bool_mask_list, index=df.index)

        # --- Step 2: Ensure the source series is calculated ---
        # We can trigger the calculation and get the full series in one go.
        # Calling calculate() on the first element is a way to ensure the
        # one-time 'calculator' method of the source series is run.
        self.source_series.calculate(0, df, **kwargs)
        source_series_full = self.source_series.series

        # --- Step 3: Apply the mask to the source series ---
        # Use the boolean mask with .where().
        # Where the mask is True, it keeps the value from the source series.
        # Where it's False, it replaces it with NaN.
        return source_series_full.where(bool_mask, np.nan)


# ==================================
# 2. The Pydantic Schema
# ==================================
class FilterModel(BaseComponent):
    """
    Creates a new sparse Series by filtering an input Series.
    The output Series will have values only where the predicate is true,
    and NaN otherwise.
    """
    type: Literal["Filter"] = "Filter"
    series: AnySeries = Field(
        ...,
        description="The Series to be filtered. Only values where the predicate evaluates to True will be retained."
    )
    predicate: AnyPredicate = Field(
        ...,
        description="Predicate to apply as a boolean filter. Determines which values from the series are kept."
    )

    def build(self) -> Filter:
        return Filter(
            series=self.series.build(),
            predicate=self.predicate.build()
        )
