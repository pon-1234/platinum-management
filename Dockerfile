# ────────────────────────────────────────────────────────────
#  Base: Claude CLI の公式サンドボックス
# ────────────────────────────────────────────────────────────
FROM claude-sandbox:latest

# ────────────────────────────────────────────────────────────
#  0. root 権限に切替
# ────────────────────────────────────────────────────────────
USER root
ARG DEBIAN_FRONTEND=noninteractive

# ────────────────────────────────────────────────────────────
#  1. 共通ランタイム & ツール
#     - git / python3 / pip
#     - curl / gnupg / ca-certificates   (NodeSource 追加に必須)
#     - pipx / uv
# ────────────────────────────────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git python3 python3-pip \
        curl gnupg ca-certificates && \
    \
    # pipx + uv
    pip install --no-cache-dir pipx && \
    pipx ensurepath && \
    pipx install uv && \
    \
    # ── 1-1. Node.js (LTS) ────────────────────────────────
    # apt の公式 repo では nodejs が無い場合があるので NodeSource を利用
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    \
    # パッケージキャッシュ削除
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ────────────────────────────────────────────────────────────
#  2. GitHub CLI（もとの手順を維持）
# ────────────────────────────────────────────────────────────
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
      gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) \
      signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \
      https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ────────────────────────────────────────────────────────────
#  3. 非 root ユーザー（既定の 'node'）へ
# ────────────────────────────────────────────────────────────
USER node
WORKDIR /workspace

# pipx / uv の PATH を node ユーザーでも使えるよう追記
ENV PATH="/home/node/.local/bin:${PATH}"