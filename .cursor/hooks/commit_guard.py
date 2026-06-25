#!/usr/bin/env python3
"""
Layer 3 of the Cursor-native security-guidance port: the commit-time gate.

Runs as a `beforeShellExecution` COMMAND hook (matcher: "git commit"). It reads
the hook payload from stdin, inspects the shell command, and emits a well-formed
`beforeShellExecution` decision on stdout using ONLY the supported fields
(permission, user_message, agent_message).

Why this is a command hook and not a prompt hook:
  The previous Layer 3 was a `type: "prompt"` hook. A model evaluated the prompt
  and was supposed to return {permission, ...}. When the model instead leaked an
  {"ok": ..., "reason": ...} shaped object, Cursor saw an invalid decision schema
  and HARD-BLOCKED every `git commit`. Putting the decision in a deterministic
  script removes the model from the hot path, so the output schema can never
  drift again.

Decision policy (intent preserved from the original prompt hook):
  * Not a real `git commit` (e.g. `git commit --help`, `git config`, anything
    that merely contains the substring) -> {"permission": "allow"}.
  * A real `git commit` -> {"permission": "ask", ...} carrying the security-review
    guidance as advisory text. "ask" surfaces a NORMAL approval prompt (not a
    hard error), so the human can approve and the commit proceeds.

Safety guarantees:
  * FAIL OPEN ALWAYS. Malformed stdin, missing keys, or any unexpected error ->
    print {"permission": "allow"} and exit 0. This hook never hard-blocks.
  * Never returns "deny". Never exits non-zero.
  * Stdlib only (sys/json/shlex/re). No network, no third-party imports.
"""
import json
import re
import shlex
import sys

# Fields supported by beforeShellExecution: permission, user_message, agent_message.
ALLOW = {"permission": "allow"}

SECURITY_REVIEW = {
    "permission": "ask",
    "user_message": "Security-guidance: review staged changes before this commit.",
    "agent_message": (
        "Before running this commit, perform a security review of the staged "
        "changes. Run `git diff --cached` and trace data flow across files for: "
        "IDOR / broken object-level authz, authentication or ownership bypass, "
        "SSRF, injection (SQL/command/template), unsafe deserialization, path "
        "traversal, and hardcoded secrets. Apply the project-specific rules in "
        ".cursor/hooks/security-guidance.md (PHI routes must require real auth "
        "and never fall back to a 'default' account; LLM-bound PHI must be "
        "de-identified server-side; no plaintext PHI at rest or in logs). For "
        "each HIGH/CRITICAL finding, fix it or state explicitly why it is not "
        "exploitable here, then re-run the commit. This is advisory: if the "
        "staged diff is clean or contains no security-relevant changes, proceed "
        "with the commit."
    ),
}

# Probe a range of plausible keys; Cursor's exact field name is not contractually
# guaranteed offline, so fall back gracefully.
COMMAND_KEYS = ("command", "commandLine", "command_line", "cmd", "shellCommand")


def _find_command(payload):
    if isinstance(payload, dict):
        for key in COMMAND_KEYS:
            val = payload.get(key)
            if isinstance(val, str) and val:
                return val
        # Nested shapes (e.g. {"tool_input": {"command": ...}}).
        for val in payload.values():
            found = _find_command(val)
            if found:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _find_command(item)
            if found:
                return found
    return ""


def is_real_git_commit(command):
    """True only for an actual commit-creating `git commit ...` invocation.

    Excludes `git commit --help`/`-h` and anything where "commit" is not the git
    subcommand (e.g. `git config`, `git log --grep="commit"`).
    """
    if not command:
        return False

    # Handle compound commands (&&, ||, ;, |) by checking each segment.
    for segment in re.split(r"&&|\|\||[;|]", command):
        segment = segment.strip()
        if not segment:
            continue
        try:
            tokens = shlex.split(segment)
        except ValueError:
            # Unbalanced quotes etc. -> cheap substring fallback for this segment.
            tokens = segment.split()
        if not tokens:
            continue

        # Find the `git` executable token (allow leading env assignments like
        # `GIT_AUTHOR_NAME=x git commit`).
        idx = 0
        while idx < len(tokens) and "=" in tokens[idx] and not tokens[idx].startswith("-"):
            idx += 1
        if idx >= len(tokens):
            continue
        if tokens[idx].split("/")[-1] != "git":
            continue

        # Walk past `git` and any global flags/options to the subcommand.
        j = idx + 1
        while j < len(tokens):
            tok = tokens[j]
            if tok in ("-C", "-c", "--git-dir", "--work-tree", "--namespace"):
                j += 2  # flag takes an argument
                continue
            if tok.startswith("-"):
                j += 1
                continue
            break
        if j >= len(tokens) or tokens[j] != "commit":
            continue

        # It's `git commit`; exclude pure help invocations.
        rest = tokens[j + 1:]
        if any(t in ("--help", "-h") for t in rest):
            continue
        return True

    return False


def main():
    try:
        raw = sys.stdin.read()
    except Exception:
        print(json.dumps(ALLOW))
        return
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except ValueError:
        print(json.dumps(ALLOW))
        return

    try:
        command = _find_command(payload)
        if is_real_git_commit(command):
            print(json.dumps(SECURITY_REVIEW))
        else:
            print(json.dumps(ALLOW))
    except Exception:
        # Absolute backstop: never block.
        print(json.dumps(ALLOW))


if __name__ == "__main__":
    main()
    sys.exit(0)
