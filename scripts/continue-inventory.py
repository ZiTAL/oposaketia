#!/usr/bin/env python3
"""Continue one verified inventory source when the Codex account can work."""

import argparse
import fcntl
import json
import os
from pathlib import Path
import select
import shutil
import subprocess
import sys
import tempfile
import time


REPO = Path(__file__).resolve().parent.parent
STATE = Path.home() / ".local" / "state" / "oposaketia"
PROMPT = """Continue the Oposaketia official public-employment source inventory.

This is an unattended, bounded run. Work on exactly ONE pending institution or
municipality from docs/inventory and the original report. Find its official
employment source, add a scraper only if real public calls and their official
documents can be verified, and record the evidence and limits in the inventory.
Never invent a call, requirement, deadline, or syllabus. If the official source
is inaccessible, record a useful verified review instead. Follow existing
scraper patterns and repository instructions. Run focused tests and the inventory
audit where appropriate. Do not modify the untracked codex.sh in the main checkout.

Commit the completed increment as zital
<2283548+ZiTAL@users.noreply.github.com>. Make exactly ONE commit. Do not push;
the scheduler checks the result and pushes it. Do not modify the main checkout,
deploy containers, ask questions, or start another inventory increment. If a
complete verified increment is impossible, leave this worktree clean and exit.
"""


def run(*args, cwd=REPO, timeout=120):
    return subprocess.run(args, cwd=cwd, check=True, timeout=timeout, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def codex_available():
    """Fail closed when the usage answer is absent or uncertain."""
    process = subprocess.Popen(["codex", "app-server", "--stdio"],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True, bufsize=1)

    def request(request_id, method, params):
        process.stdin.write(json.dumps({"id": request_id, "method": method,
                                        "params": params}) + "\n")
        process.stdin.flush()
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            ready, _, _ = select.select([process.stdout], [], [],
                                        max(0, deadline - time.monotonic()))
            if not ready:
                break
            line = process.stdout.readline()
            if not line:
                break
            message = json.loads(line)
            if message.get("id") == request_id:
                return message
        raise TimeoutError(f"No response to {method}")

    try:
        init = request(1, "initialize", {"clientInfo": {
            "name": "oposaketia_inventory_cron", "title": "Oposaketia inventory cron",
            "version": "1.0.0"}})
        if "result" not in init:
            return False
        process.stdin.write(json.dumps({"method": "initialized"}) + "\n")
        process.stdin.flush()
        usage = request(2, "account/rateLimits/read",
                        {"excludeResetCreditDetails": True})
        return usage.get("result", {}).get("ordinaryUsageAllowed") is True
    except (OSError, ValueError, TimeoutError, BrokenPipeError):
        return False
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def continue_inventory():
    if run("git", "branch", "--show-current") != "main":
        print("Skipped: main checkout is not on main")
        return
    changed = run("git", "status", "--porcelain=v1").splitlines()
    if any(line != "?? codex.sh" for line in changed):
        print("Skipped: main checkout has other local changes")
        return

    run("git", "fetch", "origin", "main")
    start = run("git", "rev-parse", "HEAD")
    if start != run("git", "rev-parse", "origin/main"):
        print("Skipped: main and origin/main differ")
        return

    worktree = Path(tempfile.mkdtemp(prefix="oposaketia-inventory-"))
    added = False
    try:
        run("git", "worktree", "add", "--detach", str(worktree), start)
        added = True
        dependencies = REPO / "node_modules"
        if dependencies.is_dir():
            linked_dependencies = worktree / "node_modules"
            linked_dependencies.mkdir()
            for item in dependencies.iterdir():
                (linked_dependencies / item.name).symlink_to(item,
                                                              target_is_directory=item.is_dir())

        command = ["codex", "exec", "-C", str(worktree), "--ephemeral",
                   "--sandbox", "danger-full-access", "-c", "approval_policy=never",
                   PROMPT]
        print("Codex has capacity; continuing one inventory increment", flush=True)
        environment = os.environ.copy()
        environment.update({
            "GIT_AUTHOR_NAME": "zital",
            "GIT_AUTHOR_EMAIL": "2283548+ZiTAL@users.noreply.github.com",
            "GIT_COMMITTER_NAME": "zital",
            "GIT_COMMITTER_EMAIL": "2283548+ZiTAL@users.noreply.github.com",
        })
        completed = subprocess.run(command, cwd=worktree, timeout=45 * 60,
                                   env=environment, text=True,
                                   stdout=sys.stdout, stderr=sys.stderr)
        if completed.returncode != 0:
            print(f"Codex stopped with exit code {completed.returncode}; no push")
            return
        if run("git", "status", "--porcelain=v1", cwd=worktree):
            print("Worktree is not clean; no push")
            return
        if run("git", "rev-list", "--count", f"{start}..HEAD", cwd=worktree) != "1":
            print("Expected exactly one completed commit; no push")
            return
        author = run("git", "show", "-s", "--format=%an <%ae>", cwd=worktree)
        if author != "zital <2283548+ZiTAL@users.noreply.github.com>":
            print(f"Unexpected commit author: {author}; no push")
            return

        run("git", "push", "origin", "HEAD:refs/heads/main", cwd=worktree)
        run("git", "fetch", "origin", "main")
        run("git", "merge", "--ff-only", "origin/main")
        print(f"Pushed {run('git', 'rev-parse', '--short', 'HEAD')}")
    finally:
        if added:
            subprocess.run(["git", "worktree", "remove", "--force", str(worktree)],
                           cwd=REPO, check=False)
        shutil.rmtree(worktree, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true",
                        help="Read Codex usage without changing the repository")
    args = parser.parse_args()
    network_config = Path.home() / ".config" / "oposaketia" / "inventory-env.json"
    if network_config.exists():
        saved = json.loads(network_config.read_text())
        for name in ("HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "NODE_EXTRA_CA_CERTS"):
            if isinstance(saved.get(name), str):
                os.environ[name] = saved[name]
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / "inventory.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("Skipped: another inventory run is active")
            return
        available = codex_available()
        print("Codex can work" if available else "Skipped: Codex has no confirmed capacity")
        if available and not args.check_only:
            continue_inventory()


if __name__ == "__main__":
    try:
        main()
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        print(f"Inventory run stopped: {error}", file=sys.stderr)
        sys.exit(1)
