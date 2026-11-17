# Repository instructions

- Always update `CHANGELOG.md` in the same commit or pull request as every change, including fixes, documentation, tooling and these instructions. Add a concise entry under the current date (YYYY-MM-DD); retain existing history. `changelog.html` reads this file, so do not duplicate entries in HTML.
- After making all changes, run `python3 scripts/update_cache.py` and include every generated change (`site-version.json` and stamped HTML files). This updates the release version and local asset URLs automatically from the repository contents. Never hand-edit version stamps.
- Run `python3 scripts/update_cache.py --check` before finishing. CI runs this check as well.
- Keep these static tools compatible with GitHub Pages and repository subpath hosting. Do not add a service worker or cache personal contact details, uploaded images, or other user data.
- Verify the affected tool and summarize validation and any deployment limitations in the pull request.
