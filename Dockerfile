# ────────────────────────────────────────────────────────────
#  Base: Claude CLI の公式サンドボックス
# ────────────────────────────────────────────────────────────
FROM claude-sandbox:latest

########################################################################
# 0. root 権限へ
########################################################################
USER root
ARG DEBIAN_FRONTEND=noninteractive

########################################################################
# 1. 共通ツール & ランタイム
#    - bash            : NodeSource スクリプトが bash 必須
#    - git / python3   : Serena ダウンロード & 実行
#    - pipx / uv       : 推奨パッケージマネージャ
########################################################################
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        git \
        python3 python3-pip \
        curl gnupg ca-certificates && \
    \
    # ---- pipx + uv ---------------------------------------------------
    pip install --no-cache-dir pipx && \
    pipx ensurepath && \
    pipx install uv && \
    \
    # ---- Node.js (LTS) ----------------------------------------------
    # bash が入ったので NodeSource でインストール
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    \
    # ---- キャッシュ削除 ---------------------------------------------
    apt-get clean && rm -rf /var/lib/apt/lists/*

########################################################################
# 2. GitHub CLI（既存ステップを維持）
########################################################################
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
      gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) \
      signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \
      https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

########################################################################
# 3. 非 root ユーザーへ戻る
########################################################################
USER node
WORKDIR /workspace

# pipx/uv が使う ~/.local/bin を PATH に追加
ENV PATH="/home/node/.local/bin:${PATH}"