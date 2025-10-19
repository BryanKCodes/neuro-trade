from abc import ABC, abstractmethod
from typing import Optional
import pandas as pd
from components.expression import Expression


class Series(Expression, ABC):
    """
    Abstract base class for series.
    Handles memoized computation into df to avoid re-computation.
    """

    def __init__(self, col_name: str):
        self.df = None
        self.col_name = col_name
        self._series = pd.Series(dtype=float)

    @abstractmethod
    def calculator(self, df: pd.DataFrame) -> pd.Series:
        """
        Compute the indicator series. Must be implemented by subclass.
        """
        pass

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        self.df = df
        if self.col_name and self.col_name not in df.columns:
            self._series = self.calculator(df)
            df[self.col_name] = self.series

        return self.df[self.col_name].iloc[i]

    @property
    def series(self) -> pd.Series:
        return self._series

    def __str__(self):
        return self.col_name
