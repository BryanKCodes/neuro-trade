from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import TypeVar, Generic

T = TypeVar('T')

class BaseComponent(ABC, BaseModel, Generic[T]):
    @abstractmethod
    def build(self) -> T:
        pass
