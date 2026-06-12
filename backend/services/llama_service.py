"""
Meta Llama summarization service — Ollama (local) or Groq / Together (cloud).

Environment:
  LLAMA_PROVIDER=ollama|groq|together   (default: ollama if reachable, else groq if key set)
  LLAMA_MODEL=llama3.2                  (Ollama) or llama-3.3-70b-versatile (Groq)
  OLLAMA_BASE_URL=http://localhost:11434
  LLAMA_API_KEY / GROQ_API_KEY / TOGETHER_API_KEY
"""

import json
import logging
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

MAX_PROMPT_MESSAGES = int(os.getenv("SUMMARY_PROMPT_MESSAGES", "60"))
MAX_MESSAGE_CHARS = int(os.getenv("SUMMARY_MESSAGE_CHARS", "280"))

DEFAULT_MODELS = {
    "ollama": "llama3.2",
    "groq": "llama-3.3-70b-versatile",
    "together": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
}

API_BASES = {
    "groq": "https://api.groq.com/openai/v1",
    "together": "https://api.together.xyz/v1",
}

PERIOD_CONTEXT = {
    "24h": "the last 24 hours (real time)",
    "conversation_tail": "the most recent 24 hours of this conversation",
    "recent": "the most recent messages in this conversation",
    "client": "the most recent messages in this conversation",
}

EXECUTIVE_SUMMARY_PROMPT = """You are a business analyst summarizing WhatsApp chat activity from {time_context}.

RULES:
- Write ONE coherent executive paragraph (3-6 sentences). Do NOT list messages one by one.
- Do NOT quote every speaker unless a person is central to a decision or assignment.
- Merge related discussions into a single narrative.
- Extract tasks, blockers, decisions, assignments, deadlines, and concerns.
- Remove greetings, emojis, and casual chat filler.
- Focus on actionable, business-relevant information.
- Open with a brief time/context phrase appropriate to the messages (do not invent dates).

CHAT TYPE: {chat_type}
MESSAGES (chronological):
{messages_block}

Respond with ONLY valid JSON (no markdown fences) in this exact shape:
{{
  "summary": "executive paragraph here",
  "keyDecisions": ["decision 1"],
  "assignedTasks": ["task with owner if known"],
  "pendingActions": ["action still needed"],
  "blockers": ["blocker or risk"],
  "peopleMentioned": ["name1", "name2"],
  "sentiment": "Positive" | "Neutral" | "Negative"
}}

Use empty arrays when nothing applies. sentiment must be exactly one of: Positive, Neutral, Negative."""


class LlamaServiceError(Exception):
    def __init__(self, message: str, *, status: str = "error"):
        super().__init__(message)
        self.status = status


class LlamaService:
    def __init__(self) -> None:
        self.provider = self._resolve_provider()
        self.model = os.getenv("LLAMA_MODEL", "").strip() or DEFAULT_MODELS.get(
            self.provider, DEFAULT_MODELS["ollama"]
        )
        self.ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.api_key = (
            os.getenv("LLAMA_API_KEY", "").strip()
            or os.getenv("GROQ_API_KEY", "").strip()
            or os.getenv("TOGETHER_API_KEY", "").strip()
        )
        self.available = self._check_configured()
        if self.available:
            logger.info(
                "Llama service ready — provider=%s model=%s",
                self.provider,
                self.model,
            )

    def _resolve_provider(self) -> str:
        explicit = os.getenv("LLAMA_PROVIDER", "").strip().lower()
        if explicit in ("ollama", "groq", "together"):
            return explicit
        if os.getenv("GROQ_API_KEY") or os.getenv("TOGETHER_API_KEY") or os.getenv("LLAMA_API_KEY"):
            if os.getenv("TOGETHER_API_KEY"):
                return "together"
            return "groq"
        return "ollama"

    def _check_configured(self) -> bool:
        if self.provider == "ollama":
            return True
        return bool(self.api_key)

    def test_connection(self) -> Dict[str, Any]:
        if self.provider == "ollama":
            try:
                self._http_get(f"{self.ollama_base}/api/tags")
                sample = self.generate("Reply with exactly: OK", max_tokens=16, temperature=0)
                return {
                    "success": True,
                    "status": "connected",
                    "message": "Ollama Llama is working correctly",
                    "model": self.model,
                    "provider": self.provider,
                    "sample_response": sample[:100],
                }
            except Exception as exc:
                logger.error("Ollama test failed: %s", exc)
                return {
                    "success": False,
                    "status": "unavailable",
                    "message": (
                        f"Cannot reach Ollama at {self.ollama_base}. "
                        "Install Ollama and run: ollama pull llama3.2"
                    ),
                    "provider": self.provider,
                }

        if not self.api_key:
            return {
                "success": False,
                "status": "missing_api_key",
                "message": f"Set GROQ_API_KEY or TOGETHER_API_KEY for provider '{self.provider}'",
                "provider": self.provider,
            }

        try:
            sample = self.generate("Reply with exactly: OK", max_tokens=16, temperature=0)
            return {
                "success": True,
                "status": "connected",
                "message": f"Meta Llama via {self.provider} is working correctly",
                "model": self.model,
                "provider": self.provider,
                "sample_response": sample[:100],
            }
        except LlamaServiceError as exc:
            return {
                "success": False,
                "status": exc.status,
                "message": str(exc),
                "provider": self.provider,
            }

    def generate(
        self,
        prompt: str,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> str:
        if not self.available:
            raise LlamaServiceError(
                "Llama is not configured. Use Ollama locally or set GROQ_API_KEY.",
                status="unavailable",
            )
        if self.provider == "ollama":
            return self._generate_ollama(prompt, max_tokens, temperature)
        return self._generate_openai_compatible(prompt, max_tokens, temperature)

    def summarize_messages(
        self,
        messages: List[Dict[str, Any]],
        chat_type: str = "individual",
        *,
        period: str = "24h",
    ) -> Dict[str, Any]:
        if not messages:
            return {
                "summary": "No messages were available to summarize for this chat.",
                "keyDecisions": [],
                "assignedTasks": [],
                "pendingActions": [],
                "blockers": [],
                "peopleMentioned": [],
                "sentiment": "Neutral",
            }

        time_context = PERIOD_CONTEXT.get(period, PERIOD_CONTEXT["recent"])
        messages_block = self._format_messages_block(messages)
        prompt = EXECUTIVE_SUMMARY_PROMPT.format(
            chat_type=chat_type,
            time_context=time_context,
            messages_block=messages_block,
        )
        raw = self.generate(prompt, max_tokens=4096, temperature=0.2)
        if not raw.strip():
            raise LlamaServiceError("Llama returned an empty summary response")
        parsed = self._parse_json_response(raw)
        normalized = self._normalize_insights(parsed)
        normalized["summary"] = self._clean_summary_text(normalized["summary"])
        return normalized

    def _generate_ollama(self, prompt: str, max_tokens: int, temperature: float) -> str:
        url = f"{self.ollama_base}/api/chat"
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        try:
            data = self._http_post_json(url, payload)
            message = data.get("message") or {}
            content = message.get("content", "")
            if content:
                return content.strip()
            raise LlamaServiceError("Ollama returned empty content", status="invalid_response")
        except LlamaServiceError:
            raise
        except Exception as exc:
            logger.error("Ollama generate failed: %s", exc, exc_info=True)
            raise LlamaServiceError(f"Ollama error: {exc}", status="api_error") from exc

    def _generate_openai_compatible(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> str:
        base = API_BASES.get(self.provider)
        if not base:
            raise LlamaServiceError(f"Unknown provider: {self.provider}")
        url = f"{base}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        try:
            data = self._http_post_json(url, payload, headers=headers)
            choices = data.get("choices") or []
            if not choices:
                raise LlamaServiceError("API returned no choices", status="invalid_response")
            content = choices[0].get("message", {}).get("content", "")
            if content:
                return content.strip()
            raise LlamaServiceError("API returned empty content", status="invalid_response")
        except LlamaServiceError:
            raise
        except Exception as exc:
            logger.error("%s generate failed: %s", self.provider, exc, exc_info=True)
            raise LlamaServiceError(f"{self.provider} API error: {exc}", status="api_error") from exc

    @staticmethod
    def _http_get(url: str) -> Dict[str, Any]:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    @staticmethod
    def _http_post_json(
        url: str,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        hdrs = {"Content-Type": "application/json", **(headers or {})}
        req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise LlamaServiceError(
                f"HTTP {exc.code}: {detail}",
                status="api_error",
            ) from exc

    def _format_messages_block(self, messages: List[Dict[str, Any]]) -> str:
        tail = messages[-MAX_PROMPT_MESSAGES:] if len(messages) > MAX_PROMPT_MESSAGES else messages
        lines = []
        for msg in tail:
            sender = msg.get("senderName") or msg.get("sender", "Unknown")
            text = (msg.get("messageText") or msg.get("content", "")).strip()
            if not text:
                continue
            if len(text) > MAX_MESSAGE_CHARS:
                text = text[:MAX_MESSAGE_CHARS].rstrip() + "…"
            ts = msg.get("timestamp", "")
            if hasattr(ts, "isoformat"):
                ts = ts.isoformat()
            lines.append(f"[{ts}] {sender}: {text}")
        return "\n".join(lines) if lines else "(no message content)"

    @staticmethod
    def _clean_summary_text(text: str) -> str:
        cleaned = re.sub(r"\s+", " ", (text or "").strip())
        cleaned = re.sub(r"\.{3,}$", "", cleaned).rstrip("…").strip()
        if cleaned and cleaned[-1] not in ".!?":
            words = cleaned.split()
            if words and len(words[-1]) <= 2:
                cleaned = " ".join(words[:-1])
            if cleaned and cleaned[-1] not in ".!?":
                cleaned += "."
        return cleaned or "No summary could be generated."

    @staticmethod
    def _extract_summary_from_raw(raw: str) -> Optional[str]:
        match = re.search(r'"summary"\s*:\s*"([\s\S]*?)"\s*,', raw)
        if not match:
            match = re.search(r'"summary"\s*:\s*"([\s\S]+)$', raw)
        if not match:
            return None
        text = match.group(1).replace('\\"', '"').replace("\\n", "\n")
        return text.strip()

    def _parse_json_response(self, raw: str) -> Dict[str, Any]:
        cleaned = raw.strip()
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    pass

        partial_summary = self._extract_summary_from_raw(raw)
        if partial_summary:
            logger.warning("Using partial summary extracted from truncated Llama JSON")
            return {
                "summary": partial_summary,
                "keyDecisions": [],
                "assignedTasks": [],
                "pendingActions": [],
                "blockers": [],
                "peopleMentioned": [],
                "sentiment": "Neutral",
            }

        if cleaned and not cleaned.startswith("{"):
            logger.warning("Using plain-text Llama response as summary")
            return {
                "summary": cleaned,
                "keyDecisions": [],
                "assignedTasks": [],
                "pendingActions": [],
                "blockers": [],
                "peopleMentioned": [],
                "sentiment": "Neutral",
            }

        logger.error("Invalid JSON from Llama: %s", raw[:500])
        raise LlamaServiceError("Llama returned invalid JSON for summary insights")

    def _normalize_insights(self, data: Dict[str, Any]) -> Dict[str, Any]:
        sentiment = str(data.get("sentiment", "Neutral")).strip().capitalize()
        if sentiment not in ("Positive", "Neutral", "Negative"):
            sentiment = "Neutral"

        def _as_list(key: str) -> List[str]:
            val = data.get(key, [])
            if not isinstance(val, list):
                return [str(val)] if val else []
            return [str(item).strip() for item in val if str(item).strip()]

        return {
            "summary": str(data.get("summary", "")).strip()
            or "No summary could be generated.",
            "keyDecisions": _as_list("keyDecisions"),
            "assignedTasks": _as_list("assignedTasks"),
            "pendingActions": _as_list("pendingActions"),
            "blockers": _as_list("blockers"),
            "peopleMentioned": _as_list("peopleMentioned"),
            "sentiment": sentiment,
        }


llama_service = LlamaService()
