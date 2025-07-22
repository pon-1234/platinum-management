/**
 * ブラウザ拡張機能（MetaMask等）の干渉を防ぐためのユーティリティ
 * @design_doc N/A - ブラウザ拡張機能エラーハンドリング
 * @related_to window, browser extensions
 * @known_issues N/A
 */

/**
 * ブラウザ拡張機能のエラーを抑制する
 * MetaMaskなどの拡張機能が原因のruntime.lastErrorを防ぐ
 */
export function suppressExtensionErrors(): void {
  if (typeof window === "undefined") return;

  // Ethereum provider injection エラーの抑制
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(" ");

    // MetaMask関連のエラーを抑制
    if (
      message.includes("Could not establish connection") ||
      message.includes("Receiving end does not exist") ||
      message.includes("runtime.lastError") ||
      message.includes("inpage.js")
    ) {
      return;
    }

    // その他のエラーは通常通り出力
    originalConsoleError.apply(console, args);
  };

  // runtime.lastError の抑制
  if (window.chrome && window.chrome.runtime) {
    const originalSendMessage = window.chrome.runtime.sendMessage;
    window.chrome.runtime.sendMessage = function (...args: any[]) {
      try {
        return originalSendMessage?.apply(this, args);
      } catch (error) {
        // エラーを静かに無視
        return;
      }
    };
  }

  // window.ethereum 関連のエラー抑制
  Object.defineProperty(window, "ethereum", {
    get() {
      return undefined;
    },
    configurable: true,
  });
}

/**
 * ページ読み込み時にエラー抑制を初期化
 */
export function initializeErrorSuppression(): void {
  if (typeof window !== "undefined") {
    // DOMContentLoaded後に実行
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", suppressExtensionErrors);
    } else {
      suppressExtensionErrors();
    }
  }
}
