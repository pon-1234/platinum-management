#!/bin/bash

# Supabaseリセットスクリプト
# このスクリプトはSupabaseの環境を完全にリセットして、クリーンな状態から再構築します

echo "🔄 Supabaseの完全リセットを開始します..."
echo "⚠️  警告: これによりローカルのSupabaseデータは全て削除されます"
echo ""

# 確認プロンプト
read -p "本当に続行しますか？ (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ キャンセルしました"
    exit 1
fi

echo ""
echo "1️⃣ Supabaseを停止中..."
supabase stop

echo ""
echo "2️⃣ Dockerボリュームを削除中..."
docker volume rm $(docker volume ls -q --filter "name=^supabase_") 2>/dev/null || echo "  削除するボリュームがありません"

echo ""
echo "3️⃣ 古いマイグレーションファイルをバックアップ中..."
mkdir -p supabase/migrations_backup
mv supabase/migrations/*.sql supabase/migrations_backup/ 2>/dev/null || echo "  バックアップするファイルがありません"

echo ""
echo "4️⃣ 初期スキーマをマイグレーションディレクトリにコピー中..."
cp supabase/V1_init_schema.sql supabase/migrations/20240101000000_init_schema.sql

echo ""
echo "5️⃣ Supabaseを再起動中..."
supabase start

echo ""
echo "6️⃣ 必要な追加マイグレーションを適用中..."
# セキュリティ修正のみを適用
cp supabase/migrations_backup/20250127_security_fixes.sql supabase/migrations/ 2>/dev/null || echo "  セキュリティ修正が見つかりません"

# その他の必要なマイグレーションを選択的に適用
# 例: cp supabase/migrations_backup/20240724000002_create_notification_logs_table.sql supabase/migrations/

echo ""
echo "7️⃣ マイグレーションを実行中..."
supabase migration up

echo ""
echo "✅ Supabaseのリセットが完了しました！"
echo ""
echo "📝 次のステップ:"
echo "  1. npm run db:check-tables でテーブルが正しく作成されたか確認"
echo "  2. npm run db:insert-demo でデモデータを挿入（オプション）"
echo "  3. npm run dev でアプリケーションを起動"