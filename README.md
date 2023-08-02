<u>The following is a draft</u>

# iCalObsidianSync
This Obsidian plugin allows for the sync between macOS/iOS native iCal and Obsidian.

## Syntax
To sync something with iCal just insert a tag with the following syntax.

```
All-day event:
#iCal/YYYY-MM-DD/Title_of_your_event

Event with fixed duration:
1) #iCal/YYYY-MM-DD/HH-MM/HH-MM/Title_of_your_event

The first HH-MM block is the start time and the second one is the end time


2) #iCal/YYYY-MM-DD/D/Title_of_your_event

The D block stands for the duration and it's specified in minutes
```

## TO-DO
The project is an absolute draft and the core functionalities are not ready yet: The following list will be useful to keep everything in mind (since the main working hours are between 23:00 and 03:00).

- General refactor: Since this is my first plugin I experimented a bit but it's time for a good module separation
- Implement different syntaxes (including the variation illustrated in the README.md)
- Fully understand if a server embedded inside Obsidian (Electron application) can't bypass CORS restrictions (at the moment they've bypassed thanks to an external CORS proxy server, the very simple .js file can be found in this repository)
- Performance testing with Glitch server
- Understand how to safely store credentials inside an Electron app
- Understand how to efficiently store and cache the previously filtered tags
- Automate the login once the device is labelled as **Trusted**
- It would be nice to think about extra applications of the iCloud sync since the plugin can potentially interact with the whole ecosystem
