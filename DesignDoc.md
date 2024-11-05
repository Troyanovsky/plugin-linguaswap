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

Key Functions:
- `replaceWords()`: Replaces text with translations
- `shouldSkipElement()`: Filters elements to modify
- Message listeners for word additions and toggle changes

### 3. Popup Interface (`popup.html`, `popup.js`, `popup.css`)
- Settings management
- Word list display
- Toggle control
- Language pair selection

Key Features:
- Tab-based interface (Settings/Word List)
- Language pair selection
- DeepL API key management
- Word list management with delete functionality
- Enable/disable toggle

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
   Replace Words → Apply Styling
   ```

## Current Considerations

### Strengths
- Supports multiple language pairs
- Real-time translation toggle
- Persistent storage
- Clean UI with modern design

## Future Enhancements
- Support import of word lists (e.g. TOEFL, IELTS, etc.)
- Additional translation services (e.g. Google Translate, Bing Translate, etc.)
- Enhanced error robustness