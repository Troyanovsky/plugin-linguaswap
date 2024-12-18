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
- Translation provider selection (DeepL/LLM)
- Word list management
  - Search functionality
  - Import/Export CSV
  - Sort words (A→Z, Z→A)
  - Edit/Delete words
- Enable/disable toggle
- Notification system
- Internationalization (i18n) support
- Debug mode for troubleshooting

## Data Structure

### Chrome Storage
```javascript
{
  settings: {
    defaultLanguage: string,
    targetLanguage: string,
    provider: string,     // 'deepl' or 'openrouter'
    excludedSites: string[]  // Added in v1.2.0
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

3. **Word List Management**:
   ```
   Import CSV → Validate Format → Update Storage → 
   Refresh Display → Notify Tabs
   
   Export CSV → Generate Content → Download File
   
   Edit Word → Update Storage → Refresh Display → 
   Notify Tabs
   
   Delete Word → Update Storage → Refresh Display → 
   Notify Tabs
   ```

## Styling Implementation
- Translated words inherit all styles from original text, with only an underline added to indicate the translation

## API Implementation

### Translation Endpoint
**Base URL**: `https://plugin-linguaswap-backend.vercel.app/api` or `https://linguaswap.524619251.xyz/api`

#### Translate Text
**Endpoint**: `GET /api/translate`

**Query Parameters**
- **text** (string, required): The text to translate. Must be 30 characters or fewer.
- **source_lang** (string, optional): The source language code (e.g., `EN` for English). If omitted, auto-detection is used.
- **target_lang** (string, required): The target language code (e.g., `DE` for German).
- **provider** (string, optional): The translation provider. Defaults to `deepl`. Supported: `deepl`, `openrouter`.
- **context** (string, optional): Additional context for translation.
- **caller** (string, optional): Identifier for request client id (for debugging & rate limiting).

**Response (200 OK)**
```json
{
  "translations": [
    { "text": "translated_text_here" }
  ]
}
```

### Wordlists Endpoint
**Endpoint**: `GET /api/wordlists`

**Query Parameters**
- **id** (string, optional): Specific wordlist identifier. If omitted, returns all available wordlists.

**Response (200 OK)**
- List all wordlists:
```json
{
  "wordlists": [
    {
      "id": "EN-DE-example",
      "source_lang": "EN",
      "target_lang": "DE"
    }
  ]
}
```
- Specific wordlist:
```json
{
  "id": "EN-DE-example",
  "source_lang": "EN",
  "target_lang": "DE",
  "words": [
    {
      "EN": "example",
      "DE": "beispiel"
    }
  ]
}
```

### Error Responses
- **405 Method Not Allowed**: Only `GET` and `OPTIONS` allowed
- **400 Bad Request**: Invalid parameters or text exceeding length
- **404 Not Found**: Requested wordlist not found
- **500 Internal Server Error**: Server-side issues

### Example Requests
```bash
# Translate text
curl -X GET "https://linguaswap.524619251.xyz/api/translate?text=Hello&target_lang=DE"

# Get all wordlists
curl -X GET "https://linguaswap.524619251.xyz/api/wordlists"

# Get specific wordlist
curl -X GET "https://linguaswap.524619251.xyz/api/wordlists?id=EN-DE-example"
```

## Current Considerations

### Features
- Supports multiple language pairs, with each language pair having its own word list
- Real-time translation toggle
- Persistent storage of word translations list
- Manage word translations (sort/edit/delete)
- Unified hosted translation API for users without a translation API key (Added Nov 7, 2024)
- Import word lists from CSV (Added Nov 8, 2024)
- Multiple translation providers (DeepL, LLMs through OpenRouter) (Added Nov 9, 2024)
- UI localization for Chinese (Added Nov 16, 2024)
- Site exclusion functionality (Added Nov 17, 2024)
- Download pre-made word lists from server (Added Nov 20, 2024)

### Technical Implementation
- Uses `computedStyle` for style inheritance
- Maintains document flow
- Preserves text node structure

## Future Enhancements
- Easier management of word lists (pagination etc.)
- Word frequency statistics
- Multilingual UI