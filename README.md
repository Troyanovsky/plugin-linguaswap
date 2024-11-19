# LinguaSwap

LinguaSwap is a Chrome extension designed to make language learning an integral part of browsing. With LinguaSwap, users can enhance their vocabulary in a new language while reading everyday content in their native language.

## Features

- **Interactive Vocabulary Building**: Set your default (native) language and target (learning) language upon initial setup.
- **Effortless Word Addition**: Highlight any word in your native language, right-click, and select "Add to LinguaSwap" to add it to your personalized word list. The word will be saved along with its translation in your target language.
- **Dynamic Word Replacement**: When browsing, LinguaSwap automatically replaces occurrences of saved words with their translations in your target language, allowing seamless integration of new vocabulary into your reading.
- **User-Friendly Word List Management**: Access the LinguaSwap popup to manage your settings and word list. Edit translations, delete words, or adjust your language settings with ease.

## Getting Started

### Option 1: Chrome Web Store (Recommended)
1. Install LinguaSwap from the [Chrome Web Store](https://chromewebstore.google.com/detail/linguaswap/alccaibaldgnhnfbooofkmdljijcemie?utm_source=github)
2. Open LinguaSwap from your extensions to set up your default and target languages
3. Start browsing, adding words, and expanding your vocabulary!

### Option 2: Developer Mode
1. Clone the repository:
   ```bash
   git clone https://github.com/Troyanovsky/plugin-linguaswap.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the cloned repository folder
5. Open LinguaSwap from your extensions to set up your default and target languages
6. Start browsing, adding words, and expanding your vocabulary!

## Changelog
- 1.0.0: Initial release. Users need their own DeepL API key.
- 1.0.1: Added hosted backend, removed need for DeepL API key. Search/sort/export word list.
- 1.1.0: Added support for multiple translation providers (DeepL, LLMs through OpenRouter).
- 1.2.0: Added support for importing word lists from CSV, and excluding specific sites from translation.

## License

This project is licensed under the Apache License 2.0.

## Contributions

Contributions to LinguaSwap are welcome! Whether it's improving functionality, fixing bugs, or enhancing usability, feel free to submit pull requests or open issues. We look forward to growing LinguaSwap with the community!

