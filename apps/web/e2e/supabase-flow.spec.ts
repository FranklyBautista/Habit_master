import { expect, test } from "@playwright/test";

import { login, register } from "./helpers/auth";

test("protects private routes and supports login, logout and recovery", async ({
  page,
}) => {
  await page.goto("/hoy");
  await expect(page).toHaveURL(/\/login\?next=%2Fhoy$/);

  await login(page);
  await page.goto("/ajustes");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill("demo@habit-tracker.local");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Si la cuenta existe, recibirás un enlace",
  );
});

test("synchronizes mutations between two browser contexts", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const habitName = `Sincronización ${crypto.randomUUID().slice(0, 8)}`;

  try {
    await Promise.all([login(firstPage), login(secondPage)]);
    await firstPage.goto("/habitos");
    await firstPage.getByRole("button", { name: "Crear hábito", exact: true }).click();
    const dialog = firstPage.getByRole("dialog", { name: "Crear hábito" });
    await dialog.getByLabel("Nombre").fill(habitName);
    await dialog.getByRole("button", { name: "Crear hábito" }).click();
    await expect(firstPage.getByText(habitName, { exact: true })).toBeVisible();

    await secondPage.bringToFront();
    await secondPage.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(secondPage.getByRole("checkbox", { name: habitName })).toBeVisible();

    await firstPage.bringToFront();
    await firstPage.goto("/hoy");
    await firstPage.getByRole("checkbox", { name: habitName }).click();
    await expect(firstPage.getByRole("checkbox", { name: habitName })).toBeChecked();
    await secondPage.bringToFront();
    await secondPage.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(secondPage.getByRole("checkbox", { name: habitName })).toBeChecked();
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});

test("keeps data isolated between two accounts", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const suffix = crypto.randomUUID();
  const privateHabit = `Privado ${suffix.slice(0, 8)}`;

  try {
    await register(firstPage, `e2e-a-${suffix}@example.test`);
    await firstPage.goto("/habitos");
    await firstPage.getByRole("button", { name: "Crear hábito", exact: true }).click();
    const dialog = firstPage.getByRole("dialog", { name: "Crear hábito" });
    await dialog.getByLabel("Nombre").fill(privateHabit);
    await dialog.getByRole("button", { name: "Crear hábito" }).click();
    await expect(firstPage.getByText(privateHabit, { exact: true })).toBeVisible();

    await register(secondPage, `e2e-b-${suffix}@example.test`);
    await secondPage.goto("/habitos");
    await expect(secondPage.getByText(privateHabit, { exact: true })).toHaveCount(0);
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});

test("imports valid local data only after explicit confirmation", async ({ page }) => {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const habitName = `Migrado ${id.slice(0, 8)}`;

  await login(page);
  await page.evaluate(
    ({ habitId, name, now }) => {
      localStorage.setItem(
        "habit-tracker:v1",
        JSON.stringify({
          version: 1,
          habits: [
            {
              id: habitId,
              name,
              description: null,
              color: "#047857",
              icon: "sparkles",
              frequency: "daily",
              startDate: now.slice(0, 10),
              position: 0,
              archivedAt: null,
              createdAt: now,
              updatedAt: now,
            },
          ],
          checkins: [],
          settings: {
            displayName: "Datos migrados",
            timezone: "America/Los_Angeles",
            locale: "es",
            weekStartsOn: 1,
          },
        }),
      );
    },
    { habitId: id, name: habitName, now: timestamp },
  );
  await page.reload();
  await expect(page.getByText("Encontramos datos locales")).toBeVisible();
  await page.getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText("Tus datos locales se importaron")).toBeVisible();
  await page.goto("/habitos");
  await expect(page.getByText(habitName, { exact: true })).toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("habit-tracker:v1")),
  ).resolves.toBeNull();
});
