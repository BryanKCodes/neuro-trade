import pandas as pd
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnyPredicate


# ==================================
# 1. The Logic Class
# ==================================
class Follows(Predicate):
    def __init__(self, first: Predicate, then: Predicate, lookback: int = 5):
        """
        :param first: The preceding Predicate event.
        :param then: The Predicate that must be true now.
        :param lookback: How far back to look for the first event.
        """
        self.first = first
        self.then = then
        self.lookback = lookback

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        if i < self.lookback:
            return False

        prior_triggered = any(
            self.first.condition(j, df, **kwargs)
            for j in range(i - self.lookback, i)
        )

        current_triggered = self.then.condition(i, df, **kwargs)

        return prior_triggered and current_triggered


# ==================================
# 2. The Pydantic Schema
# ==================================
class FollowsModel(BaseComponent):
    """
    Predicate that riggers when the `first` predicate occurred within the last `lookback` bars,
    and the `then` predicate occurs at the current bar. Useful for capturing
    cause-effect logic or short-term setup-follow-through patterns.

    Example: "Crossover occurred within 5 bars, and RSI is now overbought."
    """
    type: Literal["Follows"] = "Follows"
    first: AnyPredicate = Field(
        ...,
        description="The preceding predicate that must have occurred within the lookback window."
    )
    then: AnyPredicate = Field(
        ...,
        description="The predicate that must be True on the current bar."
    )
    lookback: int = Field(
        5,
        ge=1,
        description="How many bars back to search for the first event. Must be ≥ 1."
    )

    def build(self) -> Follows:
        return Follows(
            first=self.first.build(),
            then=self.then.build(),
            lookback=self.lookback
        )

