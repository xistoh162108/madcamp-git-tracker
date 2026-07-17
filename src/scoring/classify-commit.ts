import type { CommitKind } from "../aggregation/types"

export interface ClassifiableCommitFile {
  filename: string
  status: string
}

export interface ClassifiableCommit {
  message: string
  additions: number
  deletions: number
  changedFiles: number
  filePaths: ClassifiableCommitFile[]
  parentCount: number
}

export interface CommitClassification {
  kind: CommitKind
  parentCount: number
  isConventionalMessage: boolean
  messageLength: number
  isVagueMessage: boolean
}

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "poetry.lock",
  "Pipfile.lock",
  "Cargo.lock",
  "go.sum",
])

// Includes vendored-dependency directories (venv/node_modules/site-packages/...), not just build
// output -- real production data showed two participants each with a single commit touching 300+
// files and 800k+ changed lines from committing (and later "untracking") a Python venv, which this
// pattern previously didn't catch, so it was scored as an ordinary "normal" commit.
const GENERATED_PATH_PATTERN =
  /(^|\/)(dist|build|\.next|out|coverage|generated|node_modules|vendor|venv|\.venv|site-packages|__pycache__|\.tox|\.mypy_cache)\//i
const GENERATED_SUFFIX_PATTERN = /\.(min\.js|map)$/i

const ASSET_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "bmp",
  "mp4",
  "mp3",
  "wav",
  "ogg",
  "glb",
  "gltf",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "pdf",
])

const FORMATTING_KEYWORDS = /\b(format|prettier|lint|eslint|stylelint|black|ruff|gofmt|clang-format)\b/i
// commits that read as genuine UI/UX improvements shouldn't be caught by the formatting keyword match
// even if they happen to mention e.g. "eslint" in passing
const UI_IMPROVEMENT_GUARD = /\b(polish|improve|adjust|refine)\b/i

// message-only dependency-update trigger is capped to small commits so a substantial feature commit
// that merely mentions "chore: update X and add Y dependency" isn't misclassified when it also touches
// real source files well beyond package.json/lockfiles
const DEPENDENCY_MESSAGE_PATTERN = /^(chore|build):\s*(install|add|update|bump|upgrade)\b/i
const DEPENDENCY_MESSAGE_MAX_FILES = 5

const CONVENTIONAL_PREFIX_PATTERN = /^(feat|fix|style|docs|refactor|test|chore|build|ci|perf):/i

// GitHub's default squash-merge commit message is "<PR title> (#<number>)" on the first line.
// Squash merges have exactly one parent (unlike a real merge commit), so parentCount alone can't
// tell them apart from an ordinary commit -- this message pattern is the only reliable signal
// available without calling the GitHub API for associated-PR data.
const SQUASH_MERGE_MESSAGE_PATTERN = /\(#\d+\)\s*$/

// Extended from real camp data: since messages under 10 chars all get the same flat "short" (0.5)
// discount regardless of content, a genuinely specific short Korean message (e.g. "카메라 연동" --
// Korean is information-dense, so a short phrase can still name a real feature) would otherwise be
// scored identically to a truly contentless one (e.g. "수정" -- just the generic verb "edit", or a
// bare "."). This list singles out the latter for the harsher vague (0.3) penalty instead.
const VAGUE_MESSAGES = new Set([
  "update",
  "updated",
  "fix",
  "fixed",
  "wip",
  "final",
  "test",
  "test2",
  "asdf",
  "real final",
  "final final",
  "temp",
  "tmp",
  "temp api",
  "change",
  "changes",
  "misc",
  "stuff",
  "merge",
  "schema",
  "home",
  "readme",
  "수정",
  "링크",
  ".",
])

function basename(filename: string): string {
  const parts = filename.split("/")
  return parts[parts.length - 1] ?? filename
}

function isLockfile(filename: string): boolean {
  return LOCKFILE_NAMES.has(basename(filename))
}

function isGenerated(filename: string): boolean {
  return GENERATED_PATH_PATTERN.test(filename) || GENERATED_SUFFIX_PATTERN.test(filename)
}

function isAsset(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase()
  return ext ? ASSET_EXTENSIONS.has(ext) : false
}

function classifyKind(input: ClassifiableCommit, message: string): CommitKind {
  const files = input.filePaths
  const lowerMessage = message.toLowerCase()

  if (input.additions === 0 && input.deletions === 0 && input.changedFiles === 0) {
    return "empty"
  }
  if (input.parentCount > 1) {
    return "merge"
  }
  if (input.parentCount === 1 && SQUASH_MERGE_MESSAGE_PATTERN.test(message.split("\n")[0] ?? message)) {
    return "squash_merge"
  }
  if (files.length > 0 && files.every((f) => isLockfile(f.filename))) {
    return "lockfile_only"
  }
  if (files.length > 0 && files.every((f) => isGenerated(f.filename))) {
    return "generated_files"
  }
  if (files.length > 0 && files.every((f) => isAsset(f.filename))) {
    return "asset_only"
  }
  if (files.length > 0 && files.every((f) => f.status === "renamed")) {
    return "rename_only"
  }
  const filesAreDependencyOnly =
    files.length > 0 && files.every((f) => basename(f.filename) === "package.json" || isLockfile(f.filename))
  const messageLooksLikeDependencyUpdate =
    DEPENDENCY_MESSAGE_PATTERN.test(message) && input.changedFiles <= DEPENDENCY_MESSAGE_MAX_FILES
  if (filesAreDependencyOnly || messageLooksLikeDependencyUpdate) {
    return "dependency_update"
  }
  if (lowerMessage.includes("conflict")) {
    return "conflict_resolve"
  }
  if (/^revert\b/i.test(message)) {
    return "revert"
  }
  if (FORMATTING_KEYWORDS.test(message) && !UI_IMPROVEMENT_GUARD.test(message)) {
    return "formatting"
  }
  return "normal"
}

export function classifyCommit(input: ClassifiableCommit): CommitClassification {
  const message = input.message.trim()
  const messageLength = message.length
  const isConventionalMessage = CONVENTIONAL_PREFIX_PATTERN.test(message)
  const isVagueMessage = VAGUE_MESSAGES.has(message.toLowerCase())

  return {
    kind: classifyKind(input, message),
    parentCount: input.parentCount,
    isConventionalMessage,
    messageLength,
    isVagueMessage,
  }
}
