# System Patterns: Fronix.ai

## System Architecture

Fronix.ai is a client-side, single-page application (SPA). All of the application logic resides within the user's browser. There is no proprietary back-end; the application communicates directly with a third-party API for language model interactions.

## Key Technical Decisions

- **Vanilla JavaScript:** The application is built without a front-end framework like React or Vue. This keeps the application lightweight and avoids framework-specific complexities.
- **Tailwind CSS:** A utility-first CSS framework is used for styling, allowing for rapid UI development and easy customization.
- **Local Storage:** User data, including chat history and settings, is stored in the browser's local storage. This simplifies data persistence without requiring a database.

## Design Patterns

- **State Management:** A single `state` object is used to manage the application's state. This object is loaded from local storage on startup and saved whenever changes are made.
- **Component-like Structure:** Although not using a formal framework, the JavaScript code is organized into functions that manage specific parts of the UI (e.g., `renderSidebar`, `renderChat`, `renderModelDropdown`). This mimics a component-based architecture.
- **Event-driven:** The application is event-driven, with user interactions (clicks, input) triggering functions that update the state and re-render the UI.
