# Gemini CLI Tool Guide

This document provides a detailed overview of the tools available to the Gemini CLI, explaining their purpose, when to use them, and how they can be effectively applied to various software engineering tasks.

## File System Tools

These tools allow for interaction with the local file system, enabling reading, writing, and navigating directories.

### `default_api.list_directory(path, file_filtering_options=None, ignore=None)`
- **Purpose:** Lists the names of files and subdirectories directly within a specified directory. Can filter results based on glob patterns and `.gitignore`/`.geminiignore`.
- **When to use:**
    - To understand the structure of a directory.
    - To find specific files or subdirectories within a known path.
    - To get an overview of a project's layout.
- **Example:** `default_api.list_directory(path='/home/user/project/src')`

### `default_api.read_file(absolute_path, limit=None, offset=None)`
- **Purpose:** Reads and returns the content of a specified file. Useful for inspecting code, configuration files, documentation, or any text-based content. Can handle large files by reading in chunks using `limit` and `offset`.
- **When to use:**
    - To understand the content of a specific file.
    - To review code for refactoring, bug fixing, or feature implementation.
    - To read documentation or log files.
- **Example:** `default_api.read_file(absolute_path='/home/user/project/src/main.js')`

### `default_api.search_file_content(pattern, include=None, path=None)`
- **Purpose:** Searches for a regular expression pattern within the content of files in a specified directory.
- **When to use:**
    - To find specific code snippets, function definitions, or variable usages across multiple files.
    - To identify where a particular string or pattern is used in the codebase.
- **Example:** `default_api.search_file_content(pattern='function\s+initApp', include='*.js', path='/home/user/project/src')`

### `default_api.glob(pattern, case_sensitive=None, path=None, respect_git_ignore=None)`
- **Purpose:** Efficiently finds files matching specific glob patterns across the codebase. Returns absolute paths.
- **When to use:**
    - To locate files when their exact path is unknown but their name pattern is known (e.g., `**/*.test.js`).
    - To find all files of a certain type within a project.
- **Example:** `default_api.glob(pattern='**/*.js', path='/home/user/project')`

### `default_api.replace(file_path, new_string, old_string, expected_replacements=None)`
- **Purpose:** Replaces specific text within a file. Requires exact matching of `old_string` and `new_string`, including context for single replacements.
- **When to use:**
    - To make precise, targeted changes to code or configuration files.
    - To update variable names, function calls, or string literals.
- **Example:** `default_api.replace(file_path='/home/user/project/src/config.js', old_string='const API_URL = "http://localhost:3000";', new_string='const API_URL = "https://api.example.com";')`

### `default_api.write_file(content, file_path)`
- **Purpose:** Writes content to a specified file. This tool will create a new file or completely overwrite an existing one. Use with caution.
- **When to use:**
    - To create new files (e.g., new source code files, configuration files).
    - To replace the entire content of an existing file.
    - To generate reports or output data.
- **Example:** `default_api.write_file(file_path='/home/user/project/new_feature.js', content='console.log("New feature loaded!");')`

### `default_api.read_many_files(paths, exclude=[], file_filtering_options=None, include=[], recursive=True, useDefaultExcludes=True)`
- **Purpose:** Reads content from multiple files simultaneously, specified by paths or glob patterns. More efficient than reading files one by one when analyzing a collection of files.
- **When to use:**
    - To get an overview of a module or component by reading all its related files.
    - To gather context from multiple configuration files.
    - When asked to "read all files in X directory" or "show me the content of all Y files".
- **Example:** `default_api.read_many_files(paths=['src/**/*.js', 'tests/**/*.js'])`

### `default_api.run_shell_command(command, description=None, directory=None)`
- **Purpose:** Executes a given shell command. Provides output from stdout and stderr, and indicates success or failure.
- **When to use:**
    - To run build commands (e.g., `npm install`, `make`).
    - To execute tests (e.g., `npm test`, `pytest`).
    - To perform file system operations not covered by other tools (e.g., `rm`, `mv`, `cp`).
    - To interact with version control systems (e.g., `git status`, `git diff`).
- **Example:** `default_api.run_shell_command(command='npm install', description='Install project dependencies.')`

### `default_api.filesystem__read_file(path, head=None, tail=None)`
- **Purpose:** Read the complete contents of a file as text. DEPRECATED: Use read_text_file instead.
- **When to use:** For reading text files.

### `default_api.read_text_file(path, head=None, tail=None)`
- **Purpose:** Read the complete contents of a file from the file system as text. Handles various text encodings and provides detailed error messages if the file cannot be read.
- **When to use:** When you need to examine the contents of a single text file.

### `default_api.read_media_file(path)`
- **Purpose:** Read an image or audio file. Returns the base64 encoded data and MIME type.
- **When to use:** For processing media files.

### `default_api.read_multiple_files(paths)`
- **Purpose:** Read the contents of multiple files simultaneously. This is more efficient than reading files one by one when you need to analyze or compare multiple files.
- **When to use:** When you need to analyze or compare multiple files.

### `default_api.filesystem__write_file(content, path)`
- **Purpose:** Create a new file or completely overwrite an existing file with new content. Use with caution as it will overwrite existing files without warning.
- **When to use:** For creating or overwriting files.

### `default_api.edit_file(edits, path, dryRun=False)`
- **Purpose:** Make line-based edits to a text file. Each edit replaces exact line sequences with new content.
- **When to use:** For precise, line-based modifications to text files.

### `default_api.create_directory(path)`
- **Purpose:** Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation.
- **When to use:** For setting up directory structures.

### `default_api.filesystem__list_directory(path)`
- **Purpose:** Get a detailed listing of all files and directories in a specified path.
- **When to use:** To understand directory structure and find specific files.

### `default_api.list_directory_with_sizes(path, sortBy='name')`
- **Purpose:** Get a detailed listing of all files and directories in a specified path, including sizes.
- **When to use:** To understand directory structure and file sizes.

### `default_api.directory_tree(path)`
- **Purpose:** Get a recursive tree view of files and directories as a JSON structure.
- **When to use:** To visualize and understand complex directory structures.

### `default_api.move_file(destination, source)`
- **Purpose:** Move or rename files and directories.
- **When to use:** For reorganizing files or renaming them.

### `default_api.search_files(path, pattern, excludePatterns=[])`
- **Purpose:** Recursively search for files and directories matching a pattern.
- **When to use:** To find files when their exact location is unknown.

### `default_api.get_file_info(path)`
- **Purpose:** Retrieve detailed metadata about a file or directory.
- **When to use:** To get information about file characteristics without reading content.

### `default_api.list_allowed_directories()`
- **Purpose:** Returns the list of directories that this server is allowed to access.
- **When to use:** To understand accessible directories.

## Web Interaction Tools

These tools enable interaction with web pages and fetching content from URLs.

### `default_api.web_fetch(prompt)`
- **Purpose:** Processes content from URL(s), including local and private network addresses (e.g., localhost), embedded in a prompt.
- **When to use:** To fetch and process content from web pages.

### `default_api.google_web_search(query)`
- **Purpose:** Performs a web search using Google Search (via the Gemini API) and returns the results.
- **When to use:** To find information on the internet based on a query.

## Knowledge Graph Tools

These tools interact with a knowledge graph to store and retrieve structured information.

### `default_api.create_entities(entities)`
- **Purpose:** Create multiple new entities in the knowledge graph.
- **When to use:** To add new concepts, objects, or individuals to the knowledge base.

### `default_api.create_relations(relations)`
- **Purpose:** Create multiple new relations between entities in the knowledge graph.
- **When to use:** To define relationships between existing entities (e.g., "A is a part of B", "C depends on D").

### `default_api.add_observations(observations)`
- **Purpose:** Add new observations to existing entities in the knowledge graph.
- **When to use:** To add descriptive information or facts about entities.

### `default_api.delete_entities(entityNames)`
- **Purpose:** Delete multiple entities and their associated relations from the knowledge graph.
- **When to use:** To remove outdated or incorrect entities.

### `default_api.delete_observations(deletions)`
- **Purpose:** Delete specific observations from entities in the knowledge graph.
- **When to use:** To remove specific facts or descriptions from entities.

### `default_api.delete_relations(relations)`
- **Purpose:** Delete multiple relations from the knowledge graph.
- **When to use:** To remove specific relationships between entities.

### `default_api.read_graph()`
- **Purpose:** Read the entire knowledge graph.
- **When to use:** To get a complete overview of the stored knowledge.

### `default_api.search_nodes(query)`
- **Purpose:** Search for nodes in the knowledge graph based on a query.
- **When to use:** To find specific entities or concepts within the knowledge graph.

### `default_api.open_nodes(names)`
- **Purpose:** Open specific nodes in the knowledge graph by their names.
- **When to use:** To retrieve detailed information about specific entities.

## AI and Utility Tools

These tools provide general AI capabilities and internal utilities.

### `default_api.sequentialthinking(nextThoughtNeeded, thought, thoughtNumber, totalThoughts, branchFromThought=None, branchId=None, isRevision=None, needsMoreThoughts=None, revisesThought=None)`
- **Purpose:** A detailed tool for dynamic and reflective problem-solving through thoughts.
- **When to use:** For breaking down complex problems, planning, design, analysis, and maintaining context over multiple steps.

### `default_api.ask_gemini(prompt, changeMode=False, chunkCacheKey=None, chunkIndex=None, model=None, sandbox=False)`
- **Purpose:** Allows direct interaction with the Gemini model for analysis, code generation, or general questions.
- **When to use:** For general inquiries, code explanations, generating code, or structured edit suggestions.

### `default_api.ping(prompt="")`
- **Purpose:** Echo.
- **When to use:** For quick checks or debugging tool execution.

### `default_api.Help()`
- **Purpose:** Receive help information.
- **When to use:** When unsure about tool usage or capabilities.

### `default_api.brainstorm(prompt, constraints=None, domain=None, existingContext=None, ideaCount=12, includeAnalysis=True, methodology='auto', model=None)`
- **Purpose:** Generate novel ideas with dynamic context gathering.
- **When to use:** For ideation, problem-solving, or exploring new approaches to a task.

### `default_api.fetch_chunk(cacheKey, chunkIndex)`
- **Purpose:** Retrieves cached chunks from a changeMode response.
- **When to use:** To get subsequent chunks after receiving a partial changeMode response.

### `default_api.timeout_test(duration)`
- **Purpose:** Test timeout prevention by running for a specified duration.
- **When to use:** For internal testing and debugging of the agent's timeout handling.

## Browser Automation Tools

These tools allow for programmatic interaction with a web browser.

### `default_api.browser_close()`
- **Purpose:** Close the page.
- **When to use:** To clean up browser sessions after completing a task.

### `default_api.browser_resize(height, width)`
- **Purpose:** Resize the browser window.
- **When to use:** To test responsive layouts or simulate different screen sizes.

### `default_api.browser_console_messages()`
- **Purpose:** Returns all console messages.
- **When to use:** For debugging web applications by inspecting console output.

### `default_api.browser_handle_dialog(accept, promptText=None)`
- **Purpose:** Handle a dialog.
- **When to use:** To interact with pop-up dialogs that might block automation.

### `default_api.browser_evaluate(function, element=None, ref=None)`
- **Purpose:** Evaluate JavaScript expression on page or element.
- **When to use:** To execute custom JavaScript on a web page.

### `default_api.browser_file_upload(paths)`
- **Purpose:** Upload one or multiple files.
- **When to use:** To automate file uploads in web forms.

### `default_api.browser_fill_form(fields)`
- **Purpose:** Fill multiple form fields.
- **When to use:** To automate form submissions or data entry.

### `default_api.browser_install()`
- **Purpose:** Install the browser specified in the config.
- **When to use:** If the browser is not installed and a browser automation task is requested.

### `default_api.browser_press_key(key)`
- **Purpose:** Press a key on the keyboard.
- **When to use:** To simulate keyboard input, such as pressing Enter or arrow keys.

### `default_api.browser_type(element, ref, text, slowly=None, submit=None)`
- **Purpose:** Type text into editable element.
- **When to use:** To fill out forms, input fields, or search bars.

### `default_api.browser_navigate(url)`
- **Purpose:** Navigate to a URL.
- **When to use:** To open a web page for inspection or interaction.

### `default_api.browser_navigate_back()`
- **Purpose:** Go back to the previous page.
- **When to use:** To navigate back in browser history.

### `default_api.browser_network_requests()`
- **Purpose:** Returns all network requests since loading the page.
- **When to use:** To analyze network activity, API calls, or resource loading.

### `default_api.browser_take_screenshot(element=None, filename=None, fullPage=None, ref=None, type='png')`
- **Purpose:** Take a screenshot of the current page.
- **When to use:** For visual debugging or to capture the state of a UI.

### `default_api.browser_snapshot()`
- **Purpose:** Capture accessibility snapshot of the current page.
- **When to use:** To understand the layout and interactive elements of a web page for subsequent automation.

### `default_api.browser_click(element, ref, button=None, doubleClick=None)`
- **Purpose:** Perform click on a web page.
- **When to use:** To interact with buttons, links, or other clickable elements on a web page.

### `default_api.browser_drag(endElement, endRef, startElement, startRef)`
- **Purpose:** Perform drag and drop between two elements.
- **When to use:** To automate drag-and-drop interactions.

### `default_api.browser_hover(element, ref)`
- **Purpose:** Hover over element on page.
- **When to use:** To trigger hover-specific UI elements or tooltips.

### `default_api.browser_select_option(element, ref, values)`
- **Purpose:** Select an option in a dropdown.
- **When to use:** To interact with select/dropdown elements.

### `default_api.browser_tabs(action, index=None)`
- **Purpose:** List, create, close, or select a browser tab.
- **When to use:** To manage multiple browser tabs during complex web automation tasks.

### `default_api.browser_wait_for(text=None, textGone=None, time=None)`
- **Purpose:** Wait for text to appear or disappear or a specified time to pass.
- **When to use:** To synchronize actions with dynamic content loading or animations.

## Puppeteer Tools

These tools provide a direct interface to Puppeteer for browser automation.

### `default_api.puppeteer_connect_active_tab(debugPort=9222, targetUrl=None)`
- **Purpose:** Connect to an existing Chrome instance with remote debugging enabled.
- **When to use:** To connect to an already running browser instance.

### `default_api.puppeteer_navigate(url)`
- **Purpose:** Navigate to a URL.
- **When to use:** To open a web page for inspection or interaction.

### `default_api.puppeteer_screenshot(name, height=None, selector=None, width=None)`
- **Purpose:** Take a screenshot of the current page or a specific element.
- **When to use:** For visual debugging or to capture the state of a UI.

### `default_api.puppeteer_click(selector)`
- **Purpose:** Click an element on the page.
- **When to use:** To interact with buttons, links, or other clickable elements on a web page.

### `default_api.puppeteer_fill(selector, value)`
- **Purpose:** Fill out an input field.
- **When to use:** To fill out forms, input fields, or search bars.

### `default_api.puppeteer_select(selector, value)`
- **Purpose:** Select an element on the page with Select tag.
- **When to use:** To interact with select/dropdown elements.

### `default_api.puppeteer_hover(selector)`
- **Purpose:** Hover an element on the page.
- **When to use:** To trigger hover-specific UI elements or tooltips.

### `default_api.puppeteer_evaluate(script)`
- **Purpose:** Execute JavaScript in the browser console.
- **When to use:** To execute custom JavaScript on a web page.

## GitHub Tools

These tools enable interaction with GitHub repositories.

### `default_api.create_or_update_file(branch, content, message, owner, path, repo, sha=None)`
- **Purpose:** Create or update a single file in a GitHub repository.
- **When to use:** To commit code changes, add new files, or update documentation directly on GitHub.

### `default_api.search_repositories(query, page=None, perPage=None)`
- **Purpose:** Search for GitHub repositories.
- **When to use:** To find relevant open-source projects or examples on GitHub.

### `default_api.create_repository(name, autoInit=None, description=None, private=None)`
- **Purpose:** Create a new GitHub repository in your account.
- **When to use:** To start a new project or create a dedicated repository for a task.

### `default_api.get_file_contents(owner, path, repo, branch=None)`
- **Purpose:** Get the contents of a file or directory from a GitHub repository.
- **When to use:** To inspect remote code, configuration, or data files.

### `default_api.push_files(branch, files, message, owner, repo)`
- **Purpose:** Push multiple files to a GitHub repository in a single commit.
- **When to use:** To commit a set of related changes to a repository.

### `default_api.create_issue(owner, repo, title, assignees=None, body=None, labels=None, milestone=None)`
- **Purpose:** Create a new issue in a GitHub repository.
- **When to use:** To report bugs, suggest features, or track tasks within a project.

### `default_api.create_pull_request(base, head, owner, repo, title, body=None, draft=None, maintainer_can_modify=None)`
- **Purpose:** Create a new pull request in a GitHub repository.
- **When to use:** To propose changes from a feature branch to a main branch.

### `default_api.fork_repository(owner, repo, organization=None)`
- **Purpose:** Fork a GitHub repository to your account or specified organization.
- **When to use:** To create a personal copy of a repository for contributions or experimentation.

### `default_api.create_branch(branch, owner, repo, from_branch=None)`
- **Purpose:** Create a new branch in a GitHub repository.
- **When to use:** To isolate development work for new features or bug fixes.

### `default_api.list_commits(owner, repo, page=None, perPage=None, sha=None)`
- **Purpose:** Get list of commits of a branch in a GitHub repository.
- **When to use:** To review commit history or identify specific changes.

### `default_api.list_issues(owner, repo, direction=None, labels=None, page=None, per_page=None, since=None, sort=None, state=None)`
- **Purpose:** List issues in a GitHub repository with filtering options.
- **When to use:** To get an overview of open tasks, bugs, or feature requests.

### `default_api.update_issue(issue_number, owner, repo, assignees=None, body=None, labels=None, milestone=None, state=None, title=None)`
- **Purpose:** Update an existing issue in a GitHub repository.
- **When to use:** To change the status, assignees, or details of an issue.

### `default_api.add_issue_comment(body, issue_number, owner, repo)`
- **Purpose:** Add a comment to an existing issue.
- **When to use:** To provide updates, ask questions, or discuss issues.

### `default_api.search_code(q, order=None, page=None, per_page=None)`
- **Purpose:** Search for code across GitHub repositories.
- **When to use:** To find examples of specific code patterns or implementations across a wider range of projects.

### `default_api.search_issues(q, order=None, page=None, per_page=None, sort=None)`
- **Purpose:** Search for issues and pull requests across GitHub repositories.
- **When to use:** To find discussions or solutions related to specific topics or problems.

### `default_api.search_users(q, order=None, page=None, per_page=None, sort=None)`
- **Purpose:** Search for users on GitHub.
- **When to use:** To find collaborators or experts on specific topics.

### `default_api.get_issue(issue_number, owner, repo)`
- **Purpose:** Get details of a specific issue in a GitHub repository.
- **When to use:** To get comprehensive information about a particular issue.

### `default_api.get_pull_request(owner, pull_number, repo)`
- **Purpose:** Get details of a specific pull request.
- **When to use:** To review the changes and context of a pull request.

### `default_api.list_pull_requests(owner, repo, base=None, direction=None, head=None, page=None, per_page=None, sort=None, state=None)`
- **Purpose:** List and filter repository pull requests.
- **When to use:** To get an overview of active or closed pull requests.

### `default_api.create_pull_request_review(body, event, owner, pull_number, repo, comments=None, commit_id=None)`
- **Purpose:** Create a review on a pull request.
- **When to use:** To provide feedback or approve/request changes on a pull request.

### `default_api.merge_pull_request(owner, pull_number, repo, commit_message=None, commit_title=None, merge_method=None)`
- **Purpose:** Merge a pull request.
- **When to use:** To integrate changes from a pull request into the base branch.

### `default_api.get_pull_request_files(owner, pull_number, repo)`
- **Purpose:** Get the list of files changed in a pull request.
- **When to use:** To quickly see what files were affected by a pull request.

### `default_api.get_pull_request_status(owner, pull_number, repo)`
- **Purpose:** Get the combined status of all status checks for a pull request.
- **When to use:** To check if a pull request has passed all CI/CD checks.

### `default_api.update_pull_request_branch(owner, pull_number, repo, expected_head_sha=None)`
- **Purpose:** Update a pull request branch with the latest changes from the base branch.
- **When to use:** To keep a feature branch up-to-date with the main branch.

### `default_api.get_pull_request_comments(owner, pull_number, repo)`
- **Purpose:** Get the review comments on a pull request.
- **When to use:** To review discussions and feedback on a pull request.

### `default_api.get_pull_request_reviews(owner, pull_number, repo)`
- **Purpose:** Get the reviews on a pull request.
- **When to use:** To see who has reviewed a pull request and their overall feedback.

## Context7 Documentation Tools

These tools provide access to up-to-date library documentation via Context7.

### `default_api.resolve_library_id(libraryName)`
- **Purpose:** Resolves a package/product name to a Context7-compatible library ID.
- **When to use:** To obtain a valid Context7-compatible library ID before fetching documentation.

### `default_api.get_library_docs(context7CompatibleLibraryID, tokens=None, topic=None)`
- **Purpose:** Fetches up-to-date documentation for a library.
- **When to use:** To get detailed information about a specific library's API, usage, or concepts.