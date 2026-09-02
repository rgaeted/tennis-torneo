export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  // Chrome/Firefox on iOS use WebKit but aren't Safari
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}
