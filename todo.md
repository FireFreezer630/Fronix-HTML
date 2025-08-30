### Needs to be fixed/changed
- Make sure messages are deleted from the database when the chats are deleted,
- Signout buttons not working and giving error : Cannot read properties of undefined (reading 'signOut')
- Test the chattitle generatir function
- If viable, change the title generator function into a websocket and do the required changes to make it quickly generate the chats title
- Inside the system prompt make it so that the webpage recognises the user's device and adds that instead of ypu are chatting w user on IOS app and make it personalised based on device, if on mobile make responses short and simple, and imitate user's tone but dont seem obvioud about it
- Also make it so that based on whatever model is selected its system prompt is updated with that models name, i.e. inside the system prompt it is added that You are {model-name}
- 
- 

### Needs to be added
- ## Dual AI mode
  # In this mode the user can interact with two ai models at once, and will work as follows, before implementing this push the last changes to git, and ONLY push these changes if I have confirmed it works without any errors .
  - Add a small bright blue plus icon next to the model selector dropdown,
  - Clicking on this plus button adds another dropdown to select another model and,
  - Closes the sidebar
  - Divides the chat menu into two sections, each of those section will have their independent models as selected by the user and independent requests .
  - If possible use some ready made element to divide the chat into two parts, also make the divider movable i.e. the width of each separate subwindow can be changes,
  - Also add a sync icon next to plus icon IF the plus icon is activated, activating this sync will make both the chats from that point onwards send the same api requests i.e. same message .
  - Plan necessary database changes required for this .
  - If the plus icon is again clicked a confirmation box opens and it asks the user if he is sure to close the dual ai mode,
  - When selected yes the main (original or the first chatwindows) is set as the only one,
- ## Memory tool
  # A function/tool which the ai models can execute to save particular info which it thinks will be required again or could help with personalizing with the user and engaging, then save it in memory, this is later added at the bottom of the system prompt, (USE context7 mcp and the docs folder for docs on how to add funciton calling for chats completions api format)
  - Add instruction in the system prompt telling it when to use memory tool
  - Add a memory button in settings opening which one can turn off memory (on by default) and can see what the ai has seen in memory
  - Add required changes in the db to save memory
  - !!Make sure to read the docs before implementing this feature
- ## Image Generation Tool
  # Add support for image generation alongside text models, user can pick which backend (PollinationsAI or A4F.co) to use from the model selector.
  - Add image models in the model selector along with the text models
  - Both the text models and images models can be selected,
  - THe selected image model is used in the function calling to generate images,
  - Use both the pollinations.ai, and a4f.co endpoint and if available airforce and navy too,
  - Ask me about which models to make free and which premium
  - !!MAKE SURE TO USE CONTEXT7 MCP and docs folder to read the docs for function calling 