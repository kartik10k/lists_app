// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Material Design Lite components
    componentHandler.upgradeAllRegistered();

    // Initialize dialogs
    const addItemDialog = document.getElementById('add-item-dialog');
    const newListDialog = document.getElementById('new-list-dialog');
    if (!addItemDialog.showModal) {
        dialogPolyfill.registerDialog(addItemDialog);
        dialogPolyfill.registerDialog(newListDialog);
    }

    // Default lists
    let lists = [
        {
            id: 'groceries',
            name: 'Groceries',
            items: [],
            aliases: ['grocery', 'shopping', 'food']
        },
        {
            id: 'todo',
            name: 'To-Do',
            items: [],
            aliases: ['tasks', 'todo list', 'to do']
        },
        {
            id: 'ideas',
            name: 'Ideas',
            items: [],
            aliases: ['idea', 'thoughts', 'concepts']
        }
    ];

    let currentListId = 'groceries';

    // Load saved data
    const savedLists = localStorage.getItem('lists');
    if (savedLists) {
        lists = JSON.parse(savedLists);
    }

    // Initialize UI
    function initializeUI() {
        // Create tabs
        const tabBar = document.getElementById('list-tabs');
        tabBar.innerHTML = '';
        lists.forEach(list => {
            const tab = document.createElement('a');
            tab.className = `mdl-layout__tab ${list.id === currentListId ? 'is-active' : ''}`;
            tab.href = `#${list.id}`;
            tab.textContent = list.name;
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                setCurrentList(list.id);
            });
            tabBar.appendChild(tab);
        });

        // Update list content
        updateListContent();
    }

    // Update list content
    function updateListContent() {
        const listContent = document.getElementById('list-content');
        const currentList = lists.find(list => list.id === currentListId);
        
        listContent.innerHTML = '';
        currentList.items.forEach(item => {
            const itemElement = createListItem(item);
            listContent.appendChild(itemElement);
        });
    }

    // Create list item element
    function createListItem(item) {
        const div = document.createElement('div');
        div.className = `list-item ${item.completed ? 'completed' : ''}`;
        div.innerHTML = `
            <div class="list-item-content">${item.text}</div>
            <div class="list-item-actions">
                <button class="mdl-button mdl-js-button mdl-button--icon" onclick="toggleItem('${item.id}')">
                    <i class="material-icons">${item.completed ? 'check_box' : 'check_box_outline_blank'}</i>
                </button>
                <button class="mdl-button mdl-js-button mdl-button--icon" onclick="deleteItem('${item.id}')">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        `;
        return div;
    }

    // Set current list
    function setCurrentList(listId) {
        currentListId = listId;
        const tabs = document.querySelectorAll('.mdl-layout__tab');
        tabs.forEach(tab => {
            tab.classList.toggle('is-active', tab.href.endsWith(listId));
        });
        updateListContent();
    }

    // Add item
    function addItem(text, listId = currentListId) {
        const newItem = {
            id: Date.now().toString(),
            text,
            completed: false
        };

        const list = lists.find(l => l.id === listId);
        if (list) {
            list.items.push(newItem);
            saveLists();
            updateListContent();
        }
    }

    // Delete item
    window.deleteItem = function(itemId) {
        const list = lists.find(l => l.id === currentListId);
        if (list) {
            list.items = list.items.filter(item => item.id !== itemId);
            saveLists();
            updateListContent();
        }
    };

    // Toggle item completion
    window.toggleItem = function(itemId) {
        const list = lists.find(l => l.id === currentListId);
        if (list) {
            const item = list.items.find(i => i.id === itemId);
            if (item) {
                item.completed = !item.completed;
                saveLists();
                updateListContent();
            }
        }
    };

    // Save lists to localStorage
    function saveLists() {
        localStorage.setItem('lists', JSON.stringify(lists));
    }

    // Find list by alias
    function findListByAlias(alias) {
        return lists.find(list => 
            list.name.toLowerCase() === alias.toLowerCase() ||
            list.aliases.some(a => a.toLowerCase() === alias.toLowerCase())
        );
    }

    // Process speech input
    function processSpeechInput(transcript) {
        // Handle "add to list" command
        const addMatch = transcript.match(/add\s+(.+?)(?:\s+to\s+(\w+))?$/i);
        if (addMatch) {
            const itemText = addMatch[1];
            const listAlias = addMatch[2]?.toLowerCase();
            
            if (listAlias) {
                const targetList = findListByAlias(listAlias);
                if (targetList) {
                    addItem(itemText, targetList.id);
                } else {
                    // Create new list
                    const newListId = listAlias.replace(/\s+/g, '-');
                    const newList = {
                        id: newListId,
                        name: listAlias.charAt(0).toUpperCase() + listAlias.slice(1),
                        items: [],
                        aliases: [listAlias]
                    };
                    lists.push(newList);
                    addItem(itemText, newListId);
                    initializeUI();
                }
            } else {
                addItem(itemText);
            }
        }

        // Handle "create new list" command
        const createListMatch = transcript.match(/create\s+(?:new\s+)?list\s+(.+)$/i);
        if (createListMatch) {
            const listName = createListMatch[1];
            const newListId = listName.toLowerCase().replace(/\s+/g, '-');
            const newList = {
                id: newListId,
                name: listName.charAt(0).toUpperCase() + listName.slice(1),
                items: [],
                aliases: [listName.toLowerCase()]
            };
            lists.push(newList);
            setCurrentList(newListId);
            initializeUI();
        }
    }

    // Handle voice recognition
    document.getElementById('voice-button').addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        const voiceButton = document.getElementById('voice-button');
        voiceButton.classList.add('listening');

        recognition.onstart = () => {
            voiceButton.classList.add('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            processSpeechInput(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceButton.classList.remove('listening');
        };

        recognition.onend = () => {
            voiceButton.classList.remove('listening');
        };

        recognition.start();
    });

    // Handle add item button
    document.getElementById('add-item-button').addEventListener('click', () => {
        addItemDialog.showModal();
    });

    // Handle add item dialog
    document.getElementById('add-item-submit').addEventListener('click', () => {
        const input = document.getElementById('new-item-input');
        if (input.value.trim()) {
            addItem(input.value.trim());
            input.value = '';
            addItemDialog.close();
        }
    });

    document.getElementById('add-item-cancel').addEventListener('click', () => {
        addItemDialog.close();
    });

    // Handle new list dialog
    document.getElementById('new-list-submit').addEventListener('click', () => {
        const nameInput = document.getElementById('new-list-name');
        const aliasesInput = document.getElementById('new-list-aliases');
        
        if (nameInput.value.trim()) {
            const newListId = nameInput.value.toLowerCase().replace(/\s+/g, '-');
            const aliases = [nameInput.value.toLowerCase(), ...aliasesInput.value.split(',').map(a => a.trim())];
            
            const newList = {
                id: newListId,
                name: nameInput.value.trim(),
                items: [],
                aliases: aliases.filter(Boolean)
            };
            
            lists.push(newList);
            setCurrentList(newListId);
            initializeUI();
            
            nameInput.value = '';
            aliasesInput.value = '';
            newListDialog.close();
        }
    });

    document.getElementById('new-list-cancel').addEventListener('click', () => {
        newListDialog.close();
    });

    // Initialize the UI
    initializeUI();
}); 