"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  BottleKeep,
  BottleKeepHistory,
  BottleKeepService,
} from "@/services/bottle-keep.service";
import {
  Wine,
  Clock,
  User,
  TrendingDown,
  RefreshCw,
  MapPin,
  Edit,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryModalProps {
  bottle: BottleKeep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoryModal({
  bottle,
  open,
  onOpenChange,
}: HistoryModalProps) {
  const [histories, setHistories] = useState<BottleKeepHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistories = async () => {
      if (!bottle) return;

      setLoading(true);
      setError(null);

      try {
        const data = await BottleKeepService.getHistories(bottle.id);
        setHistories(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "履歴の取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    if (bottle && open) {
      loadHistories();
    }
  }, [bottle, open]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "serve":
        return <TrendingDown className="h-4 w-4" />;
      case "refill":
        return <RefreshCw className="h-4 w-4" />;
      case "move":
        return <MapPin className="h-4 w-4" />;
      case "status_change":
        return <Edit className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case "serve":
        return "提供";
      case "refill":
        return "補充";
      case "move":
        return "移動";
      case "status_change":
        return "ステータス変更";
      case "note":
        return "メモ";
      default:
        return actionType;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "serve":
        return "bg-blue-100 text-blue-800";
      case "refill":
        return "bg-green-100 text-green-800";
      case "move":
        return "bg-purple-100 text-purple-800";
      case "status_change":
        return "bg-yellow-100 text-yellow-800";
      case "note":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!bottle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5" />
            ボトル履歴
          </DialogTitle>
          <DialogDescription>
            {bottle.product?.name} ({bottle.bottle_number}) -{" "}
            {bottle.customer?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : histories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                履歴がありません
              </div>
            ) : (
              <div className="space-y-3">
                {histories.map((history) => (
                  <div
                    key={history.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(history.action_type)}
                        <Badge className={getActionColor(history.action_type)}>
                          {getActionLabel(history.action_type)}
                        </Badge>
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {format(
                          new Date(history.created_at),
                          "yyyy/MM/dd HH:mm",
                          { locale: ja }
                        )}
                      </time>
                    </div>

                    {history.action_type === "serve" &&
                      history.served_amount && (
                        <div className="text-sm space-y-1">
                          <div>
                            提供量: {Math.round(history.served_amount * 100)}%
                          </div>
                          {history.remaining_before !== undefined &&
                            history.remaining_after !== undefined && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>
                                  {Math.round(history.remaining_before * 100)}%
                                </span>
                                <span>→</span>
                                <span>
                                  {Math.round(history.remaining_after * 100)}%
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                    {history.notes && (
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        {history.notes}
                      </div>
                    )}

                    {history.staff && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{history.staff.full_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
