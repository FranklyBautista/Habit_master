import { expect, type Page } from "@playwright/test";

export const demoCredentials = {
  email: "demo@habit-tracker.local",
  password: "HabitTracker2026",
};

export async function login(page: Page, credentials = demoCredentials): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoy$/);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(page.getByRole("heading", { name: /Buenos días/ })).toBeVisible({
        timeout: 2_000,
      });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(1_000);
      await page.reload();
    }
  }
}

export async function register(page: Page, email: string): Promise<void> {
  await page.goto("/registro");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("CuentaSegura2026");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/hoy$/);
}
