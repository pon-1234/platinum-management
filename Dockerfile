#
# Claude CLI ＋ Serena(stdio) 用の最小イメージ
#   - git / python3 / pipx / uv
#   - nodejs (via NodeSource)  ※TypeScript LS 用
#   - gh CLI (元の設定を維持)
#

FROM claude-sandbox:latest

USER root
ARG DEBIAN_FRONTEND=noninteractive

# ────────────────────────────────
# 1) 基本ツール & Python ランタイム
# ────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        git \
        python3 python3-pip python3-venv \
        curl gnupg ca-certificates && \
    \
    pip install --no-cache-dir pipx && \
    pipx ensurepath && \
    pipx install uv && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ────────────────────────────────
# 2) Node.js (LTS) – NodeSource
# ────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ────────────────────────────────
# 3) GitHub CLI (既存手順)
# ────────────────────────────────
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
      gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ────────────────────────────────
# 4) 非 root ユーザーへ
# ────────────────────────────────
USER node
WORKDIR /workspace
ENV PATH="/home/node/.local/bin:${PATH}"