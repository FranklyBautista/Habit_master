import { expect, test } from "@playwright/test";

test("exposes a valid web app manifest with install icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/manifest+json");

  const manifest = await response.json();
  expect(manifest.name).toBe("Constancia — Habit Tracker");
  expect(manifest.short_name).toBe("Constancia");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  expect(
    manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable"),
  ).toBe(true);
});

test("renders a clear, read-only offline page", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
});

test("registers the service worker in production", async ({ page }) => {
  await page.goto("/login");
  const registered = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });
  expect(registered).toBe(true);
});

test("falls back to the offline page when navigation fails without network", async ({
  page,
  context,
}) => {
  // First load lets the service worker install, activate and precache the
  // offline page while still online.
  await page.goto("/login");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // A controlled navigation is required for the activated worker to start
  // intercepting fetches on this page (clients.claim() only affects future
  // navigations).
  await page.reload();

  await context.setOffline(true);
  try {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
