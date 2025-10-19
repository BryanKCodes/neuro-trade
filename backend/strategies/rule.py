from __future__ import annotations
from typing import Optional
import pandas as pd
import uuid

from components.predicate.base import Predicate
from components.expression.base import Expression
from components.trades import Trade, Long, Short


class Rule:
    """
    A single, self-contained trading rule that holds instantiated
    logic components for entry, exit, sizing, etc.
    """

    def __init__(
            self,
            trade: str,
            entry: Predicate,
            exit: Predicate,
            stop_loss: Expression,
            take_profit: Expression,
            sizing: Expression,
            filter: Predicate,
    ):
        """
        Initializes the Rule with pre-built logic components.
        This class no longer builds components from a config dict.
        """
        self.trade_type = trade
        self.filter = filter
        self.entry = entry
        self.exit = exit
        self.stop_loss = stop_loss
        self.take_profit = take_profit
        self.sizing = sizing

    def generate_signal(self, i: int, df: pd.DataFrame, **context) -> Optional[Trade]:
        """
        Generates a trade signal if all conditions are met.
        Now requires 'cash' to be passed for sizing calculations.
        """
        # Check pre-trade filter (like session constraints)
        if self.filter and not self.filter.condition(i, df, **context):
            return None

        # Check signal for entry
        if self.entry and not self.entry.condition(i, df, **context):
            return None

        trade_id = str(uuid.uuid4())
        context['trade_uid'] = trade_id

        # Compute stop loss price first, as it may be needed for sizing
        if self.stop_loss:
            stop_loss_price = self.stop_loss.calculate(i, df, **context)
        else:
            stop_loss_price = 0 if self.trade_type == 'long' else float('inf')

        # Compute take profit
        if self.take_profit:
            take_profit_price = self.take_profit.calculate(i, df, **context)
        else:
            take_profit_price = float('inf') if self.trade_type == 'long' else 0

        context['stop_loss'] = stop_loss_price
        context['take_profit'] = take_profit_price
        # Compute position size
        size = self.sizing.calculate(i, df, **context) or 1.0  # Might be wrong
        if size <= 0:
            return None

        # Create the trade
        trade_class = Long if 'long' else Short
        trade = trade_class(
            uid=trade_id,
            i=i,
            rule=self,
            entry_price=df['Close'].iloc[i],
            size=size,
            stop_loss=lambda x: self.stop_loss.calculate(x, df, **context) if self.stop_loss else None,
            take_profit=lambda x: self.take_profit.calculate(x, df, **context) if self.take_profit else None,
        )

        return trade
