import pandas as pd
from pydantic import Field, conint
from typing import Literal, Optional

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
AnyPredicate = "AnyPredicate"


# ==================================
# 1. The Logic Class
# ==================================
class Repeat(Predicate):
    def __init__(self, predicate: Predicate, count: int = 3, lookback: Optional[int] = None):
        """
        :param predicate: The Predicate condition to evaluate.
        :param count: The minimum number of times the predicate must be True.
        :param lookback: The number of bars to look back. Defaults to 'count' if not provided.
        """
        self.predicate = predicate
        self.count = count
        self.lookback = count if lookback is None else lookback

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        if i < self.lookback - 1:
            return False

        true_count = 0
        for j in range(i - self.lookback + 1, i + 1):
            if self.predicate.condition(j, df, **kwargs):
                true_count += 1
        return true_count >= self.count


# ==================================
# 2. The Pydantic Schema
# ==================================
class RepeatModel(BaseComponent):
    """
    Predicate that checks if a condition was met a minimum number of times
    within a lookback window.

    Triggers if the inner predicate has occurred at least `count` times
    in the last `lookback` bars. Can be used to detect clustering behavior
    or multiple confirmations.

    Example: "RSI < 30 at least 3 times in last 7 bars."
    """
    type: Literal["Repeat"] = "Repeat"
    predicate: "AnyPredicate" = Field(
        ...,
        description="Predicate to check multiple times over the lookback window."
    )
    count: conint(ge=1) = Field(
        3,
        description="Minimum number of times the predicate must evaluate True. Must be ≥ 1."
    )
    lookback: Optional[conint(ge=1)] = Field(
        None,
        description="Number of bars to look back. If omitted, defaults to the count."
    )

    def build(self) -> Repeat:
        return Repeat(
            predicate=self.predicate.build(),
            count=self.count,
            lookback=self.lookback
        )
