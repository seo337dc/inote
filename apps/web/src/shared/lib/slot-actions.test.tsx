import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { registerSlotAction, useSlotActions, useRegisterSlotAction } from "./slot-actions";

const Icon = () => null;
const make = (id: string) => ({ id, label: id, icon: Icon, onClick: vi.fn() });

describe("slot-actions", () => {
  it("등록하면 목록에 나타나고, 해제하면 사라진다", () => {
    const { result } = renderHook(() => useSlotActions());
    expect(result.current).toHaveLength(0);

    let unregister = () => {};
    act(() => {
      unregister = registerSlotAction(make("a"));
    });
    expect(result.current.map((a) => a.id)).toEqual(["a"]);

    act(() => unregister());
    expect(result.current).toHaveLength(0);
  });

  it("같은 id를 다시 등록하면 중복되지 않고 새 것으로 바뀐다", () => {
    const { result } = renderHook(() => useSlotActions());
    const first = make("a");
    const second = make("a");
    let off1 = () => {};
    let off2 = () => {};
    act(() => {
      off1 = registerSlotAction(first);
      off2 = registerSlotAction(second);
    });
    expect(result.current).toEqual([second]);
    act(() => {
      off1(); // 이미 교체된 옛 등록의 해제는 새 것을 지우지 않는다
    });
    expect(result.current).toEqual([second]);
    act(() => off2());
    expect(result.current).toHaveLength(0);
  });

  it("useRegisterSlotAction에 null을 주면 등록하지 않는다 (조건부로 건너뛸 때)", () => {
    const list = renderHook(() => useSlotActions());
    renderHook(() => useRegisterSlotAction(null));
    expect(list.result.current).toHaveLength(0);
  });

  it("useRegisterSlotAction은 마운트 중에만 등록한다", () => {
    const action = make("memo");
    const list = renderHook(() => useSlotActions());
    const reg = renderHook(() => useRegisterSlotAction(action));
    expect(list.result.current.map((a) => a.id)).toEqual(["memo"]);
    reg.unmount();
    expect(list.result.current).toHaveLength(0);
  });
});

describe("slot-actions: 슬롯", () => {
  it("슬롯 없이 등록하면 dock이고, header-left 목록에는 나타나지 않는다", () => {
    const dock = renderHook(() => useSlotActions("dock"));
    const header = renderHook(() => useSlotActions("header-left"));
    let off = () => {};
    act(() => {
      off = registerSlotAction(make("a"));
    });
    expect(dock.result.current.map((a) => a.id)).toEqual(["a"]);
    expect(header.result.current).toHaveLength(0);
    act(() => off());
  });

  it("header-left로 등록한 것은 그 슬롯에만 나타난다", () => {
    const dock = renderHook(() => useSlotActions());
    const header = renderHook(() => useSlotActions("header-left"));
    let off = () => {};
    act(() => {
      off = registerSlotAction({ ...make("settings"), slot: "header-left" });
    });
    expect(header.result.current.map((a) => a.id)).toEqual(["settings"]);
    expect(dock.result.current).toHaveLength(0);
    act(() => off());
    expect(header.result.current).toHaveLength(0);
  });

  it("다른 슬롯이면 id가 같아도 서로 덮어쓰지 않는다", () => {
    const dock = renderHook(() => useSlotActions("dock"));
    const header = renderHook(() => useSlotActions("header-left"));
    let off1 = () => {};
    let off2 = () => {};
    act(() => {
      off1 = registerSlotAction(make("x"));
      off2 = registerSlotAction({ ...make("x"), slot: "header-left" });
    });
    expect(dock.result.current).toHaveLength(1);
    expect(header.result.current).toHaveLength(1);
    act(() => {
      off1();
      off2();
    });
  });
});
