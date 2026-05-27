# =====================================================
# WHATSAPP ANALYZER + INTENT DETECTION (SAFE VERSION)
# MongoDB optional + BERT + Pipeline
# =====================================================

from datasets import load_dataset
from transformers import BertTokenizer, BertForSequenceClassification
import torch
import numpy as np
import os

# ==============================
# 1. SAFE MONGODB CONNECTION
# ==============================
MONGO_AVAILABLE = False
intent_col = None

try:
    from pymongo import MongoClient

    client = MongoClient(
        "mongodb://localhost:27017/",
        serverSelectionTimeoutMS=3000
    )

    # Force check connection
    client.server_info()

    db = client["whatsapp_analyzer"]
    intent_col = db["message_intents"]

    MONGO_AVAILABLE = True
    print("MongoDB Connected ✔")

except Exception as e:
    print("MongoDB NOT available ❌ (running in local mode)")
    print("Reason:", str(e))

# ==============================
# 2. LOAD DATASET
# ==============================
dataset = load_dataset("clinc_oos", "plus")

num_labels = len(set(dataset["train"]["intent"]))
label_names = dataset["train"].features["intent"].names

print("Dataset loaded ✔")

# ==============================
# 3. TOKENIZER
# ==============================
tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")

def tokenize(batch):
    return tokenizer(
        batch["text"],
        padding="max_length",
        truncation=True,
        max_length=64
    )

tokenized = dataset.map(tokenize)
tokenized = tokenized.rename_column("intent", "labels")
tokenized.set_format("torch")

# ==============================
# 4. MODEL (TRAIN OR LOAD)
# ==============================
MODEL_PATH = "./intent_model"

if os.path.exists(MODEL_PATH):
    print("Loading saved model ✔")
    model = BertForSequenceClassification.from_pretrained(MODEL_PATH)
    tokenizer = BertTokenizer.from_pretrained(MODEL_PATH)

else:
    print("No trained model found ❌")
    print("Training now... ⏳")

    from transformers import TrainingArguments, Trainer
    from sklearn.metrics import accuracy_score

    model = BertForSequenceClassification.from_pretrained(
        "bert-base-uncased",
        num_labels=num_labels
    )

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {"accuracy": accuracy_score(labels, preds)}

    training_args = TrainingArguments(
        output_dir="./intent_model",
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=2,
        weight_decay=0.01
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        compute_metrics=compute_metrics
    )

    trainer.train()

    model.save_pretrained(MODEL_PATH)
    tokenizer.save_pretrained(MODEL_PATH)

    print("Model trained & saved ✔")

model.eval()

# ==============================
# 5. INTENT PREDICTION
# ==============================
def predict_intent(text):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=64
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)
    conf, pred = torch.max(probs, dim=1)

    intent = label_names[pred.item()]

    return intent, float(conf.item())

# ==============================
# 6. CATEGORY MAPPING
# ==============================
def map_category(intent):
    intent = intent.lower()

    if "book" in intent or "flight" in intent:
        return "booking"
    elif "price" in intent or "buy" in intent:
        return "sales"
    elif "help" in intent or "issue" in intent:
        return "support"
    else:
        return "general"

# ==============================
# 7. SAVE TO MONGO (SAFE)
# ==============================
def save_to_db(raw_text, summary, intent, confidence):

    if not MONGO_AVAILABLE:
        return  # skip saving safely

    doc = {
        "raw_text": raw_text,
        "summary": summary,
        "intent": intent,
        "category": map_category(intent),
        "confidence": confidence
    }

    intent_col.insert_one(doc)

# ==============================
# 8. MAIN PIPELINE
# ==============================
def process_message(raw_text, summary=""):

    input_text = summary if summary else raw_text

    intent, confidence = predict_intent(input_text)

    save_to_db(raw_text, summary, intent, confidence)

    return {
        "intent": intent,
        "confidence": confidence,
        "category": map_category(intent),
        "mongo_saved": MONGO_AVAILABLE
    }

# ==============================
# 9. TEST RUN
# ==============================
if __name__ == "__main__":

    result = process_message(
        raw_text="I want to buy a laptop under 100k",
        summary="User wants to purchase a laptop within budget"
    )

    print("\nRESULT:")
    print(result)