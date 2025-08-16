"use client";

import { useState, useRef, useEffect } from "react";
import { CameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { QRAttendanceAction } from "@/types/qr-code.types";
import { recordAttendance } from "@/app/actions/qr-code.actions";

interface QRCodeScannerProps {
  action: QRAttendanceAction;
  onScanSuccess?: (result: { actionType: string }) => void;
  onScanError?: (error: string) => void;
}

export function QRCodeScanner({
  action,
  onScanSuccess,
  onScanError,
}: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setScanning(true);

        // QRコードのスキャンを開始
        scanQRCode();
      }
    } catch {
      const errorMessage = "カメラへのアクセスが拒否されました";
      setError(errorMessage);
      onScanError?.(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const scanQRCode = async () => {
    if (!videoRef.current || !scanning) return;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;

    // 動画が準備できるまで待つ
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(() => scanQRCode());
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // 実装メモ: 実際は qr-scanner 等で imageData → 文字列化
      if (Math.random() > 0.98 && !processing) {
        setProcessing(true);

        const mockQRDataObj = {
          staffId: "mock-staff-id",
          timestamp: Date.now(),
          signature: "mock-signature",
        } as { staffId: string; timestamp: number; signature?: string };
        const qrData = JSON.stringify(mockQRDataObj);

        try {
          const signature = mockQRDataObj.signature || "";
          const res = await recordAttendance({
            qrData,
            signature,
            action,
            deviceInfo: { userAgent: navigator.userAgent },
          });

          if (!res.success) {
            const msg = res.error || "打刻に失敗しました";
            setError(msg);
            onScanError?.(msg);
          } else {
            onScanSuccess?.({ actionType: res.data.action });
          }
          stopCamera();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "QRコードの処理に失敗しました";
          setError(errorMessage);
          onScanError?.(errorMessage);
        } finally {
          setProcessing(false);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("QRコードスキャンエラー:", err);
      }
    }

    // 継続的にスキャン
    if (scanning && !processing) {
      requestAnimationFrame(() => scanQRCode());
    }
  };

  return (
    <div className="relative">
      {!scanning ? (
        <div className="text-center py-12">
          <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            QRコードをスキャン
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            カメラを使用してQRコードを読み取ります
          </p>
          <div className="mt-6">
            <button
              onClick={startCamera}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <CameraIcon className="h-4 w-4 mr-2" />
              スキャン開始
            </button>
          </div>

          {error && (
            <div className="mt-4 mx-auto max-w-sm">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-lg mx-auto"
              style={{ maxHeight: "400px" }}
            />

            {/* スキャンガイド */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="flex items-center justify-center h-full">
                <div className="w-64 h-64 border-2 border-white rounded-lg opacity-50"></div>
              </div>
            </div>

            {/* 処理中表示 */}
            {processing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">処理中...</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={stopCamera}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              QRコードを枠内に合わせてください
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
