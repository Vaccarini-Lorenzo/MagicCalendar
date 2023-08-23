# iCalObsidianSync
This Obsidian plugin allows to synchronize iCalendar with your Obsidian notes.

<p align="center">
  <img width="650" src="https://raw.githubusercontent.com/Vaccarini-Lorenzo/iCalObsidianSync/main/materials/iCalDemo.gif">
</p>

# Getting started
### Installation
Currently, this plugin is not registered as a standard community plugin for downloading or updating within Obsidian. <br>
To install it:
- Check the [latest release](https://github.com/Vaccarini-Lorenzo/iCalObsidianSync/releases/latest)
- Download ```ical-obsidian-sync.zip```
- Unzip the file and move the ```ical-obsidian-sync``` folder into your Obsidian plugin folder
- Enable the plugin from your Obsidian settings.

### Log-in
To interact with iCalendar you'll need to login into your iCloud account.
Your credentials will be stored <ins>exclusively</ins> in your local device (encrypted).<br> Check the **How it works** section for more informations.<br>
To login just look for *iCalSync* in your command palette.

### Just sync it
That's it. Just write an event and the plugin will try its best to identify it.

# How it works
### NLP module
The plugin works on top of a **NLP** library [(NLP wink)](https://winkjs.org/wink-nlp/). The NLP module associates dates to intentions, nouns and proper names. At the moment the project is still in an early stage so some event might not be recognized or may not be accurate.

### iCloud module
The communication with iCloud wouldn't be possible without the help of [iCloud.js](https://github.com/foxt/icloud.js.git). The library has been opportunely modified to support POST requests and bypass CORS policies. <br>
Since Apple doesn't support OAuth, it's necessary to login with email and password. These inserted credentials are stored exclusively in your local device (AES encrypted) in order to avoid a manual login everytime a token refresh is needed. The encryption key is randomly generated when the plugin is installed. It can be manually changed in the settings section (not recommended).


# What's new?
### v.1.1.0
- No need for a CORS proxy anymore
- NPL module improvements:
  1) Entity-related attributes identification
  2) Event purpose recognition
  3) Fix entity overlap bug

# Currently in development phase
- **Event inline view**: From version v.1.2.0 will be possible to embed iCalendar events in your notes

<p align="center">
  <img width="650" src="https://raw.githubusercontent.com/Vaccarini-Lorenzo/iCalObsidianSync/main/materials/inlineViewDemo.gif">
</p>
