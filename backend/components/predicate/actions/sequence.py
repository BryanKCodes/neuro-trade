import pandas as pd
from pydantic import Field
from typing import List, Literal, TYPE_CHECKING

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnyPredicate


# ==================================
# 1. The Logic Class
# ==================================
class Sequence(Predicate):
    def __init__(self, predicates: list[Predicate], max_bars_between: int = 25):
        """
        :param predicates: Ordered list of Predicate objects.
        :param max_bars_between: Maximum bars allowed between any two predicates.
        """
        if not isinstance(predicates, list) or len(predicates) < 2:
            raise ValueError("Sequence requires a list of at least two predicates.")
        self.predicates = predicates
        self.max_bars_between = max_bars_between

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        # Start with the last event in the sequence. It MUST be true at the current index 'i'.
        if not self.predicates[-1].condition(i, df, **kwargs):
            return False

        # This will track the index of the last found event as we search backward.
        last_event_index = i

        # Now, iterate backward through the rest of the predicates, from second-to-last to first.
        for j in range(len(self.predicates) - 2, -1, -1):
            predicate_to_find = self.predicates[j]
            found_in_window = False

            # Define the search window for this predicate. It must occur
            # between (last_event_index - max_bars_between) and (last_event_index - 1).
            search_start_index = last_event_index - 1
            search_end_index = max(-1, last_event_index - self.max_bars_between - 1)

            # Search backward within this window to find the preceding event.
            for k in range(search_start_index, search_end_index, -1):
                if k < 0:
                    break  # Stop if we run out of data history

                if predicate_to_find.condition(k, df, **kwargs):
                    # We found the preceding event in the correct place!
                    # Update the last_event_index to this new, earlier point in time.
                    last_event_index = k
                    found_in_window = True
                    break  # Stop searching for this predicate and move to the next one in the sequence.

            # If we looped through the entire window and didn't find the event, the sequence is broken.
            if not found_in_window:
                return False

        # If we successfully found every predicate in the correct order within their windows, the sequence is complete.
        return True


# ==================================
# 2. The Pydantic Schema
# ==================================
class SequenceModel(BaseComponent):
    """
    Predicate that checks if a series of predicates happened in order,
    each within a certain maximum gap from the previous.

    Checks whether a sequence of predicates occurred in the given order,
    each within a maximum spacing of `max_bars_between` bars from the next.
    Great for structured multistep patterns.

    Example: "Pattern A → then crossover → then RSI overbought", all within 25 bars.
    """
    type: Literal["Sequence"] = "Sequence"
    predicates: List[AnyPredicate] = Field(
        ...,
        min_length=2,
        description="Ordered list of predicates that must be triggered in sequence."
    )
    max_bars_between: int = Field(
        25,
        ge=1,
        description="Maximum number of bars allowed between two successive predicates. Must be ≥ 1."
    )

    def build(self) -> Sequence:
        return Sequence(
            predicates=[predicate.build() for predicate in self.predicates],
            max_bars_between=self.max_bars_between
        )
