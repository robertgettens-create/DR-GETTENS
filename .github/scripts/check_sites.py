"""Weekly health check for the GitHub Pages sites. Exits 1 if any site has a problem."""
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

SITES = [
    "https://robertgettens-create.github.io/",
    "https://robertgettens-create.github.io/DR-GETTENS/",
]
# Bot-blocking responses: report as unverified, not broken.
SOFT_STATUS = {401, 403, 405, 429, 999}
HEADERS = {"User-Agent": "Mozilla/5.0 (site-health-check)"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.problems = [], []
        self.title = self.viewport = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.title = True
        if tag == "meta" and a.get("name") == "viewport":
            self.viewport = True
        if tag == "img" and "alt" not in a:
            self.problems.append(f"<img src={a.get('src')}> has no alt text")
        for key in ("href", "src"):
            if a.get(key) and (tag != "link" or a.get("rel") != "preconnect"):
                self.refs.append(a[key])


def fetch(url, method="GET"):
    """Return (status, body bytes). Retries once on network errors."""
    for attempt in (1, 2):
        try:
            req = urllib.request.Request(url, headers=HEADERS, method=method)
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.status, r.read() if method == "GET" else b""
        except urllib.error.HTTPError as e:
            return e.code, b""
        except Exception as e:  # timeouts, DNS, TLS
            if attempt == 2:
                return str(e), b""


def main():
    problems, unverified, checked = [], [], {}
    queue, seen_pages = list(SITES), set()
    js_urls = set()

    while queue:
        url = queue.pop(0)
        if url in seen_pages:
            continue
        seen_pages.add(url)
        status, body = fetch(url)
        if status != 200:
            problems.append(f"PAGE {url} -> {status}")
            continue
        p = Page()
        p.feed(body.decode("utf-8", "replace"))
        if not p.title:
            problems.append(f"{url}: missing <title>")
        if not p.viewport:
            problems.append(f"{url}: missing viewport meta tag")
        problems += [f"{url}: {m}" for m in p.problems]

        site_root = next(s for s in SITES if url.startswith(s))
        for ref in set(p.refs):
            if ref.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
                continue
            full = urllib.parse.urldefrag(urllib.parse.urljoin(url, ref))[0]
            if full in checked:
                continue
            internal = full.startswith(site_root)
            if internal and full.split("?")[0].endswith((".html", "/")) and full not in seen_pages:
                queue.append(full)
                checked[full] = True
                continue
            if full.endswith(".js") and internal:
                js_urls.add(full)
            st, _ = fetch(full, "GET" if internal else "HEAD")
            if st == 405:  # HEAD not allowed
                st, _ = fetch(full)
            checked[full] = st
            if st == 200 or (isinstance(st, int) and 300 <= st < 400):
                continue
            if isinstance(st, int) and st in SOFT_STATUS:
                unverified.append(f"{full} -> {st} (referenced from {url})")
            else:
                problems.append(f"BROKEN {full} -> {st} (referenced from {url})")

    for js in sorted(js_urls):
        _, code = fetch(js)
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as f:
            f.write(code)
        r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
        os.unlink(f.name)
        if r.returncode:
            problems.append(f"JS syntax error in {js}: {r.stderr.strip()[:300]}")

    lines = [f"## Website health check: {'ALL SITES HEALTHY' if not problems else str(len(problems)) + ' ISSUES FOUND'}", ""]
    lines.append(f"Pages crawled: {len(seen_pages)}; references checked: {len(checked)}")
    if problems:
        lines += ["", "### Problems"] + [f"- {x}" for x in problems]
    if unverified:
        lines += ["", "### Unverified (site blocks automated checks; spot-check by hand)"] + [f"- {x}" for x in unverified]
    out = "\n".join(lines)
    print(out)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(out + "\n")
    sys.exit(1 if problems else 0)


main()
