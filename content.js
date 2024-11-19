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

    // If site was not excluded but is now excluded, remove all translations
    if (!wasExcluded && isNowExcluded) {
      removeAllTranslations();
      return;
    }

    // If site was excluded but is now not excluded, apply translations
    if (wasExcluded && !isNowExcluded) {
      chrome.storage.local.get(['wordLists', 'settings'], ({ wordLists, settings }) => {
        const langPairKey = `${settings.defaultLanguage}-${settings.targetLanguage}`;
        const currentWordList = wordLists[langPairKey] || {};
        Object.entries(currentWordList).forEach(([word, translation]) => {
          replaceWords(word, translation);
        });
      });
    }
  }

  // Get settings first to check for excluded sites
  chrome.storage.local.get('settings', ({ settings }) => {
    if (isExcludedSite(settings?.excludedSites || [])) {
      return; // Skip processing if site is excluded
    }

    if (message.type === 'wordAdded' || message.type === 'wordEdited') {
      debug('Processing word edit/add:', message);
      if (isSwappingEnabled) {
        const currentLangPair = `${settings.defaultLanguage}-${settings.targetLanguage}`;
        debug('Current language pair:', currentLangPair, 'Message pair:', message.langPairKey);
        
        if (message.langPairKey === currentLangPair) {
          removeAllTranslations(message.word);
          replaceWords(message.word, message.translation);
          debug('Translation updated on page');
        }
      }
    } else if (message.type === 'wordDeleted') {
      if (isSwappingEnabled) {
        const currentLangPair = `${settings.defaultLanguage}-${settings.targetLanguage}`;
        if (message.langPairKey === currentLangPair) {
          removeAllTranslations(message.word);
        }
      }
    } else if (message.type === 'toggleSwap') {
      isSwappingEnabled = message.isEnabled;
      if (isSwappingEnabled) {
        chrome.storage.local.get(['wordLists', 'settings'], ({ wordLists, settings }) => {
          if (wordLists && settings) {
            const langPairKey = `${settings.defaultLanguage}-${settings.targetLanguage}`;
            const currentWordList = wordLists[langPairKey] || {};
            removeAllTranslations();
            Object.entries(currentWordList).forEach(([word, translation]) => {
              replaceWords(word, translation);
            });
          }
        });
      } else {
        removeAllTranslations();
      }
    } else if (message.type === 'wordListUpdated') {
      if (isSwappingEnabled) {
        chrome.storage.local.get(['wordLists', 'settings'], ({ wordLists, settings }) => {
          const currentLangPair = `${settings.defaultLanguage}-${settings.targetLanguage}`;
          if (message.langPairKey === currentLangPair) {
            removeAllTranslations();
            const currentWordList = wordLists[currentLangPair] || {};
            Object.entries(currentWordList).forEach(([word, translation]) => {
              replaceWords(word, translation);
            });
          }
        });
      }
    } else if (message.type === 'settingsUpdated') {
      if (isSwappingEnabled) {
        removeAllTranslations();
        const langPairKey = `${message.settings.defaultLanguage}-${message.settings.targetLanguage}`;
        chrome.storage.local.get('wordLists', ({ wordLists }) => {
          const currentWordList = wordLists[langPairKey] || {};
          Object.entries(currentWordList).forEach(([word, translation]) => {
            replaceWords(word, translation);
          });
        });
      }
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
  
  // First, restore any existing translations of this word
  document.querySelectorAll('.linguaswap-word').forEach(el => {
    if (el.getAttribute('title').toLowerCase() === word.toLowerCase()) {
      el.textContent = translation;
    }
  });

  // Then proceed with finding and replacing new instances
  chrome.storage.local.get('settings', ({ settings }) => {
    const isChineseSource = settings?.defaultLanguage === 'ZH';
    
    elements.forEach(element => {
      if (shouldSkipElement(element)) return;

      // Create appropriate regex based on language
      const regex = isChineseSource
        ? new RegExp(escapeRegExp(word), 'g')  // Chinese: match without word boundaries
        : new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');  // Other languages: use word boundaries
      
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
          // Add the regular text
          if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
          
          // Add the translated word if there's a match
          if (index < matches.length) {
            const span = document.createElement('span');
            span.className = 'linguaswap-word';
            span.setAttribute('title', matches[index]);
            span.textContent = translation;
            const computedStyle = window.getComputedStyle(textNode.parentElement);
            span.style.color = 'inherit';
            span.style.fontSize = computedStyle.fontSize;
            span.style.fontFamily = computedStyle.fontFamily;
            span.style.fontWeight = computedStyle.fontWeight;
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