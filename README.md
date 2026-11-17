# i-tabu / Tools
List of all the simple tools (mostly simple quick utilities, mostly for personal use and just to pass my time :) )

TOOLS -> [https://i-tabu.github.io/tools/](https://i-tabu.github.io/tools/)

## Spectrogram
A simple spectrogram, to help with mostly voice feminzation but people may find other uses :)

DEMO -> [https://i-tabu.github.io/spectrogram/](https://i-tabu.github.io/spectrogram/)

## json-parser

A simple & quick tool to parse json into tidy readable format

DEMO -> [https://i-tabu.github.io/json-parser/](https://i-tabu.github.io/json-parser/)

## Timer
A simple timer

DEMO -> [https://i-tabu.github.io/timer](https://i-tabu.github.io/timer)

## Request
A simplet HRTP Request Sender

DEMO -> [https://i-tabu.github.io/request](https://i-tabu.github.io/request) 

----
[Check deployments](https://github.com/i-tabu/tools/deployments)

## Digital Business Card

Enter your name, occupation, company, mobile, email, and website to generate a business card with a vCard 3.0 QR code. A name and at least one phone number or email are required. Scan with a compatible phone and confirm adding the contact, or download the .vcf file directly. Card and QR PNG downloads are available. Contact details are processed locally without storage or uploads.

Open [Digital Business Card](https://tools.itabu.xyz/business-card.html).

QR generation uses the vendored MIT-licensed qrcode-generator 1.4.4 library by Kazuhiko Arase (including its UTF-8 extension); see vendor/qrcode.LICENSE.

## Updating the site

Update `CHANGELOG.md` for every change, then run `python3 scripts/update_cache.py` and commit its generated changes. Run `python3 scripts/update_cache.py --check` to verify that the release manifest, page stamps, and local asset URLs match the current repository contents. CI performs the same check.

On page load, the inline version check fetches `site-version.json` without browser caching and with a unique request URL. A newer release redirects once to a versioned page URL, preserving other query parameters and the fragment. Local scripts and styles use versioned URLs too. The check fails silently when offline and does not reload tools while you are editing them. Existing visitors may need one hard refresh after this mechanism is first deployed; subsequent releases are detected on page load. GitHub Pages deployment/CDN propagation must finish before any new release can appear.
