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
        if duration_days is None:
            return 0
        target_date = self.df.index[-1] - timedelta(days=duration_days)
        start_idx = self.df.index.searchsorted(target_date, side="left")
        return int(start_idx)

    def run(self) -> None:
        # Initialize Cash column so the Cash expression reads portfolio value per bar.
        self.df["Cash"] = np.full(len(self.df), self._portfolio_value)

        start_date = self.df.index[self._start_index]
        self._cash_flows.append((start_date, -self._initial_cash))

        # Signals fire on bar i but execute at bar i+1's open to prevent look-ahead bias.
        pending_entries: list[tuple] = []  # [(rule, params_dict), ...]

        for i in range(self._start_index, len(self.df)):
            candle = Candle(i, self.df)

            # Step 1: Execute entries that were signaled on the previous bar.
            # Entry price is this bar's open — no knowledge of this bar's close used.
            for rule, params in pending_entries:
                new_trade = rule.execute_entry(i, self.df, params)
                if self._portfolio_value <= 0:
                    continue
                # Cap size to what cash can genuinely afford at this bar's open.
                max_affordable = self._portfolio_value / new_trade._entry_price
                if new_trade._size > max_affordable:
                    new_trade._size = max_affordable
                # Drop the trade if the cash-adjusted size is effectively zero.
                # This prevents phantom chart markers from near-broke sessions.
                if new_trade._size <= 0:
                    continue
                self._portfolio_value -= new_trade.cost()
                self._trades.append(new_trade)
                self._active_trades.append(new_trade)
            pending_entries = []

            # Step 2: Check exits, stop-loss, and take-profit for all active trades.
            # Closing trades restores cash before new signals are evaluated.
            self._update_open_trades(i, candle)
            self._active_trades = [t for t in self._active_trades if t.is_open]

            # Step 3: Update the Cash column so Cash expressions see current capital.
            self.df.at[self.df.index[i], 'Cash'] = self._portfolio_value

            # Step 4: Evaluate entry signals. Two guards prevent double-entry:
            #   a) One active trade per rule (position guard).
            #   b) One queued pending entry per rule (prevents re-queuing same bar).
            #   c) Skip the last bar — there is no next bar to execute on.
            for rule in self._strategy.rules:
                if any(t.rule is rule for t in self._active_trades):
                    continue
                if any(r is rule for r, _ in pending_entries):
                    continue
                if i + 1 >= len(self.df):
                    continue
                context = {'open_trades': self._active_trades, 'offset': self._start_index}
                signal_params = rule.generate_signal(i, self.df, **context)
                if signal_params:
                    pending_entries.append((rule, signal_params))

            # Step 5: Equity = available cash + current market value of all open positions.
            # With cash accounting in place, this is always the true account value.
            equity = self._portfolio_value
            for trade in self._active_trades:
                equity += trade.calculate_equity(candle)
            self._equity_curve.append(equity)

        end_date = self.df.index[-1]
        final_equity = self._equity_curve[-1] if self._equity_curve else self._initial_cash
        self._cash_flows.append((end_date, final_equity))

    def _update_open_trades(self, i: int, candle: Candle) -> None:
        for trade in self._active_trades:
            # A trade that just entered this bar cannot exit on the same bar.
            # Enforcing a minimum 1-bar holding period prevents stacked buy/sell
            # arrows at the same chart position and matches standard retail behavior.
            if trade.entry_i == i:
                continue

            exit_now = trade.should_exit(i, self.df)
            hit_stop = trade.is_stop_loss_hit(i, candle)
            hit_tp = trade.is_take_profit_hit(i, candle)

            if exit_now or hit_stop or hit_tp:
                trade.close(candle.candle_close, i)
                # Return the entry cost plus profit (or minus loss) to the cash pool.
                self._portfolio_value += trade.cost() + (trade.pnl() or 0)

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
