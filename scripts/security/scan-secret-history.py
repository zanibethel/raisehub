#!/usr/bin/env python3
"""Scan reachable Git history for high-confidence credential patterns.

This intentionally uses `git grep -l`, which returns only revision/path names.
Matched credential values are never printed into CI logs.
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: str


# Patterns are split where practical so this scanner does not match its own
# source when traversing repository history.
RULES = [
    Rule("stripe_live_secret", "sk_" + "live_[A-Za-z0-9]{20,}"),
    Rule("stripe_webhook_secret", "wh" + "sec_[A-Za-z0-9]{20,}"),
    Rule("github_classic_token", "gh" + "[pousr]_[A-Za-z0-9]{30,}"),
    Rule("github_fine_grained_token", "github_" + "pat_[A-Za-z0-9_]{40,}"),
    Rule("openai_api_key", "sk-" + "(proj-)?[A-Za-z0-9_-]{30,}"),
    Rule("aws_access_key", "AK" + "IA[0-9A-Z]{16}"),
    Rule(
        "supabase_service_role_assignment",
        "SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*['\"]?[A-Za-z0-9._-]{40,}",
    ),
    Rule(
        "stripe_secret_assignment",
        "STRIPE_SECRET_KEY[[:space:]]*=[[:space:]]*['\"]?[A-Za-z0-9_-]{20,}",
    ),
    Rule(
        "private_key_block",
        "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
    ),
]

CHUNK_SIZE = 100


def git_lines(*args: str) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return [line for line in result.stdout.splitlines() if line]


def scan_rule(rule: Rule, revisions: list[str]) -> set[str]:
    findings: set[str] = set()
    for index in range(0, len(revisions), CHUNK_SIZE):
        chunk = revisions[index : index + CHUNK_SIZE]
        findings.update(
            git_lines("grep", "-I", "-l", "-E", "-e", rule.pattern, *chunk, "--")
        )
    return findings


def main() -> int:
    revisions = git_lines("rev-list", "--all")
    findings: list[tuple[str, str]] = []

    for rule in RULES:
        for location in sorted(scan_rule(rule, revisions)):
            findings.append((rule.name, location))

    if findings:
        print("Potential credential material was found in Git history.")
        print("Matched values are intentionally suppressed. Rotate/inspect before launch.")
        for name, location in sorted(set(findings)):
            print(f"- {name}: {location}")
        return 1

    print("No high-confidence credential patterns found in reachable Git history.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
