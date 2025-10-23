from abc import ABC, abstractmethod
import pandas as pd
from typing import Any, Callable, Optional

from components.candle import Candle


class Trade(ABC):
    """
    Represents old trade with entry details
    """

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
        """
        Initialize old Trade.

        :param entry_price: Price at which the trade was entered
        :param size: Position size (e.g. number of shares/contracts)
        :param stop_loss: Optional stop loss price level
        :param take_profit: Optional take profit price level
        """
        self._uid = uid
        self._i = i
        self._rule = rule
        self._entry_price = entry_price
        self._exit_price: Optional[float] = None
        self._size = size
        self._slippage: float = 0.001
        self._is_open: bool = True
        self._stop_loss = stop_loss
        self._take_profit = take_profit
        self.exit_strategy: Optional[Any] = rule.exit.clone() if rule.exit else None

    def should_exit(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        kwargs['trade_uid'] = self._uid
        if self.exit_strategy:
            return self.exit_strategy.condition(i, df, **kwargs)
        return False

    @abstractmethod
    def is_stop_loss_hit(self, index: int, candle: Candle) -> bool:
        """
        Check if the current price hits or breaches the stop loss level.

        For long trades, take profit is triggered if wick_low <= stop_loss.
        For short trades, take profit is triggered if wick_high >= stop_loss.

        :param index: The index in the dataframe to check stop loss price
        :param candle: Current market candle of the underlying asset.
        :return: True if stop loss is hit, False otherwise
        """
        pass

    @abstractmethod
    def is_take_profit_hit(self, index: int, candle: Candle) -> bool:
        """
        Check if the current price hits or exceeds the take profit level.

        For long trades, take profit is triggered if wick_high >= take_profit.
        For short trades, take profit is triggered if wick_low <= take_profit.

        :param index: The index in the dataframe to check take profit price
        :param candle: Current market candle of the underlying asset.
        :return: True if take profit is hit, False otherwise
        """
        pass

    @abstractmethod
    def pnl(self) -> Optional[float]:
        """
        Calculate the profit or loss of the trade.

        :return: PnL amount if trade is closed, else None
        """
        pass

    @abstractmethod
    def calculate_equity(self, candle: Candle) -> float:
        """
        Calculate the current value of this open trade based on current market price.
        For longs: size * current_price
        For shorts: size * (2 * entry_price - current_price)

        :param candle: Current market candle of the underlying asset.
        :return: Current equity value of the trade.
        """
        pass

    def cost(self) -> float:
        """
        Calculate total cost of the trade.

        :return: Cost required to enter trade
        """
        return self._entry_price * self._size

    def close(self, exit_price: float) -> None:
        """
        Close the trade at the given exit price.

        :param exit_price: Price at which the trade is closed
        """
        self._exit_price = exit_price
        self._is_open = False

    def active_days(self, curr_day: int) -> int:
        """
        Calculates the number of days the trade has been active.

        :param curr_day: The day of the simulation the method is called
        :return: The number of days since the trade entry
        """
        return curr_day - self._i

    @property
    def rule(self) -> Any:
        return self._rule

    @property
    def stop_loss(self) -> Callable[[int], Optional[float]]:
        return self._stop_loss

    @property
    def take_profit(self) -> Callable[[int], Optional[float]]:
        return self._take_profit

    @property
    def is_open(self) -> bool:
        return self._is_open

    def __str__(self) -> str:
        status = "OPEN" if self.is_open else f"CLOSED at {self._exit_price:.2f}"
        return (f"t={self._i}, x{self._size:.2f} @ {self._entry_price:.2f} with {self.cost()}, "
                f"SL={self._stop_loss}, TP={self._take_profit}, P&L={self.pnl()}, {status})")
