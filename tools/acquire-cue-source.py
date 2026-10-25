"""Acquire one documented public source into an explicit experiment directory."""
import hashlib
import json
import pathlib
import sys
import urllib.request

URL = "https://upload.wikimedia.org/wikipedia/commons/c/c5/Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm"
PAGE = "https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm"
EXPECTED = "06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe"
LIMIT = 2 * 1024 * 1024
directory = pathlib.Path(sys.argv[1]).resolve()
directory.mkdir(parents=True, exist_ok=True)
target = directory / "scissors-original.webm"
if target.exists():
    if target.stat().st_size > LIMIT or hashlib.sha256(target.read_bytes()).hexdigest() != EXPECTED:
        raise SystemExit("Existing original differs; left untouched")
else:
    partial = directory / "scissors-original.webm.part"
    request = urllib.request.Request(URL, headers={"User-Agent": "HAMON-source-receiving/1.0 (local research; original-source verification)"})
    count = 0
    digest = hashlib.sha256()
    with partial.open("xb") as output:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.getheader("Content-Length") and int(response.getheader("Content-Length")) > LIMIT:
                raise SystemExit("Source exceeds the declared acquisition limit")
            while block := response.read(65536):
                count += len(block)
                if count > LIMIT:
                    raise SystemExit("Source exceeds the declared acquisition limit")
                output.write(block)
                digest.update(block)
    if digest.hexdigest() != EXPECTED:
        raise SystemExit("Downloaded source hash differs; partial retained, no accepted original written")
    partial.rename(target)
(directory / "source-attribution.json").write_text(json.dumps({
    "author": "Aerra Carnicom / Aerrapc",
    "title": "Aerra's Films of the Ordinary IV -- Scissors Cutting Card Stock",
    "sourcePage": PAGE, "originalUrl": URL,
    "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "sha256": EXPECTED, "use": "Separately retained source and observer-authored frame extraction; no media redistributed with code",
}, indent=2))
print(json.dumps({"path": str(target), "bytes": target.stat().st_size, "sha256": EXPECTED}))
