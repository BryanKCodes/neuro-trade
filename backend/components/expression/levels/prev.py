import pandas as pd
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression import Expression
from components.expression.series import Series
from components.predicate import Predicate


# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"
AnyPredicate = "AnyPredicate"


# ==================================
# 1. The Logic Class
# ==================================
class PrevLevel(Expression):
    def __init__(self, series: Series, predicate: Predicate, count: int = 1):
        """
        :param series: The Series to fetch the value from.
        :param predicate: The Predicate whose True condition signals the level.
        :param count: How many predicate triggers to skip before selecting. For example,
                      `count=2` means find the second-most recent occurrence.
        """
        self.series = series
        self.predicate = predicate
        self.count = count

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        """
        Go backwards from i to find the last index where predicate._condition is True.
        :return: The indicator value at that index.
        """
        for j in range(i - 1, -1, -1):
            if self.predicate.condition(j, df, **kwargs):
                self.count -= 1
                if self.count <= 0:
                    return self.series.calculate(j, df)
        raise None

    def __str__(self) -> str:
        return f"PrevLevel({self.series}, {self.predicate}, {self.count})"

# ==================================
# 2. The Pydantic Schema
# ==================================
class PrevLevelModel(BaseComponent):
    """
    Previous Level Expression.

    Looks backwards through the data to find the last point(s) where a Predicate
    condition fired True, and returns the value of a given Series at that point.

    Useful for rules like: "Take the high of the last fractal" or
    "use the close when the last crossover happened".
    """
    type: Literal["PrevLevel"] = "PrevLevel"
    series: AnyExpression = Field(
        ...,
        description="The Series to fetch values from at the time the predicate last fired true."
    )
    predicate: AnyPredicate = Field(
        ...,
        description="Predicate whose trigger determines which point in time to look back to."
    )
    count: conint(ge=1) = Field(
        1,
        description="How many predicate triggers to skip before selecting. "
                    "E.g., count=2 selects the second-most recent match."
    )

    def build(self) -> PrevLevel:
        return PrevLevel(
            series=self.series.build(),
            predicate=self.predicate.build(),
            count=self.count
        )
