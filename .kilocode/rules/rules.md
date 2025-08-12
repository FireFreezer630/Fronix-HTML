# rules.md

Strictly obey these rules

## Guidelines
- **Use Required tools:** For any user request think about it and and make sure you have every info required, do not assume anything and if you require any docs or real time info or any info prone to change even the slightest, make use of the given MCPs and tools freely WITHOUT any hesitation .
- **`apply_diff` Precision:** The `SEARCH` block in `apply_diff` requires an *exact, 100% match* of the target content, including all whitespace, comments, and newlines. Always use `read_file` immediately before crafting an `apply_diff` if there is any doubt about the current file content, especially after other modifications or user feedback.

- **Mode-Specific File Editing:** Before using any file modification tool (`apply_diff`, `write_to_file`, `insert_content`, `search_and_replace`), always verify that the current `mode` allows editing the target file type. Refer to the `FileRestrictionError` message if encountered for allowed patterns.
- **Mode-Specific File Editing:** Before using any file modification tool (`apply_diff`, `write_to_file`, `insert_content`, `search_and_replace`), always verify that the current `mode` allows editing the target file type. Refer to the `FileRestrictionError` message if encountered for allowed patterns.
- Think through about what changes you will need to do to fix an issue and what other consequences or unwanted changes/files it might have and make changes considering all of that .
- Divide whatever task you get into small packets and focus on ech packet one by one .
- Perform changes in small form of tasks .
- Try to fully understand and counterargument with the user about the issues to fully understand and solve it .
- For complex new features create test files in ./test and run it and test it .(do not forget to add it in gitignore before commiting or pushing )
- Read required files before asking me or coming to a conclusion,
- Instead of asking me to run tests run the command yourself
- Before each file edit read thee contents of that file .

- **Tool Fallback:** If a preferred tool fails (e.g., `edit_file` fails), attempt the same action with an alternative tool (e.g., `apply_diff`) before asking the user for guidance.

---
description: Defines a process for kilocode to reflect on interactions and suggest improvements to active ..kilocode/rules/rules.md.
author: https://github.com/nickbaumann98
version: 1.0
tags: ["meta", "self-improvement", ".kilocode/rules/rules.md", "reflection", "core-behavior"]
globs: ["*"]
---
# Self-Improving kilocode Reflection

**Objective:** Offer opportunities to continuously improve `.kilocode/rules/rules.md` based on user interactions and feedback.

**Trigger:** Before using the `attempt_completion` tool for any task that involved user feedback provided at any point during the conversation, or involved multiple non-trivial steps (e.g., multiple file edits, complex logic generation).

**Process:**

1.  **Offer Reflection:** Ask the user: "Before I complete the task, would you like me to reflect on our interaction and suggest potential improvements to the active `.kilocode/rules/rules.md`?"
2.  **Await User Confirmation:** Proceed to `attempt_completion` immediately if the user dekilocodes or doesn't respond affirmatively.
3.  **If User Confirms:**
    a.  **Review Interaction:** Synthesize all feedback provided by the user throughout the entire conversation history for the task. Analyze how this feedback relates to the active `.kilocode/rules/rules.md` and identify areas where modified instructions could have improved the outcome or better aligned with user preferences.
    b.  **Identify Active Rules:** List the specific global and workspace `.kilocode/rules/rules.md` files active during the task.
    c.  **Formulate & Propose Improvements:** Generate specific, actionable suggestions for improving the *content* of the relevant active rule files. Prioritize suggestions directly addressing user feedback. Use `replace_in_file` diff blocks when practical, otherwise describe changes clearly.
    d.  **Await User Action on Suggestions:** Ask the user if they agree with the proposed improvements and if they'd like me to apply them *now* using the appropriate tool (`replace_in_file` or `write_to_file`). Apply changes if approved, then proceed to `attempt_completion`.

**Constraint:** Do not offer reflection if:
*   No `.kilocode/rules/rules.md` were active.
*   The task was very simple and involved no feedback.
