"""
utils/llm_factory.py — single place to instantiate the LLM.

All agents import get_llm() so switching providers
(Mistral ↔ Groq ↔ local Ollama) requires changing only config.py.
"""

from __future__ import annotations

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import (
    LLM_PROVIDER,
    LLM_MODEL,
    LLM_TEMPERATURE,
    MISTRAL_API_KEY,
    GROQ_API_KEY,  # Swapped from OPENAI_API_KEY
)


def get_llm():
    """Return the configured LangChain chat model."""
    if LLM_PROVIDER == "mistral":
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
            api_key=MISTRAL_API_KEY,
        )

    elif LLM_PROVIDER == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
            groq_api_key=GROQ_API_KEY,
        )

    elif LLM_PROVIDER == "ollama":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(model=LLM_MODEL, temperature=LLM_TEMPERATURE)

    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}. Use mistral | groq | ollama")