# LuxAeris V16

This build includes:
- fixed `request.html` flow after the homepage form submit
- improved premium request page layout
- autocomplete dropdowns anchored directly under Origin and Destination fields
- metro city code support such as NYC, LON, PAR, CHI, YTO
- Google Sheets submission wired to the deployed Apps Script endpoint

## Google Sheets endpoint in this build
The frontend is already connected to:

`https://script.google.com/macros/s/AKfycbyqmp583lxg3IEorhq4SaiXu2VrrMO1hUeQ1e2e4sByfqaLFMetKFeKir9Zi4AWopZk/exec`

## Included Apps Script
Use the file in `google-apps-script/Code.gs` inside your spreadsheet project.

## Notes
- Replace `assets/video/hero-background.mp4` with the real background video before deploying.
- Deploy on Netlify as a static site.
