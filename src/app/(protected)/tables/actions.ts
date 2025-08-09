"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkInAction(
  tableId: string,
  customerId: string,
  numGuests: number = 1
): Promise<{ success: boolean; error?: string; visitId?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("認証されていません");
    }

    // テーブルIDを数値に変換
    const tableIdNumber = parseInt(tableId, 10);
    if (isNaN(tableIdNumber)) {
      throw new Error("無効なテーブルIDです");
    }

    // visit-session.service.ts の createSession のロジックをここに移動
    const sessionCode = `V${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .insert({
        customer_id: customerId,
        primary_customer_id: customerId,
        table_id: tableIdNumber,
        num_guests: numGuests,
        is_group_visit: numGuests > 1,
        session_code: sessionCode,
        status: "active",
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (visitError) throw visitError;

    // visit_table_segments にもレコードを追加
    const { error: segmentError } = await supabase
      .from("visit_table_segments")
      .insert({
        visit_id: visit.id,
        table_id: tableIdNumber,
        reason: "initial",
        started_at: new Date().toISOString(),
      });

    if (segmentError) throw segmentError;

    // tables テーブルのステータスを更新
    const { error: tableUpdateError } = await supabase
      .from("tables")
      .update({
        current_status: "occupied",
        current_visit_id: visit.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableIdNumber);

    if (tableUpdateError) throw tableUpdateError;

    revalidatePath("/tables"); // ページを再検証してUIを更新
    return { success: true, visitId: visit.id };
  } catch (error) {
    console.error("Check-in failed:", error);
    const message =
      error instanceof Error ? error.message : "来店受付に失敗しました";
    return { success: false, error: message };
  }
}

export async function checkOutAction(
  visitId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("認証されていません");
    }

    // 来店情報を取得
    const { data: visit, error: visitFetchError } = await supabase
      .from("visits")
      .select("table_id")
      .eq("id", visitId)
      .single();

    if (visitFetchError) throw visitFetchError;

    // visit_table_segmentsのアクティブなセグメントを終了
    const { error: segmentError } = await supabase
      .from("visit_table_segments")
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq("visit_id", visitId)
      .is("ended_at", null);

    if (segmentError) throw segmentError;

    // visitsテーブルのステータスを更新
    const { error: visitError } = await supabase
      .from("visits")
      .update({
        status: "completed",
        check_out_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);

    if (visitError) throw visitError;

    // tablesテーブルのステータスを空席に更新
    const { error: tableError } = await supabase
      .from("tables")
      .update({
        current_status: "available",
        current_visit_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", visit.table_id);

    if (tableError) throw tableError;

    revalidatePath("/tables");
    return { success: true };
  } catch (error) {
    console.error("Check-out failed:", error);
    const message =
      error instanceof Error ? error.message : "チェックアウトに失敗しました";
    return { success: false, error: message };
  }
}

export async function moveTableAction(
  visitId: string,
  newTableId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("認証されていません");
    }

    const newTableIdNumber = parseInt(newTableId, 10);
    if (isNaN(newTableIdNumber)) {
      throw new Error("無効なテーブルIDです");
    }

    // 現在のテーブルセグメントを終了
    const { error: endSegmentError } = await supabase
      .from("visit_table_segments")
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq("visit_id", visitId)
      .is("ended_at", null);

    if (endSegmentError) throw endSegmentError;

    // 新しいテーブルセグメントを開始
    const { error: newSegmentError } = await supabase
      .from("visit_table_segments")
      .insert({
        visit_id: visitId,
        table_id: newTableIdNumber,
        reason: "move",
        started_at: new Date().toISOString(),
      });

    if (newSegmentError) throw newSegmentError;

    // visitsテーブルを更新
    const { error: visitError } = await supabase
      .from("visits")
      .update({
        table_id: newTableIdNumber,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);

    if (visitError) throw visitError;

    // 元のテーブルのステータスを空席に更新
    const { data: visit } = await supabase
      .from("visits")
      .select("table_id")
      .eq("id", visitId)
      .single();

    if (visit) {
      await supabase
        .from("tables")
        .update({
          current_status: "available",
          current_visit_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("current_visit_id", visitId);

      // 新しいテーブルのステータスを使用中に更新
      await supabase
        .from("tables")
        .update({
          current_status: "occupied",
          current_visit_id: visitId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", newTableIdNumber);
    }

    revalidatePath("/tables");
    return { success: true };
  } catch (error) {
    console.error("Table move failed:", error);
    const message =
      error instanceof Error ? error.message : "テーブル移動に失敗しました";
    return { success: false, error: message };
  }
}
