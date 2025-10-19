import pandas as pd
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
AnyPredicate = "AnyPredicate"


# ==================================
# 1. The Logic Class
# ==================================
class Delay(Predicate):
    def __init__(self, predicate: Predicate, delay: int = 5):
        """
        :param predicate: The Predicate to monitor.
        :param delay: Number of bars to wait after the predicate first fires.
        """
        self.predicate = predicate
        self.delay = delay
        self.start = None

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        if self.start is None:
            if self.predicate.condition(i, df, **kwargs):
                self.start = i
        return self.start + self.delay <= i


# ==================================
# 2. The Pydantic Schema
# ==================================
class DelayModel(BaseComponent):
    """
    Predicate that delays the evaluation of another predicate by a fixed number of bars.
    Returns True only after the inner predicate has triggered and the specified
    delay period has passed. Useful for follow-up actions or staggered signals.

    Example: Delay(Crossover(...), delay=3) will fire 3 bars after crossover occurs.
    """
    type: Literal["Delay"] = "Delay"
    predicate: "AnyPredicate" = Field(
        ...,
        description="The predicate whose signal should be delayed."
    )
    delay: conint(ge=0) = Field(
        5,
        description="Number of bars to delay after the inner predicate triggers. Must be ≥ 0."
    )

    def build(self) -> Delay:
        return Delay(
            predicate=self.predicate.build(),
            delay=self.delay
        )
