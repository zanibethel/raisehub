#!/usr/bin/env python3
"""Scan reachable Git history for high-confidence credential patterns.

The scanner uses `git log -G` without patch output, so matched credential values
never appear in CI logs. Only rule names, commit IDs, and affected paths are
reported when a historical diff contains a credential pattern.
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: str


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


def git_lines(*args: str) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.splitlines()


def scan_rule(rule: Rule) -> set[tuple[str, str]]:
    lines = git_lines(
        "log",
        "--all",
        "--no-renames",
        "--format=COMMIT:%H",
        "--name-only",
        f"-G{rule.pattern}",
    )

    commit = "<unknown>"
    findings: set[tuple[str, str]] = set()
    for line in lines:
        if line.startswith("COMMIT:"):
            commit = line.removeprefix("COMMIT:")
        elif line.strip():
            findings.add((commit, line.strip()))
    return findings


def main() -> int:
    findings: list[tuple[str, str, str]] = []

    for rule in RULES:
        for commit, path in sorted(scan_rule(rule)):
            findings.append((rule.name, commit, path))

    if findings:
        print("Potential credential material was found in Git history.")
        print("Matched values are intentionally suppressed. Rotate/inspect before launch.")
        for name, commit, path in sorted(set(findings)):
            print(f"- {name}: commit={commit} path={path}")
        return 1

    print("No high-confidence credential patterns found in reachable Git history.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
