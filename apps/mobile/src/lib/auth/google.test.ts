import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, browser } = vi.hoisted(() => ({
  auth: { signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn() },
  browser: { openAuthSessionAsync: vi.fn() },
}));

vi.mock("@/lib/supabase/client", () => ({ supabase: { auth } }));
vi.mock("expo-web-browser", () => browser);
// Linking.createURL/parse reales dependen de expo-constants; basta con la
// forma de un build standalone.
vi.mock("expo-linking", () => ({
  createURL: (path: string) => `habittracker:/${path}`,
  parse: (url: string) => ({
    queryParams: Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? "")),
  }),
}));

const { completeGoogleSignIn, GOOGLE_SIGN_IN_ERROR, signInWithGoogle } =
  await import("./google");

const googleUrl = "https://example.supabase.co/auth/v1/authorize?provider=google";
const redirectTo = "habittracker://auth/callback";

beforeEach(() => {
  Object.values(auth).forEach((mock) => mock.mockReset());
  browser.openAuthSessionAsync.mockReset();
  auth.signInWithOAuth.mockResolvedValue({ data: { url: googleUrl }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("signInWithGoogle", () => {
  it("opens Google in an auth session and exchanges the returned code", async () => {
    browser.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `${redirectTo}?code=code-1`,
    });

    expect(await signInWithGoogle()).toEqual({ status: "success" });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    expect(browser.openAuthSessionAsync).toHaveBeenCalledWith(googleUrl, redirectTo);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("code-1");
  });

  it("treats closing the browser as a cancellation, not an error", async () => {
    browser.openAuthSessionAsync.mockResolvedValue({ type: "cancel" });

    expect(await signInWithGoogle()).toEqual({ status: "cancelled" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails without opening the browser when Supabase gives no URL", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: "Unsupported provider" },
    });

    expect(await signInWithGoogle()).toEqual({
      status: "error",
      message: GOOGLE_SIGN_IN_ERROR,
    });
    expect(browser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  it("reports a failed exchange", async () => {
    browser.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `${redirectTo}?code=code-2`,
    });
    auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid flow state" },
    });

    expect(await signInWithGoogle()).toEqual({
      status: "error",
      message: GOOGLE_SIGN_IN_ERROR,
    });
  });
});

describe("completeGoogleSignIn", () => {
  it("exchanges each code once even when the deep link also arrives", async () => {
    const [fromSession, fromDeepLink] = await Promise.all([
      completeGoogleSignIn({ code: "code-3" }),
      completeGoogleSignIn({ code: "code-3" }),
    ]);

    expect(fromSession).toEqual({ status: "success" });
    expect(fromDeepLink).toEqual({ status: "success" });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it("treats a denied consent as a cancellation", async () => {
    expect(await completeGoogleSignIn({ error: "access_denied" })).toEqual({
      status: "cancelled",
    });
  });

  it("reports any other provider error", async () => {
    expect(await completeGoogleSignIn({ error: "server_error" })).toEqual({
      status: "error",
      message: GOOGLE_SIGN_IN_ERROR,
    });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
