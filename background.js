// Debug mode flag
const debug_mode = false;

// Debug logger
const debug = (message, data = null) => {
  if (debug_mode) {
    if (data) {
      console.log(`[LinguaSwap Debug] ${message}:`, data);
    } else {
      console.log(`[LinguaSwap Debug] ${message}`);
    }
  }
};

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  debug('Extension installed/updated');
  
  chrome.contextMenus.create({
    id: 'addToLinguaSwap',
    title: 'Add to LinguaSwap',
    contexts: ['selection']
  });
  debug('Context menu created');

  // Initialize storage with default settings if not exists
  chrome.storage.local.get(['settings', 'wordLists'], (result) => {
    debug('Initial storage state:', result);
    if (!result.settings) {
      const initialSettings = {
        settings: {
          defaultLanguage: '',
          targetLanguage: ''
        },
        wordLists: {}
      };
      chrome.storage.local.set(initialSettings);
      debug('Initialized default settings:', initialSettings);
    }
  });
});

// Handle context menu clicks: add selected text to LinguaSwap word list, translate it, and notify content script
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToLinguaSwap') {
    const selectedText = info.selectionText.toLowerCase().trim();
    debug('Selected text:', selectedText);
    
    // Get settings and existing word lists
    const { settings, wordLists = {} } = await chrome.storage.local.get(['settings', 'wordLists']);
    debug('Current settings:', settings);
    debug('Current wordLists:', wordLists);

    // Translate the word using LinguaSwap API
    try {
      debug('Attempting translation', {
        text: selectedText,
        sourceLang: settings.defaultLanguage,
        targetLang: settings.targetLanguage
      });

      const translation = await translateWord(
        selectedText,
        settings.defaultLanguage,
        settings.targetLanguage
      );
      debug('Translation result:', translation);

      // Create language pair key
      const langPairKey = `${settings.defaultLanguage}-${settings.targetLanguage}`;
      debug('Language pair key:', langPairKey);
      
      // Initialize word list for this language pair if it doesn't exist
      if (!wordLists[langPairKey]) {
        debug('Creating new word list for language pair');
        wordLists[langPairKey] = {};
      }

      // Add to specific language pair word list
      wordLists[langPairKey][selectedText] = translation;
      await chrome.storage.local.set({ wordLists });
      debug('Updated word lists:', wordLists);

      // Notify content script to update the page
      chrome.tabs.sendMessage(tab.id, {
        type: 'wordAdded',
        word: selectedText,
        translation,
        langPairKey
      });
      debug('Sent update message to content script');
    } catch (error) {
      debug('Translation error:', error);
      chrome.tabs.sendMessage(tab.id, {
        type: 'showNotification',
        message: 'Translation failed.'
      });
    }
  }
});

// Function to translate a word using the LinguaSwap API
async function translateWord(text, sourceLang, targetLang) {
  debug('translateWord called with:', { text, sourceLang, targetLang });
  
  // Get current settings to access the provider
  const { settings = { provider: 'deepl' } } = await chrome.storage.local.get('settings');
  
  const baseUrl = 'https://linguaswap.524619251.xyz/api/translate';
  const params = new URLSearchParams({
    text,
    target_lang: targetLang,
    provider: settings.provider
  });
  
  // Only add source_lang if it's provided (otherwise let API auto-detect)
  if (sourceLang) {
    params.append('source_lang', sourceLang);
  }
  
  debug('API request:', {
    url: `${baseUrl}?${params.toString()}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Origin': `chrome-extension://${chrome.runtime.id}`
    }
  });

  const url = `${baseUrl}?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Origin': `chrome-extension://${chrome.runtime.id}`
    }
  });

  debug('API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    debug('API error response:', errorText);
    
    // More specific error handling based on status codes
    switch (response.status) {
      case 400:
        throw new Error('Invalid parameters or text too long (max 30 characters)');
      case 401:
        throw new Error('Unauthorized: Origin not allowed');
      case 405:
        throw new Error('Method not allowed');
      default:
        throw new Error('Translation failed');
    }
  }

  const data = await response.json();
  debug('API success response:', data);
  return data.translations[0].text;
} 