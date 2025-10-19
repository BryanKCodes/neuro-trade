from typing import Any, Callable, Optional

from components.candle import Candle
from components.trades import Trade


class Short(Trade):
    def __init__(
        self,
        uid: str,
        i: int,
        rule: Any,
        entry_price: float,
        size: float,
        stop_loss: Callable[[int], Optional[float]],
        take_profit: Callable[[int], Optional[float]],
    ) -> None:
        super().__init__(uid, i, rule, entry_price, size, stop_loss, take_profit)

    def is_stop_loss_hit(self, index: int, candle: Candle) -> bool:
        stop_loss = self._stop_loss(index)
        if stop_loss is None:
            return False
        return candle.wick_high >= stop_loss

    def is_take_profit_hit(self, index: int, candle: Candle) -> bool:
        take_profit = self._take_profit(index)
        if take_profit is None:
            return False
        return candle.wick_low <= take_profit

    def pnl(self) -> Optional[float]:
        if self.is_open or self._exit_price is None:
            return None
        return (self._entry_price - self._exit_price * (1 + self._slippage)) * self._size

    def calculate_equity(self, candle: Candle) -> float:
        return self._size * (self._entry_price - candle.candle_close)

    def __str__(self) -> str:
        return f"Short({super().__str__()})"
