import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";

type RouteMetrics = {
  domContentLoadedMs: number;
  firstContentfulPaintMs: number;
  javascriptBytes: number;
};

async function measureRoute(page: import("@playwright/test").Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  return page.evaluate<RouteMetrics>(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const firstContentfulPaint = performance
      .getEntriesByType("paint")
      .find((entry) => entry.name === "first-contentful-paint");
    const javascriptBytes = (
      performance.getEntriesByType("resource") as PerformanceResourceTiming[]
    )
      .filter((resource) => resource.initiatorType === "script")
      .reduce((total, resource) => total + resource.decodedBodySize, 0);
    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      firstContentfulPaintMs: Math.round(firstContentfulPaint?.startTime ?? 0),
      javascriptBytes,
    };
  });
}

for (const route of ["/hoy", "/estadisticas"]) {
  test(`${route} stays inside the prototype performance budget`, async ({
    page,
  }, testInfo) => {
    await login(page);
    const metrics = await measureRoute(page, route);
    await testInfo.attach(`performance-${route.slice(1)}`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });

    expect(metrics.domContentLoadedMs).toBeLessThan(2_000);
    expect(metrics.domContentLoadedMs).toBeGreaterThan(0);
    expect(metrics.firstContentfulPaintMs).toBeGreaterThan(0);
    expect(metrics.firstContentfulPaintMs).toBeLessThan(2_500);
    expect(metrics.javascriptBytes).toBeLessThan(2_500_000);
  });
}
