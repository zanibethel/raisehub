#!/usr/bin/env python3
"""Scan every reachable Git blob for high-confidence credential patterns.

The scanner never prints matched credential content. Failures report only the
rule name, blob SHA, and repository path so exposed credentials can be rotated
without copying them into CI logs.
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass

MAX_BLOB_BYTES = 2 * 1024 * 1024


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: re.Pattern[str]


RULES = [
    Rule("stripe_live_secret", re.compile(r"sk_" + r"live_[A-Za-z0-9]{20,}")),
    Rule("stripe_webhook_secret", re.compile(r"wh" + r"sec_[A-Za-z0-9]{20,}")),
    Rule("github_classic_token", re.compile(r"gh" + r"[pousr]_[A-Za-z0-9]{30,}")),
    Rule("github_fine_grained_token", re.compile(r"github_" + r"pat_[A-Za-z0-9_]{40,}")),
    Rule("openai_api_key", re.compile(r"sk-" + r"(?:proj-)?[A-Za-z0-9_-]{30,}")),
    Rule("aws_access_key", re.compile(r"AK" + r"IA[0-9A-Z]{16}")),
    Rule(
        "supabase_service_role_assignment",
        re.compile(r"SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"]?[A-Za-z0-9._-]{40,}"),
    ),
    Rule(
        "stripe_secret_assignment",
        re.compile(r"STRIPE_SECRET_KEY\s*=\s*['\"]?[A-Za-z0-9_-]{20,}"),
    ),
    Rule(
        "private_key_block",
        re.compile(r"-----BEGIN " + r"(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    ),
]


def git(*args: str, text: bool = True) -> str | bytes:
    return subprocess.check_output(["git", *args], text=text)


def reachable_blobs() -> list[tuple[str, str]]:
    seen: set[str] = set()
    blobs: list[tuple[str, str]] = []

    for line in str(git("rev-list", "--objects", "--all")).splitlines():
        sha, _, path = line.partition(" ")
        if not sha or sha in seen:
            continue
        seen.add(sha)
        try:
            object_type = str(git("cat-file", "-t", sha)).strip()
        except subprocess.CalledProcessError:
            continue
        if object_type == "blob":
            blobs.append((sha, path or "<unknown-path>"))

    return blobs


def main() -> int:
    findings: list[tuple[str, str, str]] = []

    for sha, path in reachable_blobs():
        try:
            size = int(str(git("cat-file", "-s", sha)).strip())
        except (subprocess.CalledProcessError, ValueError):
            continue
        if size > MAX_BLOB_BYTES:
            continue

        try:
            raw = git("cat-file", "blob", sha, text=False)
        except subprocess.CalledProcessError:
            continue
        assert isinstance(raw, bytes)
        text = raw.decode("utf-8", errors="ignore")

        for rule in RULES:
            if rule.pattern.search(text):
                findings.append((rule.name, sha, path))

    if findings:
        print("Potential credential material was found in Git history.")
        print("Matched values are intentionally suppressed. Rotate/inspect before launch.")
        for name, sha, path in sorted(set(findings)):
            print(f"- {name}: blob={sha} path={path}")
        return 1

    print("No high-confidence credential patterns found in reachable Git history.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
