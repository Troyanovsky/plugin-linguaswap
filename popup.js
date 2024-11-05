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

  // Load settings and word lists
  const { settings = {}, wordLists = {} } = await chrome.storage.local.get(['settings', 'wordLists']);
  
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

  // Function to update word list display
  const updateWordList = () => {
    const wordListContainer = document.getElementById('wordList');
    if (wordListContainer) {
      // Clear existing words
      wordListContainer.innerHTML = '';
      
      // Get current language pair's word list
      const langPairKey = `${currentSettings.defaultLanguage}-${currentSettings.targetLanguage}`;
      const currentWordList = wordLists[langPairKey] || {};
      
      // Add words for current language pair
      Object.entries(currentWordList).forEach(([word, translation]) => {
        addWordToList(word, translation, wordListContainer, langPairKey);
      });
    }
  };

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
      
      // Update word list display for new language pair
      updateWordList();
    });
  }

  // Add event listeners for language changes
  defaultLanguageSelect.addEventListener('change', updateWordList);
  targetLanguageSelect.addEventListener('change', updateWordList);

  // Initial word list population
  updateWordList();
});

function addWordToList(word, translation, container, langPairKey) {
  const wordItem = document.createElement('div');
  wordItem.className = 'word-item';
  
  const wordText = document.createElement('span');
  wordText.className = 'word-text';
  wordText.textContent = `${word} : ${translation}`;
  
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'word-actions';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn edit-btn';
  editBtn.textContent = '✏️';  // pencil emoji
  editBtn.title = "Edit translation";

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn delete-btn';
  deleteBtn.textContent = '🗑️';  // trash bin emoji
  deleteBtn.title = "Delete word";

  editBtn.addEventListener('click', () => {
    // Replace text with input field
    const inputField = document.createElement('input');
    inputField.className = 'word-edit-input';
    inputField.value = translation;
    wordText.textContent = `${word} : `;
    wordText.appendChild(inputField);

    // Replace edit button with save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'icon-btn save-btn';
    saveBtn.textContent = '💾';  // floppy disk emoji
    saveBtn.title = "Save translation";

    saveBtn.addEventListener('click', async () => {
      const newTranslation = inputField.value.trim();
      if (newTranslation) {
        const { wordLists } = await chrome.storage.local.get('wordLists');
        wordLists[langPairKey][word] = newTranslation;
        await chrome.storage.local.set({ wordLists });

        // Update display
        wordText.textContent = `${word} : ${newTranslation}`;
        actionsDiv.replaceChild(editBtn, saveBtn);

        // Notify content script to update the page
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]) {
            await chrome.tabs.sendMessage(tabs[0].id, {
              type: 'wordAdded',
              word,
              translation: newTranslation,
              langPairKey
            });
          }
        } catch (error) {
          // Ignore the connection error as it's expected in some cases
          console.debug('Content script communication error (expected):', error);
        }

        showNotification('Translation updated successfully! Reload the page to see the changes.');
      }
    });

    actionsDiv.replaceChild(saveBtn, editBtn);
    inputField.focus();
  });

  deleteBtn.addEventListener('click', async () => {
    const { wordLists } = await chrome.storage.local.get('wordLists');
    delete wordLists[langPairKey][word];
    await chrome.storage.local.set({ wordLists });
    wordItem.remove();

    // Notify content script to update the page
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'wordDeleted',
          word,
          langPairKey
        });
      }
    } catch (error) {
      // Ignore the connection error as it's expected in some cases
      console.debug('Content script communication error (expected):', error);
    }

    showNotification('Word deleted successfully!');
  });

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);
  wordItem.appendChild(wordText);
  wordItem.appendChild(actionsDiv);
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