import numpy as np
import pandas as pd
from datetime import timedelta
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

    def _compute_start_index(self, duration_days: int) -> int:
        """Finds the index in self.df to start from based on a rolling window of N days."""
        if duration_days is None:
            return 0
        target_date = self.df.index[-1] - timedelta(days=duration_days)
        # searchsorted returns the insertion point, which is exactly the start index
        start_idx = self.df.index.searchsorted(target_date, side="left")
        return int(start_idx)

    def run(self) -> None:
        self.df["Cash"] = np.full(len(self.df), self._portfolio_value)
        cash_series = self.df["Cash"].values

        for i in range(self._start_index, len(self.df)):
            candle = Candle(i, self.df)

            # Check existing trades
            self._update_open_trades(i, candle)

            # Clean up closed trades
            self._active_trades = [t for t in self._active_trades if t.is_open]

            # Try to open new trade
            for rule in self._strategy.rules:
                context = {'open_trades': self._active_trades, 'offset': self._start_index}
                new_trade = rule.generate_signal(i, self.df, **context)
                if new_trade:
                    self._trades.append(new_trade)
                    self._active_trades.append(new_trade)

            # Update portfolio value
            equity = self._portfolio_value
            for trade in self._active_trades:
                equity += trade.calculate_equity(candle)

            cash_series[i] = self._portfolio_value
            self._equity_curve.append(equity)

    def _update_open_trades(self, i: int, candle: Candle) -> None:
        for trade in self._active_trades:
            exit_now = trade.should_exit(i, self.df)
            hit_stop = trade.is_stop_loss_hit(i, candle)
            hit_tp = trade.is_take_profit_hit(i, candle)

            if exit_now or hit_stop or hit_tp:
                trade.close(candle.candle_close)
                self._portfolio_value += trade.pnl() or 0

    @property
    def trades(self):
        return self._trades

    @property
    def equity_curve(self):
        return pd.Series(self._equity_curve)
