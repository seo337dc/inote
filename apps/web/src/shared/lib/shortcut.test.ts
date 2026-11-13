import { afterEach, describe, expect, it, vi } from "vitest";
import { detectPlatform, formatShortcut } from "./shortcut";

describe("formatShortcut", () => {
  it("맥: Mod는 ⌘, Shift는 ⇧, Alt는 ⌥이고 Apple 순서(⌥ ⇧ ⌘)로 붙여 쓴다", () => {
    expect(formatShortcut("Mod-b", "mac")).toBe("⌘B");
    expect(formatShortcut("Mod-Shift-8", "mac")).toBe("⇧⌘8");
    expect(formatShortcut("Mod-Alt-c", "mac")).toBe("⌥⌘C");
    expect(formatShortcut("Mod-Shift-s", "mac")).toBe("⇧⌘S");
  });

  it("윈도우·리눅스: Mod는 Ctrl이고 Ctrl+Alt+Shift 순서로 +로 잇는다", () => {
    expect(formatShortcut("Mod-b", "other")).toBe("Ctrl+B");
    expect(formatShortcut("Mod-Shift-8", "other")).toBe("Ctrl+Shift+8");
    expect(formatShortcut("Mod-Alt-c", "other")).toBe("Ctrl+Alt+C");
  });

  it("쓴 순서와 상관없이 같은 순서로 표기하고, 수식어 대소문자를 가리지 않는다", () => {
    expect(formatShortcut("Shift-Mod-z", "other")).toBe("Ctrl+Shift+Z");
    expect(formatShortcut("mod-alt-1", "mac")).toBe("⌥⌘1");
  });

  it("한 글자가 아닌 키(Enter 등)는 그대로 둔다", () => {
    expect(formatShortcut("Mod-Enter", "other")).toBe("Ctrl+Enter");
    expect(formatShortcut("Shift-Tab", "mac")).toBe("⇧Tab");
  });
});

describe("detectPlatform", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("userAgentData가 있으면 그 platform으로 판단한다", () => {
    vi.stubGlobal("navigator", { userAgentData: { platform: "macOS" }, platform: "Win32" });
    expect(detectPlatform()).toBe("mac");
  });

  it("navigator.platform이 Mac·iPhone·iPad이면 맥 표기, 그 외는 other", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(detectPlatform()).toBe("mac");
    vi.stubGlobal("navigator", { platform: "iPad" });
    expect(detectPlatform()).toBe("mac");
    vi.stubGlobal("navigator", { platform: "Win32" });
    expect(detectPlatform()).toBe("other");
    vi.stubGlobal("navigator", { platform: "Linux x86_64" });
    expect(detectPlatform()).toBe("other");
  });

  it("navigator가 없는 환경(서버)에서는 other다", () => {
    vi.stubGlobal("navigator", undefined);
    expect(detectPlatform()).toBe("other");
  });
});
