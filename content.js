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

// Global flag to track if swapping is enabled
let isSwappingEnabled = true;

// Add this function near the top
function isExcludedSite(excludedSites) {
  const currentUrl = window.location.hostname + window.location.pathname;
  return excludedSites.some(site => 
    currentUrl.toLowerCase().includes(site.toLowerCase())
  );
}

function removeAllTranslations(wordFilter = null) {
  document.querySelectorAll('.linguaswap-word').forEach(el => {
    if (!wordFilter || el.getAttribute('title').toLowerCase() === wordFilter.toLowerCase()) {
      el.outerHTML = el.getAttribute('title');
    }
  });
}

// Apply translations for a language pair
function applyTranslations(wordList) {
  Object.entries(wordList).forEach(([word, translation]) => {
    replaceWords(word, translation);
  });
}

// Get current language pair key from settings
function getLangPairKey(settings) {
  return `${settings.defaultLanguage}-${settings.targetLanguage}`;
}

// Apply translations from storage for current language pair
async function applyStoredTranslations() {
  const { wordLists, settings } = await chrome.storage.local.get(['wordLists', 'settings']);
  const langPairKey = getLangPairKey(settings);
  const currentWordList = wordLists[langPairKey] || {};
  applyTranslations(currentWordList);
}

// Create translated span element
function createTranslatedSpan(originalWord, translation, parentStyle) {
  const span = document.createElement('span');
  span.className = 'linguaswap-word';
  span.setAttribute('title', originalWord);
  span.textContent = translation;
  
  // Inherit styles
  span.style.color = 'inherit';
  span.style.fontSize = parentStyle.fontSize;
  span.style.fontFamily = parentStyle.fontFamily;
  span.style.fontWeight = parentStyle.fontWeight;
  
  return span;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug('Content script received message:', message);
  
  if (message.type === 'settingsUpdated') {
    const currentUrl = window.location.hostname + window.location.pathname;
    const wasExcluded = message.oldExcludedSites.some(site => 
      currentUrl.toLowerCase().includes(site.toLowerCase())
    );
    const isNowExcluded = message.newExcludedSites.some(site => 
      currentUrl.toLowerCase().includes(site.toLowerCase())
    );

    if (!wasExcluded && isNowExcluded) {
      removeAllTranslations();
      return;
    }

    if (wasExcluded && !isNowExcluded) {
      applyStoredTranslations();
    }
  }

  chrome.storage.local.get('settings', ({ settings }) => {
    if (isExcludedSite(settings?.excludedSites || [])) return;

    if (message.type === 'wordAdded' || message.type === 'wordEdited') {
      if (isSwappingEnabled) {
        const currentLangPair = getLangPairKey(settings);
        if (message.langPairKey === currentLangPair) {
          removeAllTranslations(message.word);
          replaceWords(message.word, message.translation);
        }
      }
    } else if (message.type === 'wordDeleted') {
      if (isSwappingEnabled) {
        const currentLangPair = getLangPairKey(settings);
        if (message.langPairKey === currentLangPair) {
          removeAllTranslations(message.word);
        }
      }
    } else if (message.type === 'toggleSwap') {
      isSwappingEnabled = message.isEnabled;
      if (isSwappingEnabled) {
        applyStoredTranslations();
      } else {
        removeAllTranslations();
      }
    } else if (message.type === 'wordListUpdated') {
      if (isSwappingEnabled) {
        const currentLangPair = getLangPairKey(settings);
        if (message.langPairKey === currentLangPair) {
          removeAllTranslations();
          applyStoredTranslations();
        }
      }
    } else if (message.type === 'settingsUpdated' && isSwappingEnabled) {
      removeAllTranslations();
      const langPairKey = getLangPairKey(message.settings);
      chrome.storage.local.get('wordLists', ({ wordLists }) => {
        const currentWordList = wordLists[langPairKey] || {};
        applyTranslations(currentWordList);
      });
    }
  });
});

// Initial page load
chrome.storage.local.get(['wordLists', 'isEnabled', 'settings'], ({ wordLists = {}, isEnabled = true, settings }) => {
  isSwappingEnabled = isEnabled;
  
  if (!settings?.excludedSites) {
    settings.excludedSites = [];
  }

  if (isSwappingEnabled && settings && !isExcludedSite(settings.excludedSites)) {
    const langPairKey = `${settings.defaultLanguage}-${settings.targetLanguage}`;
    const currentWordList = wordLists[langPairKey] || {};
    Object.entries(currentWordList).forEach(([word, translation]) => {
      replaceWords(word, translation);
    });
  }
});

// Function to replace words with translations
function replaceWords(word, translation) {
  const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, li');
  
  // Update existing translations
  document.querySelectorAll('.linguaswap-word').forEach(el => {
    if (el.getAttribute('title').toLowerCase() === word.toLowerCase()) {
      el.textContent = translation;
    }
  });

  // Process new translations
  chrome.storage.local.get('settings', ({ settings }) => {
    const isChineseSource = settings?.defaultLanguage === 'ZH';
    const regex = isChineseSource
      ? new RegExp(escapeRegExp(word), 'g')
      : new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    
    elements.forEach(element => {
      if (shouldSkipElement(element)) return;
      
      // Process all text nodes within the element
      const textNodes = [];
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip if parent is already a linguaswap-word or if text doesn't contain the word
            if (node.parentElement.classList.contains('linguaswap-word') || !regex.test(node.textContent)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        },
        false
      );

      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      // Replace text in all found nodes
      textNodes.forEach(textNode => {
        const fragment = document.createDocumentFragment();
        const parts = textNode.textContent.split(regex);
        const matches = textNode.textContent.match(regex) || [];
        
        parts.forEach((part, index) => {
          if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
          
          if (index < matches.length) {
            const computedStyle = window.getComputedStyle(textNode.parentElement);
            const span = createTranslatedSpan(matches[index], translation, computedStyle);
            fragment.appendChild(span);
          }
        });

        textNode.parentNode.replaceChild(fragment, textNode);
      });
    });
  });
}

// Function to determine if an element should be skipped, e.g. if it's a script, style, input, or textarea
function shouldSkipElement(element) {
  // Skip elements that shouldn't be modified
  const skipTags = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'];
  return skipTags.includes(element.tagName) || 
         element.closest('input, textarea, script, style');
}

// Function to show a notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10000;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Helper function to escape special characters in regular expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Add styles for translated words
const style = document.createElement('style');
style.textContent = `
  .linguaswap-word {
    cursor: help;
    border-bottom: 1px dashed currentColor;
    text-decoration: none;
  }
`;
document.head.appendChild(style); 