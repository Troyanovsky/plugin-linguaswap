// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToLinguaSwap',
    title: 'Add to LinguaSwap',
    contexts: ['selection']
  });

  // Initialize storage with default settings if not exists
  chrome.storage.local.get(['settings', 'wordList'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          defaultLanguage: '',
          targetLanguage: '',
          deeplApiKey: ''
        },
        wordList: {}
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToLinguaSwap') {
    const selectedText = info.selectionText.toLowerCase().trim();
    
    // Get settings and existing word list
    const { settings, wordList } = await chrome.storage.local.get(['settings', 'wordList']);
    
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

      // Add to word list
      wordList[selectedText] = translation;
      await chrome.storage.local.set({ wordList });

      // Notify content script to update the page
      chrome.tabs.sendMessage(tab.id, {
        type: 'wordAdded',
        word: selectedText,
        translation
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