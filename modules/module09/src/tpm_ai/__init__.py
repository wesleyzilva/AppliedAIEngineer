"""Assistente local de aprendizagem e trabalho."""

__all__ = ["LocalAssistant", "RAGIndex", "OllamaClient"]

from .agent import LocalAssistant
from .llm import OllamaClient
from .rag import RAGIndex
