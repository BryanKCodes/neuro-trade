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
        self.trade_type = trade
        self.filter = filter
        self.entry = entry
        self.exit = exit
        self.stop_loss = stop_loss
        self.take_profit = take_profit
        self.sizing = sizing

    def generate_signal(self, i: int, df: pd.DataFrame, **context) -> Optional[dict]:
        """
        Checks all conditions on bar i. Returns a parameter dict if a signal fires,
        None otherwise. Does NOT create a Trade — entry is deferred to the next bar.
        """
        if self.filter and not self.filter.condition(i, df, **context):
            return None
        if self.entry and not self.entry.condition(i, df, **context):
            return None

        trade_id = str(uuid.uuid4())
        context = {**context, 'trade_uid': trade_id}

        # Compute stop/take at signal bar so sizing expressions can reference them.
        stop_loss_price = self.stop_loss.calculate(i, df, **context)
        take_profit_price = self.take_profit.calculate(i, df, **context)
        context['stop_loss'] = stop_loss_price
        context['take_profit'] = take_profit_price

        # None means no sizing expression was provided — default to 1 unit.
        # An explicit 0.0 suppresses the trade rather than defaulting to 1.
        raw_size = self.sizing.calculate(i, df, **context)
        size = raw_size if raw_size is not None else 1.0
        if size <= 0:
            return None

        return {'trade_id': trade_id, 'size': size, 'context': context}

    def execute_entry(self, i: int, df: pd.DataFrame, params: dict) -> Trade:
        """
        Creates a Trade at bar i's open price.
        Called on the bar after the signal fires to eliminate look-ahead bias.
        """
        trade_class = Long if self.trade_type == 'long' else Short
        ctx = params['context']
        return trade_class(
            uid=params['trade_id'],
            i=i,
            rule=self,
            entry_price=df['Open'].iloc[i],
            size=params['size'],
            stop_loss=lambda x: self.stop_loss.calculate(x, df, **ctx),
            take_profit=lambda x: self.take_profit.calculate(x, df, **ctx),
        )
