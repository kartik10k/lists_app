// DOM Elements
const listsContainer = document.getElementById('lists-container');
const listItemsView = document.getElementById('list-items-view');
const listItemsContainer = document.getElementById('list-items');
const currentListTitle = document.getElementById('current-list-title');
const backButton = document.getElementById('back-button');
const voiceButton = document.getElementById('voice-button');
const addListButton = document.getElementById('add-list-button');
const addItemButton = document.getElementById('add-item-button');
const newListDialog = document.getElementById('new-list-dialog');
const newItemDialog = document.getElementById('add-item-dialog');
const newListInput = document.getElementById('new-list-name');
const newItemInput = document.getElementById('new-item-input');

// State
let currentList = null;
let lists = {};

// Initialize default lists
const defaultLists = ['Groceries', 'Tasks', 'Notes'];

// Global variables for edit functionality
let currentEditList = '';
let currentEditItem = '';

// Add new DOM element for transcription
const transcriptionDisplay = document.createElement('div');
transcriptionDisplay.id = 'transcription-display';
transcriptionDisplay.className = 'transcription-display';
document.body.appendChild(transcriptionDisplay);

// AI Model for list categorization
let model = null;
let listEmbeddings = null;

// Global function for back button
window.goBack = function() {
    console.log('goBack called');
    if (listItemsView) {
        listItemsView.style.display = 'none';
    }
    if (listsContainer) {
        listsContainer.style.display = 'grid';
    }
    currentList = null;
    renderLists();
};

// Load lists from localStorage and ensure default lists exist
function loadLists() {
    const storedLists = JSON.parse(localStorage.getItem('lists')) || {};
    
    // Initialize with default lists
    defaultLists.forEach(name => {
        lists[name] = storedLists[name] || [];
    });
    
    // Add any custom lists
    Object.entries(storedLists).forEach(([name, items]) => {
        if (!defaultLists.includes(name)) {
            lists[name] = items;
        }
    });
    
    // Save to ensure all lists are in localStorage
    saveLists();
}

// Initialize
async function init() {
    console.log('Initializing app...');
    
    // Load lists immediately
    loadLists();
    
    // Clean up any numeric lists
    cleanupLists();
    
    // Initialize AI model in the background
    initAIModel().catch(error => {
        console.error('Error initializing AI model:', error);
    });
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Render lists immediately
    renderLists();
    
    console.log('Initialization complete. Lists:', lists);
}

// Clean up lists
function cleanupLists() {
    console.log('Starting list cleanup...');
    const listsToKeep = {};
    
    // Keep default lists
    defaultLists.forEach(name => {
        listsToKeep[name] = lists[name] || [];
    });
    
    // Add any non-numeric, non-empty custom lists
    Object.entries(lists).forEach(([name, items]) => {
        if (!defaultLists.includes(name) && !isNaN(name) && name.trim() !== '') {
            console.log('Keeping custom list:', name);
            listsToKeep[name] = items;
        }
    });
    
    // Replace the lists object with cleaned version
    lists = listsToKeep;
    console.log('Cleaned lists:', lists);
    saveLists();
}

// Event Listeners
function setupEventListeners() {
    // Use passive event listeners for better scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    
    // Voice button - handle both click and touch events
    voiceButton.addEventListener('click', handleVoiceButton, { passive: false });
    voiceButton.addEventListener('touchend', handleVoiceButton, { passive: false });
    
    // Add list button
    addListButton.addEventListener('click', () => {
        newListInput.value = '';
        newListDialog.showModal();
    }, { passive: true });
    
    // Add item button
    addItemButton.addEventListener('click', () => {
        if (currentList) {
            newItemInput.value = '';
            newItemDialog.showModal();
        }
    }, { passive: true });
    
    // Dialog submit handlers
    document.getElementById('new-list-submit').addEventListener('click', () => {
        const listName = newListInput.value.trim();
        if (listName) {
            createList(listName);
            newListDialog.close();
        }
    }, { passive: true });
    
    document.getElementById('new-item-submit').addEventListener('click', () => {
        const itemText = newItemInput.value.trim();
        if (itemText && currentList) {
            addItem(currentList, itemText);
            newItemDialog.close();
        }
    }, { passive: true });
    
    // Dialog cancel handlers
    document.getElementById('new-list-cancel').addEventListener('click', () => newListDialog.close(), { passive: true });
    document.getElementById('add-item-cancel').addEventListener('click', () => newItemDialog.close(), { passive: true });
}

// Function to handle voice button interaction
function handleVoiceButton(event) {
    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle recognition state
    if (!isListening) {
        startRecognition();
    } else {
        // If we're stopping manually, process the current transcript
        if (currentTranscript.trim()) {
            processVoiceCommand(currentTranscript);
        }
        stopRecognition();
    }
}

function startRecognition() {
    if (!recognition) {
        initSpeechRecognition();
    }
    
    if (!isListening) {
        try {
            // Reset transcript when starting new recognition
            currentTranscript = '';
            
            // Request microphone permission explicitly
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    recognition.start();
                })
                .catch((err) => {
                    console.error('Microphone permission denied:', err);
                    alert('Please allow microphone access to use voice commands.');
                });
        } catch (error) {
            console.error('Error starting recognition:', error);
            alert('Error starting voice recognition. Please try again.');
        }
    }
}

function stopRecognition() {
    if (isListening && recognition) {
        console.log('Stopping recognition');
        if (silenceTimer) {
            clearTimeout(silenceTimer);
        }
        recognition.stop();
        isListening = false;
        voiceButton.classList.remove('listening');
        
        // Clear the current transcript after processing
        currentTranscript = '';
    }
}

// List Management
function createList(name) {
    // Validate list name
    if (!name || name.trim() === '' || !isNaN(name)) {
        console.error('Invalid list name:', name);
        return;
    }
    
    const normalizedName = normalizeListName(name.trim());
    console.log('Creating list with normalized name:', normalizedName);
    
    if (!lists[normalizedName]) {
        lists[normalizedName] = [];
        saveLists();
        renderLists();
    }
}

function deleteList(name) {
    const confirmDialog = document.createElement('dialog');
    confirmDialog.className = 'confirm-dialog';
    
    const content = document.createElement('div');
    content.innerHTML = `
        <h3>Delete List</h3>
        <p>Are you sure you want to delete the list "${name}"?</p>
        <p class="warning">This action cannot be undone.</p>
        <div class="dialog-buttons">
            <button class="cancel-button" onclick="this.closest('dialog').close()">Cancel</button>
            <button class="delete-button" onclick="confirmDeleteList('${name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
    `;
    
    confirmDialog.appendChild(content);
    document.body.appendChild(confirmDialog);
    confirmDialog.showModal();
}

function confirmDeleteList(name) {
    if (lists[name]) {
        delete lists[name];
        saveLists();
        renderLists();
        const dialog = document.querySelector('.confirm-dialog');
        if (dialog) {
            dialog.close();
            dialog.remove();
        }
    }
}

function addItem(listName, text) {
    if (lists[listName]) {
        lists[listName].push({
            text,
            completed: false,
            id: Date.now()
        });
        saveLists();
        if (currentList === listName) {
            renderListItems(listName);
        }
        renderLists();
    }
}

function toggleItem(listName, itemId) {
    if (lists[listName]) {
        const item = lists[listName].find(item => item.id === itemId);
        if (item) {
            item.completed = !item.completed;
            saveLists();
            renderListItems(listName);
        }
    }
}

function deleteItem(listName, itemId) {
    const item = lists[listName].find(item => item.id === itemId);
    if (!item) return;

    const confirmDialog = document.createElement('dialog');
    confirmDialog.className = 'confirm-dialog';
    
    const content = document.createElement('div');
    content.innerHTML = `
        <h3>Delete Item</h3>
        <p>Are you sure you want to delete this item?</p>
        <p class="item-text">${item.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <p class="warning">This action cannot be undone.</p>
        <div class="dialog-buttons">
            <button class="cancel-button" onclick="this.closest('dialog').close()">Cancel</button>
            <button class="delete-button" onclick="confirmDeleteItem('${listName.replace(/'/g, "\\'")}', ${itemId})">Delete</button>
        </div>
    `;
    
    confirmDialog.appendChild(content);
    document.body.appendChild(confirmDialog);
    confirmDialog.showModal();
}

function confirmDeleteItem(listName, itemId) {
    if (lists[listName]) {
        lists[listName] = lists[listName].filter(item => item.id !== itemId);
        saveLists();
        if (currentList === listName) {
            renderListItems(listName);
        }
        renderLists();
        const dialog = document.querySelector('.confirm-dialog');
        if (dialog) {
            dialog.close();
            dialog.remove();
        }
    }
}

// Rendering
function renderLists() {
    console.log('Rendering lists:', lists);
    const listsGrid = document.getElementById('lists-grid');
    if (!listsGrid) {
        console.error('Lists grid not found!');
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    // First render default lists
    defaultLists.forEach(name => {
        console.log('Rendering default list:', name);
        const items = lists[name] || [];
        const card = createListCard(name, items);
        fragment.appendChild(card);
    });
    
    // Then render custom lists
    Object.entries(lists).forEach(([name, items]) => {
        if (!defaultLists.includes(name)) {
            console.log('Rendering custom list:', name);
            const card = createListCard(name, items);
            fragment.appendChild(card);
        }
    });
    
    // Clear and update in one operation
    listsGrid.innerHTML = '';
    listsGrid.appendChild(fragment);
}

// Helper function to create list card
function createListCard(name, items) {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
        <div class="list-card-title">
            <span>${name}</span>
            <div class="list-card-actions">
                <button class="edit-list-button" onclick="event.stopPropagation(); showEditListDialog('${name}')">
                    <i class="material-icons">edit</i>
                </button>
                ${!defaultLists.includes(name) ? 
                    `<button class="delete-list-button" onclick="event.stopPropagation(); deleteList('${name}')">
                        <i class="material-icons">delete</i>
                    </button>` : ''}
            </div>
        </div>
        <div class="list-card-count">${items.length} items</div>
    `;
    card.addEventListener('click', () => showList(name));
    return card;
}

function showList(name) {
    console.log('Showing list:', name);
    currentList = name;
    if (currentListTitle) currentListTitle.textContent = name;
    if (listItemsView) listItemsView.style.display = 'block';
    if (listsContainer) listsContainer.style.display = 'none';
    renderListItems(name);
}

function renderListItems(listName) {
    if (!listItemsContainer) return;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    const items = lists[listName] || [];
    
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = `list-item ${item.completed ? 'completed' : ''}`;
        const itemText = typeof item === 'object' ? item.text : item;
        const itemId = typeof item === 'object' ? item.id : item;
        
        itemElement.innerHTML = `
            <div class="list-item-content">
                <input type="checkbox" 
                       class="item-checkbox" 
                       ${item.completed ? 'checked' : ''} 
                       onchange="toggleItem('${listName}', ${itemId})">
                <span class="item-text">${itemText}</span>
            </div>
            <div class="list-item-actions">
                <button class="move-item-button" onclick="event.stopPropagation(); showMoveOptionsDialog({text: '${itemText.replace(/'/g, "\\'")}', id: ${itemId}, completed: ${item.completed}}, '${listName}')">
                    <i class="material-icons">swap_horiz</i>
                </button>
                <button class="edit-item-button" onclick="event.stopPropagation(); showEditItemDialog('${itemText.replace(/'/g, "\\'")}', '${listName}')">
                    <i class="material-icons">edit</i>
                </button>
                <button class="delete-item-button" onclick="event.stopPropagation(); deleteItem('${listName}', ${itemId})">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        `;
        fragment.appendChild(itemElement);
    });
    
    // Clear and update in one operation
    listItemsContainer.innerHTML = '';
    listItemsContainer.appendChild(fragment);
}

// Voice Recognition
let recognition = null;
let isListening = false;
let silenceTimer = null;
let currentTranscript = '';

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        // Use requestAnimationFrame for smoother animations
        let animationFrame;
        recognition.onstart = () => {
            isListening = true;
            voiceButton.classList.add('listening');
            transcriptionDisplay.style.display = 'block';
            transcriptionDisplay.innerHTML = `
                <div class="listening-indicator">
                    <span class="pulse-dot"></span>
                    Listening...
                </div>
                <div class="transcript-container">
                    <div class="interim-transcript"></div>
                    <div class="final-transcript"></div>
                </div>
            `;
            
            // Optimize animation
            function animate() {
                if (isListening) {
                    voiceButton.classList.add('listening');
                    animationFrame = requestAnimationFrame(animate);
                }
            }
            animate();
            
            console.log('Voice recognition started');
        };

        recognition.onend = () => {
            isListening = false;
            cancelAnimationFrame(animationFrame);
            voiceButton.classList.remove('listening');
            // Keep the display visible for a moment after stopping
            setTimeout(() => {
                transcriptionDisplay.style.display = 'none';
            }, 1000);
            console.log('Voice recognition ended');
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            isListening = false;
            voiceButton.classList.remove('listening');
            transcriptionDisplay.style.display = 'none';
            
            switch(event.error) {
                case 'no-speech':
                    alert('No speech was detected. Please try again.');
                    break;
                case 'audio-capture':
                    alert('No microphone was found. Please ensure your microphone is connected and try again.');
                    break;
                case 'not-allowed':
                    alert('Microphone access was denied. Please allow microphone access and try again.');
                    break;
                default:
                    alert('An error occurred with voice recognition. Please try again.');
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update current transcript by appending new content
            if (finalTranscript) {
                currentTranscript += finalTranscript;
            }

            // Update the display with both interim and final transcripts
            const interimElement = transcriptionDisplay.querySelector('.interim-transcript');
            const finalElement = transcriptionDisplay.querySelector('.final-transcript');
            
            if (interimElement && finalElement) {
                interimElement.textContent = interimTranscript;
                finalElement.textContent = currentTranscript;
            }

            // Reset silence timer
            if (silenceTimer) {
                clearTimeout(silenceTimer);
            }

            // Set new silence timer only if we're not manually stopping
            if (isListening) {
                silenceTimer = setTimeout(() => {
                    if (currentTranscript.trim()) {
                        processVoiceCommand(currentTranscript);
                        stopRecognition();
                    }
                }, 3000); // 3 seconds of silence
            }
        };
    } else {
        console.error('Speech recognition not supported');
        voiceButton.style.display = 'none';
        alert('Voice recognition is not supported in your browser. Please use a modern browser like Chrome or Safari.');
    }
}

// Initialize the AI model
async function initAIModel() {
    try {
        // Load the Universal Sentence Encoder model
        model = await use.load();
        console.log('AI model loaded successfully');
    } catch (error) {
        console.error('Error loading AI model:', error);
    }
}

// Function to categorize text into the most appropriate list
async function categorizeText(text) {
    if (!model) {
        console.error('AI model not initialized');
        return null;
    }

    try {
        // Get all current lists and their items as context
        const listContexts = {};
        for (const [listName, items] of Object.entries(lists)) {
            // Create context from list name and its items
            const itemTexts = items.map(item => typeof item === 'object' ? item.text : item);
            listContexts[listName] = [listName, ...itemTexts];
        }

        // Get embeddings for the input text and all list contexts
        const textEmbedding = await model.embed([text]);
        const similarities = {};

        // Calculate similarity with each list's context
        for (const [listName, context] of Object.entries(listContexts)) {
            const contextEmbedding = await model.embed(context);
            const similarity = tf.matMul(textEmbedding, contextEmbedding.transpose()).dataSync()[0];
            similarities[listName] = similarity;
        }

        // Find the best matching list
        let maxSimilarity = -1;
        let bestList = null;

        for (const [listName, similarity] of Object.entries(similarities)) {
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestList = listName;
            }
        }

        // Use a lower threshold for zero-shot classification
        const threshold = 0.2;

        // Log the similarities for debugging
        console.log('Text:', text);
        console.log('Similarities:', similarities);
        console.log('Best match:', bestList, 'with similarity:', maxSimilarity);

        // Return both the best list and all similarities
        return {
            bestList: maxSimilarity > threshold ? bestList : null,
            similarities,
            maxSimilarity
        };
    } catch (error) {
        console.error('Error categorizing text:', error);
        return null;
    }
}

// Update the processVoiceCommand function to be more responsive
async function processVoiceCommand(transcript) {
    console.log('Processing command:', transcript);
    
    // Start AI categorization immediately
    const categorizationPromise = categorizeText(transcript);
    
    // First try to find explicit list mentions
    let listName = null;
    Object.keys(lists).forEach(name => {
        if (transcript.toLowerCase().includes(name.toLowerCase())) {
            listName = name;
        }
    });

    // If no explicit list mention, use AI to categorize
    if (!listName) {
        const categorization = await categorizationPromise;
        console.log('AI categorization:', categorization);
        
        if (categorization && categorization.bestList) {
            listName = categorization.bestList;
        }
    }

    // Create a temporary item
    const tempItem = {
        text: transcript.trim(),
        id: Date.now(),
        completed: false
    };

    // If we found a list (either explicitly or through AI)
    if (listName) {
        // Add the item
        addItem(listName, tempItem.text);

        // Show the list if we're not already viewing it
        if (currentList !== listName) {
            showList(listName);
        }

        // Show move options dialog immediately
        requestAnimationFrame(() => {
            showMoveOptionsDialog(tempItem, listName);
        });
    } else {
        // If no list was found, create a new list
        const newListName = 'New List ' + (Object.keys(lists).length + 1);
        createList(newListName);
        addItem(newListName, tempItem.text);
        showList(newListName);
        
        // Show move options dialog immediately
        requestAnimationFrame(() => {
            showMoveOptionsDialog(tempItem, newListName);
        });
    }
}

// Optimize the showMoveOptionsDialog function
function showMoveOptionsDialog(item, currentListName) {
    // Create dialog with minimal content first
    const dialog = document.createElement('dialog');
    dialog.className = 'move-options-dialog';
    
    // Get all lists including the current one
    const allLists = [...defaultLists, ...Object.keys(lists).filter(name => !defaultLists.includes(name))];
    
    // Create basic structure
    const content = document.createElement('div');
    content.innerHTML = `
        <h3>Move Item</h3>
        <p>Select a list to move this item to:</p>
        <div class="move-options">
            ${allLists.map(listName => `
                <button class="move-option ${listName === currentListName ? 'current selected' : ''}" 
                        data-list-name="${listName.replace(/"/g, '&quot;')}"
                        onclick="selectListForMove('${listName.replace(/'/g, "\\'")}')">
                    ${listName}
                </button>
            `).join('')}
        </div>
        <div class="dialog-buttons">
            <button class="cancel-button" onclick="this.closest('dialog').close()">Cancel</button>
            <button class="done-button" onclick="confirmMoveItem('${item.text.replace(/'/g, "\\'")}', '${currentListName.replace(/'/g, "\\'")}')">Done</button>
        </div>
    `;
    
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // Show dialog immediately
    dialog.showModal();

    // Set the current list as selected
    selectedListForMove = currentListName;
}

// Global variable to store selected list for moving
let selectedListForMove = null;

// Function to select a list for moving
function selectListForMove(listName) {
    selectedListForMove = listName;
    
    // Update UI to show selection
    const moveOptions = document.querySelectorAll('.move-option');
    moveOptions.forEach(option => {
        if (option.getAttribute('data-list-name') === listName) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Function to confirm and execute the move
function confirmMoveItem(itemText, fromList) {
    if (selectedListForMove) {
        moveItem(itemText, fromList, selectedListForMove);
        selectedListForMove = null; // Reset selection
    } else {
        alert('Please select a list to move the item to.');
    }
}

// Function to move item between lists
function moveItem(itemText, fromList, toList) {
    console.log('Moving item:', { itemText, fromList, toList });
    
    // Find the item in the source list
    const itemIndex = lists[fromList].findIndex(item => item.text === itemText);
    if (itemIndex === -1) {
        console.error('Item not found in source list');
        return;
    }
    
    // Get the complete item object
    const item = lists[fromList][itemIndex];
    
    // Remove from current list
    lists[fromList].splice(itemIndex, 1);
    
    // Add to new list with the same properties
    lists[toList].push({
        text: item.text,
        completed: item.completed,
        id: item.id
    });
    
    // Save changes
    saveLists();
    
    // Update UI
    if (currentList === fromList || currentList === toList) {
        renderListItems(currentList);
    }
    renderLists();
    
    // Close dialog
    const dialog = document.querySelector('.move-options-dialog');
    if (dialog) {
        dialog.close();
        dialog.remove();
    }
}

// Helper function to normalize list names
function normalizeListName(name) {
    // Convert to lowercase for comparison
    const lowerName = name.toLowerCase();
    
    // Handle common singular/plural cases
    const singularToPlural = {
        'grocery': 'Groceries',
        'task': 'Tasks',
        'note': 'Notes',
        'shopping': 'Shopping',
        'todo': 'Todo',
        'reminder': 'Reminders'
    };
    
    // Check if the name matches any known singular forms
    for (const [singular, plural] of Object.entries(singularToPlural)) {
        if (lowerName === singular) {
            return plural;
        }
    }
    
    // If no match found, capitalize the first letter of each word
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Storage
function saveLists() {
    // Debounce save operations
    if (saveLists.timeout) {
        clearTimeout(saveLists.timeout);
    }
    saveLists.timeout = setTimeout(() => {
        console.log('Saving lists:', lists);
        localStorage.setItem('lists', JSON.stringify(lists));
    }, 100);
}

// Function to show edit list dialog
function showEditListDialog(listName) {
    currentEditList = listName;
    const dialog = document.getElementById('edit-list-dialog');
    const input = document.getElementById('edit-list-name');
    input.value = listName;
    dialog.showModal();
}

// Function to close edit list dialog
function closeEditListDialog() {
    const dialog = document.getElementById('edit-list-dialog');
    dialog.close();
    currentEditList = '';
}

// Function to save edited list name
function saveListName() {
    const newName = document.getElementById('edit-list-name').value.trim();
    if (newName && newName !== currentEditList) {
        if (lists[newName]) {
            alert('A list with this name already exists!');
            return;
        }
        
        // Update the global lists object directly
        lists[newName] = lists[currentEditList];
        delete lists[currentEditList];
        
        // Save to localStorage
        localStorage.setItem('lists', JSON.stringify(lists));
        
        // Update UI
        closeEditListDialog();
        renderLists();
        
        // If we're currently viewing the edited list, update the view
        if (currentList === currentEditList) {
            currentList = newName;
            document.getElementById('current-list-title').textContent = newName;
            renderListItems(newName);
        }
    }
    closeEditListDialog();
}

// Function to show edit item dialog
function showEditItemDialog(itemText, listName) {
    currentEditItem = itemText;
    currentList = listName;
    const dialog = document.getElementById('edit-item-dialog');
    const input = document.getElementById('edit-item-text');
    input.value = itemText;
    dialog.showModal();
}

// Function to close edit item dialog
function closeEditItemDialog() {
    const dialog = document.getElementById('edit-item-dialog');
    dialog.close();
    currentEditItem = '';
}

// Function to save edited item
function saveItemEdit() {
    const newText = document.getElementById('edit-item-text').value.trim();
    if (newText && newText !== currentEditItem && currentList) {
        // Update the global lists object directly
        const items = lists[currentList] || [];
        
        // Find and replace the item
        const index = items.findIndex(item => {
            const itemText = typeof item === 'object' ? item.text : item;
            return itemText === currentEditItem;
        });
        
        if (index !== -1) {
            if (typeof items[index] === 'object') {
                items[index].text = newText;
            } else {
                items[index] = newText;
            }
            
            // Save to localStorage
            localStorage.setItem('lists', JSON.stringify(lists));
            
            // Update UI immediately
            closeEditItemDialog();
            renderListItems(currentList);
            
            // Also update the list count in the main view
            renderLists();
        }
    }
    closeEditItemDialog();
}

// Initialize the app immediately
document.addEventListener('DOMContentLoaded', () => {
    init();
}); 