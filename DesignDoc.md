# LinguaSwap - Chrome Extension Documentation

## Overview
LinguaSwap is a Chrome extension that helps users learn new languages by replacing selected words with their translations while browsing. It supports multiple language pairs and uses the DeepL API for translations.

## Project Structure

### Files
```
├── manifest.json      # Extension configuration
├── popup.html        # Extension popup interface
├── popup.css         # Popup styling
├── popup.js          # Popup functionality
├── background.js     # Service worker for background tasks
└── content.js        # Content script for webpage manipulation
```

## Core Components

### 1. Background Service (`background.js`)
- Initializes context menu
- Handles translation requests
- Manages DeepL API communication
- Stores translations in Chrome storage

Key Functions:
- `translateWord()`: Handles DeepL API calls
- Context menu click handler: Processes selected text

### 2. Content Script (`content.js`)
- Handles webpage text replacement
- Manages translation display/removal
- Controls toggle state
- Maintains original page styling

Key Functions:
- `replaceWords()`: Replaces text with translations while preserving styles
- `shouldSkipElement()`: Filters elements to modify
- Message listeners for word additions and toggle changes
- Style inheritance handling for translated words

### 3. Popup Interface (`popup.html`, `popup.js`, `popup.css`)
- Settings management
- Word list display
- Toggle control
- Language pair selection

Key Features:
- Tab-based interface (Settings/Word List)
- Language pair selection
- DeepL API key management
- Word list management
- Enable/disable toggle
- GitHub and Buy Me a Coffee links

## Data Structure

### Chrome Storage
```javascript
{
  settings: {
    defaultLanguage: string,
    targetLanguage: string,
    deeplApiKey: string
  },
  wordLists: {
    "LANG1-LANG2": {
      word1: translation1,
      word2: translation2
    }
  },
  isEnabled: boolean
}
```

## Implementation Flow

1. **Word Addition**:
   ```
   User Selection → Context Menu → Background Script → 
   DeepL API → Storage → Content Script → Page Update
   ```

2. **Translation Display**:
   ```
   Page Load → Get Settings/Words → Process Text Nodes → 
   Replace Words → Apply Inherited Styling
   ```

## Styling Implementation
- Translated words inherit all styles from original text, with only an underline added to indicate the translation

## API Implementation

**Endpoint**:  
`GET https://plugin-linguaswap-backend.vercel.app/api/translate`

### Query Parameters
- **text** (string, required): Text to translate (max 30 characters).
- **source_lang** (string, optional): Source language code (e.g., `EN`). Defaults to auto-detect.
- **target_lang** (string, required): Target language code (e.g., `DE`).
- **provider** (string, optional, default: `deepl`): Translation provider. Only `deepl` is supported as of now.

### Responses
- **200 OK**
  ```json
  {
    "translations": [
      { "text": "translated_text_here" }
    ]
  }
  ```
- **Error Codes**
  - `401 Unauthorized`: Origin not allowed.
  - `405 Method Not Allowed`: Only `GET` allowed.
  - `400 Bad Request`: Invalid parameters or text too long.
  - `500 Internal Server Error`: Translation failed.

### Example Request
```bash
curl -X GET "https://plugin-linguaswap-backend.vercel.app/api/translate?text=Hello&target_lang=DE"
```

## Current Considerations

### Features
- Supports multiple language pairs, with each language pair having its own word list
- Real-time translation toggle
- Persistent storage of word translations list
- Manage word translations (sort/edit/delete)
- Unified hosted translation API for users without a translation API key (Added Nov 7, 2024)
- Import word lists from files (Added Nov 8, 2024)

### Technical Implementation
- Uses `computedStyle` for style inheritance
- Maintains document flow
- Preserves text node structure

## Future Enhancements
- Easier management of word lists (pagination, searching etc.)
- Additional translation services (e.g. Google Translate, Bing Translate, etc.)
- Add contextual translation using LLMs for word conjugations
- Word frequency statistics
- Multilingual UI