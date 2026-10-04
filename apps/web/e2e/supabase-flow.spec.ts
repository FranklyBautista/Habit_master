import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login, register } from "./helpers/auth";
import { readEmailedCode } from "./helpers/mailpit";

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
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page).toHaveURL(/\/verificar\?type=recovery&email=/);
  await expect(
    page.getByText(
      "Si hay una cuenta con demo@habit-tracker.local, te enviamos un código.",
    ),
  ).toBeVisible();
});

test("recovers the password with the emailed code", async ({ page }) => {
  const email = `e2e-recovery-${crypto.randomUUID()}@example.test`;
  await register(page, email);
  await page.context().clearCookies();

  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill(email);
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page).toHaveURL(/\/verificar\?type=recovery/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(
    page.getByRole("button", { name: /Reenviar código en \d+ s/ }),
  ).toBeDisabled();

  await page.getByLabel("Código de verificación").fill("000000");
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page.locator(".form-error")).toHaveText(
    "El código no es válido o ha caducado. Pide uno nuevo.",
  );

  await page.getByLabel("Código de verificación").fill(await readEmailedCode(email));
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page).toHaveURL(/\/actualizar-contrasena$/);

  await page.getByLabel("Contraseña").fill("NuevaClave2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/hoy$/);

  await page.context().clearCookies();
  await login(page, { email, password: "NuevaClave2026" });
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

test("rejects local data with orphan check-ins and keeps it", async ({ page }) => {
  const timestamp = new Date().toISOString();
  const localState = JSON.stringify({
    version: 1,
    habits: [],
    checkins: [
      {
        id: crypto.randomUUID(),
        habitId: crypto.randomUUID(),
        checkinDate: timestamp.slice(0, 10),
        completedAt: timestamp,
      },
    ],
    settings: {
      displayName: "Datos huérfanos",
      timezone: "America/Los_Angeles",
      locale: "es",
      weekStartsOn: 1,
    },
  });

  await login(page);
  await page.evaluate(
    (state) => localStorage.setItem("habit-tracker:v1", state),
    localState,
  );
  await page.reload();
  await page.getByRole("button", { name: "Importar" }).click();
  await expect(
    page.getByText(
      "No se pudieron importar los datos locales. Hay check-ins de un hábito que no existe.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("habit-tracker:v1")),
  ).resolves.toBe(localState);
  await page.evaluate(() => localStorage.removeItem("habit-tracker:v1"));
});
