import { test, expect } from "@playwright/test";

test.describe("Form submission and redirect", () => {
    test("contact form submits via morph and redirects to success", async ({ page }) => {
        await page.goto("/contact/");

        await page.fill('input[name="name"]', "E2E Test");
        await page.fill('input[name="email"]', "e2e@test.com");
        await page.fill('textarea[name="message"]', "Hello from Playwright");

        await page.click('button[type="submit"]');
        await page.waitForURL(/\/success\//);
        await page.waitForTimeout(300);

        await expect(page.locator("h1")).toContainText("Success");
    });

    test("item creation via morph redirects to items list", async ({ page }) => {
        await page.goto("/items/?add=1");
        await page.waitForTimeout(300);

        await page.fill('input[name="title"]', "E2E Created Item");
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/items\//);
        await page.waitForTimeout(300);

        const pageText = await page.evaluate(() => document.body.textContent);
        expect(pageText).toContain("E2E Created Item");
    });
});
