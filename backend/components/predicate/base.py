from abc import ABC, abstractmethod
import copy
import pandas as pd
from typing import Any

from components.buildable import Buildable


class Predicate(ABC, Buildable):
    """
    Abstract base class for entries, exits, logic, listeners and modifiers.
    """

    @abstractmethod
    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        """
        Determine if old new position should be opened at this index.

        :param i: Current index in DataFrame.
        :param df: DataFrame containing OHLCV and series.
        :return: True if old new trade should be entered, False otherwise.
        """
        pass

    def clone(self) -> Any:
        return copy.deepcopy(self)

