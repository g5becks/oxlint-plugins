#!/usr/bin/env bash
# Local stand-in for .github/workflows/ci.yml while GitHub Actions is unavailable.
# Any change to ci.yml must be mirrored here in the same commit.
#
# Runs every ci.yml job against a clean clone of a git ref (default: HEAD):
#   check          linux: actionlint, frozen install, lint, format check, typecheck, build, repo tests
#   unit           linux + macOS (host)
#   cli            oxlint floor (1.70.0, linux), pinned (linux + macOS), latest (linux, advisory):
#                  CLI suite + bench, via OXLINT_BIN for non-pinned versions
#   eslint-compat  linux
#   pack           linux: build, pack every package, install into a consumer with the
#                  oxlint floor and the pinned oxlint, lint a fixture per plugin
# Linux legs run in Docker (Colima) on Node + the pinned Bun (scripts/ci-local/Dockerfile);
# Node and Bun versions are written at the top of each leg's log.
#
# Usage:   bash scripts/ci-local.sh [git-ref]
# Env:     CI_LOCAL_DIR  work dir; must be inside $HOME so Colima can mount it
#                        (default: ../oxlint-plugins-release/ci-local next to the repo)
#          CI_SCHEDULE=1 treat the latest-oxlint leg as blocking (the weekly scheduled run)
#          DOCKER_HOST   auto-detected for Colima when unset or unreachable
# Exit:    0 if every required leg passed, 1 otherwise. Logs: $CI_LOCAL_DIR/<sha>/logs/
#
# Requirements: Docker via Colima, and the Colima VM must allow overcommit
# (vm.overcommit_memory=1). oxlint's JS-plugin allocator pool reserves a large block of
# address space per thread; heuristic overcommit (mode 0) refuses it on a 6 GiB VM without
# swap and oxlint aborts (oxc_allocator fixed_size.rs, exit 134). Real memory use is small.
#   colima ssh -- sudo sysctl -w vm.overcommit_memory=1
#   ~/.config/colima/default/colima.yaml:  provision: [{ mode: system, script: sysctl -w vm.overcommit_memory=1 }]
# A preflight runs a no-op JS plugin in the CI image first and stops with this fix if it fails.
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
REF="${1:-HEAD}"
SHA="$(git -C "$REPO" rev-parse --verify "$REF^{commit}")"
SHORT="${SHA:0:7}"
BASE="${CI_LOCAL_DIR:-$(cd "$REPO/.." && pwd)/oxlint-plugins-release/ci-local}"
WORK="$BASE/$SHORT"
LOGS="$WORK/logs"
# Keep in sync with ci.yml `env:`.
BUN_VERSION="1.4.4"
NODE_IMAGE="node:24-bookworm-slim"
OXLINT_FLOOR="1.70.0"
ACTIONLINT_VERSION="1.7.12"
IMAGE="oxlint-plugins-ci:node24-bun$BUN_VERSION"

rm -rf "$WORK"
mkdir -p "$LOGS"

# Docker (Colima) for the Linux legs
if ! docker info >/dev/null 2>&1; then
  for sock in "$HOME/.config/colima/default/docker.sock" "$HOME/.colima/default/docker.sock"; do
    if [[ -S "$sock" ]]; then export DOCKER_HOST="unix://$sock"; break; fi
  done
fi
docker info >/dev/null 2>&1 || { echo "Docker is not reachable (start it with: colima start)"; exit 1; }

echo "▶ building $IMAGE"
docker build -q -t "$IMAGE" --build-arg "NODE_IMAGE=$NODE_IMAGE" --build-arg "BUN_VERSION=$BUN_VERSION" \
  "$REPO/scripts/ci-local" >"$LOGS/image.log" 2>&1 || { cat "$LOGS/image.log"; echo "image build failed"; exit 1; }

OXLINT_PINNED="$(git -C "$REPO" show "$SHA:package.json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).devDependencies.oxlint))')"

# Preflight: can oxlint run a JS plugin in this Docker VM at all? (see "Requirements" above)
echo "▶ preflight (oxlint $OXLINT_PINNED JS plugin in $IMAGE)"
PREFLIGHT='set -e
echo "vm.overcommit_memory=$(cat /proc/sys/vm/overcommit_memory)"
mkdir -p /tmp/pf && cd /tmp/pf
npm install --no-audit --no-fund --silent --prefix /tmp/pf/ox "oxlint@$1" >/dev/null
printf "export default { meta: { name: \"preflight\" }, rules: { noop: { create() { return {}; } } } };\n" > plugin.mjs
printf "{\"jsPlugins\": [\"./plugin.mjs\"], \"rules\": {\"preflight/noop\": \"error\"}}\n" > .oxlintrc.json
echo "export const a = 1;" > a.ts
/tmp/pf/ox/node_modules/.bin/oxlint a.ts'
if ! docker run --rm "$IMAGE" bash -c "$PREFLIGHT" _ "$OXLINT_PINNED" >"$LOGS/preflight.log" 2>&1; then
  cat "$LOGS/preflight.log"
  cat <<'MSG'

ci-local preflight FAILED: oxlint cannot run JS plugins in the Docker VM.
oxlint's JS-plugin allocator pool reserves a large block of address space per thread,
and Linux heuristic overcommit (vm.overcommit_memory=0) refuses it on a small VM without swap
(panic at oxc_allocator/src/pool/fixed_size.rs, exit 134). Fix:

  colima ssh -- sudo sysctl -w vm.overcommit_memory=1

and persist it in ~/.config/colima/default/colima.yaml:

  provision:
    - mode: system
      script: sysctl -w vm.overcommit_memory=1

RESULT: FAIL
MSG
  exit 1
fi
OXLINT_LATEST="$(npm view oxlint version 2>/dev/null || true)"
[[ -n "$OXLINT_LATEST" ]] || { echo "Could not resolve the latest oxlint version from npm"; exit 1; }

RESULTS=()
FAILED=0

clone() { # fresh checkout of $SHA, like actions/checkout
  local dir="$1"
  git clone --quiet --no-hardlinks "$REPO" "$dir"
  git -C "$dir" checkout --quiet --detach "$SHA"
}

record() { # name status required|advisory
  local label="$1"
  [[ "$3" == "advisory" ]] && label="$label [advisory]"
  RESULTS+=("$(printf '%-46s %s' "$label" "$2")")
  if [[ "$2" != "pass" && "$3" == "required" ]]; then FAILED=1; fi
}

VERSIONS='echo "node $(node --version) / bun $(bun --version) / $(uname -sm)"'

linux() { # name log required|advisory steps...
  local name="$1" log="$2" kind="$3"; shift 3
  local dir="$WORK/$log"; clone "$dir"
  echo "▶ $name"
  if docker run --rm -e CI=true -v "$dir:/w" -w /w "$IMAGE" bash -c "set -euo pipefail; $VERSIONS; $*" \
       >"$LOGS/$log.log" 2>&1; then
    record "$name" pass "$kind"
  else
    record "$name" FAIL "$kind"
  fi
}

macos() { # name log required|advisory steps...
  local name="$1" log="$2" kind="$3"; shift 3
  local dir="$WORK/$log"; clone "$dir"
  echo "▶ $name"
  if (cd "$dir" && CI=true bash -c "set -euo pipefail; test \"\$(bun --version)\" = $BUN_VERSION; $VERSIONS; $*") \
       >"$LOGS/$log.log" 2>&1; then
    record "$name" pass "$kind"
  else
    record "$name" FAIL "$kind"
  fi
}

INSTALL='bun install --frozen-lockfile'
with_oxlint() { # version -> steps that install it and export OXLINT_BIN
  echo "npm install --no-audit --no-fund --silent --prefix /tmp/oxlint oxlint@$1 && export OXLINT_BIN=/tmp/oxlint/node_modules/.bin/oxlint"
}
CLI_STEPS='"${OXLINT_BIN:-node_modules/.bin/oxlint}" --version; bun run test:cli; bun run test:bench'

# check
echo "▶ check (actionlint $ACTIONLINT_VERSION)"
dir="$WORK/actionlint"; clone "$dir"
if docker run --rm -v "$dir:/repo" -w /repo "rhysd/actionlint:$ACTIONLINT_VERSION" >"$LOGS/actionlint.log" 2>&1; then
  record "check (actionlint $ACTIONLINT_VERSION)" pass required
else
  record "check (actionlint $ACTIONLINT_VERSION)" FAIL required
fi
linux "check (linux)" check required \
  "$INSTALL; bun run lint; bun run format:check; bun run check; bun run build; bun run test:repo"

# unit
linux "unit (linux)" unit-linux required "$INSTALL; bun run test:unit"
macos "unit (macos)" unit-macos required "$INSTALL; bun run test:unit"

# cli
linux "cli (linux, oxlint floor $OXLINT_FLOOR)" cli-floor required "$INSTALL; $(with_oxlint "$OXLINT_FLOOR"); $CLI_STEPS"
linux "cli (linux, oxlint pinned $OXLINT_PINNED)" cli-pinned required "$INSTALL; $CLI_STEPS"
macos "cli (macos, oxlint pinned $OXLINT_PINNED)" cli-pinned-macos required "$INSTALL; $CLI_STEPS"
latest_kind=advisory; [[ "${CI_SCHEDULE:-0}" == "1" ]] && latest_kind=required
linux "cli (linux, oxlint latest=$OXLINT_LATEST)" cli-latest "$latest_kind" \
  "$INSTALL; $(with_oxlint "$OXLINT_LATEST"); $CLI_STEPS"

# eslint-compat
linux "eslint-compat (linux)" eslint-compat required "$INSTALL; bun run test:compat"

# pack
linux "pack (linux, oxlint $OXLINT_FLOOR + $OXLINT_PINNED)" pack required \
  "$INSTALL; bun run build; bun scripts/pack-smoke.ts --oxlint $OXLINT_FLOOR,$OXLINT_PINNED"

echo
echo "ci-local results for $SHORT ($(git -C "$REPO" log -1 --format=%s "$SHA"))"
echo "bun $BUN_VERSION, $NODE_IMAGE (linux), oxlint floor=$OXLINT_FLOOR pinned=$OXLINT_PINNED latest=$OXLINT_LATEST; logs: $LOGS"
printf '  %s\n' "${RESULTS[@]}"
if [[ "$FAILED" -eq 0 ]]; then
  echo "RESULT: PASS"
  find "$WORK" -mindepth 1 -maxdepth 1 ! -name logs -exec rm -rf {} +   # keep logs, drop clones
else
  echo "RESULT: FAIL"
fi
exit "$FAILED"
