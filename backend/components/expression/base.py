from abc import ABC, abstractmethod
import pandas as pd

from components.buildable import Buildable


class Expression(ABC, Buildable):
    """
    Abstract base class for any component that can calculate a numerical value
    at a specific point in time.
    """

    @abstractmethod
    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        """
        Given current context, calculate a numerical price level
        :param i: Current index in DataFrame.
        :param df: DataFrame containing OHLCV and series.
        :return: The price level after calculating operator
        """
        pass
