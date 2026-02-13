from dataclasses import dataclass, field
from typing import Optional
import torch


@dataclass
class Category:
    title: str
    content: str

    def to_query_string(self) -> str:
        return f"{self.title}: {self.content}"


@dataclass
class CategoryTheme:
    title: str
    categories: list[Category]

    def __str__(self):
        categories_str = "\n".join(
            [f"- {category.title}: {category.content}" for category in self.categories]
        )
        return f"Theme: {self.title}\nCategories:\n{categories_str}"


@dataclass
class Paper:
    title: str
    abstract: str
    url: str
    conference_name: str
    conference_year: int
    embedding: torch.Tensor
    authors: Optional[list[str]] = None
    id: Optional[int] = None

    def from_json(data: dict) -> 'Paper':
        return Paper(
            id=data.get("id", None),
            title=data["title"],
            abstract=data["abstract"],
            url=data["url"],
            conference_name=data["conference_name"],
            conference_year=data["conference_year"],
            embedding=data["embedding"],
            authors=data.get("authors", None),
        )


@dataclass
class PaperWithCategories(Paper):
    categories: list[Category] = field(default_factory=list)
