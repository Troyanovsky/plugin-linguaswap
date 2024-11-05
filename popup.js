document.addEventListener('DOMContentLoaded', async () => {
  // Add this near the top of the DOMContentLoaded listener
  const swapToggle = document.getElementById('swapToggle');
  
  // Load toggle state
  const { isEnabled = true } = await chrome.storage.local.get('isEnabled');
  swapToggle.checked = isEnabled;

  // Handle toggle changes
  swapToggle.addEventListener('change', async () => {
    const isEnabled = swapToggle.checked;
    await chrome.storage.local.set({ isEnabled });
    
    // Notify content script of the change
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'toggleSwap',
        isEnabled
      });
    }
  });

  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Load settings and word list
  const { settings = {}, wordList = {} } = await chrome.storage.local.get(['settings', 'wordList']);
  
  // Initialize default settings if they don't exist
  const defaultSettings = {
    defaultLanguage: 'EN',
    targetLanguage: 'ES',
    deeplApiKey: ''
  };

  // Merge existing settings with defaults
  const currentSettings = { ...defaultSettings, ...settings };

  // Populate settings
  const defaultLanguageSelect = document.getElementById('defaultLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const deeplApiKeyInput = document.getElementById('deeplApiKey');

  if (defaultLanguageSelect) defaultLanguageSelect.value = currentSettings.defaultLanguage;
  if (targetLanguageSelect) targetLanguageSelect.value = currentSettings.targetLanguage;
  if (deeplApiKeyInput) deeplApiKeyInput.value = currentSettings.deeplApiKey;

  // Save settings
  const saveButton = document.getElementById('saveSettings');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const newSettings = {
        defaultLanguage: defaultLanguageSelect.value,
        targetLanguage: targetLanguageSelect.value,
        deeplApiKey: deeplApiKeyInput.value
      };

      await chrome.storage.local.set({ settings: newSettings });
      showNotification('Settings saved successfully!');
    });
  }

  // Populate word list
  const wordListContainer = document.getElementById('wordList');
  if (wordListContainer) {
    for (const [word, translation] of Object.entries(wordList)) {
      addWordToList(word, translation, wordListContainer);
    }
  }
});

function addWordToList(word, translation, container) {
  const wordItem = document.createElement('div');
  wordItem.className = 'word-item';
  
  const wordText = document.createElement('span');
  wordText.className = 'word-text';
  wordText.textContent = `${word} : ${translation}`;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', async () => {
    const { wordList } = await chrome.storage.local.get('wordList');
    delete wordList[word];
    await chrome.storage.local.set({ wordList });
    wordItem.remove();
    showNotification('Word deleted successfully!');
  });

  wordItem.appendChild(wordText);
  wordItem.appendChild(deleteBtn);
  container.appendChild(wordItem);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10B981;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Remove notification
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
} 