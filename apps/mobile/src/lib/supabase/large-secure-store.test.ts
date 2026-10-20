import * as aesjs from "aes-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const asyncStorage = new Map<string, string>();
const secureStore = new Map<string, string>();

// Each call yields to the event loop first, like the native modules do, so
// unqueued writes would interleave.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

vi.mock("react-native-get-random-values", () => ({}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => {
      await tick();
      return asyncStorage.get(key) ?? null;
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      await tick();
      asyncStorage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      await tick();
      asyncStorage.delete(key);
    }),
  },
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => {
    await tick();
    return secureStore.get(key) ?? null;
  }),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    await tick();
    secureStore.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    await tick();
    secureStore.delete(key);
  }),
}));

const { default: AsyncStorage } =
  await import("@react-native-async-storage/async-storage");
const { LargeSecureStore } = await import("./large-secure-store");

const KEY = "sb-auth-token";
const session = (token: string) => JSON.stringify({ access_token: token });

describe("LargeSecureStore", () => {
  beforeEach(() => {
    asyncStorage.clear();
    secureStore.clear();
  });

  it("round-trips a value and keeps it encrypted at rest", async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, session("a"));

    expect(asyncStorage.get(KEY)).not.toContain("access_token");
    expect(await store.getItem(KEY)).toBe(session("a"));
  });

  it("keeps the last value readable when writes overlap", async () => {
    const store = new LargeSecureStore();
    await Promise.all([
      store.setItem(KEY, session("first")),
      store.setItem(KEY, session("second")),
      store.setItem(KEY, session("third")),
    ]);

    expect(await store.getItem(KEY)).toBe(session("third"));
  });

  it("keeps the previous session if a write dies before the value is saved", async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, session("a"));
    // The OS kills the app after the key write but before the value write.
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("killed"));
    await expect(store.setItem(KEY, session("b"))).rejects.toThrow("killed");

    expect(await new LargeSecureStore().getItem(KEY)).toBe(session("a"));
  });

  it("reuses the encryption key but not the counter", async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, session("a"));
    const keyAfterFirst = secureStore.get(KEY);
    const firstCipher = asyncStorage.get(KEY);
    await store.setItem(KEY, session("a"));

    expect(secureStore.get(KEY)).toBe(keyAfterFirst);
    expect(asyncStorage.get(KEY)).not.toBe(firstCipher);
  });

  it("reads values written before the counter was stored", async () => {
    const encryptionKey = new Uint8Array(32).fill(7);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    secureStore.set(KEY, aesjs.utils.hex.fromBytes(encryptionKey));
    asyncStorage.set(
      KEY,
      aesjs.utils.hex.fromBytes(
        cipher.encrypt(aesjs.utils.utf8.toBytes(session("old"))),
      ),
    );

    expect(await new LargeSecureStore().getItem(KEY)).toBe(session("old"));
  });

  it("returns null instead of throwing when the value can't be decrypted", async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, session("a"));
    secureStore.set(KEY, aesjs.utils.hex.fromBytes(new Uint8Array(32).fill(1)));

    expect(await store.getItem(KEY)).toBeNull();
  });

  it("removes both the value and its key", async () => {
    const store = new LargeSecureStore();
    await store.setItem(KEY, session("a"));
    await store.removeItem(KEY);

    expect(asyncStorage.has(KEY)).toBe(false);
    expect(secureStore.has(KEY)).toBe(false);
    expect(await store.getItem(KEY)).toBeNull();
  });
});
