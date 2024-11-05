// Add this at the top of content.js
let isSwappingEnabled = true;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'wordAdded') {
    if (isSwappingEnabled) {
      replaceWords(message.word, message.translation);
    }
  } else if (message.type === 'showNotification') {
    showNotification(message.message);
  } else if (message.type === 'toggleSwap') {
    isSwappingEnabled = message.isEnabled;
    if (isSwappingEnabled) {
      // Re-apply all translations
      chrome.storage.local.get('wordList', ({ wordList }) => {
        if (wordList) {
          Object.entries(wordList).forEach(([word, translation]) => {
            replaceWords(word, translation);
          });
        }
      });
    } else {
      // Remove all translations
      document.querySelectorAll('.linguaswap-word').forEach(el => {
        el.outerHTML = el.getAttribute('title');
      });
    }
  }
});

// Initial page load
chrome.storage.local.get(['wordList', 'isEnabled'], ({ wordList, isEnabled = true }) => {
  isSwappingEnabled = isEnabled;
  if (wordList && isSwappingEnabled) {
    Object.entries(wordList).forEach(([word, translation]) => {
      replaceWords(word, translation);
    });
  }
});

function replaceWords(word, translation) {
  const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
  
  elements.forEach(element => {
    if (shouldSkipElement(element)) return;

    // Create a regular expression that matches the word with word boundaries
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    
    // Process text nodes only
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, `<span class="linguaswap-word" title="${word}">${translation}</span>`);
        node.parentNode.replaceChild(span, node);
      }
    }
  });
}

function shouldSkipElement(element) {
  // Skip elements that shouldn't be modified
  const skipTags = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'];
  return skipTags.includes(element.tagName) || 
         element.closest('input, textarea, script, style');
}

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
    color: #2196F3;
    cursor: help;
    border-bottom: 1px dashed #2196F3;
  }
`;
document.head.appendChild(style); 