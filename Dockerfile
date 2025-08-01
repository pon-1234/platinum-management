# ────────────────────────────────────────────────────────────
#  Base image: Claude CLI の公式サンドボックス
# ────────────────────────────────────────────────────────────
FROM claude-sandbox:latest

# ────────────────────────────────────────────────────────────
#  0. ルート権限に切り替え
# ────────────────────────────────────────────────────────────
USER root

# ────────────────────────────────────────────────────────────
#  1. 共通ツール & ランタイム
#     - git            : Serena を GitHub から取得
#     - python3/pip    : pipx/uv 用ランタイム
#     - pipx           : Python アプリを隔離インストール
#     - uv (+uvx)      : Serena 推奨パッケージマネージャ
#     - nodejs         : TypeScript/JS Language Server 用
# ────────────────────────────────────────────────────────────
RUN apt-get update && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
        git \
        python3 python3-pip \
        nodejs \
        ca-certificates curl gnupg && \
    # pipx + uv
    pip install --no-cache-dir pipx && \
    pipx ensurepath && \
    pipx install uv && \
    # (pipx が ~/.local/bin を使うので PATH を明示)
    echo 'export PATH="$PATH:/root/.local/bin"' >> /etc/profile.d/pipx_path.sh && \
    # パッケージキャッシュ削除
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ────────────────────────────────────────────────────────────
#  2. GitHub CLI (既存のステップを保持)
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
#  3. 非 root ユーザー (既存どおり 'node')
# ────────────────────────────────────────────────────────────
USER node
WORKDIR /workspace

# ────────────────────────────────────────────────────────────
#  4. 環境変数 (pipx / uv を node ユーザーで使う)
# ────────────────────────────────────────────────────────────
ENV PATH="/home/node/.local/bin:${PATH}"

# ────────────────────────────────────────────────────────────
#  5. エントリポイントは画像側の既定値をそのまま利用
#     （Serena は stdio モードで Claude が自動 spawn）
# ────────────────────────────────────────────────────────────