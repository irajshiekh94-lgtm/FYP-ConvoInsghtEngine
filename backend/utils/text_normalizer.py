
import re
import sqlite3
from typing import Dict, List
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from word2number import w2n
from datetime import datetime


MODEL_NAME = "google/flan-t5-base"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

_tokenizer = None
_model = None


def _load_model():
    global _tokenizer, _model
    if _tokenizer is None:
        print("🔹 Loading FLAN-T5...")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(DEVICE)
        _model.eval()
        print("Model ready")
    return _tokenizer, _model

DB_PATH = "memory.db"

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS memory (
    raw TEXT PRIMARY KEY,
    normalized TEXT,
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()


def remember(raw: str, normalized: str):
    """Store with usage tracking"""
    try:
        cur.execute("""
            INSERT INTO memory (raw, normalized, last_used)
            VALUES (?, ?, ?)
            ON CONFLICT(raw) DO UPDATE SET
                normalized = excluded.normalized,
                usage_count = usage_count + 1,
                last_used = excluded.last_used
        """, (raw.strip(), normalized.strip(), datetime.now()))
        conn.commit()
    except Exception as e:
        print(f"Memory error: {e}")


def recall(text: str) -> str:
    """Recall from memory"""
    try:
        cur.execute(
            "SELECT normalized FROM memory WHERE raw=?",
            (text.strip(),)
        )
        row = cur.fetchone()
        return row[0] if row else None
    except:
        return None

SLANG_MAP = {
   
    "omg": "oh my god", "lol": "laughing out loud", "lmao": "laughing my ass off",
    "btw": "by the way", "imo": "in my opinion", "imho": "in my humble opinion",
    "fyi": "for your information", "brb": "be right back", "idk": "I don't know",
    "tbh": "to be honest", "nvm": "never mind", "jk": "just kidding",
    "af": "as heck", "fr": "for real", "smh": "shaking my head",
    "wth": "what the hell", "wtf": "what the heck", "omw": "on my way",
    "rn": "right now", "messg": "message", "msg": "message",
    "tf": "the heck", "gtg": "got to go", "tysm": "thank you so much",
    
    "pls": "please", "plz": "please", "plssss": "please", "thx": "thanks", 
    "thnx": "thanks", "ty": "thank you",
    "sry": "sorry", "w/": "with", "w/o": "without", "b4": "before",
    "b/c": "because", "bc": "because", "cuz": "because",
    "bro": "brother", "brooo": "brother", "bruh": "brother", "sis": "sister", 
    "dis": "this", "dat": "that", "d": "the",
    "nah": "no", "yah": "yes", "ya": "yes", "yep": "yes", "nope": "no",
    "luv": "love", "ur": "your", "u": "you",
    
    "doc": "document", "docs": "documents", "nt": "not", "chk": "check", 
    "chck": "check", "frnd": "friend", "hv": "have", "acc": "accuracy",
    "r": "are", "y": "why", "c": "see", "2": "to", "4": "for", "8": "ate",
    "knw": "know", "knww": "know", "lyk": "like", "prof": "professor",
    "pwd": "password",
    
    "aint": "am not", "ain't": "am not", "dont": "do not", "cant": "cannot", 
    "wont": "will not", "didnt": "did not", "wasnt": "was not", "werent": "were not",
    "isnt": "is not", "arent": "are not", "hasnt": "has not", "havent": "have not",
    "shouldnt": "should not", "wouldnt": "would not", "couldnt": "could not",
    
    "gonna": "going to", "wanna": "want to", "gotta": "got to",
    "kinda": "kind of", "sorta": "sort of", "dunno": "don't know",
    "lemme": "let me", "gimme": "give me", "woulda": "would have",
    "coulda": "could have", "shoulda": "should have",

    
    "poc": "proof of concept", "asap": "as soon as possible", "faq": "frequently asked questions",
    "eta": "estimated time of arrival", "rsvp": "please respond",
    "aka": "also known as", "etc": "et cetera", "vs": "versus",
    "imo": "in my opinion", "imho": "in my humble opinion",
    "smh": "shaking my head", "tbh": "to be honest",
    "idk": "I don't know", "nvm": "never mind",
    "brb": "be right back", "gtg": "got to go",
    "lmk": "let me know", "fyi": "for your information",
    "bff": "best friends forever", "tl;dr": "too long; didn't read",
    "poc": "proof of concept", "asap": "as soon as possible", "faq": "frequently asked questions",
}


TECH_TERMS = {
    "cpu": "CPU", "gpu": "GPU", "ram": "RAM", "rom": "ROM",
    "usb": "USB", "hdmi": "HDMI", "wifi": "WiFi", "ios": "iOS",
    "api": "API", "sdk": "SDK", "ui": "UI", "ux": "UX",
    "html": "HTML", "css": "CSS", "sql": "SQL", "json": "JSON",
    "xml": "XML", "pdf": "PDF", "csv": "CSV", "url": "URL",
    "http": "HTTP", "https": "HTTPS", "ftp": "FTP", "ssh": "SSH",
    "nan": "NaN", "null": "null", "seo": "SEO", "crm": "CRM",
    "ml": "machine learning", "ai": "artificial intelligence",
}


def remove_emojis(text: str) -> str:
    """Remove all emojis, emoticons, and special Unicode characters"""
    
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FAFF"  # extended symbols
        "\U00002600-\U000026FF"  # misc symbols
        "\U00002700-\U000027BF"  # dingbats
        "\U0001F004-\U0001F9E6"  # additional emojis
        "\u200d"  # zero-width joiner (used in compound emojis)
        "\ufe0f"  # variation selector
        "]+", 
        flags=re.UNICODE
    )
   
    text = emoji_pattern.sub('', text)
    
    emoticons = [
        r':\)', r':\(', r':D', r':P', r':p', r';-?\)', r'<3', r'</3',
        r':-?\)', r':-?\(', r':-?D', r':-?P', r':-?p', r'xD', r'XD',
        r':\|', r':-\|', r'T_T', r'T\.T', r'>_<', r'\^_\^', r'-_-',
        r'o_o', r'O_O', r'0_0', r':o', r':O', r'D:', r':\/', r':-\/',
        r'=\)', r'=\(', r'=D', r'=P', r';\)', r':3', r'<3',
    ]
    
    for emoticon in emoticons:
        text = re.sub(emoticon, '', text)
    
    text = re.sub(r'[\u200b-\u200f\u2028-\u202f\u205f-\u206f]', '', text)
    
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def normalize_numbers(text: str) -> str:
    """Convert word numbers to digits - IMPROVED"""
   
    text = re.sub(
        r'\berror\s+(\d{3})\s+(?:&|and)\s+(\d{3})',
        lambda m: f'error {m.group(1)} and {m.group(2)}',
        text,
        flags=re.IGNORECASE
    )
  
    pattern = (
        r'\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|'
        r'eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|'
        r'eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|'
        r'eighty|ninety|hundred|thousand|million|billion)(?:\s+and\s+|\s+)*)+\b'
    )
    
    def repl(m):
        try:
            num_str = m.group().strip()
            result = str(w2n.word_to_num(num_str))
            return result
        except:
            return m.group()
    
    return re.sub(pattern, repl, text, flags=re.IGNORECASE)


def fix_repeated_chars(text: str) -> str:
    """Fix elongated words: heyyy -> hey, sooo -> so"""
   
    return re.sub(r'(.)\1{2,}', r'\1', text)


def fix_spacing(text: str) -> str:
    """Fix spacing issues - ENHANCED"""
 
    text = re.sub(r'\s+', ' ', text)
   
    text = re.sub(r'(\d)([A-Za-z])(?![a-z])', r'\1 \2', text)
    
    text = re.sub(r'(\d+)\.\s+(\d+)%', r'\1.\2%', text)
    text = re.sub(r'(\d+)\s+\.\s*(\d+)%', r'\1.\2%', text)
    text = re.sub(r'(\d)\s*(%)', r'\1\2', text)
  
    text = re.sub(r'(\d+)\.\s+(\d+)', r'\1.\2', text)
    
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    
    text = re.sub(r'([.,!?;:])(?=[A-Za-z])', r'\1 ', text)
    
    text = re.sub(r'(\d{1,2}):(\d{2})\s*(am|pm)', r'\1:\2 \3', text, flags=re.IGNORECASE)
    
    text = re.sub(r'([\[\(\{])\s+', r'\1', text)
  
    text = re.sub(r'\s+([\]\)\}])', r'\1', text)
    
    return text.strip()


def fix_capitalization(text: str) -> str:
    """Smart capitalization - ENHANCED"""
    if not text:
        return text
   
    text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
    
    text = re.sub(
        r'([.!?])\s+([a-z])', 
        lambda m: m.group(1) + ' ' + m.group(2).upper(), 
        text
    )
   
    text = re.sub(r'\bi\b', 'I', text)
    
    text = re.sub(r"\bi'm\b", "I'm", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi've\b", "I've", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi'll\b", "I'll", text, flags=re.IGNORECASE)
    text = re.sub(r"\bi'd\b", "I'd", text, flags=re.IGNORECASE)
    
    return text


def fix_common_typos(text: str) -> str:
    """Fix common keyboard typos - EXPANDED"""
    typo_map = {
        r'\bteh\b': 'the',
        r'\bwth\b': 'with',
        r'\bwht\b': 'what',
        r'\bwhn\b': 'when',
        r'\bthn\b': 'then',
        r'\bwhch\b': 'which',
        r'\bfrm\b': 'from',
        r'\byur\b': 'your',
        r'\btht\b': 'that',
        r'\brecieve\b': 'receive',
        r'\boccured\b': 'occurred',
        r'\bseperate\b': 'separate',
        r'\bdefinately\b': 'definitely',
        r'\bvrything\b': 'everything',
        r'\bgud\b': 'good',
        r'\bhangin\b': 'hanging',
        r'\btrashhhh\b': 'trash',
        r'\blaggyyy\b': 'laggy',
    }
    
    for pattern, replacement in typo_map.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    return text


def smart_sentence_split(text: str) -> List[str]:
    """Split text into sentences intelligently"""
   
    text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
    
 
    sentences = re.split(r'([.!?]\s+)', text)
    
    result = []
    for i in range(0, len(sentences), 2):
        sentence = sentences[i] + (sentences[i+1] if i+1 < len(sentences) else "")
        if sentence.strip():
            result.append(sentence.strip())
    
    return result


def fix_context_errors(text: str) -> str:
    """Fix context-specific errors - ENHANCED"""
    
    text = re.sub(r'\bmodel\s+accuracy\b', 'model accuracy', text, flags=re.IGNORECASE)
    text = re.sub(r'\btrain\s+accuracy\b', 'train accuracy', text, flags=re.IGNORECASE)
    text = re.sub(r'\btest\s+accuracy\b', 'test accuracy', text, flags=re.IGNORECASE)
    
    text = re.sub(r'\bmodel\s+account\b', 'model accuracy', text, flags=re.IGNORECASE)
    text = re.sub(r'\btrain\s+account\b', 'train accuracy', text, flags=re.IGNORECASE)
    text = re.sub(r'\btest\s+account\b', 'test accuracy', text, flags=re.IGNORECASE)
    
    text = re.sub(r'\berr\s+(\d+)', r'error \1', text, flags=re.IGNORECASE)
    
    text = re.sub(r'(\d+)\s*°?\s*c\b', r'\1°C', text, flags=re.IGNORECASE)
    
    text = re.sub(r'\b2day\b', 'today', text, flags=re.IGNORECASE)
    text = re.sub(r'\b2morrow\b', 'tomorrow', text, flags=re.IGNORECASE)
    
    return text


def rule_normalize(text: str) -> str:
    """Multi-stage rule-based normalization - FIXED"""
    
    original_text = text
    text = text.strip()
    
    text = remove_emojis(text)

    preserved = {}
    idx = 0
    
    def preserve(match):
        nonlocal idx
       
        key = f"__preserve_{idx}__"

        preserved[key] = match.group()
        idx += 1
        return key
    
    text = re.sub(r'\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b', preserve, text) 
    text = re.sub(r'\$\d+(?:\.\d{2})?', preserve, text)
    text = re.sub(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', preserve, text)  
    text = re.sub(r'https?://\S+', preserve, text)  
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', preserve, text) 
    text = re.sub(r'\b\d+\.\d+%\b', preserve, text)  
    text = re.sub(r'\b\d+%\b', preserve, text)  
    text = re.sub(r'\b\d+\.\d+\b', preserve, text)  
    text = re.sub(r'\b\d+°C\b', preserve, text) 
    text = re.sub(r'\berror\s+\d{3}\b', preserve, text, flags=re.IGNORECASE)  
    
    text = text.lower()
    
    text = fix_repeated_chars(text)

    text = fix_context_errors(text)
    
    for slang, expansion in SLANG_MAP.items():
        text = re.sub(rf'\b{re.escape(slang)}\b', expansion, text)
    
    text = fix_common_typos(text)
    
    text = normalize_numbers(text)
    
    text = fix_spacing(text)
   
    sentences = smart_sentence_split(text)
    text = " ".join([fix_capitalization(s) for s in sentences])
    
    for tech_lower, tech_proper in TECH_TERMS.items():
        text = re.sub(rf'\b{re.escape(tech_lower)}\b', tech_proper, text, flags=re.IGNORECASE)
    
    for key, value in preserved.items():
        text = text.replace(key, value)
    
    text = re.sub(r'([.!?]){2,}', r'\1', text)
    
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n+', ' ', text)
    
    return text.strip()


@torch.inference_mode()
def ml_polish(text: str) -> str:
    """ML-based polish - HANDLES LONG TEXTS WITH BETTER CHUNKING"""
    tokenizer, model = _load_model()

    sentences = smart_sentence_split(text)
    
    max_input_length = 200 
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence_tokens = len(tokenizer.encode(sentence, add_special_tokens=False))
        
        if current_length + sentence_tokens > max_input_length:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_tokens
        else:
            current_chunk.append(sentence)
            current_length += sentence_tokens
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    polished_chunks = []
    for i, chunk in enumerate(chunks):
        if not chunk:
            continue
        
        prompt = (
            "Fix grammar and spelling errors only. Keep all content and meaning:\n\n"
            f"{chunk}"
        )
        
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=400
        ).to(DEVICE)
        
        input_word_count = len(chunk.split())
        max_output_tokens = max(input_word_count + 100, 350)  
        
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_output_tokens,
            num_beams=2,  
            no_repeat_ngram_size=3,
            temperature=0.2,
            do_sample=False,
            early_stopping=False,  
            length_penalty=0.8  
        )
        
        result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        output_word_count = len(result.split())
        if output_word_count < input_word_count * 0.7:
     
            print(f" Chunk {i+1} truncated ({output_word_count}/{input_word_count} words), using original")
            polished_chunks.append(chunk)
        else:
            polished_chunks.append(result)
    
    return " ".join(polished_chunks)


def validate_output(text: str, original: str) -> bool:
    """Validate output quality - IMPROVED"""
    if not text or len(text.strip()) < 2:
        return False
    
    if "__PRESERVE_" in text or "__preserve_" in text:
        return False
    
    
    words = text.split()
    if len(words) > 3:
        if len(set(words)) / len(words) < 0.3:
            return False
    
    if len(text) < len(original) * 0.3:
        return False
    
    if len(text) > len(original) * 3:
        return False
    
    return True


def full_normalize(text: str, use_ml: bool = None) -> Dict[str, object]:
    """
    Complete normalization pipeline
    
    Args:
        text: Input text to normalize
        use_ml: Whether to use ML polishing
                None = auto-decide based on text length (default)
                True = force ML polish
                False = rules only
    
    Returns:
        Dictionary with normalized output
    """
    
    if not text or not text.strip():
        return {
            "normalized_text": "",
            "source": "empty",
            "validation": False
        }
    
    original = text
    
   
    if use_ml is None:
        word_count = len(text.split())
     
        use_ml = word_count < 100
        if not use_ml:
            print(f"📝 Text has {word_count} words - using rules only to avoid truncation")
    
  
    rule_out = rule_normalize(text)
    
    
    final_out = rule_out 
    source = "rules only"
    
    if use_ml:
        try:
            ml_out = ml_polish(rule_out)
          
            ml_word_count = len(ml_out.split())
            rule_word_count = len(rule_out.split())
            
            if ml_word_count < rule_word_count * 0.7:
                print(f" ML output truncated ({ml_word_count}/{rule_word_count} words), using rules only")
                final_out = rule_out
                source = "rules only (ML truncated)"
            else:
                final_out = ml_out
                source = "rules + ML"
                
        except Exception as e:
            print(f"ML polish error: {e}, falling back to rule output")
            final_out = rule_out
            source = "rules only (ML error)"
    

    is_valid = validate_output(final_out, original)
    
    if not is_valid:
       
        final_out = rule_out
        is_valid = validate_output(rule_out, original)
        source = "rules only (validation failed)"
    
   
    if is_valid:
        remember(original, final_out)
    

    return {
        "normalized_text": final_out,
        "source": source,
        "validation": is_valid,
        "word_count": len(final_out.split())
    }


def batch_normalize(texts: List[str], use_ml: bool = False) -> List[Dict]:
    """Normalize multiple texts efficiently"""
    return [full_normalize(text, use_ml) for text in texts]