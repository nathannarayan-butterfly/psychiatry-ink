#!/usr/bin/env python3
"""
Layer 1 of the Cursor-native security-guidance port.

Deterministic, dependency-light per-edit pattern scanner. Runs as a
`postToolUse` COMMAND hook (matcher: Write|Edit|MultiEdit). It reads the
hook payload from stdin, extracts the edited file path + new content, scans
it against `security_patterns.json` (plus an optional, gitignored
`security-patterns.local.json` for project-specific additive rules), and
emits any matches back to the agent via the `additional_context` output
field documented for `postToolUse`.

Design guarantees (see .cursor/hooks/README is the hooks.json + threat-model
md; this header is the contract):
  * FAIL OPEN ALWAYS. Malformed stdin, missing/broken pattern file, bad
    regex, or any unexpected error -> exit 0 with no output. This hook never
    blocks or fails an edit.
  * No third-party imports (stdlib only: sys/os/json/re). No network. No env
    reads required.
  * Advisory only: warnings are reminders, not gates.
"""
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILTIN_PATTERNS = os.path.join(SCRIPT_DIR, "security_patterns.json")
# Additive, project-local overrides (intended to be .gitignore'd). Mirrors the
# original plugin's `security-patterns.local.*` extension point.
LOCAL_PATTERNS = os.path.join(SCRIPT_DIR, "security-patterns.local.json")

# Output budget so a pathological edit can't flood the agent context.
MAX_OUTPUT_BYTES = 12000
MAX_FINDINGS = 12

# stdin payload keys we look at, most specific first. Cursor's exact
# postToolUse schema is not contractually guaranteed offline, so we probe a
# range of plausible keys and fall back to scanning the raw payload.
PATH_KEYS = (
    "file_path", "filePath", "target_file", "targetFile",
    "relative_path", "relativePath", "path", "file", "uri",
)
CONTENT_KEYS = (
    "content", "contents", "new_string", "newString", "new_content",
    "newContent", "file_contents", "fileContents", "text", "code", "value",
)


def _first_by_key(obj, keys, _depth=0):
    """Return the first string value found for the highest-priority key."""
    if _depth > 8:
        return None
    for key in keys:
        val = _search_key(obj, key, 0)
        if isinstance(val, str) and val:
            return val
    return None


def _search_key(obj, key, depth):
    if depth > 8:
        return None
    if isinstance(obj, dict):
        if key in obj and isinstance(obj[key], str):
            return obj[key]
        for v in obj.values():
            found = _search_key(v, key, depth + 1)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = _search_key(item, key, depth + 1)
            if found is not None:
                return found
    return None


def _collect_strings(obj, keys, out, depth=0):
    """Collect every string value stored under any of `keys` (e.g. all
    new_string values in a MultiEdit edits[] array)."""
    if depth > 8:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in keys and isinstance(v, str):
                out.append(v)
            _collect_strings(v, keys, out, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            _collect_strings(item, keys, out, depth + 1)


def extract_target(payload, raw):
    """Return (path, content_to_scan). Falls back to the raw stdin string when
    no structured content is found, so the scan still runs on schema drift."""
    path = _first_by_key(payload, PATH_KEYS) or ""
    contents = []
    _collect_strings(payload, CONTENT_KEYS, contents)
    content = "\n".join(contents) if contents else ""
    if not content:
        content = raw
    return path, content


def load_rules():
    rules = []
    for source in (BUILTIN_PATTERNS, LOCAL_PATTERNS):
        try:
            with open(source, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            # Missing local file is normal; broken builtin -> fail open (no rules).
            continue
        for entry in (data or {}).get("patterns", []):
            if isinstance(entry, dict) and entry.get("ruleName"):
                rules.append(entry)
    return rules


def _ext_of(path):
    clean = path.replace("\\", "/").split("?", 1)[0].lower()
    _, ext = os.path.splitext(clean)
    return ext


def rule_applies_to_path(rule, path):
    norm = path.replace("\\", "/")
    needle = rule.get("path_contains")
    if needle and needle not in norm:
        return False
    ext = _ext_of(path)
    include = rule.get("include_exts")
    if include:
        # Unknown extension (no path) can't satisfy an ext gate -> skip.
        if ext not in include:
            return False
    exclude = rule.get("exclude_exts")
    if exclude and ext in exclude:
        return False
    return True


def rule_matches(rule, content):
    for sub in rule.get("substrings") or []:
        if isinstance(sub, str) and sub and sub in content:
            return True
    regex = rule.get("regex")
    if regex:
        try:
            if re.search(regex, content):
                return True
        except re.error:
            return False
    # Path-only rule (no substrings, no regex): the path filter already
    # decided it applies, so a reached-here state is a match.
    if not (rule.get("substrings") or rule.get("regex")):
        return True
    return False


def build_context(findings, path):
    label = path or "edited file"
    header = (
        "[security-guidance] Pattern warnings for {f}\n"
        "These deterministic reminders flag known-dangerous patterns in the "
        "edit you just made. Address each, or briefly note in a comment why "
        "it is safe in this context, before moving on.\n".format(f=label)
    )
    lines = [header]
    seen = set()
    count = 0
    for rule in findings:
        name = rule.get("ruleName")
        if name in seen:
            continue
        seen.add(name)
        sev = str(rule.get("severity", "medium")).upper()
        reminder = str(rule.get("reminder", "")).strip()
        lines.append("\n--- [{sev}] {name} ---\n{rem}".format(
            sev=sev, name=name, rem=reminder))
        count += 1
        if count >= MAX_FINDINGS:
            lines.append("\n... additional findings suppressed (cap reached).")
            break
    text = "\n".join(lines)
    if len(text) > MAX_OUTPUT_BYTES:
        text = text[:MAX_OUTPUT_BYTES] + "\n... [truncated]"
    return text


def main():
    try:
        raw = sys.stdin.read()
    except Exception:
        sys.exit(0)
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except ValueError:
        sys.exit(0)  # fail open on malformed JSON
    if not isinstance(payload, (dict, list)):
        sys.exit(0)

    try:
        path, content = extract_target(payload, raw)
        rules = load_rules()
        findings = []
        for rule in rules:
            try:
                if rule_applies_to_path(rule, path) and rule_matches(rule, content):
                    findings.append(rule)
            except Exception:
                continue
        if not findings:
            sys.exit(0)
        print(json.dumps({"additional_context": build_context(findings, path)}))
    except Exception:
        # Absolute backstop: never crash, never block.
        sys.exit(0)
    sys.exit(0)


if __name__ == "__main__":
    main()
