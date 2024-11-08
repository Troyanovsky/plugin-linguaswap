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

document.addEventListener('DOMContentLoaded', async () => {
  // Toggle translation button
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
    targetLanguage: 'DE',
    provider: 'deepl'
  };

  // Merge existing settings with defaults
  const currentSettings = { ...defaultSettings, ...settings };

  // Populate settings
  const defaultLanguageSelect = document.getElementById('defaultLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');

  if (defaultLanguageSelect) defaultLanguageSelect.value = currentSettings.defaultLanguage;
  if (targetLanguageSelect) targetLanguageSelect.value = currentSettings.targetLanguage;

  // Add this after populating language selects
  const providerBtns = document.querySelectorAll('.provider-btn');
  providerBtns.forEach(btn => {
    if (btn.dataset.provider === currentSettings.provider) {
      btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => {
      providerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Function to create empty state element
  function createEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
      </svg>
      <p>No words added yet</p>
      <small>Words you add will appear here</small>
    `;
    return emptyState;
  }

  // Function to create search container
  function createSearchContainer(filterAndDisplayWords) {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Search words...';
    
    // Add search input listener
    searchInput.addEventListener('input', (e) => {
      filterAndDisplayWords(e.target.value);
    });
    
    searchContainer.appendChild(searchInput);
    return { searchContainer, searchInput };
  }

  // Function to create import button
  function createImportButton(langPairKey, currentWordList, filterAndDisplayWords, searchInput) {
    const importBtn = document.createElement('button');
    importBtn.className = 'action-btn import-btn';
    importBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Import
    `;
    
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').map(line => line.trim()).filter(line => line);
          
          // Validate CSV format
          const wordPairs = lines.map(line => {
            const [word, translation] = line.split(',').map(item => item.trim());
            if (!word || !translation) {
              throw new Error('Invalid CSV format. Each line must have two columns separated by a comma (default language, target language).');
            }
            return [word.toLowerCase(), translation];
          });

          // Get current word lists
          const { wordLists = {} } = await chrome.storage.local.get('wordLists');
          
          // Initialize or get current language pair's word list
          wordLists[langPairKey] = wordLists[langPairKey] || {};
          
          // Add or update words
          wordPairs.forEach(([word, translation]) => {
            wordLists[langPairKey][word] = translation;
          });

          // Save updated word lists
          await chrome.storage.local.set({ wordLists });
          
          // Update currentWordList reference
          Object.assign(currentWordList, wordLists[langPairKey]);
          
          // Update display
          filterAndDisplayWords(searchInput.value);
          
          // Notify all tabs to update their content
          const tabs = await chrome.tabs.query({});
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'wordListUpdated',
              langPairKey
            }).catch(() => {
              // Ignore errors for inactive tabs
            });
          });
          
          showNotification(`Successfully imported ${wordPairs.length} words!`);
        } catch (error) {
          showNotification(error.message, 'error');
        }
      };
      
      reader.readAsText(file);
      fileInput.value = ''; // Reset file input
    });
    
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    return importBtn;
  }

  // Function to create export button
  function createExportButton(langPairKey, currentWordList) {
    const exportBtn = document.createElement('button');
    exportBtn.className = 'action-btn export-btn';
    exportBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export
    `;
    
    exportBtn.addEventListener('click', () => {
      // Convert word list to CSV content for export
      const csvContent = Object.entries(currentWordList)
        .map(([word, translation]) => `${word},${translation}`)
        .join('\n');
      
      // Create blob and download link
      const blob = new Blob([`${langPairKey}\n${csvContent}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linguaswap-wordlist-${langPairKey}.csv`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showNotification('Word list exported successfully!');
    });

    return exportBtn;
  }

  // Function to create sort button
  function createSortButton(filterAndDisplayWords, searchInput) {
    const sortBtn = document.createElement('button');
    sortBtn.className = 'action-btn sort-btn';
    let isAscending = true;
    
    const updateSortButtonText = () => {
      sortBtn.innerHTML = `↕️ ${isAscending ? 'A → Z' : 'Z → A'}`;
    };
    updateSortButtonText();
    
    sortBtn.addEventListener('click', () => {
      isAscending = !isAscending;
      updateSortButtonText();
      filterAndDisplayWords(searchInput.value);
    });

    return { sortBtn, isAscending: () => isAscending };
  }

  // Main function to create action buttons
  function createActionButtons(langPairKey, currentWordList, filterAndDisplayWords, searchInput) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'list-actions';
    
    // Create buttons
    const importBtn = createImportButton(langPairKey, currentWordList, filterAndDisplayWords, searchInput);
    const exportBtn = createExportButton(langPairKey, currentWordList);
    const { sortBtn, isAscending } = createSortButton(filterAndDisplayWords, searchInput);
    
    // Add buttons to container
    actionsContainer.appendChild(importBtn);
    actionsContainer.appendChild(exportBtn);
    actionsContainer.appendChild(sortBtn);
    
    return { actionsContainer, isAscending };
  }

  // Main updateWordList function
  const updateWordList = () => {
    const wordListContainer = document.getElementById('wordList');
    if (wordListContainer) {
      // Clear existing words
      wordListContainer.innerHTML = '';
      
      // Get current language pair's word list
      const langPairKey = `${currentSettings.defaultLanguage}-${currentSettings.targetLanguage}`;
      const currentWordList = wordLists[langPairKey] || {};
      
      // Check if the word list is empty
      if (Object.keys(currentWordList).length === 0) {
        wordListContainer.appendChild(createEmptyState());
      } else {
        // Create a container for the filtered words
        const wordsContainer = document.createElement('div');
        wordsContainer.className = 'words-container';
        
        let sortState;
        
        // Function to filter and display words
        const filterAndDisplayWords = (searchTerm = '') => {
          wordsContainer.innerHTML = '';
          const sortedEntries = Object.entries(currentWordList)
            .filter(([word]) => 
              word.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort(([a], [b]) => sortState.isAscending() ? a.localeCompare(b) : b.localeCompare(a));

          sortedEntries.forEach(([word, translation]) => {
            addWordToList(word, translation, wordsContainer, langPairKey, currentWordList, filterAndDisplayWords, searchInput);
          });
        };

        // Add search container
        const { searchContainer, searchInput } = createSearchContainer(filterAndDisplayWords);
        wordListContainer.appendChild(searchContainer);

        // Add action buttons
        const { actionsContainer, isAscending } = createActionButtons(
          langPairKey, 
          currentWordList, 
          filterAndDisplayWords,
          searchInput
        );
        sortState = { isAscending };
        wordListContainer.appendChild(actionsContainer);
        
        wordListContainer.appendChild(wordsContainer);
        
        // Initial display of all words
        filterAndDisplayWords();
      }
    }
  };

  // Save settings
  const saveButton = document.getElementById('saveSettings');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const defaultLang = defaultLanguageSelect.value;
      const targetLang = targetLanguageSelect.value;
      const provider = document.querySelector('.provider-btn.active').dataset.provider;

      // Check if languages are the same, only possible if both are English
      if (defaultLang === 'EN' && targetLang === 'EN-US') {
        showNotification('Default and target languages cannot be the same!', 'error');
        return;
      }

      const newSettings = {
        defaultLanguage: defaultLang,
        targetLanguage: targetLang,
        provider
      };

      await chrome.storage.local.set({ settings: newSettings });
      
      // Update currentSettings before updating word list
      Object.assign(currentSettings, newSettings);
      
      // Update word list display for new language pair
      updateWordList();
      
      // Notify all tabs to update their content with new language pair
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'settingsUpdated',
          settings: newSettings
        }).catch(() => {
          // Ignore errors for inactive tabs
        });
      });
      
      showNotification('Settings saved successfully!');
    });
  }

  // Add event listeners for language changes
  defaultLanguageSelect.addEventListener('change', updateWordList);
  targetLanguageSelect.addEventListener('change', updateWordList);

  // Initial word list population
  updateWordList();
});

// Function to add a word to the word list
function addWordToList(word, translation, container, langPairKey, currentWordList, filterAndDisplayWords, searchInput) {
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

  // Edit button
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

    // Save button for editing
    saveBtn.addEventListener('click', async () => {
      const newTranslation = inputField.value.trim();
      if (newTranslation) {
        const { wordLists } = await chrome.storage.local.get('wordLists');
        wordLists[langPairKey][word] = newTranslation;
        await chrome.storage.local.set({ wordLists });

        // Update the current word list
        currentWordList[word] = newTranslation;

        // Refresh the filtered display
        filterAndDisplayWords(searchInput.value);

        // Update display
        wordText.textContent = `${word} : ${newTranslation}`;
        actionsDiv.replaceChild(editBtn, saveBtn);

        // Notify all tabs to update their content
        const tabs = await chrome.tabs.query({});
        debug('Found tabs:', tabs.length);

        const messagePromises = tabs.map(tab => 
          chrome.tabs.sendMessage(tab.id, {
            type: 'wordEdited',
            word,
            translation: newTranslation,
            langPairKey
          }).catch(error => {
            debug('Error sending message to tab:', tab.id, error);
            return null;
          })
        );

        await Promise.all(messagePromises);
        debug('Messages sent to all tabs');

        showNotification('Translation updated successfully!');
      }
    });

    actionsDiv.replaceChild(saveBtn, editBtn);
    inputField.focus();
  });

  // Delete button
  deleteBtn.addEventListener('click', async () => {
    const { wordLists } = await chrome.storage.local.get('wordLists');
    delete wordLists[langPairKey][word];
    await chrome.storage.local.set({ wordLists });
    
    // Update the current word list
    delete currentWordList[word];

    // Refresh the filtered display
    filterAndDisplayWords(searchInput.value);

    wordItem.remove();

    // Notify all tabs to update the page
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'wordDeleted',
        word,
        langPairKey
      }).catch(() => {
        // Ignore errors for inactive tabs
      });
    });

    showNotification('Word deleted successfully!');
  });

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);
  wordItem.appendChild(wordText);
  wordItem.appendChild(actionsDiv);
  container.appendChild(wordItem);
}

// Function to show a notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  `;

  // Set colors based on type
  if (type === 'error') {
    notification.style.background = '#EF4444';
  } else {
    notification.style.background = '#10B981';
  }
  notification.style.color = 'white';
  
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