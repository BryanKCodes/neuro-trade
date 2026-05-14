import numpy as np
import pandas as pd
from datetime import timedelta, datetime
from typing import List, Tuple
from components.candle import Candle
from components.trades import Trade
from strategies.strategy import Strategy


class Simulator:
    def __init__(self, strategy: Strategy, df: pd.DataFrame, initial_cash: float, duration_days: int) -> None:
        self.df = df
        self._strategy = strategy
        self._initial_cash = initial_cash
        self._portfolio_value = initial_cash
        self._equity_curve = []
        self._trades: list[Trade] = []
        self._active_trades: list[Trade] = []
        self._start_index = self._compute_start_index(duration_days)
        self._cash_flows: List[Tuple[datetime, float]] = []

    def _compute_start_index(self, duration_days: int) -> int:
        """Finds the index in self.df to start from based on a rolling window of N days."""
        if duration_days is None:
            return 0
        target_date = self.df.index[-1] - timedelta(days=duration_days)
        start_idx = self.df.index.searchsorted(target_date, side="left")
        return int(start_idx)

    def run(self) -> None:
        self.df["Cash"] = np.full(len(self.df), self._portfolio_value)
        cash_series = self.df["Cash"].to_numpy(copy=True)

        start_date = self.df.index[self._start_index]
        self._cash_flows.append((start_date, -self._initial_cash))

        for i in range(self._start_index, len(self.df)):
            candle = Candle(i, self.df)

            self._update_open_trades(i, candle)
            self._active_trades = [t for t in self._active_trades if t.is_open]

            for rule in self._strategy.rules:
                # Position guard: one open trade per rule at a time
                if any(t.rule is rule for t in self._active_trades):
                    continue
                context = {'open_trades': self._active_trades, 'offset': self._start_index}
                new_trade = rule.generate_signal(i, self.df, **context)
                if new_trade:
                    self._trades.append(new_trade)
                    self._active_trades.append(new_trade)

            equity = self._portfolio_value
            for trade in self._active_trades:
                equity += trade.calculate_equity(candle)

            cash_series[i] = self._portfolio_value
            self._equity_curve.append(equity)

        end_date = self.df.index[-1]
        final_equity = self._equity_curve[-1] if self._equity_curve else self._initial_cash
        self._cash_flows.append((end_date, final_equity))


    def _update_open_trades(self, i: int, candle: Candle) -> None:
        for trade in self._active_trades:
            exit_now = trade.should_exit(i, self.df)
            hit_stop = trade.is_stop_loss_hit(i, candle)
            hit_tp = trade.is_take_profit_hit(i, candle)

            if exit_now or hit_stop or hit_tp:
                trade.close(candle.candle_close, i)
                self._portfolio_value += trade.pnl() or 0

    @property
    def start_index(self) -> int:
        return self._start_index

    @property
    def trades(self):
        return self._trades

    @property
    def equity_curve(self):
        return pd.Series(self._equity_curve)

    @property
    def cash_flows(self):
        return self._cash_flows
