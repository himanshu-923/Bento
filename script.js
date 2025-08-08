document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeToggle = document.querySelector('.theme-toggle');
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    const addNoteBtn = document.getElementById('add-note');
    const addTodoBtn = document.getElementById('add-todo');
    const addPasswordBtn = document.getElementById('add-password');
    const unlockPasswordsBtn = document.getElementById('unlock-passwords');
    const masterPinInput = document.getElementById('master-pin');
    const noteEditorModal = document.getElementById('note-editor-modal');
    const todoEditorModal = document.getElementById('todo-editor-modal');
    const passwordEditorModal = document.getElementById('password-editor-modal');
    const pinChangeModal = document.getElementById('pin-change-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const saveNoteBtn = document.getElementById('save-note');
    const cancelNoteBtn = document.getElementById('cancel-note');
    const saveTodoBtn = document.getElementById('save-todo');
    const cancelTodoBtn = document.getElementById('cancel-todo');
    const savePasswordBtn = document.getElementById('save-password');
    const cancelPasswordBtn = document.getElementById('cancel-password');
    const savePinBtn = document.getElementById('save-pin');
    const cancelPinBtn = document.getElementById('cancel-pin');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const exportDataBtn = document.getElementById('export-data');
    const importDataInput = document.getElementById('import-data');
    const changePinBtn = document.getElementById('change-pin');
    const generatePasswordBtn = document.getElementById('generate-password');
    const messageBoxOverlay = document.getElementById('message-box-overlay');
    const messageBoxOk = document.getElementById('message-box-ok');
    const messageBoxText = document.getElementById('message-box-text');

    // Notes-specific elements
    const noteTitleInput = document.getElementById('note-title');
    const noteContentEditor = document.getElementById('note-content');
    const noteToolbar = document.querySelector('.toolbar');
    
    // To-Do-specific elements
    const todoTextInput = document.getElementById('todo-text');
    const todoDueInput = document.getElementById('todo-due');
    const todosContainer = document.getElementById('todos-container');

    // Password-specific elements
    const passwordServiceInput = document.getElementById('password-service');
    const passwordUsernameInput = document.getElementById('password-username');
    const passwordPasswordInput = document.getElementById('password-password');
    const passwordsList = document.getElementById('passwords-list');

    // PIN change elements
    const currentPinInput = document.getElementById('current-pin');
    const newPinInput = document.getElementById('new-pin');
    const confirmPinInput = document.getElementById('confirm-pin');

    // State variables
    let currentNoteId = null;
    let currentTodoId = null;
    let currentPasswordId = null;
    let isPasswordsUnlocked = false;
    // Default PIN for demo, but in a real app, this should be set on first use.
    let masterPin = localStorage.getItem('bento-master-pin'); 
    let passwords = null; // Stored separately and only loaded upon unlock

    // Initialize the app
    initApp();

    function initApp() {
        // Load theme preference
        const savedTheme = localStorage.getItem('bento-theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            darkModeToggle.checked = true;
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }

        // Load data from localStorage
        loadNotes();
        loadTodos();
        
        // Set up event listeners
        setupEventListeners();

        // Check if master PIN is set
        if (!masterPin) {
            // No master PIN, show message to set one.
            const passwordsSection = document.getElementById('passwords-section');
            if (passwordsSection.classList.contains('active')) {
                showMessageBox('Please set a master PIN to use the Password Manager.');
            }
        }
    }

    function setupEventListeners() {
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);
        darkModeToggle.addEventListener('change', toggleTheme);
        
        // Navigation
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const section = button.getAttribute('data-section');
                switchSection(section);
            });
        });
        
        // Notes
        addNoteBtn.addEventListener('click', () => openNoteEditor());
        closeModalBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
        saveNoteBtn.addEventListener('click', saveNote);
        cancelNoteBtn.addEventListener('click', closeAllModals);
        noteToolbar.addEventListener('click', applyTextFormatting);
        
        // To-Dos
        addTodoBtn.addEventListener('click', () => openTodoEditor());
        saveTodoBtn.addEventListener('click', saveTodo);
        cancelTodoBtn.addEventListener('click', closeAllModals);
        
        // Passwords
        addPasswordBtn?.addEventListener('click', () => openPasswordEditor());
        unlockPasswordsBtn.addEventListener('click', unlockPasswords);
        masterPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') unlockPasswords();
        });
        savePasswordBtn.addEventListener('click', savePassword);
        cancelPasswordBtn.addEventListener('click', closeAllModals);
        generatePasswordBtn.addEventListener('click', generatePassword);
        
        // PIN Change
        changePinBtn.addEventListener('click', () => pinChangeModal.style.display = 'block');
        savePinBtn.addEventListener('click', changePin);
        cancelPinBtn.addEventListener('click', closeAllModals);
        
        // Data Import/Export
        exportDataBtn.addEventListener('click', exportData);
        importDataInput.addEventListener('change', importData);
        
        // Message Box
        messageBoxOk.addEventListener('click', hideMessageBox);
    }

    // Utility Functions
    function showMessageBox(message) {
        messageBoxText.textContent = message;
        messageBoxOverlay.classList.add('active');
    }

    function hideMessageBox() {
        messageBoxOverlay.classList.remove('active');
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    function generateId() {
        return Date.now().toString();
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function generatePassword() {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        passwordPasswordInput.value = password;
    }

    // Encryption/Decryption using a simple key from the master PIN
    function encrypt(text) {
      if (!masterPin) return text; // Failsafe
      const key = CryptoJS.enc.Utf8.parse(masterPin.slice(0, 16));
      const iv = CryptoJS.enc.Utf8.parse(masterPin.slice(16, 32));
      const encrypted = CryptoJS.AES.encrypt(text, key, { iv: iv });
      return encrypted.toString();
    }
  
    function decrypt(ciphertext) {
      if (!masterPin) return "Error";
      try {
        const key = CryptoJS.enc.Utf8.parse(masterPin.slice(0, 16));
        const iv = CryptoJS.enc.Utf8.parse(masterPin.slice(16, 32));
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv });
        return decrypted.toString(CryptoJS.enc.Utf8);
      } catch (e) {
        return "Error: Could not decrypt.";
      }
    }

    // Theme Functions
    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            html.removeAttribute('data-theme');
            localStorage.setItem('bento-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('bento-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // Navigation Functions
    function switchSection(section) {
        // Update active nav button
        navButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-section') === section) {
                button.classList.add('active');
            }
        });
        
        // Show the selected section
        contentSections.forEach(sectionEl => {
            sectionEl.classList.remove('active');
            if (sectionEl.id === `${section}-section`) {
                sectionEl.classList.add('active');
            }
        });
        
        // Special handling for passwords section
        if (section === 'passwords') {
            if (!isPasswordsUnlocked) {
                document.querySelector('.password-auth').style.display = 'block';
                document.getElementById('passwords-container').style.display = 'none';
            } else {
                document.querySelector('.password-auth').style.display = 'none';
                document.getElementById('passwords-container').style.display = 'block';
                loadPasswords();
            }
        }
    }

    // Notes Functions
    function loadNotes() {
        const notesContainer = document.getElementById('notes-container');
        notesContainer.innerHTML = '';
        
        const notes = JSON.parse(localStorage.getItem('bento-notes')) || [];
        
        if (notes.length === 0) {
            notesContainer.innerHTML = '<p class="empty-message">No notes yet. Click "Add Note" to create one.</p>';
            return;
        }
        
        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.setAttribute('data-id', note.id);
            
            noteCard.innerHTML = `
                <h3>${note.title || 'Untitled Note'}</h3>
                <div class="note-content">${note.content || ''}</div>
                <div class="note-actions">
                    <button class="edit-note" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-note" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            notesContainer.appendChild(noteCard);
            
            // Add event listeners to the new note card
            noteCard.querySelector('.edit-note').addEventListener('click', () => editNote(note.id));
            noteCard.querySelector('.delete-note').addEventListener('click', () => deleteNote(note.id));
            noteCard.addEventListener('click', (e) => {
                if (!e.target.closest('.note-actions')) {
                    editNote(note.id);
                }
            });
        });
    }

    function openNoteEditor(noteId = null) {
        currentNoteId = noteId;
        const noteEditor = document.getElementById('note-editor-modal');
        
        if (noteId) {
            // Editing existing note
            const notes = JSON.parse(localStorage.getItem('bento-notes')) || [];
            const note = notes.find(n => n.id === noteId);
            
            if (note) {
                noteTitleInput.value = note.title || '';
                noteContentEditor.innerHTML = note.content || '';
            }
        } else {
            // Creating new note
            noteTitleInput.value = '';
            noteContentEditor.innerHTML = '';
        }
        
        noteEditor.style.display = 'block';
        noteTitleInput.focus();
    }

    function editNote(noteId) {
        openNoteEditor(noteId);
    }

    function saveNote() {
        const title = noteTitleInput.value;
        const content = noteContentEditor.innerHTML;
        
        if (!content.trim()) {
            showMessageBox('Note content cannot be empty!');
            return;
        }
        
        let notes = JSON.parse(localStorage.getItem('bento-notes')) || [];
        
        if (currentNoteId) {
            // Update existing note
            notes = notes.map(note => {
                if (note.id === currentNoteId) {
                    return { 
                        ...note, 
                        title, 
                        content,
                        updatedAt: new Date().toISOString()
                    };
                }
                return note;
            });
        } else {
            // Create new note
            const newNote = {
                id: generateId(),
                title,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notes.push(newNote);
        }
        
        localStorage.setItem('bento-notes', JSON.stringify(notes));
        loadNotes();
        closeAllModals();
    }

    function deleteNote(noteId) {
        showMessageBox('Are you sure you want to delete this note?');
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = hideMessageBox;
        messageBoxOverlay.querySelector('.message-box-content').appendChild(cancelButton);
        
        messageBoxOk.textContent = 'Delete';
        messageBoxOk.onclick = function() {
            let notes = JSON.parse(localStorage.getItem('bento-notes')) || [];
            notes = notes.filter(note => note.id !== noteId);
            localStorage.setItem('bento-notes', JSON.stringify(notes));
            loadNotes();
            hideMessageBox();
            // Clean up the added button
            messageBoxOverlay.querySelector('.message-box-content').removeChild(cancelButton);
            // Reset the OK button
            messageBoxOk.textContent = 'OK';
            messageBoxOk.onclick = hideMessageBox;
        };
    }

    // Text formatting for notes
    function applyTextFormatting(event) {
        const command = event.target.closest('.tool-btn')?.dataset.command;
        if (command) {
            document.execCommand(command, false, null);
            noteContentEditor.focus();
        }
    }

    // To-Do Functions
    function loadTodos() {
        todosContainer.innerHTML = '';
        const todos = JSON.parse(localStorage.getItem('bento-todos')) || [];

        if (todos.length === 0) {
            todosContainer.innerHTML = '<p class="empty-message">No tasks yet. Click "Add Task" to create one.</p>';
            return;
        }
        
        todos.forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            todoItem.setAttribute('data-id', todo.id);

            todoItem.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${todo.text}</span>
                <span class="todo-due">${formatDate(todo.dueDate)}</span>
                <div class="todo-actions">
                    <button class="edit-todo"><i class="fas fa-edit"></i></button>
                    <button class="delete-todo"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            todosContainer.appendChild(todoItem);

            todoItem.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTodoCompletion(todo.id));
            todoItem.querySelector('.edit-todo').addEventListener('click', () => openTodoEditor(todo.id));
            todoItem.querySelector('.delete-todo').addEventListener('click', () => deleteTodo(todo.id));
        });
    }

    function openTodoEditor(todoId = null) {
        currentTodoId = todoId;
        if (todoId) {
            const todos = JSON.parse(localStorage.getItem('bento-todos')) || [];
            const todo = todos.find(t => t.id === todoId);
            if (todo) {
                todoTextInput.value = todo.text;
                todoDueInput.value = todo.dueDate;
            }
        } else {
            todoTextInput.value = '';
            todoDueInput.value = '';
        }
        todoEditorModal.style.display = 'block';
    }

    function saveTodo() {
        const text = todoTextInput.value;
        const dueDate = todoDueInput.value;

        if (!text) {
            showMessageBox('Task description cannot be empty.');
            return;
        }

        let todos = JSON.parse(localStorage.getItem('bento-todos')) || [];
        
        if (currentTodoId) {
            todos = todos.map(todo => {
                if (todo.id === currentTodoId) {
                    return { ...todo, text, dueDate, updatedAt: new Date().toISOString() };
                }
                return todo;
            });
        } else {
            const newTodo = {
                id: generateId(),
                text,
                dueDate,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            todos.push(newTodo);
        }
        
        localStorage.setItem('bento-todos', JSON.stringify(todos));
        loadTodos();
        closeAllModals();
    }

    function toggleTodoCompletion(todoId) {
        let todos = JSON.parse(localStorage.getItem('bento-todos')) || [];
        todos = todos.map(todo => {
            if (todo.id === todoId) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });
        localStorage.setItem('bento-todos', JSON.stringify(todos));
        loadTodos();
    }

    function deleteTodo(todoId) {
        let todos = JSON.parse(localStorage.getItem('bento-todos')) || [];
        todos = todos.filter(todo => todo.id !== todoId);
        localStorage.setItem('bento-todos', JSON.stringify(todos));
        loadTodos();
    }

    // Password Functions
    function unlockPasswords() {
        const pin = masterPinInput.value;
        if (!masterPin) {
            if (pin.length < 4) {
                showMessageBox('PIN must be at least 4 digits long.');
                return;
            }
            masterPin = CryptoJS.SHA256(pin).toString();
            localStorage.setItem('bento-master-pin', masterPin);
            // Initialize passwords as an empty array
            localStorage.setItem('bento-passwords', JSON.stringify([])); 
            passwords = [];
            isPasswordsUnlocked = true;
            document.querySelector('.password-auth').style.display = 'none';
            document.getElementById('passwords-container').style.display = 'block';
            loadPasswords();
            showMessageBox('New PIN set successfully!');
        } else {
            if (CryptoJS.SHA256(pin).toString() === masterPin) {
                isPasswordsUnlocked = true;
                document.querySelector('.password-auth').style.display = 'none';
                document.getElementById('passwords-container').style.display = 'block';
                loadPasswords();
            } else {
                showMessageBox('Incorrect PIN.');
            }
        }
        masterPinInput.value = '';
    }

    function loadPasswords() {
        passwords = JSON.parse(localStorage.getItem('bento-passwords')) || [];
        passwordsList.innerHTML = '';
        if (passwords.length === 0) {
            passwordsList.innerHTML = '<p class="empty-message">No passwords saved. Click "Add Password" to create one.</p>';
            return;
        }

        passwords.forEach(pw => {
            const decryptedPassword = decrypt(pw.password);
            const entry = document.createElement('div');
            entry.className = 'password-entry';
            entry.innerHTML = `
                <h3>${pw.service}</h3>
                <div class="password-row">
                    <span class="password-label">Username:</span>
                    <span class="password-value">${pw.username}</span>
                </div>
                <div class="password-row">
                    <span class="password-label">Password:</span>
                    <span class="password-value concealed">••••••••</span>
                    <button class="show-password-btn"><i class="fas fa-eye"></i></button>
                </div>
                <div class="password-actions">
                    <button class="copy-btn"><i class="fas fa-copy"></i> Copy</button>
                    <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
            passwordsList.appendChild(entry);

            const showBtn = entry.querySelector('.show-password-btn');
            const passwordValueSpan = entry.querySelector('.password-value.concealed');
            showBtn.addEventListener('click', () => {
                if (passwordValueSpan.textContent === '••••••••') {
                    passwordValueSpan.textContent = decryptedPassword;
                    showBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    passwordValueSpan.textContent = '••••••••';
                    showBtn.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });

            entry.querySelector('.copy-btn').addEventListener('click', () => {
                navigator.clipboard.writeText(decryptedPassword);
                showMessageBox('Password copied to clipboard!');
            });
            entry.querySelector('.edit-btn').addEventListener('click', () => openPasswordEditor(pw.id));
            entry.querySelector('.delete-btn').addEventListener('click', () => deletePassword(pw.id));
        });
    }

    function openPasswordEditor(pwId = null) {
        if (!isPasswordsUnlocked) return;
        currentPasswordId = pwId;
        if (pwId) {
            const password = passwords.find(p => p.id === pwId);
            if (password) {
                passwordServiceInput.value = password.service;
                passwordUsernameInput.value = password.username;
                passwordPasswordInput.value = ''; // Do not pre-fill password for security
            }
        } else {
            passwordServiceInput.value = '';
            passwordUsernameInput.value = '';
            passwordPasswordInput.value = '';
        }
        passwordEditorModal.style.display = 'block';
    }

    function savePassword() {
        const service = passwordServiceInput.value;
        const username = passwordUsernameInput.value;
        const plainTextPassword = passwordPasswordInput.value;

        if (!service || !username || !plainTextPassword) {
            showMessageBox('All password fields are required.');
            return;
        }

        const encryptedPassword = encrypt(plainTextPassword);
        
        if (currentPasswordId) {
            passwords = passwords.map(pw => {
                if (pw.id === currentPasswordId) {
                    return { ...pw, service, username, password: encryptedPassword };
                }
                return pw;
            });
        } else {
            const newPassword = {
                id: generateId(),
                service,
                username,
                password: encryptedPassword,
            };
            passwords.push(newPassword);
        }
        localStorage.setItem('bento-passwords', JSON.stringify(passwords));
        loadPasswords();
        closeAllModals();
    }

    function deletePassword(pwId) {
        if (!isPasswordsUnlocked) return;
        passwords = passwords.filter(pw => pw.id !== pwId);
        localStorage.setItem('bento-passwords', JSON.stringify(passwords));
        loadPasswords();
    }

    // PIN Change Functions
    function changePin() {
        const currentPin = currentPinInput.value;
        const newPin = newPinInput.value;
        const confirmPin = confirmPinInput.value;

        if (CryptoJS.SHA256(currentPin).toString() !== masterPin) {
            showMessageBox('Incorrect current PIN.');
            return;
        }
        if (newPin.length < 4) {
            showMessageBox('New PIN must be at least 4 digits long.');
            return;
        }
        if (newPin !== confirmPin) {
            showMessageBox('New PINs do not match.');
            return;
        }

        masterPin = CryptoJS.SHA256(newPin).toString();
        localStorage.setItem('bento-master-pin', masterPin);
        closeAllModals();
        showMessageBox('PIN changed successfully!');
    }

    // Data Management Functions
    function exportData() {
        const data = {
            notes: JSON.parse(localStorage.getItem('bento-notes')) || [],
            todos: JSON.parse(localStorage.getItem('bento-todos')) || [],
            passwords: passwords || [], // Export passwords only if unlocked
            masterPin: masterPin // Export the hashed PIN
        };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bento_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.notes && importedData.todos && importedData.passwords !== undefined && importedData.masterPin) {
                    localStorage.setItem('bento-notes', JSON.stringify(importedData.notes));
                    localStorage.setItem('bento-todos', JSON.stringify(importedData.todos));
                    localStorage.setItem('bento-passwords', JSON.stringify(importedData.passwords));
                    localStorage.setItem('bento-master-pin', importedData.masterPin);
                    
                    masterPin = importedData.masterPin; // Update local state
                    if (isPasswordsUnlocked) {
                      passwords = importedData.passwords;
                      loadPasswords();
                    }

                    loadNotes();
                    loadTodos();
                    showMessageBox('Data imported successfully!');
                } else {
                    showMessageBox('Invalid file format. Please import a valid Bento JSON file.');
                }
            } catch (error) {
                showMessageBox('Error reading file. Please ensure it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }
});