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
            const tabContainer = document.createElement('div');
            tabContainer.className = 'list-tab-container';
            tabContainer.style.display = 'inline-flex';
            tabContainer.style.alignItems = 'center';

            const tab = document.createElement('a');
            tab.className = `mdl-layout__tab ${list.id === currentListId ? 'is-active' : ''}`;
            tab.href = `#${list.id}`;
            tab.textContent = list.name;
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                setCurrentList(list.id);
            });

            // Don't show delete button for default lists
            if (!['groceries', 'todo', 'ideas'].includes(list.id)) {
                const deleteButton = document.createElement('button');
                deleteButton.className = 'mdl-button mdl-js-button mdl-button--icon list-delete-button';
                deleteButton.innerHTML = '<i class="material-icons">close</i>';
                deleteButton.style.marginLeft = '4px';
                deleteButton.style.minWidth = '24px';
                deleteButton.style.width = '24px';
                deleteButton.style.height = '24px';
                deleteButton.style.padding = '0';
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete the "${list.name}" list?`)) {
                        deleteList(list.id);
                    }
                });
                tabContainer.appendChild(deleteButton);
            }

            tabContainer.insertBefore(tab, tabContainer.firstChild);
            tabBar.appendChild(tabContainer);
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
        if (!alias) return null;
        
        // Try to find an exact match first
        const exactMatch = lists.find(list => 
            list.name.toLowerCase() === alias.toLowerCase() ||
            list.id.toLowerCase() === alias.toLowerCase() ||
            list.aliases.some(a => a.toLowerCase() === alias.toLowerCase())
        );
        
        if (exactMatch) return exactMatch;
        
        // If no exact match, try to find a partial match
        return lists.find(list => 
            list.name.toLowerCase().includes(alias.toLowerCase()) ||
            list.id.toLowerCase().includes(alias.toLowerCase()) ||
            list.aliases.some(a => a.toLowerCase().includes(alias.toLowerCase()))
        );
    }

    // Process speech input
    function processSpeechInput(transcript) {
        console.log('Processing speech input:', transcript);

        // Normalize the transcript
        const normalizedTranscript = transcript.toLowerCase().trim();
        console.log('Normalized transcript:', normalizedTranscript);

        // Show feedback of what was heard
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'mdl-js-snackbar mdl-snackbar';
        feedbackElement.innerHTML = `
            <div class="mdl-snackbar__text"></div>
            <button class="mdl-snackbar__action" type="button"></button>
        `;
        document.body.appendChild(feedbackElement);
        componentHandler.upgradeElement(feedbackElement);

        // Function to show feedback
        function showFeedback(message) {
            const data = {
                message: message,
                timeout: 2000
            };
            feedbackElement.MaterialSnackbar.showSnackbar(data);
        }

        // Check for list creation intent
        if (normalizedTranscript.startsWith('create') || 
            normalizedTranscript.startsWith('make') || 
            normalizedTranscript.startsWith('new list')) {
            
            const listName = normalizedTranscript
                .replace(/^(?:create|make|new list)\s+(?:a\s+)?(?:new\s+)?(?:list\s+)?(?:for\s+)?/i, '')
                .trim();
            
            if (listName) {
                console.log('Creating new list:', listName);
                const newListId = listName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const newList = {
                    id: newListId,
                    name: listName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                    items: [],
                    aliases: [listName.toLowerCase()]
                };
                
                lists.push(newList);
                saveLists();
                setCurrentList(newListId);
                initializeUI();
                showFeedback(`Created new list: ${newList.name}`);
                return;
            }
        }

        // Check for add item intent
        const addMatch = normalizedTranscript.match(/^(?:add|put|include)\s+(.+?)(?:\s+(?:to|in|on)\s+(.+))$/i) ||
                        normalizedTranscript.match(/^(.+?)(?:\s+(?:to|in|on)\s+(.+))$/i);

        if (addMatch) {
            const itemText = addMatch[1].trim();
            const listAlias = addMatch[2]?.toLowerCase().trim();
            
            console.log('Item text:', itemText);
            console.log('List alias:', listAlias);
            
            if (itemText) {
                let targetList = null;
                
                if (listAlias) {
                    // Try to find existing list
                    targetList = findListByAlias(listAlias);
                    
                    // If no existing list found, create a new one
                    if (!targetList) {
                        console.log('Creating new list for:', listAlias);
                        const newListId = listAlias.replace(/[^a-z0-9]+/g, '-');
                        targetList = {
                            id: newListId,
                            name: listAlias.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                            items: [],
                            aliases: [listAlias]
                        };
                        lists.push(targetList);
                        saveLists();
                    }
                } else {
                    // If no list specified, use current list
                    targetList = lists.find(l => l.id === currentListId);
                }

                if (targetList) {
                    addItem(itemText, targetList.id);
                    showFeedback(`Added "${itemText}" to ${targetList.name}`);
                    return;
                }
            }
        }

        // If no patterns matched, show error feedback
        showFeedback("Sorry, I didn't understand that. Try saying 'add [item]' or 'create new list [name]'");
    }

    // Handle voice recognition
    document.getElementById('voice-button').addEventListener('click', async () => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';  // Set language explicitly

        const voiceButton = document.getElementById('voice-button');
        const statusDiv = document.createElement('div');
        statusDiv.id = 'voice-status';
        statusDiv.style.position = 'fixed';
        statusDiv.style.bottom = '20px';
        statusDiv.style.left = '50%';
        statusDiv.style.transform = 'translateX(-50%)';
        statusDiv.style.padding = '10px 20px';
        statusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statusDiv.style.color = 'white';
        statusDiv.style.borderRadius = '20px';
        statusDiv.style.display = 'none';
        statusDiv.style.zIndex = '1000';
        document.body.appendChild(statusDiv);

        // Debug logging
        console.log('Starting voice recognition...');

        recognition.onstart = () => {
            console.log('Voice recognition started');
            voiceButton.classList.add('listening');
            statusDiv.style.display = 'block';
            statusDiv.textContent = 'Listening...';
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            statusDiv.textContent = `Heard: ${transcript}`;
            
            if (event.results[0].isFinal) {
                console.log('Final transcript:', transcript);
                await processSpeechInput(transcript);
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 2000);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceButton.classList.remove('listening');
            statusDiv.textContent = `Error: ${event.error}`;
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 2000);
        };

        recognition.onend = () => {
            console.log('Voice recognition ended');
            voiceButton.classList.remove('listening');
            if (statusDiv.textContent === 'Listening...') {
                statusDiv.style.display = 'none';
            }
        };

        try {
            recognition.start();
            console.log('Recognition started successfully');
        } catch (error) {
            console.error('Error starting recognition:', error);
            statusDiv.textContent = 'Error starting voice recognition';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 2000);
        }
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

    // Delete list
    function deleteList(listId) {
        // Don't allow deletion of default lists
        if (['groceries', 'todo', 'ideas'].includes(listId)) {
            alert('Cannot delete default lists');
            return;
        }

        // Remove the list
        lists = lists.filter(list => list.id !== listId);
        
        // If the deleted list was current, switch to groceries
        if (currentListId === listId) {
            currentListId = 'groceries';
        }
        
        // Save and update UI
        saveLists();
        initializeUI();
    }

    // Initialize the UI
    initializeUI();
}); 