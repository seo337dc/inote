/**
 * 단축키 표기 — Tiptap 단축키 문자열("Mod-Shift-8")을 플랫폼에 맞는 글자로 바꾼다.
 * - 맥: Apple 표기 순서(⌃ ⌥ ⇧ ⌘)로 붙여 쓴다 → "⇧⌘8", "⌥⌘C"
 * - 그 외(윈도우·리눅스): Ctrl+Alt+Shift 순서로 "+"로 잇는다 → "Ctrl+Shift+8", "Ctrl+Alt+C"
 * `Mod`는 맥에서는 ⌘, 그 외에는 Ctrl이다.
 */
export type ShortcutPlatform = "mac" | "other";

export function detectPlatform(): ShortcutPlatform {
  if (typeof navigator === "undefined") return "other";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform) ? "mac" : "other";
}

const MODIFIERS = ["Mod", "Ctrl", "Alt", "Shift"] as const;
type Modifier = (typeof MODIFIERS)[number];
// 맥은 Apple 표기 순서(⌃ ⌥ ⇧ ⌘), 윈도우는 Ctrl(=Mod) 먼저 Ctrl+Alt+Shift 순서
const MAC_ORDER: Modifier[] = ["Ctrl", "Alt", "Shift", "Mod"];
const OTHER_ORDER: Modifier[] = ["Mod", "Ctrl", "Alt", "Shift"];
const MAC_SYMBOL: Record<Modifier, string> = { Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Mod: "⌘" };

function toModifier(part: string): Modifier | undefined {
  return MODIFIERS.find((m) => m.toLowerCase() === part.toLowerCase());
}

export function formatShortcut(spec: string, platform: ShortcutPlatform = detectPlatform()): string {
  const parts = spec.split("-");
  const rawKey = parts.pop() ?? "";
  const key = rawKey.length === 1 ? rawKey.toUpperCase() : rawKey;
  const used = new Set(parts.map(toModifier));

  if (platform === "mac") {
    return MAC_ORDER.filter((m) => used.has(m)).map((m) => MAC_SYMBOL[m]).join("") + key;
  }
  const names = OTHER_ORDER.filter((m) => used.has(m)).map((m) => (m === "Mod" ? "Ctrl" : m));
  return [...new Set(names), key].join("+"); // Mod와 Ctrl을 같이 쓴 경우 Ctrl이 두 번 나오지 않게 한다
}
