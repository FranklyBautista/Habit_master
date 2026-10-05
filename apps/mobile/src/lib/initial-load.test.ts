import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialLoadErrorDetail, loadWithRetry } from "./initial-load";

describe("loadWithRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the first successful result without waiting", async () => {
    const load = vi.fn().mockResolvedValue("estado");

    await expect(loadWithRetry(load)).resolves.toBe("estado");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("recovers from a transient failure on its own", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce({ code: "PGRST301", message: "JWT expired" })
      .mockResolvedValue("estado");

    const result = loadWithRetry(load, { delayMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe("estado");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("waits longer before each new attempt and gives up after the last one", async () => {
    const failure = { message: "TypeError: Network request failed" };
    const load = vi.fn().mockRejectedValue(failure);

    const result = loadWithRetry(load, { attempts: 3, delayMs: 1000 });
    const settled = expect(result).rejects.toBe(failure);

    await vi.advanceTimersByTimeAsync(999);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(load).toHaveBeenCalledTimes(3);

    await settled;
  });
});

describe("initialLoadErrorDetail", () => {
  it("joins the code and message of a Supabase error object", () => {
    expect(
      initialLoadErrorDetail({ code: "PGRST303", message: "JWT issued at future" }),
    ).toBe("PGRST303: JWT issued at future");
  });

  it("uses the message of a regular Error", () => {
    expect(initialLoadErrorDetail(new Error("Network request failed"))).toBe(
      "Network request failed",
    );
  });

  it("returns nothing when there is no usable detail", () => {
    expect(initialLoadErrorDetail({ code: "", message: "" })).toBeUndefined();
    expect(initialLoadErrorDetail(undefined)).toBeUndefined();
  });
});
