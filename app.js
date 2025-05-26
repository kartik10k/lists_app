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
let lists = JSON.parse(localStorage.getItem('lists')) || {
    'Groceries': [],
    'Tasks': [],
    'Notes': []
};

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

// Initialize
function init() {
    console.log('Initializing app with lists:', lists);
    // Ensure default lists exist
    if (!lists['Groceries']) lists['Groceries'] = [];
    if (!lists['Tasks']) lists['Tasks'] = [];
    if (!lists['Notes']) lists['Notes'] = [];
    
    // Save to ensure lists are in localStorage
    saveLists();
    
    renderLists();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    // Voice button
    voiceButton.addEventListener('click', toggleVoiceRecognition);
    
    // Add list button
    addListButton.addEventListener('click', () => {
        newListInput.value = '';
        newListDialog.showModal();
    });
    
    // Add item button
    addItemButton.addEventListener('click', () => {
        if (currentList) {
            newItemInput.value = '';
            newItemDialog.showModal();
        }
    });
    
    // Dialog submit handlers
    document.getElementById('new-list-submit').addEventListener('click', () => {
        const listName = newListInput.value.trim();
        if (listName) {
            createList(listName);
            newListDialog.close();
        }
    });
    
    document.getElementById('new-item-submit').addEventListener('click', () => {
        const itemText = newItemInput.value.trim();
        if (itemText && currentList) {
            addItem(currentList, itemText);
            newItemDialog.close();
        }
    });
    
    // Dialog cancel handlers
    document.getElementById('new-list-cancel').addEventListener('click', () => newListDialog.close());
    document.getElementById('add-item-cancel').addEventListener('click', () => newItemDialog.close());
}

// List Management
function createList(name) {
    if (!lists[name]) {
        lists[name] = [];
        saveLists();
        renderLists();
    }
}

function deleteList(name) {
    if (confirm(`Are you sure you want to delete the list "${name}"?`)) {
        delete lists[name];
        saveLists();
        renderLists();
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
    if (lists[listName]) {
        lists[listName] = lists[listName].filter(item => item.id !== itemId);
        saveLists();
        if (currentList === listName) {
            renderListItems(listName);
        }
        renderLists();
    }
}

// Rendering
function renderLists() {
    console.log('Rendering lists:', lists);
    listsContainer.innerHTML = '';
    
    if (!listsContainer) {
        console.error('Lists container not found!');
        return;
    }
    
    Object.entries(lists).forEach(([name, items]) => {
        console.log('Creating card for list:', name, 'with items:', items);
        const card = document.createElement('div');
        card.className = 'list-card';
        card.innerHTML = `
            <h3 class="list-card-title">${name}</h3>
            <div class="list-card-count">${items.length} items</div>
            ${name !== 'Groceries' && name !== 'Tasks' && name !== 'Notes' ? 
                `<button class="mdl-button mdl-js-button mdl-button--icon list-delete-button" onclick="event.stopPropagation(); deleteList('${name}')">
                    <i class="material-icons">delete</i>
                </button>` : ''}
        `;
        card.addEventListener('click', () => showList(name));
        listsContainer.appendChild(card);
    });
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
    listItemsContainer.innerHTML = '';
    lists[listName].forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = `list-item ${item.completed ? 'completed' : ''}`;
        itemElement.innerHTML = `
            <div class="list-item-content">${item.text}</div>
            <div class="list-item-actions">
                <button class="mdl-button mdl-js-button mdl-button--icon" onclick="toggleItem('${listName}', ${item.id})">
                    <i class="material-icons">${item.completed ? 'check_circle' : 'radio_button_unchecked'}</i>
                </button>
                <button class="mdl-button mdl-js-button mdl-button--icon" onclick="deleteItem('${listName}', ${item.id})">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        `;
        listItemsContainer.appendChild(itemElement);
    });
}

// Voice Recognition
let recognition = null;
let isListening = false;

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            voiceButton.classList.add('listening');
            console.log('Voice recognition started');
        };

        recognition.onend = () => {
            isListening = false;
            voiceButton.classList.remove('listening');
            console.log('Voice recognition ended');
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            isListening = false;
            voiceButton.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Transcript:', transcript);
            processVoiceCommand(transcript);
        };
    } else {
        console.error('Speech recognition not supported');
        voiceButton.style.display = 'none';
    }
}

function toggleVoiceRecognition() {
    if (!recognition) {
        initSpeechRecognition();
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    }
}

function processVoiceCommand(transcript) {
    console.log('Processing command:', transcript);
    
    // Extract list name and item text
    let listName, itemText;
    
    // Try different patterns
    const patterns = [
        // "add [item] to [list]"
        { regex: /add\s+(.+?)\s+to\s+(.+)/i, itemIndex: 1, listIndex: 2 },
        // "[item] in [list]"
        { regex: /(.+?)\s+in\s+(.+)/i, itemIndex: 1, listIndex: 2 },
        // "put [item] in [list]"
        { regex: /put\s+(.+?)\s+in\s+(.+)/i, itemIndex: 1, listIndex: 2 },
        // "add [item] in [list]"
        { regex: /add\s+(.+?)\s+in\s+(.+)/i, itemIndex: 1, listIndex: 2 },
        // "put [item] to [list]"
        { regex: /put\s+(.+?)\s+to\s+(.+)/i, itemIndex: 1, listIndex: 2 },
        // "[item] to [list]"
        { regex: /(.+?)\s+to\s+(.+)/i, itemIndex: 1, listIndex: 2 }
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
        const match = transcript.match(pattern.regex);
        if (match) {
            itemText = match[pattern.itemIndex].trim();
            listName = match[pattern.listIndex].trim();
            console.log('Pattern matched:', pattern.regex);
            console.log('Extracted item:', itemText);
            console.log('Extracted list:', listName);
            break;
        }
    }
    
    if (listName && itemText) {
        console.log('Adding item:', itemText, 'to list:', listName);
        
        // Normalize list name (handle singular/plural)
        const normalizedListName = normalizeListName(listName);
        console.log('Normalized list name:', normalizedListName);
        
        // Create list if it doesn't exist
        if (!lists[normalizedListName]) {
            console.log('Creating new list:', normalizedListName);
            createList(normalizedListName);
        }
        
        // Add item to the list
        addItem(normalizedListName, itemText);
        
        // Show the list if we're not already viewing it
        if (currentList !== normalizedListName) {
            showList(normalizedListName);
        }
        
        return;
    }
    
    // If we couldn't parse the command, try to find a list name in the transcript
    Object.keys(lists).forEach(name => {
        if (transcript.toLowerCase().includes(name.toLowerCase())) {
            console.log('Switching to list:', name);
            showList(name);
            return;
        }
    });
    
    // If we still haven't handled the command, try to add the entire transcript as an item to the current list
    if (currentList && transcript.trim()) {
        console.log('Adding to current list:', currentList, 'item:', transcript.trim());
        addItem(currentList, transcript.trim());
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
    console.log('Saving lists:', lists);
    localStorage.setItem('lists', JSON.stringify(lists));
}

// Initialize the app
init(); 