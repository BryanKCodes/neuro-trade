import pandas as pd
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class Interval(Predicate):
    def __init__(self, interval: int = 30, start: int = 0, stop: int = float('inf')) -> None:
        self.interval = interval
        self.start = start
        self.stop = stop

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        idx = i - kwargs.get('offset', 0)
        return self.start <= idx < self.stop and (idx - self.start) % self.interval == 0


# ==================================
# 2. The Pydantic Schema
# ==================================
class IntervalModel(BaseComponent):
    """
    Fires a signal every `interval` bars, starting at index `start`
    and stopping before index `stop`. Useful for regularly timed entries
    or checks (e.g. re-balancing every N bars).
    """
    type: Literal["Interval"] = "Interval"
    interval: conint(ge=1) = Field(
        30,
        description="Number of bars between signals. Must be ≥ 1."
    )
    start: conint(ge=0) = Field(
        0,
        description="Index at which to begin firing signals. Must be ≥ 0."
    )
    stop: conint(ge=0) = Field(
        float('inf'),
        description="Index at which to stop firing (exclusive). Must be ≥ 0."
    )

    def build(self) -> Interval:
        return Interval(
            interval=self.interval,
            start=self.start,
            stop=self.stop
        )
