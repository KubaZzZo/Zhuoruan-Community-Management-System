"""Run the existing browser suite in an isolated, headless Chrome instance."""

import os
from pathlib import Path
import socket
import subprocess
import sys

from playwright.sync_api import sync_playwright


def main():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        debug_port = listener.getsockname()[1]

    root = Path(__file__).resolve().parent.parent
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            channel="chrome",
            args=[f"--remote-debugging-port={debug_port}"],
        )
        try:
            environment = dict(
                os.environ, CHROME_DEBUG_ORIGIN=f"http://127.0.0.1:{debug_port}"
            )
            result = subprocess.run(
                ["node", "tests/test_browser.cjs"],
                cwd=root,
                env=environment,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            print(result.stdout, end="")
            print(result.stderr, end="", file=sys.stderr)
            return result.returncode
        finally:
            browser.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
