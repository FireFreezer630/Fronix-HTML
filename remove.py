# refactor_script.py
import os
import re
from bs4 import BeautifulSoup

# --- CONFIGURATION ---

# 1. This mapping defines which file each function/variable belongs to.
# It's the core logic that determines how the code is split.
FILE_MAPPING = {
    'config.js': ['API_BASE_URL', 'config', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SYSTEM_PROMPT_BASE', 'FONTS', 'FONT_WEIGHTS'],
    'state.js': ['supabaseClient', 'state', 'currentController', 'isStreaming', 'isScrolledUp', 'isGeneratingTitle', 'attachedImageData', 'saveState', 'loadState'],
    'elements.js': ['elements'],
    'utils.js': ['isTokenExpired', 'getDeviceType', 'renderContent', 'renderStreamingContent', 'copyMessage', 'scrollToBottom', 'retryWithBackoff', 'marked.setOptions'],
    'ui.js': ['updateSendButtonState', 'renderSidebar', 'renderChat', 'updateProfileUI', 'updateLoginStateUI', 'updateModelSelectorDisplay', 'updateProModelsToggleUI', 'renderModelDropdown', 'MODELS'],
    'modals.js': ['animateModalOpen', 'animateModalClose', 'openRenameModal', 'openDeleteModal', 'openAlertModal', 'closeAlertModal', 'closeAllModals', 'openChatActionsDropdown'],
    'auth.js': ['validateAndRefreshToken', 'handleSignIn', 'handleSignUp', 'handleGoogleLogin'],
    'chat.js': ['createChat', 'addMessage', 'setActive', 'loadAvailableModels', 'loadDataFromServer', 'handleNewChat', 'sendMessage', 'generateImage', 'enterEditMode', 'exitEditMode', 'toggleSidebar'],
    'settings.js': ['applyFont', 'applyFontWeight', 'renderFontOptions', 'renderFontWeightOptions', 'applyTheme', 'toggleTheme'],
    'main.js': ['init'] # Event listeners are handled separately and placed in main.js
}

# 2. Boilerplate code added to the top of each new JS file.
FILE_BOILERPLATE = {
    'config.js': '// js/config.js\n// Contains global application configuration constants.\nwindow.App = window.App || {};\n',
    'state.js': '// js/state.js\n// Manages global application state and the Supabase client.\n',
    'elements.js': '// js/elements.js\n// Caches references to all necessary DOM elements for performance.\n',
    'utils.js': '// js/utils.js\n// Provides common utility functions used across the application.\n',
    'ui.js': '// js/ui.js\n// Handles rendering and updating all UI components.\n',
    'modals.js': '// js/modals.js\n// Manages all modal dialogs, including opening, closing, and animations.\n',
    'auth.js': '// js/auth.js\n// Contains all logic related to user authentication and session management.\n',
    'chat.js': '// js/chat.js\n// Core logic for chat interactions, AI communication, and message handling.\n',
    'settings.js': '// js/settings.js\n// Manages application-wide settings like theme and fonts.\n',
    'main.js': '// js/main.js\n// The main entry point for the application. Initializes the app and sets up event listeners.\n'
}

# --- SCRIPT LOGIC (No need to edit below this line) ---

def find_js_script(soup):
    """Finds the main script tag in the HTML."""
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string and 'const API_BASE_URL' in script.string:
            return script
    return None

def parse_js_code(js_code):
    """Parses the JavaScript code into logical blocks using regex."""
    blocks = []
    # This comprehensive regex captures function declarations, variable assignments,
    # and event listeners, handling various formats including async and arrow functions.
    pattern = re.compile(
        r'((?:async\s+)?function\s+\w+\s*\(.*?\)\s*\{.*?\n\})|'
        r'(const\s+\w+\s*=\s*(?:\{[\s\S]*?\}|`[\s\S]*?`|[^;]+);)|'
        r'(let\s+\w+\s*=\s*[^;]+;)|'
        r'(\w+\.setOptions\(\{[\s\S]*?\}\);)|'
        r'([\w\.\'\"\[\]\(\)]+?\s*\.\s*(?:onclick|addEventListener)\s*=\s*(?:async\s*)?\(.*?\)\s*=>\s*\{[\s\S]*?\n\};?)',
        re.DOTALL | re.MULTILINE
    )
    last_end = 0
    for match in pattern.finditer(js_code):
        start, end = match.span()
        if start > last_end:
            unmatched_code = js_code[last_end:start].strip()
            if unmatched_code:
                blocks.append(('unmatched', unmatched_code))
        blocks.append(('code', match.group(0).strip()))
        last_end = end
    return blocks

def get_block_identifier(block_code):
    """Gets the main name (identifier) of a code block."""
    match = re.match(r'(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)', block_code)
    if match:
        return match.group(1) or match.group(2)
    
    # Handle event listeners: e.g., "elements.themeToggleBtn.onclick" -> "elements.themeToggleBtn.onclick"
    match = re.match(r'([\w\.\'\"\[\]\(\)]+?)\s*\.\s*(?:onclick|addEventListener)', block_code)
    if match:
        return f"event_{match.group(1)}"
        
    if block_code.strip().startswith('marked.setOptions'):
        return 'marked.setOptions'
    return None

def categorize_blocks(blocks):
    """Assigns each code block to a file based on its identifier."""
    categorized = {filename: [] for filename in FILE_MAPPING.keys()}
    categorized['unassigned'] = []

    for block_type, block_code in blocks:
        if block_type == 'unmatched' and block_code.startswith('//'):
            continue

        identifier = get_block_identifier(block_code)
        found = False
        if identifier:
            if 'event_' in identifier:
                categorized['main.js'].append(block_code)
                found = True
            else:
                for filename, identifiers in FILE_MAPPING.items():
                    if identifier in identifiers:
                        categorized[filename].append(block_code)
                        found = True
                        break
        
        if not found:
            # Place remaining simple assignments in main.js as they are likely event handlers
            if '=' in block_code and ('onclick' in block_code or 'addEventListener' in block_code):
                categorized['main.js'].append(block_code)
            else:
                categorized['unassigned'].append(block_code)
    
    if categorized['unassigned']:
        print("\nWarning: Some blocks could not be automatically categorized:")
        for block in categorized['unassigned']:
            print(f"  - {block[:80]}...")
        print("These will be skipped. You may need to move them manually.")
    
    return categorized

def rewrite_code_for_app_scope(categorized_blocks):
    """Rewrites the code to use the global App object."""
    all_identifiers = {name for names in FILE_MAPPING.values() for name in names if name != 'elements'}
    
    prefix_pattern = re.compile(r'\b(' + '|'.join(re.escape(id) for id in all_identifiers) + r'|elements)\b')

    rewritten_content = {filename: FILE_BOILERPLATE.get(filename, '') for filename in FILE_MAPPING.keys()}
    
    for filename, blocks in categorized_blocks.items():
        if filename == 'unassigned': continue
        exports = []
        for block in blocks:
            identifier = get_block_identifier(block)
            
            def replacer(match):
                token = match.group(1)
                # Don't prefix the declaration itself, or if it's a local variable in a function signature
                if (identifier and token == identifier) or f"({token}" in block or f", {token}" in block:
                    return token
                # Always prefix 'elements'
                if token == 'elements':
                    return 'App.elements'
                if token in all_identifiers:
                    return f'App.{token}'
                return token

            processed_block = prefix_pattern.sub(replacer, block)
            rewritten_content[filename] += processed_block + '\n\n'
            
            if identifier and not 'event_' in identifier:
                exports.append(identifier)
        
        if exports:
            rewritten_content[filename] += "// Expose functions and variables to the global App scope\n"
            for exp in sorted(list(set(exports))):
                rewritten_content[filename] += f"App.{exp} = {exp};\n"

    return rewritten_content

def create_new_html(soup):
    """Creates the new HTML content with updated script tags."""
    old_script_tag = find_js_script(soup)
    if old_script_tag:
        old_script_tag.decompose()
        
    body = soup.find('body')
    if body:
        script_order = [
            'config.js', 'state.js', 'elements.js', 'utils.js', 'ui.js', 'modals.js',
            'auth.js', 'chat.js', 'settings.js', 'main.js'
        ]
        
        body.append(BeautifulSoup("<!-- Custom Application Scripts -->", 'html.parser'))
        for script_file in script_order:
            new_tag = soup.new_tag('script', src=f"js/{script_file}")
            body.append(new_tag)
            
    return soup.prettify()

def main():
    """Main function to run the refactoring process."""
    input_html_file = 'index.html'
    output_html_file = 'index.refactored.html'
    js_dir = 'js'

    print(f"--- Starting Fronix Frontend Refactoring ---")
    try:
        with open(input_html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"Error: '{input_html_file}' not found. Please run this script in the same directory.")
        return

    soup = BeautifulSoup(html_content, 'html.parser')
    
    print("\nStep 1: Extracting JavaScript from HTML...")
    script_tag = find_js_script(soup)
    if not script_tag or not script_tag.string:
        print("Error: Could not find the main JavaScript block.")
        return
    js_code = script_tag.string
    print(" -> Success: Found and extracted JS block.")

    print("\nStep 2: Parsing and Categorizing Code...")
    blocks = parse_js_code(js_code)
    print(f" -> Parsed into {len(blocks)} logical code blocks.")
    categorized = categorize_blocks(blocks)
    print(" -> Categorized blocks into target files.")

    print("\nStep 3: Rewriting Code for Modularity...")
    rewritten_files = rewrite_code_for_app_scope(categorized)
    print(" -> Added 'App.' prefixes and export statements.")

    print(f"\nStep 4: Creating '{js_dir}/' directory and writing JS files...")
    if not os.path.exists(js_dir):
        os.makedirs(js_dir)
        print(f" -> Created directory: '{js_dir}/'")

    for filename, content in rewritten_files.items():
        if filename == 'unassigned' or not content.strip(): continue
        filepath = os.path.join(js_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')
        print(f"  - Wrote {filepath}")

    print(f"\nStep 5: Generating new '{output_html_file}'...")
    new_html_content = create_new_html(soup)
    with open(output_html_file, 'w', encoding='utf-8') as f:
        f.write(new_html_content)
    print(f" -> Successfully created new HTML file.")

    print("\n--- Refactoring Complete! ---")
    print(f"Your original '{input_html_file}' has not been changed.")
    print(f"Open '{output_html_file}' in your browser to see the refactored application.")

if __name__ == '__main__':
    main()