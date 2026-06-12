"""
Intent Classification Pipeline - ConvoInsight
Classifies a cluster summary into one of the defined intent labels using Gemini.
"""

import os

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    GENAI_AVAILABLE = False


INTENT_LABELS = [
    "question",    # sender is asking something
    "request",     # sender wants something done
    "complaint",   # sender is expressing dissatisfaction
    "greeting",    # hello / hi / how are you
    "information", # sender is sharing a fact or update
    "other",       # anything that doesn't fit above
]

_model = None


def _get_model():
    global _model
    if _model is None:
        if not GENAI_AVAILABLE:
            raise EnvironmentError("google.generativeai is not installed.")
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY environment variable is not set.")
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel("models/gemini-2.5-flash")
    return _model


def _rule_based_intent(summary_text: str) -> str:
    lower = summary_text.lower()
    if any(w in lower for w in ["hello", "hi ", "hey ", "good morning", "good evening", "how are you"]):
        return "greeting"
    if any(w in lower for w in ["angry", "upset", "complaint", "frustrated", "unacceptable", "asap", "urgent"]):
        return "complaint"
    if "?" in summary_text or any(w in lower for w in ["can you", "could you", "please send", "when will", "how much"]):
        return "question"
    if any(w in lower for w in ["need", "want", "please", "send me", "confirm", "deadline", "invoice", "order"]):
        return "request"
    if any(w in lower for w in ["update", "fyi", "just to let", "completed", "done", "received"]):
        return "information"
    return "other"


def classify_intent(summary_text: str) -> str:
    """
    Classify the intent of a cluster summary.

    Args:
        summary_text: The abstractive summary produced by SummarizationService.

    Returns:
        One of the INTENT_LABELS strings.
    """
    if not summary_text or not summary_text.strip():
        return "other"

    lower = summary_text.lower()
    if any(w in lower for w in ["hello", "hi ", "hey ", "good morning", "good evening", "how are you"]):
        return "greeting"

    use_gemini = os.getenv("ENABLE_GEMINI_INTENT", "0").lower() in (
        "1",
        "true",
        "yes",
    )
    if not use_gemini or not os.getenv("GEMINI_API_KEY") or not GENAI_AVAILABLE:
        return _rule_based_intent(summary_text)

    labels_str = ", ".join(INTENT_LABELS)
    prompt = f"""Classify the following message summary into exactly one intent label.

Available labels: {labels_str}

Definitions:
- question   : the sender is asking something
- request    : the sender wants something done or provided
- complaint  : the sender is dissatisfied or frustrated
- greeting   : the sender is saying hello / checking in
- information: the sender is sharing a fact, update, or status
- other      : does not fit any of the above

Summary: "{summary_text}"

Reply with only the single label word. No explanation."""

    try:
        model = _get_model()
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.0,
                max_output_tokens=10,
            ),
        )
        label = response.text.strip().lower()
        return label if label in INTENT_LABELS else "other"
    except Exception as e:
        print(f"[IntentPipeline] Error: {e}")
        return _rule_based_intent(summary_text)


def classify_all(sender_summaries: dict) -> dict:
    """
    Add intent to every cluster entry inside sender_summaries (in-place).

    Args:
        sender_summaries: output from SummarizationService.summarize_by_sender()

    Returns:
        The same dict with 'intent' key added to each cluster entry.
    """
    for sender, data in sender_summaries.items():
        for cluster in data.get("clusters", []):
            cluster["intent"] = classify_intent(cluster.get("summary", ""))
    return sender_summaries
