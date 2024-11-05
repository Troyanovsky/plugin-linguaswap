// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToLinguaSwap',
    title: 'Add to LinguaSwap',
    contexts: ['selection']
  });

  // Initialize storage with default settings if not exists
  chrome.storage.local.get(['settings', 'wordLists'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          defaultLanguage: '',
          targetLanguage: '',
          deeplApiKey: ''
        },
        wordLists: {}
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToLinguaSwap') {
    const selectedText = info.selectionText.toLowerCase().trim();
    
    // Get settings and existing word lists
    const { settings, wordLists = {} } = await chrome.storage.local.get(['settings', 'wordLists']);
    
    if (!settings.deeplApiKey) {
      // Notify user to set up API key
      chrome.tabs.sendMessage(tab.id, {
        type: 'showNotification',
        message: 'Please set up your DeepL API key in LinguaSwap settings'
      });
      return;
    }

    // Translate the word using DeepL API
    try {
      const translation = await translateWord(
        selectedText,
        settings.defaultLanguage,
        settings.targetLanguage,
        settings.deeplApiKey
      );

      // Create language pair key
      const langPairKey = `${settings.defaultLanguage}-${settings.targetLanguage}`;
      
      // Initialize word list for this language pair if it doesn't exist
      if (!wordLists[langPairKey]) {
        wordLists[langPairKey] = {};
      }

      // Add to specific language pair word list
      wordLists[langPairKey][selectedText] = translation;
      await chrome.storage.local.set({ wordLists });

      // Notify content script to update the page
      chrome.tabs.sendMessage(tab.id, {
        type: 'wordAdded',
        word: selectedText,
        translation,
        langPairKey
      });
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'showNotification',
        message: 'Translation failed. Please check your API key and try again.'
      });
    }
  }
});

async function translateWord(text, sourceLang, targetLang, apiKey) {
  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    })
  });

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  const data = await response.json();
  return data.translations[0].text;
} 