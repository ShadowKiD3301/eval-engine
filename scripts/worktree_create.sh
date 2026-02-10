#!/bin/bash
# Create a new git worktree for a task (Codex Orchestrator pattern)

BRANCH=$1
WORKTREE_PATH=$2

if [ -z "$BRANCH" ] || [ -z "$WORKTREE_PATH" ]; then
  echo "Usage: $0 <branch-name> <worktree-path>"
  echo "Example: $0 task/TSK-003-preflight ../worktrees/preflight"
  exit 1
fi

# Create branch if it doesn't exist
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git branch "$BRANCH"
fi

# Create worktree
git worktree add "$WORKTREE_PATH" "$BRANCH"

echo "✓ Worktree created at $WORKTREE_PATH on branch $BRANCH"
echo "  cd $WORKTREE_PATH"