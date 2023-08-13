<u>The following is a draft</u>

# iCalObsidianSync
This Obsidian plugin allows for the sync between macOS/iOS native iCal and Obsidian.

## 
## TO-DO
The project is an absolute draft and the core functionalities are not ready yet: The following list will be useful to keep everything in mind.

The tasks are listed in importance order.

- ~~⚠️  General refactor: Since this is my first plugin I experimented a bit but it's time for a good module separation~~ ✅
- ~~⚠️ Understand how to safely store credentials inside an Electron app~~ ✅
- ⚠️ Understand how to efficiently store and cache the previously filtered tags
- ⚠️ Create event listeners to sync tags in real-time
- Find a way to manage different calendars (UI selection?)
- ~~⚠️ Automate the login once the device is labelled as **Trusted**~~ ✅
- ~~⚠️ Separate env variables~~ ✅
- Implement different syntaxes (including the variation illustrated in the README.md)
- ~~Fully understand if a server embedded inside Obsidian (Electron application) can't bypass CORS restrictions (at the moment they've bypassed thanks to an external CORS proxy server, the very simple .js file can be found in this repository)~~ ✅
- ~~Performance testing with Glitch server~~ Switched to Render
- It would be nice to think about extra applications of the iCloud sync since the plugin can potentially interact with the whole ecosystem
