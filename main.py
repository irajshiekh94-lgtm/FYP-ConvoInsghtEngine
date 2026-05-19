from text_normalizer import full_normalize

def main():
    text = input("Enter text to normalize:\n> ")

    result = full_normalize(text, use_ml=True)

    print("\n" + "="*80)
    print("NORMALIZED OUTPUT (Rules + ML Combined)")
    print("="*80)
    print(result["normalized_text"])
    print("\nSource:", result["source"])
    print("Valid:", result["validation"])
    print("="*80)

if __name__ == "__main__":
    main()