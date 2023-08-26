# iCalObsidianSync
This Obsidian plugin allows to synchronize iCalendar (and soon Google Calendar too!) with your Obsidian notes.

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
The plugin works on top of a **NLP** library [(NLP wink)](https://winkjs.org/wink-nlp/). <br>
First, the sentence is split into tokens, entities and Part-of-Speeches. Once the sentence has been broken down into understandable components, it's time to filter them following common patterns that include dates, times, durations, event-related nouns and purposes. In order to keep iCalSync lightweight, the number of patterns is not huge, nevertheless the recognition process scores high levels of precision.

### iCloud module
The communication with iCloud wouldn't be possible without the help of [iCloud.js](https://github.com/foxt/icloud.js.git). The library has been opportunely modified to support POST requests and bypass CORS policies. <br>
Since Apple doesn't support OAuth, it's necessary to login with email and password. These inserted credentials are stored exclusively in your local device (AES encrypted) in order to avoid a manual login everytime a token refresh is needed. The encryption key is randomly generated when the plugin is installed. It can be manually changed in the settings section (not recommended).


# What's new?
### v.1.1.3
- Inline event view beta
- Bugfix: non-editable widget bug
- NPL module improvements:
	1) Fine-tuning
### v.1.1.2
- Implement internal counter to keep track of the number of cumulative synchronizations
- Community review adjustments
### v.1.1.1
- Bugfix: date parsing
### v.1.1.0
- No need for a CORS proxy anymore
- NPL module improvements:
	1) Entity-related attributes identification
	2) Event purpose recognition
	3) Bugfix: entity overlap

# Currently in development phase
- **Event inline view**: From version v.1.2.0 will be possible to embed iCalendar events in your notes. The user will be able to interact with the events directly and automatically synchronize the event with their calendar
<p align="center">
  <img width="650" src="https://raw.githubusercontent.com/Vaccarini-Lorenzo/iCalObsidianSync/main/materials/inlineViewDemo.gif">
</p>

- **Google calendar integration**: Project refactor to support multiple calendars
