from abc import ABC, abstractmethod
from pydantic import BaseModel


class BaseComponent(ABC, BaseModel):
    @abstractmethod
    def build(self):
        pass
