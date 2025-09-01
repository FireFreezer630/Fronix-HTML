// js/settings.js
// Manages application-wide settings like theme and fonts.
window.App = window.App || {};

App.applyFont = function(font) {
    Object.keys(App.FONTS).forEach(f => App.elements.body.classList.remove(`font-${f}`));
    App.elements.body.classList.add(`font-${font}`);
    App.state.settings.font = font;
    App.saveState();
    App.renderFontOptions();
}
App.applyFontWeight = function(weight) {
    App.elements.body.style.fontWeight = weight;
    App.state.settings.fontWeight = weight;
    App.saveState();
    App.renderFontWeightOptions();
}
App.renderFontOptions = function() { 
    const currentFont = App.state.settings.font; 
    App.elements.settingsModal.fontOptions.innerHTML = '<div><label class="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Font Family</label></div>'; 
    Object.entries(App.FONTS).forEach(([key, name]) => {
        const btn = document.createElement('button'); 
        btn.className = `w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${currentFont === key ? 'bg-accent text-white font-semibold' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`; 
        btn.textContent = name; 
        btn.onclick = () => { App.applyFont(key); }; 
        App.elements.settingsModal.fontOptions.appendChild(btn); 
    }); 
}
App.renderFontWeightOptions = function() { 
    const currentWeight = App.state.settings.fontWeight; 
    App.elements.settingsModal.fontWeightOptions.innerHTML = `<div class="flex justify-between items-center"><label class="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Font Weight</label><span id="font-weight-label" class="text-sm text-light-text-subtle dark:text-dark-text-subtle">${App.FONT_WEIGHTS[currentWeight]}</span></div><input type="range" id="font-weight-slider" class="w-full h-2 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-accent" min="0" max="${Object.keys(App.FONT_WEIGHTS).length - 1}" step="1" value="${Object.keys(App.FONT_WEIGHTS).indexOf(currentWeight)}">`; 
    document.getElementById('font-weight-slider').addEventListener('input', (e) => { 
        const weight = Object.keys(App.FONT_WEIGHTS)[e.target.value]; 
        App.applyFontWeight(weight); 
        document.getElementById('font-weight-label').textContent = App.FONT_WEIGHTS[weight]; 
    }); 
}
App.updateModelSelectorDisplay = function() {
    let currentModelKey = App.state.settings.model;
    let modelData = App.MODELS[currentModelKey];
    let displayName = 'No models available'; // Default message if no models are found
    let modelType = '';

    // If the currently selected model is not available, try to find a fallback
    if (!modelData) {
        console.warn(`⚠️ Currently selected model "${currentModelKey}" is not available. Attempting to find a fallback.`);
        
        // Try to default to 'openai-large' if it exists and is available
        if (App.MODELS['openai-large']) {
            currentModelKey = 'openai-large';
            modelData = App.MODELS[currentModelKey];
            console.log(`  - Falling back to 'openai-large'.`);
        } else {
            // If 'openai-large' is not available, try to find the first available model
            const firstAvailableModelKey = Object.keys(App.MODELS)[0];
            if (firstAvailableModelKey) {
                currentModelKey = firstAvailableModelKey;
                modelData = App.MODELS[currentModelKey];
                console.log(`  - Falling back to first available model: '${currentModelKey}'.`);
            } else {
                // No models available at all
                console.error(`❌ No models are available. Displaying "No models available".`);
                App.state.settings.model = null; // Clear selected model
                App.elements.chatTitle.textContent = displayName;
                return;
            }
        }
        App.state.settings.model = currentModelKey; // Update state with the new model
        App.saveState(); // Persist the new default model
    }

    // Update display based on the selected or fallback model
    displayName = modelData.name;
    modelType = modelData.type === 'image' ? ' 🎨' : ' 💬';
    
    App.elements.chatTitle.textContent = displayName + modelType;
    console.log('🔄 Updated model selector display to:', displayName, `(${modelData.type})`);
}
App.updateProModelsToggleUI = function() {
    const enabled = App.state.settings.proModelsEnabled;
    const toggle = App.elements.settingsModal.proModelsToggle;
    if (!toggle) return;
    const knob = toggle.querySelector('span');

    toggle.setAttribute('aria-checked', enabled);
    toggle.classList.toggle('bg-accent', enabled);
    toggle.classList.toggle('bg-gray-200', !enabled);
    toggle.classList.toggle('dark:bg-gray-700', !enabled);
    knob.classList.toggle('translate-x-5', enabled);
    knob.classList.toggle('translate-x-0', !enabled);
}
App.renderModelDropdown = function() {
    App.elements.modelDropdown.innerHTML = '';
    
    const isProUser = App.state.currentUser && App.state.currentUser.plan === 'pro';
    const proModelsEnabled = App.state.settings.proModelsEnabled;

    // Filter models based on pro status
    const availableModels = Object.entries(App.MODELS).filter(([key, data]) => {
        if (data.pro) {
            return isProUser && proModelsEnabled;
        }
        return true;
    });

    // Separate models by type
    const textModels = availableModels.filter(([_, data]) => data.type === 'text');
    const imageModels = availableModels.filter(([_, data]) => data.type === 'image');
    
    // Add Text Models section
    const textHeader = document.createElement('div');
    textHeader.className = 'px-3 py-2 text-xs font-medium text-light-text-subtle dark:text-dark-text-subtle uppercase tracking-wider border-b border-light-border dark:border-dark-border';
    textHeader.textContent = '💬 Text Models';
    App.elements.modelDropdown.appendChild(textHeader);
    
    textModels.forEach(([key, data]) => {
        const btn = document.createElement('button');
        const isSelected = key === App.state.settings.model;
        btn.className = `w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-accent text-white' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
        
        let proBadge = '';
        if (data.pro) {
            proBadge = '<span class="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">PRO</span>';
        }

        btn.innerHTML = `<span>${data.name}</span> ${proBadge}`;
        btn.onclick = () => {
            App.state.settings.model = key;
            const activeChat = App.state.chats.find(c => c.id === App.state.activeId);
            if (activeChat) activeChat.model = key;
            App.saveState();
            App.updateModelSelectorDisplay();
            App.renderModelDropdown();
            App.elements.modelDropdown.style.display = 'none';
        };
        App.elements.modelDropdown.appendChild(btn);
    });
    
    // Add Image Generation section
    if (imageModels.length > 0) {
        const imgHeader = document.createElement('div');
        imgHeader.className = 'px-3 py-2 text-xs font-medium text-light-text-subtle dark:text-dark-text-subtle uppercase tracking-wider border-b border-light-border dark:border-dark-border mt-2';
        imgHeader.textContent = '🎨 Image Generation';
        App.elements.modelDropdown.appendChild(imgHeader);
        
        imageModels.forEach(([key, data]) => {
            const btn = document.createElement('button');
            const isSelected = key === App.state.settings.model;
            btn.className = `w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-accent text-white' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
            
            let proBadge = '';
            if (data.pro) {
                proBadge = '<span class="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">PRO</span>';
            }

            btn.innerHTML = `<span>${data.name}</span> ${proBadge}`;
            btn.onclick = () => {
                App.state.settings.model = key;
                const activeChat = App.state.chats.find(c => c.id === App.state.activeId);
                if (activeChat) activeChat.model = key;
                App.saveState();
                App.updateModelSelectorDisplay();
                App.renderModelDropdown();
                App.elements.modelDropdown.style.display = 'none';
            };
            App.elements.modelDropdown.appendChild(btn);
        });
    }
}
App.applyTheme = function(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('theme-icon-light').classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-dark').classList.toggle('hidden', !isDark);
    localStorage.setItem('theme', theme);
}
App.toggleTheme = function(event) {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    if (!document.startViewTransition) {
        App.applyTheme(newTheme);
        return;
    }
    
    const btn = App.elements.themeToggleBtn;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    document.documentElement.style.setProperty('--cx', cx + 'px');
    document.documentElement.style.setProperty('--cy', cy + 'px');

    document.startViewTransition(() => {
        App.applyTheme(newTheme);
    });
};
