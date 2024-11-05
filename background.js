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
          targetLanguage: '',
          deeplApiKey: ''
        },
        wordLists: {}
      };
      chrome.storage.local.set(initialSettings);
      debug('Initialized default settings:', initialSettings);
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToLinguaSwap') {
    const selectedText = info.selectionText.toLowerCase().trim();
    debug('Selected text:', selectedText);
    
    // Get settings and existing word lists
    const { settings, wordLists = {} } = await chrome.storage.local.get(['settings', 'wordLists']);
    debug('Current settings:', settings);
    debug('Current wordLists:', wordLists);
    
    if (!settings.deeplApiKey) {
      debug('No API key found');
      chrome.tabs.sendMessage(tab.id, {
        type: 'showNotification',
        message: 'Please set up your DeepL API key in LinguaSwap settings by clicking the settings icon in the toolbar.'
      });
      return;
    }

    // Translate the word using DeepL API
    try {
      debug('Attempting translation', {
        text: selectedText,
        sourceLang: settings.defaultLanguage,
        targetLang: settings.targetLanguage
      });

      const translation = await translateWord(
        selectedText,
        settings.defaultLanguage,
        settings.targetLanguage,
        settings.deeplApiKey
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
        message: 'Translation failed. Please check your API key and try again.'
      });
    }
  }
});

async function translateWord(text, sourceLang, targetLang, apiKey) {
  debug('translateWord called with:', { text, sourceLang, targetLang });
  
  const url = 'https://api-free.deepl.com/v2/translate';
  const params = new URLSearchParams({
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
  });
  
  debug('API request params:', params.toString());

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });

  debug('API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    debug('API error response:', errorText);
    throw new Error('Translation failed');
  }

  const data = await response.json();
  debug('API success response:', data);
  return data.translations[0].text;
} 