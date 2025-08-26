// js/elements.js
// Caches references to all necessary DOM elements for performance.
window.App = window.App || {};

App.elements = {
      body: document.body, 
      sidebar: document.getElementById('sidebar'), 
      sidebarOverlay: document.getElementById('sidebar-overlay'), 
      chatList: document.getElementById('chat-list'), 
      chatBox: document.getElementById('chat-box'), 
      chatTitle: document.getElementById('chat-title'), 
      userInput: document.getElementById('user-input'), 
      sendBtn: document.getElementById('send-btn'), 
      sendIcon: document.getElementById('send-icon'), 
      stopIcon: document.getElementById('stop-icon'), 
      saveIcon: document.getElementById('save-icon'), 
      newChatBtn: document.getElementById('new-chat'), 
      toggleSidebarBtn: document.getElementById('toggle-sidebar'), 
      themeToggleBtn: document.getElementById('theme-toggle'), 
      settingsBtn: document.getElementById('settings-btn'),
      signinBtn: document.getElementById('signin-btn'),
      logoutBtn: document.getElementById('logout-btn'),
      profileSection: document.getElementById('profile-section'),
      profileBtn: document.getElementById('profile-btn'),
      profileDropdown: document.getElementById('profile-dropdown'),
      profileUsername: document.getElementById('profile-username'),
      profileEmail: document.getElementById('profile-email'),
      profilePlan: document.getElementById('profile-plan'),
      profileBtnUsername: document.getElementById('profile-btn-username'),
      modelSelector: document.getElementById('model-selector'), 
      modelDropdown: document.getElementById('model-dropdown'),
      chatActionsDropdown: document.getElementById('chat-actions-dropdown'),
      editIndicator: document.getElementById('edit-indicator'),
      cancelEditBtn: document.getElementById('cancel-edit-btn'),
      scrollToBottomBtn: document.getElementById('scroll-to-bottom-btn'), // Added scroll to bottom button
      autocompleteSuggestions: document.getElementById('autocomplete-suggestions'), // Added for autocomplete
      studyCommandBtn: document.getElementById('study-command-btn'), // Added for study command autocomplete
      settingsModal: {
          container: document.getElementById('settings-modal'), 
          fontOptions: document.getElementById('font-options'), 
          fontWeightOptions: document.getElementById('font-weight-options'), 
          closeBtn: document.getElementById('close-settings-btn'), 
          resetBtn: document.getElementById('reset-settings-btn'), 
          apiTokenInput: document.getElementById('api-token-input'), 
          proModelsToggle: document.getElementById('pro-models-toggle')
      },
      renameModal: {
          container: document.getElementById('rename-modal'), 
          input: document.getElementById('rename-input'), 
          saveBtn: document.getElementById('rename-save'), 
          cancelBtn: document.getElementById('rename-cancel')
      },
      deleteModal: {
          container: document.getElementById('delete-modal'), 
          message: document.getElementById('delete-message'), 
          confirmBtn: document.getElementById('delete-confirm'), 
          cancelBtn: document.getElementById('delete-cancel')
      },
      signinModal: {
          container: document.getElementById('signin-modal'), 
          closeBtn: document.getElementById('close-signin-btn')
      },
      alertModal: {
        container: document.getElementById('alert-modal'),
        title: document.getElementById('alert-title'),
        message: document.getElementById('alert-message'),
        okBtn: document.getElementById('alert-ok-btn')
      },
      // Authentication Modals
      signinEmail: document.getElementById('signin-email'),
      signinPassword: document.getElementById('password-input'),
      signinEmailBtn: document.getElementById('signin-email-btn'),
      signupEmail: document.getElementById('signup-email'),
      signupPassword: document.getElementById('signup-password'),
      signupEmailBtn: document.getElementById('signup-email-btn'),
      signinGoogleBtn: document.getElementById('signin-google-btn'),
      signupGoogleBtn: document.getElementById('signup-google-btn'),
      signinTabBtn: document.getElementById('signin-tab-btn'),
      signupTabBtn: document.getElementById('signup-tab-btn'),
      signinView: document.getElementById('signin-view'),
      signupView: document.getElementById('signup-view'),
      passwordInput: document.getElementById('password-input'),
      passwordToggleBtn: document.getElementById('password-toggle-btn'),
      eyeOpenIcon: document.getElementById('eye-open-icon'),
      eyeClosedIcon: document.getElementById('eye-closed-icon'),
};
