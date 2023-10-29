# MagicCalendar
This Obsidian plugin allows to synchronize your calendar of choice with Obsidian.
The plugin is still in beta and at the moment the supported calendars are:
- Apple Calendar
- Google Calendar

<p align="center">
  <img width="650" src="https://raw.githubusercontent.com/Vaccarini-Lorenzo/MagicCalendar/main/materials/magicCalendarDemo.gif">
</p>

# Getting started
### Installation
Currently, this plugin is not registered as a standard community plugin for downloading or updating within Obsidian. <br>
To install it:
- Check the [latest release](https://github.com/Vaccarini-Lorenzo/MagicCalendar/releases/latest)
- Download ```magic-calendar.zip```
- Unzip the file and move the ```magic-calendar``` folder into your Obsidian plugin folder
- Enable the plugin from your Obsidian settings.

### Log-in
To interact with Apple Calendar you'll need to log-in into your iCloud account.
Your credentials will be stored <ins>exclusively</ins> in your local device (encrypted).<br> Check the **How it works** section for more informations.<br>
Google, on the other hand, supports OAuth2 authentication.
Just click on the calendar ribbon icon to select your calendar provider and log-in.
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
- **Event inline view**: From version v.1.2.0 will be possible to embed calendar events in your notes. The user will be able to interact with the events directly and automatically synchronize the event with their calendar
<p align="center">
  <img width="650" src="https://raw.githubusercontent.com/Vaccarini-Lorenzo/MagicCalendar/main/materials/inlineViewDemo.gif">
</p>

- **Google calendar integration**: Project refactor to support multiple calendars
