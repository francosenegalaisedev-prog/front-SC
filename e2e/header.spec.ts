import { expect, test } from "@playwright/test";

test("header desktop : connexion et inscription sont côte à côte", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/");

  const actions = page.locator(".hd-actions");
  const login = actions.getByRole("link", { name: "Connexion" });
  const register = actions.getByRole("link", { name: /S'inscrire/ });

  await expect(actions).toBeVisible();
  await expect(page.locator(".hd")).toHaveCount(1);
  await expect(login).toHaveAttribute("href", "/login");
  await expect(register).toHaveAttribute("href", "/register");
  await expect
    .poll(() =>
      login.evaluate(element => getComputedStyle(element).backgroundColor),
    )
    .toBe("rgb(232, 199, 127)");
  await expect
    .poll(() =>
      register.evaluate(element => getComputedStyle(element).backgroundColor),
    )
    .toBe("rgb(239, 23, 51)");
  await expect(
    page.locator(".hd").getByRole("link", { name: "Demander un devis" }),
  ).toHaveCount(0);

  const loginBox = await login.boundingBox();
  const registerBox = await register.boundingBox();
  expect(loginBox).not.toBeNull();
  expect(registerBox).not.toBeNull();
  expect(loginBox!.x + loginBox!.width).toBeLessThan(registerBox!.x);
});

test("header tablette : actions visibles avec le bouton menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");

  await expect(page.locator(".hd-actions")).toBeVisible();
  await expect(page.locator(".hd")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Ouvrir le menu" }),
  ).toBeVisible();
  await expect(page.locator(".hd .nav")).toBeHidden();
});

test("header mobile : connexion et inscription dans le menu, sans devis", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".hd-actions")).toBeHidden();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();

  const drawer = page.locator(".drawer");
  const actions = drawer.locator(".drawer-auth");
  const login = actions.getByRole("link", { name: "Connexion" });
  const register = actions.getByRole("link", { name: /S'inscrire/ });

  await expect(drawer).toBeVisible();
  await expect(page.locator(".hd")).toHaveCount(1);
  await expect(login).toHaveAttribute("href", "/login");
  await expect(register).toHaveAttribute("href", "/register");
  await expect(
    drawer.getByRole("link", { name: "Demander un devis" }),
  ).toHaveCount(0);

  const loginBox = await login.boundingBox();
  const registerBox = await register.boundingBox();
  expect(loginBox).not.toBeNull();
  expect(registerBox).not.toBeNull();
  expect(loginBox!.x + loginBox!.width).toBeLessThan(registerBox!.x);
  expect(registerBox!.x + registerBox!.width).toBeLessThanOrEqual(390);

  await login.click();
  await expect(page).toHaveURL(/\/login$/);
});
