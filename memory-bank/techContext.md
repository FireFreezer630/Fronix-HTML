# Tech Context: Fronix.ai

## Technologies Used

- **HTML5:** The structure of the application.
- **CSS3:** Styling the application.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
- **Vanilla JavaScript (ES6+):** The core application logic.
- **Anime.js:** A lightweight JavaScript animation library used for modal animations.
- **Marked.js:** A Markdown parser for rendering chat messages.
- **KaTeX:** A math typesetting library for rendering mathematical formulas.

## Development Setup

The application can be run by simply opening the `index.html` file in a web browser. There is no build process or development server required.

## Technical Constraints

- The application is entirely client-side, so all processing happens in the user's browser.
- The application relies on a third-party API for language model interactions. The availability and performance of this API are external dependencies.
- The list of available models is hardcoded in the `index.html` file.

## Dependencies

All dependencies are loaded from CDNs in the `index.html` file. There is no package manager like npm or yarn being used.
