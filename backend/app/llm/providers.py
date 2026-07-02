from __future__ import annotations

from typing import Protocol, Type, TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMProvider(Protocol):
    def generate(self, prompt: str, schema: Type[SchemaT]) -> SchemaT:
        """Generate schema-constrained output from a prompt."""


class LocalRulesProvider:
    """Deterministic Phase 1 provider used when no external LLM key is configured."""

    def generate(self, prompt: str, schema: Type[SchemaT]) -> SchemaT:
        raise NotImplementedError(
            "LocalRulesProvider is a marker for deterministic agents in Phase 1. "
            "Add OpenAIProvider or GeminiProvider here when API keys are available."
        )
