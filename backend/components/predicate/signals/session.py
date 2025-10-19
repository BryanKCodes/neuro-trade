from datetime import time
import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class Session(Predicate):
    def __init__(self, start: time = time(9, 30), end: time = time(16, 0)):
        self.start = start
        self.end = end

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        t = df.index[i].time()
        return self.start <= t <= self.end


# ==================================
# 2. The Pydantic Schema
# ==================================
class SessionModel(BaseComponent):
    """
    Fires True for bars whose timestamp falls within the defined
    start and end times of the trading session.

    Useful if user prompts to only trade within London / Asian / New York sessions,
    or between any specified start and end time daily
    """
    type: Literal["Session"] = "Session"
    start: time = Field(
        time(9, 30),
        description="Session start time (inclusive), as HH:MM."
    )
    end: time = Field(
        time(16, 0),
        description="Session end time (inclusive), as HH:MM."
    )

    def build(self) -> Session:
        return Session(
            start=self.start,
            end=self.end
        )

