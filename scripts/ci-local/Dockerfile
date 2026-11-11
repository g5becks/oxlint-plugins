# Linux image for scripts/ci-local.sh: Node (oxlint runs JS plugins on Node)
# plus the pinned Bun, matching the ubuntu legs of .github/workflows/ci.yml.
ARG NODE_IMAGE=node:24-bookworm-slim
FROM ${NODE_IMAGE}
ARG BUN_VERSION=1.4.4
RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends git ca-certificates >/dev/null \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g --no-audit --no-fund "bun@${BUN_VERSION}" >/dev/null \
  && git config --system --add safe.directory '*' \
  && node --version && bun --version
