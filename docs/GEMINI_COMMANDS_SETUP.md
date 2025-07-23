# Gemini Commands Setup Guide

`gemini-search`と`gemini-analyze`コマンドが使用できるようになりました。

## セットアップ完了内容

1. **作成されたコマンド:**
   - `/Users/pon/claude-sbx/platinum-management/bin/gemini-search` - Web検索用のラッパー
   - `/Users/pon/claude-sbx/platinum-management/bin/gemini-analyze` - コード分析用のラッパー

2. **使い方:**

### gemini-search
```bash
# Web検索を実行
gemini-search "TypeScript best practices 2024"
gemini-search "React hooks performance optimization"
```

### gemini-analyze
```bash
# ファイルの一般的なコードレビュー
gemini-analyze src/app.ts

# 特定の観点でのレビュー
gemini-analyze src/app.ts "Check for performance issues"
gemini-analyze src/utils/auth.ts "Security audit"
```

## PATH設定（恒久的に使用する場合）

現在のセッションでは既に使用可能ですが、新しいターミナルセッションでも使えるようにするには、以下をシェル設定ファイルに追加してください：

### bashの場合 (~/.bashrc または ~/.bash_profile)
```bash
export PATH="$PATH:/Users/pon/claude-sbx/platinum-management/bin"
```

### zshの場合 (~/.zshrc)
```bash
export PATH="$PATH:/Users/pon/claude-sbx/platinum-management/bin"
```

設定後、以下のコマンドで反映：
```bash
source ~/.zshrc  # または source ~/.bashrc
```

## 動作確認

以下のコマンドで正しく設定されているか確認できます：
```bash
which gemini-search
which gemini-analyze
```

## 注意事項

- これらのコマンドは、システムにインストールされている`gemini`コマンド（v0.1.5）をラップしています
- gemini-analyzeで大きなファイルを分析する場合、処理に時間がかかることがあります
- Web検索結果は最新の情報を提供しますが、必ず信頼できるソースを確認してください