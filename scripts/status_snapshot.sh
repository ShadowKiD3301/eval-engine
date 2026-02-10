#!/bin/bash
# Snapshot status of worktrees and basic git state

echo "=== Active Worktrees ==="
if command -v git >/dev/null 2>&1; then
  git worktree list 2>/dev/null || echo "No worktrees (or not a git repo)."
else
  echo "git not installed or not in PATH."
fi

echo ""
echo "=== Git Status ==="
if command -v git >/dev/null 2>&1; then
  echo "Current branch: $(git branch --show-current 2>/dev/null)"
  echo "Staged changes: $(git diff --cached --stat | tail -n 1 || echo 'none')"
  echo "Unstaged changes: $(git diff --stat | tail -n 1 || echo 'none')"
else
  echo "git not available."
fi

if [ -f "docs/tasks.md" ]; then
  echo ""
  echo "=== Task Status (first 20) ==="
  grep -E "^- \[.|## " docs/tasks.md | head -n 20 || echo "No tasks found."
fi
