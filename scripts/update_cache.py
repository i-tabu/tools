#!/usr/bin/env python3
"""Stamp static pages and local assets with a deterministic release version."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
STAMP = re.compile(r'\n?<!-- site-version:start -->.*?<!-- site-version:end -->\n?', re.S)
ASSET = re.compile(r'(<(?:script|link)\b[^>]*?\b(?:src|href)=)([\'"])([^\'"]+)(\2)', re.I)


def asset_url(url, version=None):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path.endswith(('.js', '.css')):
        return url
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != 'v']
    if version:
        query.append(('v', version))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def assets(html, version=None):
    return ASSET.sub(lambda m: m[1] + m[2] + asset_url(m[3], version) + m[4], html)


def stamp(version, manifest):
    # Inline so even a cached HTML document can check for a newer deployed version.
    return '''\n<!-- site-version:start -->
<script>
(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const manifest = new URL(%s, location.href);
  manifest.searchParams.set('_', Date.now());
  fetch(manifest, { cache: 'no-store', signal: controller.signal })
    .then(response => { if (!response.ok) throw new Error('Version unavailable'); return response.json(); })
    .then(({ version }) => {
      if (!/^[a-f0-9]{16}$/.test(version) || version === '%s') return;
      const url = new URL(location.href);
      if (url.searchParams.get('v') === version) return;
      url.searchParams.set('v', version);
      location.replace(url.href);
    })
    .catch(() => {})
    .finally(() => clearTimeout(timeout));
})();
</script>
<!-- site-version:end -->\n''' % (json.dumps(manifest), version)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail if generated files need updating')
    args = parser.parse_args()
    sources = {}
    for path in sorted(ROOT.rglob('*')):
        relative = path.relative_to(ROOT)
        if any(part in {'.git', 'node_modules', '__pycache__'} for part in relative.parts):
            continue
        if path.is_file() and path.name != 'site-version.json':
            text = path.read_bytes()
            if path.suffix == '.html':
                text = assets(STAMP.sub('\n', text.decode())).encode()
            sources[relative] = text
    digest = hashlib.sha256()
    for relative, text in sources.items():
        digest.update(relative.as_posix().encode() + b'\0' + text + b'\0')
    version = digest.hexdigest()[:16]
    outputs = {Path('site-version.json'): json.dumps({'version': version}) + '\n'}
    for relative, text in sources.items():
        if relative.suffix != '.html' or not re.search(rb'<head\b', text, re.I):
            continue
        prefix = '../' * (len(relative.parts) - 1)
        html = assets(text.decode(), version)
        anchor = r'(<meta\b[^>]*charset[^>]*>)(\s*)' if re.search(r'<meta\b[^>]*charset', html, re.I) else r'(<head\b[^>]*>)(\s*)'
        outputs[relative] = re.sub(anchor, lambda m: m[1] + stamp(version, prefix + 'site-version.json') + m[2].lstrip('\n'), html, count=1, flags=re.I)
    stale = []
    for relative, expected in outputs.items():
        path = ROOT / relative
        if not path.exists() or path.read_text() != expected:
            stale.append(str(relative))
            if not args.check:
                path.write_text(expected)
    if args.check and stale:
        raise SystemExit('Run python3 scripts/update_cache.py and commit: ' + ', '.join(stale))
    print(('Checked' if args.check else 'Updated') + ' cache version ' + version)


if __name__ == '__main__':
    main()
