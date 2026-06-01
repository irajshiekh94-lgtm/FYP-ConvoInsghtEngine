"""
Text Normaliser - ConvoInsight
Rule-based + optional FLAN-T5 ML polish for WhatsApp / STT text.
"""

import re
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from word2number import w2n


# ── ML model (singleton) ──────────────────────────────────────────────────────
MODEL_NAME = "google/flan-t5-base"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
_tokenizer = None
_model = None


def _load_model():
    global _tokenizer, _model
    if _tokenizer is None:
        print("[Normaliser] Loading FLAN-T5...")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(DEVICE)
        _model.eval()
        print("[Normaliser] FLAN-T5 ready.")
    return _tokenizer, _model


# ── SQLite memory cache ───────────────────────────────────────────────────────
DB_PATH = "memory.db"
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_cur = _conn.cursor()
_cur.execute("""
CREATE TABLE IF NOT EXISTS memory (
    raw        TEXT PRIMARY KEY,
    normalized TEXT,
    usage_count INTEGER DEFAULT 1,
    last_used   TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
_conn.commit()


def remember(raw: str, normalized: str) -> None:
    """Persist a normalisation result (upsert with usage counter)."""
    try:
        _cur.execute("""
            INSERT INTO memory (raw, normalized, last_used)
            VALUES (?, ?, ?)
            ON CONFLICT(raw) DO UPDATE SET
                normalized  = excluded.normalized,
                usage_count = usage_count + 1,
                last_used   = excluded.last_used
        """, (raw.strip(), normalized.strip(), datetime.now()))
        _conn.commit()
    except Exception as exc:
        print(f"[Normaliser] Memory write error: {exc}")


def recall(text: str) -> Optional[str]:
    """Return cached normalisation or None."""
    try:
        _cur.execute("SELECT normalized FROM memory WHERE raw = ?", (text.strip(),))
        row = _cur.fetchone()
        return row[0] if row else None
    except Exception:
        return None


# ── Lookup tables ─────────────────────────────────────────────────────────────

# Duplicates removed; longest / most-specific form kept.
SLANG_MAP: Dict[str, str] = {
    # Internet / chat abbreviations
    "omg": "oh my god", "lol": "laughing out loud", "lmao": "laughing my ass off",
    "btw": "by the way", "imo": "in my opinion", "imho": "in my humble opinion",
    "fyi": "for your information", "brb": "be right back", "idk": "I don't know",
    "tbh": "to be honest", "nvm": "never mind", "jk": "just kidding",
    "af": "as heck", "fr": "for real", "smh": "shaking my head",
    "wth": "what the hell", "wtf": "what the heck", "omw": "on my way",
    "rn": "right now", "messg": "message", "msg": "message",
    "tf": "the heck", "gtg": "got to go", "tysm": "thank you so much",
    "lmk": "let me know", "bff": "best friends forever", "tl;dr": "too long didn't read",
    # Politeness shortcuts
    "pls": "please", "plz": "please", "plssss": "please",
    "thx": "thanks", "thnx": "thanks", "ty": "thank you",
    "sry": "sorry",
    # Prepositions / conjunctions
    "w/": "with", "w/o": "without", "b4": "before",
    "b/c": "because", "bc": "because", "cuz": "because",
    # Informal pronouns / determiners
    "bro": "brother", "brooo": "brother", "bruh": "brother", "sis": "sister",
    "dis": "this", "dat": "that", "d": "the",
    "nah": "no", "yah": "yes", "ya": "yes", "yep": "yes", "nope": "no",
    "luv": "love", "ur": "your", "u": "you",
    # Common shorthand
    "doc": "document", "docs": "documents", "nt": "not",
    "chk": "check", "chck": "check", "frnd": "friend", "hv": "have",
    "acc": "accuracy", "r": "are", "y": "why", "c": "see",
    "2": "to", "4": "for", "8": "ate",
    "knw": "know", "knww": "know", "lyk": "like",
    "prof": "professor", "pwd": "password",
    # Contractions without apostrophes
    "aint": "am not", "ain't": "am not",
    "dont": "do not", "cant": "cannot",
    "wont": "will not", "didnt": "did not",
    "wasnt": "was not", "werent": "were not",
    "isnt": "is not", "arent": "are not",
    "hasnt": "has not", "havent": "have not",
    "shouldnt": "should not", "wouldnt": "would not", "couldnt": "could not",
    # Verbal contractions
    "gonna": "going to", "wanna": "want to", "gotta": "got to",
    "kinda": "kind of", "sorta": "sort of", "dunno": "don't know",
    "lemme": "let me", "gimme": "give me",
    "woulda": "would have", "coulda": "could have", "shoulda": "should have",
    # Acronyms
    "poc": "proof of concept", "asap": "as soon as possible",
    "faq": "frequently asked questions", "eta": "estimated time of arrival",
    "rsvp": "please respond", "aka": "also known as", "etc": "et cetera",
    "vs": "versus",
}

TECH_TERMS: Dict[str, str] = {
    "cpu": "CPU", "gpu": "GPU", "ram": "RAM", "rom": "ROM",
    "usb": "USB", "hdmi": "HDMI", "wifi": "WiFi", "ios": "iOS",
    "api": "API", "sdk": "SDK", "ui": "UI", "ux": "UX",
    "html": "HTML", "css": "CSS", "sql": "SQL", "json": "JSON",
    "xml": "XML", "pdf": "PDF", "csv": "CSV", "url": "URL",
    "http": "HTTP", "https": "HTTPS", "ftp": "FTP", "ssh": "SSH",
    "nan": "NaN", "null": "null", "seo": "SEO", "crm": "CRM",
    "ml": "machine learning", "ai": "artificial intelligence",
}


# ── Rule-based helpers ────────────────────────────────────────────────────────

def remove_emojis(text: str) -> str:
    """Remove Unicode emojis, emoticons, and zero-width characters."""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"
        "\U0001FA00-\U0001FAFF"
        "\U00002600-\U000026FF"
        "\U00002700-\U000027BF"
        "\U0001F004-\U0001F9E6"
        "\u200d\ufe0f"
        "]+",
        flags=re.UNICODE,
    )
    text = emoji_pattern.sub("", text)

    for emoticon in [
        r":\)", r":\(", r":D", r":P", r":p", r";-?\)", r"<3", r"</3",
        r":-?\)", r":-?\(", r":-?D", r":-?P", r":-?p", r"xD", r"XD",
        r":\|", r":-\|", r"T_T", r"T\.T", r">_<", r"\^_\^", r"-_-",
        r"o_o", r"O_O", r"0_0", r":o", r":O", r"D:", r":\\/", r":-\\/",
        r"=\)", r"=\(", r"=D", r"=P", r";\)", r":3",
    ]:
        text = re.sub(emoticon, "", text)

    text = re.sub(r"[\u200b-\u200f\u2028-\u202f\u205f-\u206f]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_numbers(text: str) -> str:
    """Convert written-out numbers to digits where unambiguous."""
    # Protect "error 404 and 500" style phrases first
    text = re.sub(
        r"\berror\s+(\d{3})\s+(?:&|and)\s+(\d{3})",
        lambda m: f"error {m.group(1)} and {m.group(2)}",
        text,
        flags=re.IGNORECASE,
    )
    pattern = (
        r"\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|"
        r"eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|"
        r"eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|"
        r"eighty|ninety|hundred|thousand|million|billion)(?:\s+and\s+|\s+)*)+\b"
    )

    def _repl(m):
        try:
            return str(w2n.word_to_num(m.group().strip()))
        except Exception:
            return m.group()

    return re.sub(pattern, _repl, text, flags=re.IGNORECASE)


def fix_repeated_chars(text: str) -> str:
    """Collapse 3+ repeated characters: heyyy → hey."""
    return re.sub(r"(.)\1{2,}", r"\1", text)


def fix_spacing(text: str) -> str:
    """Fix common spacing issues around punctuation and numbers."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\d)([A-Za-z])(?![a-z])", r"\1 \2", text)
    text = re.sub(r"(\d+)\.\s+(\d+)%", r"\1.\2%", text)
    text = re.sub(r"(\d+)\s+\.\s*(\d+)%", r"\1.\2%", text)
    text = re.sub(r"(\d)\s*(%)", r"\1\2", text)
    text = re.sub(r"(\d+)\.\s+(\d+)", r"\1.\2", text)
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)
    text = re.sub(r"([.,!?;:])(?=[A-Za-z])", r"\1 ", text)
    text = re.sub(r"(\d{1,2}):(\d{2})\s*(am|pm)", r"\1:\2 \3", text, flags=re.IGNORECASE)
    text = re.sub(r"([\[\(\{])\s+", r"\1", text)
    text = re.sub(r"\s+([\]\)\}])", r"\1", text)
    return text.strip()


def fix_capitalization(text: str) -> str:
    """Capitalise first letter of sentence and the pronoun 'I'."""
    if not text:
        return text
    text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
    text = re.sub(r"([.!?])\s+([a-z])", lambda m: m.group(1) + " " + m.group(2).upper(), text)
    text = re.sub(r"\bi\b", "I", text)
    text = re.sub(r"\bi'm\b", "I'm", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi've\b", "I've", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi'll\b", "I'll", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi'd\b", "I'd", text, flags=re.IGNORECASE)
    return text


def fix_common_typos(text: str) -> str:
    """Fix common keyboard typos."""
    typo_map = {
        r"\bteh\b": "the",
        r"\bwth\b": "with",
        r"\bwht\b": "what",
        r"\bwhn\b": "when",
        r"\bthn\b": "then",
        r"\bwhch\b": "which",
        r"\bfrm\b": "from",
        r"\byur\b": "your",
        r"\btht\b": "that",
        r"\brecieve\b": "receive",
        r"\boccured\b": "occurred",
        r"\bseperate\b": "separate",
        r"\bdefinately\b": "definitely",
        r"\bvrything\b": "everything",
        r"\bgud\b": "good",
        r"\bhangin\b": "hanging",
        r"\btrashhhh\b": "trash",
        r"\blaggyyy\b": "laggy",
    }
    for pattern, replacement in typo_map.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def smart_sentence_split(text: str) -> List[str]:
    """Split text into sentences without breaking common abbreviations."""
    text = re.sub(r"([.!?])([A-Z])", r"\1 \2", text)
    parts = re.split(r"([.!?]\s+)", text)
    result = []
    for i in range(0, len(parts), 2):
        sentence = parts[i] + (parts[i + 1] if i + 1 < len(parts) else "")
        if sentence.strip():
            result.append(sentence.strip())
    return result


def fix_context_errors(text: str) -> str:
    """Fix domain-specific OCR / STT confusions."""
    text = re.sub(r"\bmodel\s+account\b", "model accuracy", text, flags=re.IGNORECASE)
    text = re.sub(r"\btrain\s+account\b", "train accuracy", text, flags=re.IGNORECASE)
    text = re.sub(r"\btest\s+account\b", "test accuracy", text, flags=re.IGNORECASE)
    text = re.sub(r"\berr\s+(\d+)", r"error \1", text, flags=re.IGNORECASE)
    text = re.sub(r"(\d+)\s*°?\s*c\b", r"\1°C", text, flags=re.IGNORECASE)
    text = re.sub(r"\b2day\b", "today", text, flags=re.IGNORECASE)
    text = re.sub(r"\b2morrow\b", "tomorrow", text, flags=re.IGNORECASE)
    return text


# ── Rule-based normalisation pipeline ────────────────────────────────────────

def rule_normalize(text: str) -> str:
    """
    Apply all rule-based normalisation stages in order.
    Preserves timestamps, URLs, emails, percentages, and error codes.
    """
    text = text.strip()
    text = remove_emojis(text)

    # Preserve tokens that must not be lowercased or altered
    preserved: Dict[str, str] = {}
    idx = 0

    def _preserve(match) -> str:
        nonlocal idx
        key = f"__preserve_{idx}__"
        preserved[key] = match.group()
        idx += 1
        return key

    text = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b", _preserve, text)
    text = re.sub(r"\$\d+(?:\.\d{2})?", _preserve, text)
    text = re.sub(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", _preserve, text)
    text = re.sub(r"https?://\S+", _preserve, text)
    text = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", _preserve, text)
    text = re.sub(r"\b\d+\.\d+%\b", _preserve, text)
    text = re.sub(r"\b\d+%\b", _preserve, text)
    text = re.sub(r"\b\d+\.\d+\b", _preserve, text)
    text = re.sub(r"\b\d+°C\b", _preserve, text)
    text = re.sub(r"\berror\s+\d{3}\b", _preserve, text, flags=re.IGNORECASE)

    text = text.lower()
    text = fix_repeated_chars(text)
    text = fix_context_errors(text)

    for slang, expansion in SLANG_MAP.items():
        text = re.sub(rf"\b{re.escape(slang)}\b", expansion, text)

    text = fix_common_typos(text)
    text = normalize_numbers(text)
    text = fix_spacing(text)

    sentences = smart_sentence_split(text)
    text = " ".join(fix_capitalization(s) for s in sentences)

    for tech_lower, tech_proper in TECH_TERMS.items():
        text = re.sub(rf"\b{re.escape(tech_lower)}\b", tech_proper, text, flags=re.IGNORECASE)

    for key, value in preserved.items():
        text = text.replace(key, value)

    text = re.sub(r"([.!?]){2,}", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\n+", " ", text)

    return text.strip()


# ── ML polish (optional) ──────────────────────────────────────────────────────

@torch.inference_mode()
def ml_polish(text: str) -> str:
    """
    Run FLAN-T5 grammar correction over the rule-normalised text.
    Processes in chunks to avoid truncation on long inputs.
    Falls back to the original chunk if output is suspiciously short.
    """
    tokenizer, model = _load_model()
    sentences = smart_sentence_split(text)

    max_input_tokens = 200
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for sentence in sentences:
        sent_len = len(tokenizer.encode(sentence, add_special_tokens=False))
        if current_len + sent_len > max_input_tokens and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_len = sent_len
        else:
            current_chunk.append(sentence)
            current_len += sent_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    polished: List[str] = []
    for i, chunk in enumerate(chunks):
        if not chunk.strip():
            continue

        prompt = f"Fix grammar and spelling errors only. Keep all content and meaning:\n\n{chunk}"
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=400).to(DEVICE)
        input_words = len(chunk.split())
        max_out = max(input_words + 100, 350)

        outputs = model.generate(
            **inputs,
            max_new_tokens=max_out,
            num_beams=2,
            no_repeat_ngram_size=3,
            temperature=0.2,
            do_sample=False,
            early_stopping=False,
            length_penalty=0.8,
        )
        result = tokenizer.decode(outputs[0], skip_special_tokens=True)

        if len(result.split()) < input_words * 0.7:
            print(f"[Normaliser] Chunk {i + 1} truncated, using rule output.")
            polished.append(chunk)
        else:
            polished.append(result)

    return " ".join(polished)


# ── Validation ────────────────────────────────────────────────────────────────

def validate_output(text: str, original: str) -> bool:
    """Sanity-check the normalised output against the original."""
    if not text or len(text.strip()) < 2:
        return False
    if "__preserve_" in text:
        return False
    words = text.split()
    if len(words) > 3 and len(set(words)) / len(words) < 0.3:
        return False          # excessive repetition
    if len(text) < len(original) * 0.3:
        return False          # too much was stripped
    if len(text) > len(original) * 3:
        return False          # hallucination / explosion
    return True


# ── Public API ────────────────────────────────────────────────────────────────

def full_normalize(text: str, use_ml: Optional[bool] = None) -> Dict:
    """
    Complete normalisation pipeline.

    Args:
        text  : Raw input text.
        use_ml: True  = always use FLAN-T5 polish
                False = rules only
                None  = auto (use ML only for texts < 100 words)

    Returns:
        {
            'normalized_text': str,
            'source'         : str,
            'validation'     : bool,
            'word_count'     : int
        }
    """
    if not text or not text.strip():
        return {"normalized_text": "", "source": "empty", "validation": False, "word_count": 0}

    # Check cache first
    cached = recall(text)
    if cached:
        return {
            "normalized_text": cached,
            "source": "cache",
            "validation": True,
            "word_count": len(cached.split()),
        }

    # Auto-decide ML usage
    if use_ml is None:
        word_count = len(text.split())
        use_ml = word_count < 100
        if not use_ml:
            print(f"[Normaliser] {word_count} words — using rules only to avoid truncation.")

    rule_out = rule_normalize(text)
    final_out = rule_out
    source = "rules only"

    if use_ml:
        try:
            ml_out = ml_polish(rule_out)
            if len(ml_out.split()) < len(rule_out.split()) * 0.7:
                print("[Normaliser] ML output truncated — falling back to rules.")
                source = "rules only (ML truncated)"
            else:
                final_out = ml_out
                source = "rules + ML"
        except Exception as exc:
            print(f"[Normaliser] ML error: {exc} — using rules only.")
            source = "rules only (ML error)"

    is_valid = validate_output(final_out, text)
    if not is_valid:
        final_out = rule_out
        is_valid = validate_output(rule_out, text)
        source = "rules only (validation fallback)"

    if is_valid:
        remember(text, final_out)

    return {
        "normalized_text": final_out,
        "source": source,
        "validation": is_valid,
        "word_count": len(final_out.split()),
    }


def batch_normalize(texts: List[str], use_ml: bool = False) -> List[Dict]:
    """Normalise a list of texts. ML is off by default for speed."""
    return [full_normalize(t, use_ml=use_ml) for t in texts]