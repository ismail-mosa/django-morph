import { test, expect } from "@playwright/test";

test.describe("Auto-preserved elements", () => {
    test("contenteditable element is detected as auto-preserved", async ({ page }) => {
        await page.goto("/widgets/");

        const isAutoPreserved = await page.evaluate(() => {
            var el = document.getElementById("test-editable");
            if (!el) return false;
            var isContentEditable = el.getAttribute("contenteditable") === "true";
            return isContentEditable;
        });
        expect(isAutoPreserved).toBe(true);
    });

    test("file input survives morph navigation within forms page", async ({ page }) => {
        await page.goto("/forms/");

        await page.click('button:has-text("Next")');
        await page.waitForTimeout(300);

        const hasFileInput = await page.evaluate(() => {
            return !!document.querySelector('input[type="file"]');
        });
        expect(hasFileInput).toBe(true);

        await page.evaluate(() => {
            var fi = document.querySelector('input[type="file"]');
            if (fi) fi.setAttribute("id", "test-file-input");
        });

        await page.goto("/about/");
        await page.waitForTimeout(300);

        await page.goto("/forms/");
        await page.waitForTimeout(300);
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(300);

        const stillHasFileInput = await page.evaluate(() => {
            return !!document.querySelector('input[type="file"]');
        });
        expect(stillHasFileInput).toBe(true);
    });

    test("canvas element is preserved (not blanked) across morph", async ({ page }) => {
        await page.goto("/js-test/");
        await page.waitForTimeout(1500);

        const canvasDataBefore = await page.evaluate(() => {
            const canvas = document.getElementById("chartjs-bar");
            return canvas ? canvas.toDataURL().length : 0;
        });
        expect(canvasDataBefore).toBeGreaterThan(100);

        await page.goto("/about/");
        await page.waitForTimeout(500);

        await page.goto("/js-test/");
        await page.waitForTimeout(1500);

        const canvasDataAfter = await page.evaluate(() => {
            const canvas = document.getElementById("chartjs-bar");
            return canvas ? canvas.toDataURL().length : 0;
        });
        expect(canvasDataAfter).toBeGreaterThan(100);
    });
});
