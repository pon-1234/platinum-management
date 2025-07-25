"use client";

import { useState, useEffect, useRef } from "react";
import { qrCodeService } from "@/services/qr-code.service";
import type {
  QRCode,
  StaffQRInfo,
  GenerateQRCodeRequest,
} from "@/types/qr-code.types";
import {
  QrCodeIcon,
  ArrowPathIcon,
  PrinterIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";

interface QRCodeGeneratorProps {
  staffId: string;
  staffName: string;
  onGenerated?: (qrCode: QRCode) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // 分
}

export function QRCodeGenerator({
  staffId,
  staffName,
  onGenerated,
  autoRefresh = true,
  // refreshInterval = 30,
}: QRCodeGeneratorProps) {
  const [qrInfo, setQrInfo] = useState<StaffQRInfo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQRInfo();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  useEffect(() => {
    if (qrInfo?.qrCode && autoRefresh) {
      startCountdown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrInfo, autoRefresh]);

  const loadQRInfo = async () => {
    try {
      setLoading(true);
      const info = await qrCodeService.getStaffQRInfo(staffId);
      setQrInfo(info);

      if (info.qrCode) {
        await generateQRImage();
        calculateTimeLeft(info.qrCode.expires_at);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "QRコード情報の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (expiresIn?: number) => {
    try {
      setGenerating(true);
      setError(null);

      const request: GenerateQRCodeRequest = {
        staffId,
        expiresIn: expiresIn || 60,
      };

      const qrCode = await qrCodeService.generateQRCode(request);
      await generateQRImage();
      await loadQRInfo(); // 情報を再読み込み

      onGenerated?.(qrCode);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "QRコード生成に失敗しました"
      );
    } finally {
      setGenerating(false);
    }
  };

  const generateQRImage = async () => {
    try {
      // QRコード生成ライブラリを使用（実際の実装では qrcode ライブラリを使用）
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 簡易QRコード表示（実際の実装では qrcode ライブラリを使用）
      const size = 200;
      canvas.width = size;
      canvas.height = size;

      // 背景
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // QRコードの代わりにテキストを表示（デモ用）
      ctx.fillStyle = "#000000";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("QR Code", size / 2, size / 2 - 20);
      ctx.fillText(staffName, size / 2, size / 2);
      ctx.fillText(new Date().toLocaleTimeString(), size / 2, size / 2 + 20);

      // 枠線
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(0, 0, size, size);

      setQrDataUrl(canvas.toDataURL());
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("QRコード画像生成エラー:", err);
      }
    }
  };

  const calculateTimeLeft = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;
    setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
  };

  const startCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (qrInfo?.qrCode) {
        calculateTimeLeft(qrInfo.qrCode.expires_at);

        setTimeLeft((prev) => {
          const newTime = prev - 1;

          // 自動更新（期限の5分前または期限切れ時）
          if (autoRefresh && (newTime <= 300 || newTime <= 0)) {
            generateQRCode(60);
          }

          return Math.max(0, newTime);
        });
      }
    }, 1000);
  };

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QRコード - ${staffName}</title>
            <style>
              body { 
                text-align: center; 
                font-family: Arial, sans-serif; 
                margin: 20px;
              }
              .qr-container {
                border: 2px solid #000;
                padding: 20px;
                display: inline-block;
                margin: 20px;
              }
              .staff-info {
                margin-bottom: 15px;
                font-size: 18px;
                font-weight: bold;
              }
              .qr-code {
                margin: 15px 0;
              }
              .instructions {
                margin-top: 15px;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="staff-info">${staffName} 様</div>
              <div class="qr-code">
                <img src="${qrDataUrl}" alt="QRコード" />
              </div>
              <div class="instructions">
                スマートフォンでQRコードを読み取り、<br>
                勤怠打刻を行ってください。
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    if (!qrDataUrl) return;

    try {
      // Web Share API を使用（対応ブラウザの場合）
      if (navigator.share) {
        // Canvas を Blob に変換
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `qr-code-${staffName}.png`, {
                type: "image/png",
              });
              await navigator.share({
                title: `QRコード - ${staffName}`,
                text: "勤怠打刻用QRコード",
                files: [file],
              });
            }
          });
        }
      } else {
        // フォールバック: クリップボードにコピー
        const link = document.createElement("a");
        link.download = `qr-code-${staffName}.png`;
        link.href = qrDataUrl;
        link.click();
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("共有エラー:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            QRコード勤怠打刻
          </h3>
          <p className="text-sm text-gray-500">{staffName} 様用のQRコード</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => generateQRCode(60)}
            disabled={generating}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            更新
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QRコード表示 */}
        <div className="text-center">
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
            {qrInfo?.qrCode ? (
              <div>
                <canvas
                  ref={canvasRef}
                  className="mx-auto"
                  style={{ maxWidth: "200px", maxHeight: "200px" }}
                />
                <div className="mt-3 text-xs text-gray-500">
                  ボトル番号: {qrInfo.qrCode.id.slice(-8)}
                </div>
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    QRコードを生成してください
                  </p>
                </div>
              </div>
            )}
          </div>

          {qrInfo?.qrCode && (
            <div className="mt-4 flex justify-center space-x-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PrinterIcon className="h-4 w-4 mr-1" />
                印刷
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ShareIcon className="h-4 w-4 mr-1" />
                共有
              </button>
            </div>
          )}
        </div>

        {/* QRコード情報 */}
        <div className="space-y-4">
          {qrInfo?.qrCode ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  有効期限
                </label>
                <div className="mt-1">
                  <div className="text-lg font-mono text-gray-900">
                    {formatTimeLeft(timeLeft)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(qrInfo.qrCode.expires_at).toLocaleString("ja-JP")}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ステータス
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      timeLeft > 300
                        ? "bg-green-100 text-green-800"
                        : timeLeft > 0
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {timeLeft > 300
                      ? "有効"
                      : timeLeft > 0
                        ? "期限間近"
                        : "期限切れ"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  生成日時
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(qrInfo.qrCode.created_at).toLocaleString("ja-JP")}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  本日の打刻回数
                </label>
                <div className="mt-1 text-lg font-semibold text-blue-600">
                  {qrInfo.todayScans} 回
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                QRコードが生成されていません
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                下のボタンからQRコードを生成してください
              </p>
              <div className="mt-6">
                <button
                  onClick={() => generateQRCode(60)}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      生成中...
                    </>
                  ) : (
                    <>
                      <QrCodeIcon className="h-4 w-4 mr-2" />
                      QRコード生成
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 自動更新設定 */}
      {qrInfo?.qrCode && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                自動更新
              </label>
              <p className="text-sm text-gray-500">
                期限切れ前に自動的にQRコードを更新します
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => {
                  // setAutoRefresh(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
