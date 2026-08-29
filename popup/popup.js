// =====================
// NOTEPAD - EXTENSÃO
// =====================

const CONFIG_KEY = 'domainSettings';
const NOTES_PREFIX = 'notes_';
const DEBOUNCE_MS = 3000;

const appState = {
    currentDomain: null,
    currentUrl: null,
    currentSettings: null,
    currentNotes: {},
    currentEditId: null,
    saveTimeout: null,
    pendingDeleteId: null
};

const DOM = {
    viewList: null,
    viewEditor: null,
    viewConfig: null,
    notesList: null,
    btnNew: null,
    btnConfig: null,
    btnExport: null,
    noteTitle: null,
    noteContent: null,
    saveStatus: null,
    editorTitle: null,
    btnBack: null,
    patternRadios: null,
    regexInput: null,
    segmentIndex: null,
    regexContainer: null,
    segmentContainer: null,
    btnSaveConfig: null,
    btnBackFromConfig: null,
    modalExport: null,
    modalConfirm: null,
    btnCloseModal: null,
    btnCloseConfirm: null,
    btnCancelExport: null,
    btnConfirmExport: null,
    btnCancelDelete: null,
    btnConfirmDelete: null,
    exportAll: null,
    exportCurrent: null,
    exportSelection: null,
    selectionItems: null,
    urlPreview: null
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    cacheDOM();
    attachEventListeners();
    await loadActiveTab();
    await checkDomainConfiguration();
}

function cacheDOM() {
    DOM.viewList = document.getElementById('view-list');
    DOM.viewEditor = document.getElementById('view-editor');
    DOM.viewConfig = document.getElementById('view-config');
    DOM.notesList = document.getElementById('notes-list');
    DOM.btnNew = document.getElementById('btn-new');
    DOM.btnConfig = document.getElementById('btn-config');
    DOM.btnExport = document.getElementById('btn-export');
    DOM.noteTitle = document.getElementById('note-title');
    DOM.noteContent = document.getElementById('note-content');
    DOM.saveStatus = document.getElementById('save-status');
    DOM.editorTitle = document.getElementById('editor-title');
    DOM.btnBack = document.getElementById('btn-back');
    DOM.patternRadios = document.querySelectorAll('input[name="pattern"]');
    DOM.regexInput = document.getElementById('regex-pattern');
    DOM.segmentIndex = document.getElementById('segment-index');
    DOM.regexContainer = document.getElementById('regex-input');
    DOM.segmentContainer = document.getElementById('path-segment-input');
    DOM.btnSaveConfig = document.getElementById('btn-save-config');
    DOM.btnBackFromConfig = document.getElementById('btn-back-from-config');
    DOM.modalExport = document.getElementById('modal-export');
    DOM.modalConfirm = document.getElementById('modal-confirm');
    DOM.btnCloseModal = document.getElementById('btn-close-modal');
    DOM.btnCloseConfirm = document.getElementById('btn-close-confirm');
    DOM.btnCancelExport = document.getElementById('btn-cancel-export');
    DOM.btnConfirmExport = document.getElementById('btn-confirm-export');
    DOM.btnCancelDelete = document.getElementById('btn-cancel-delete');
    DOM.btnConfirmDelete = document.getElementById('btn-confirm-delete');
    DOM.exportAll = document.getElementById('export-all');
    DOM.exportCurrent = document.getElementById('export-current');
    DOM.exportSelection = document.getElementById('export-selection');
    DOM.selectionItems = document.getElementById('selection-items');
    DOM.urlPreview = document.getElementById('url-preview');
}

function attachEventListeners() {
    // View navigation
    DOM.btnNew.addEventListener('click', () => {
        if (saveCurrentNote(true)) {
            showView('editor', null);
        }
    });
    DOM.btnConfig.addEventListener('click', () => showView('config', null));
    DOM.btnBack.addEventListener('click', () => {
        saveCurrentNote(true);
        showView('list', null);
    });
    DOM.btnBackFromConfig.addEventListener('click', () => showView('list', null));

    // Pattern type toggle
    DOM.patternRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            togglePatternInputs(radio.value);
        });
    });

    // Editor save events
    DOM.noteContent.addEventListener('input', debouncedSave);
    DOM.noteContent.addEventListener('blur', () => saveCurrentNote(true));
    DOM.noteTitle.addEventListener('input', debouncedSave);
    DOM.noteTitle.addEventListener('blur', () => saveCurrentNote(true));

    // Save config
    DOM.btnSaveConfig.addEventListener('click', saveConfig);

    // Export modal
    DOM.btnExport.addEventListener('click', openExportModal);
    DOM.btnCloseModal.addEventListener('click', closeExportModal);
    DOM.btnCancelExport.addEventListener('click', closeExportModal);
    DOM.btnConfirmExport.addEventListener('click', handleExport);
    DOM.exportAll.addEventListener('change', updateExportOptions);
    DOM.exportCurrent.addEventListener('change', updateExportOptions);
    DOM.exportSelection.addEventListener('change', updateExportOptions);

    // Delete confirm
    DOM.btnCloseConfirm.addEventListener('click', closeConfirmModal);
    DOM.btnCancelDelete.addEventListener('click', closeConfirmModal);
    DOM.btnConfirmDelete.addEventListener('click', confirmDelete);
}

async function loadActiveTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
            const url = new URL(tabs[0].url);
            appState.currentUrl = tabs[0].url;
            appState.currentDomain = url.hostname;
        } else {
            appState.currentDomain = null;
            appState.currentUrl = null;
        }
    } catch (e) {
        console.error('Error loading active tab:', e);
        appState.currentDomain = null;
    }
}

async function checkDomainConfiguration() {
    if (!appState.currentDomain) {
        DOM.notesList.innerHTML = `
            <div class="empty-state">
                <p>Não foi possível identificar a aba ativa.</p>
                <p>Abra uma página web para usar a extensão.</p>
            </div>
        `;
        DOM.btnNew.disabled = true;
        showView('list');
        return;
    }

    const storage = await chrome.storage.local.get([CONFIG_KEY]);
    const domainSettings = storage[CONFIG_KEY] || {};

    if (domainSettings[appState.currentDomain]) {
        appState.currentSettings = domainSettings[appState.currentDomain];
        await loadNotes();
        showView('list');
    } else {
        showConfigView();
    }
}

function showConfigView() {
    if (DOM.urlPreview) {
        DOM.urlPreview.textContent = appState.currentUrl || appState.currentDomain;
    }
    togglePatternInputs('path-segment');
    showView('config');
}

function togglePatternInputs(pattern) {
    DOM.patternRadios.forEach(r => {
        r.parentElement.classList.remove('selected');
    });
    const checked = document.querySelector(`input[name="pattern"]:checked`);
    if (checked) {
        checked.parentElement.classList.add('selected');
    }

    if (pattern === 'regex') {
        DOM.regexContainer.classList.remove('hidden');
        DOM.segmentContainer.classList.add('hidden');
    } else if (pattern === 'path-segment') {
        DOM.segmentContainer.classList.remove('hidden');
        DOM.regexContainer.classList.add('hidden');
    } else {
        DOM.regexContainer.classList.add('hidden');
        DOM.segmentContainer.classList.add('hidden');
    }
}

async function saveConfig() {
    const checked = document.querySelector('input[name="pattern"]:checked');
    if (!checked) {
        alert('Selecione um padrão de URL');
        return;
    }

    const pattern = checked.value;
    const settings = {
        pattern,
        createdAt: Date.now()
    };

    if (pattern === 'path-segment') {
        const idx = parseInt(DOM.segmentIndex.value);
        if (!idx || idx < 1) {
            alert('Informe um índice válido (>= 1)');
            return;
        }
        settings.segmentIndex = idx;
    } else if (pattern === 'regex') {
        const re = DOM.regexInput.value.trim();
        if (!re) {
            alert('Informe a expressão regular');
            return;
        }
        try {
            new RegExp(re);
        } catch (e) {
            alert('Expressão regular inválida');
            return;
        }
        settings.regex = re;
    }

    const storage = await chrome.storage.local.get([CONFIG_KEY]);
    const domainSettings = storage[CONFIG_KEY] || {};
    domainSettings[appState.currentDomain] = settings;
    await chrome.storage.local.set({ [CONFIG_KEY]: domainSettings });

    appState.currentSettings = settings;
    await loadNotes();
    showView('list');
}

function getStorageKey() {
    if (!appState.currentUrl || !appState.currentSettings) return 'default';

    const url = appState.currentUrl;
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    switch (appState.currentSettings.pattern) {
        case 'path-segment': {
            const idx = parseInt(appState.currentSettings.segmentIndex) || 1;
            return `seg_${idx}_${pathSegments[idx - 1] || 'default'}`;
        }
        case 'regex': {
            try {
                const re = new RegExp(appState.currentSettings.regex);
                const match = url.match(re);
                return match ? `regex_${match[1] || 'default'}` : 'default';
            } catch (e) {
                return 'default';
            }
        }
        case 'full-url': {
            return `url_${urlObj.href.replace(/[^a-z0-9]/gi, '_')}`;
        }
        case 'domain-only':
        default:
            return `domain_${urlObj.hostname}`;
    }
}

async function loadNotes() {
    const storageKey = getStorageKey();
    const notesKey = `${NOTES_PREFIX}${storageKey}`;
    const storage = await chrome.storage.local.get([notesKey]);
    appState.currentNotes = storage[notesKey] || {};
    appState.currentNotesKey = notesKey;
}

function saveCurrentNote(immediate = false) {
    if (appState.view !== 'editor') return true;
    if (!DOM.noteTitle || !DOM.noteContent) return true;

    const title = DOM.noteTitle.value.trim();
    const content = DOM.noteContent.value;

    if (!title && !content) {
        return true;
    }

    const id = appState.currentEditId;
    const now = Date.now();
    const note = {
        id: id || `note_${now}_${Math.random().toString(36).substr(2, 5)}`,
        title: title || 'Sem título',
        content,
        createdAt: appState.currentNotes[id]?.createdAt || now,
        updatedAt: now
    };

    appState.currentNotes[note.id] = note;
    appState.currentEditId = note.id;

    persistNotes(immediate);
    return true;
}

function persistNotes(immediate = false) {
    if (immediate) {
        clearTimeout(appState.saveTimeout);
        appState.saveTimeout = null;
    }

    if (!appState.currentNotesKey) return;

    updateSaveStatus('saving');
    chrome.storage.local.set({ [appState.currentNotesKey]: appState.currentNotes }, () => {
        updateSaveStatus('saved');
        setTimeout(() => {
            if (DOM.saveStatus && DOM.saveStatus.textContent === 'Salvo') {
                updateSaveStatus('ready');
            }
        }, 2000);
    });
}

function debouncedSave() {
    clearTimeout(appState.saveTimeout);
    updateSaveStatus('saving');
    appState.saveTimeout = setTimeout(() => {
        saveCurrentNote(true);
    }, DEBOUNCE_MS);
}

function requestDelete(id) {
    appState.pendingDeleteId = id;
    const note = appState.currentNotes[id];
    const title = note ? note.title : 'esta anotação';
    const p = DOM.modalConfirm.querySelector('p');
    if (p) p.textContent = `Tem certeza que deseja excluir "${title}"?`;
    DOM.modalConfirm.classList.remove('hidden');
}

function confirmDelete() {
    const id = appState.pendingDeleteId;
    if (!id) return;

    if (appState.currentEditId === id) {
        appState.currentEditId = null;
        DOM.noteTitle.value = '';
        DOM.noteContent.value = '';
    }

    delete appState.currentNotes[id];
    persistNotes(true);
    renderNotesList();
    closeConfirmModal();
    appState.pendingDeleteId = null;
}

function openNote(id) {
    saveCurrentNote(true);
    const note = appState.currentNotes[id];
    if (!note) return;

    appState.currentEditId = id;
    DOM.noteTitle.value = note.title || '';
    DOM.noteContent.value = note.content || '';
    updateSaveStatus('ready');
    showView('editor', id);
}

function renderNotesList() {
    if (!DOM.notesList) return;

    const notes = appState.currentNotes;
    const entries = Object.values(notes);

    if (entries.length === 0) {
        DOM.notesList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma anotação ainda.</p>
                <p>Clique em "+ Nova Anotação" para começar.</p>
            </div>
        `;
        return;
    }

    const sorted = entries.sort((a, b) => b.updatedAt - a.updatedAt);

    DOM.notesList.innerHTML = sorted.map(note => `
        <div class="note-card" data-id="${escapeHtml(note.id)}">
            <div class="note-card-content">
                <div class="note-card-title">${escapeHtml(note.title || 'Sem título')}</div>
                <div class="note-card-date">${formatDate(note.updatedAt)}</div>
            </div>
            <button class="note-card-delete" data-action="delete" data-id="${escapeHtml(note.id)}" title="Excluir">×</button>
        </div>
    `).join('');

    DOM.notesList.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'delete') return;
            const id = card.dataset.id;
            openNote(id);
        });
    });

    DOM.notesList.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            requestDelete(btn.dataset.id);
        });
    });
}

function showView(view) {
    DOM.viewList.classList.add('hidden');
    DOM.viewEditor.classList.add('hidden');
    DOM.viewConfig.classList.add('hidden');
    DOM.modalExport.classList.add('hidden');
    DOM.modalConfirm.classList.add('hidden');

    appState.view = view;

    if (view === 'list') {
        DOM.viewList.classList.remove('hidden');
        renderNotesList();
    } else if (view === 'editor') {
        DOM.viewEditor.classList.remove('hidden');
        DOM.editorTitle.textContent = appState.currentEditId ? 'Editar Anotação' : 'Nova Anotação';
    } else if (view === 'config') {
        DOM.viewConfig.classList.remove('hidden');
    }
}

function updateSaveStatus(status) {
    if (!DOM.saveStatus) return;
    DOM.saveStatus.className = 'save-status';
    if (status === 'saving') {
        DOM.saveStatus.classList.add('saving');
        DOM.saveStatus.textContent = 'Salvando...';
    } else if (status === 'saved') {
        DOM.saveStatus.classList.add('saved');
        DOM.saveStatus.textContent = 'Salvo';
    } else {
        DOM.saveStatus.textContent = 'Pronto';
    }
}

function openExportModal() {
    DOM.modalExport.classList.remove('hidden');
    DOM.exportAll.checked = true;
    DOM.exportCurrent.checked = false;
    DOM.exportSelection.checked = false;
    updateExportOptions();
}

function closeExportModal() {
    DOM.modalExport.classList.add('hidden');
}

function closeConfirmModal() {
    DOM.modalConfirm.classList.add('hidden');
    appState.pendingDeleteId = null;
}

function updateExportOptions() {
    DOM.exportCurrent.disabled = DOM.exportAll.checked;
    DOM.exportSelection.disabled = DOM.exportAll.checked || DOM.exportCurrent.checked;

    const showSelection = !DOM.exportAll.checked && !DOM.exportCurrent.checked && DOM.exportSelection.checked;
    const listEl = document.getElementById('selection-list');
    if (listEl) listEl.classList.toggle('hidden', !showSelection);

    if (showSelection) {
        renderExportSelection();
    }
}

function renderExportSelection() {
    const notes = Object.values(appState.currentNotes);
    if (notes.length === 0) {
        DOM.selectionItems.innerHTML = '<div style="color:#888;padding:8px">Nenhuma anotação</div>';
        DOM.btnConfirmExport.disabled = true;
        return;
    }

    DOM.selectionItems.innerHTML = notes.map(note => `
        <div class="selection-item">
            <input type="checkbox" class="selection-checkbox" data-id="${escapeHtml(note.id)}">
            <span>${escapeHtml(note.title || 'Sem título')}</span>
        </div>
    `).join('');

    DOM.selectionItems.querySelectorAll('.selection-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            DOM.btnConfirmExport.disabled = document.querySelectorAll('.selection-checkbox:checked').length === 0;
        });
    });

    DOM.btnConfirmExport.disabled = true;
}

async function handleExport() {
    let data = {};

    if (DOM.exportAll.checked) {
        const all = await chrome.storage.local.get(null);
        data = {
            type: 'all',
            domainSettings: all[CONFIG_KEY] || {},
            notes: {}
        };
        Object.keys(all).forEach(k => {
            if (k.startsWith(NOTES_PREFIX)) {
                data.notes[k] = all[k];
            }
        });
    } else if (DOM.exportCurrent.checked) {
        data = {
            type: 'current-domain',
            domain: appState.currentDomain,
            settings: appState.currentSettings,
            notes: { [appState.currentNotesKey]: appState.currentNotes }
        };
    } else {
        const checked = document.querySelectorAll('.selection-checkbox:checked');
        if (checked.length === 0) {
            alert('Selecione pelo menos uma anotação');
            return;
        }
        const selectedNotes = {};
        checked.forEach(cb => {
            const id = cb.dataset.id;
            if (appState.currentNotes[id]) {
                selectedNotes[id] = appState.currentNotes[id];
            }
        });
        data = {
            type: 'selection',
            domain: appState.currentDomain,
            notes: selectedNotes
        };
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notepad-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeExportModal();
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);

    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    if (hr < 24) return `há ${hr}h`;
    if (day < 7) return `há ${day}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
