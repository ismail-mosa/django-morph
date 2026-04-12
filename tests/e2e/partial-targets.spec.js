import { test, expect } from "@playwright/test";

test.describe("Partial morph targets", () => {
    test("data-morph-target morphs only the target element", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        const scriptCountBefore = await page.evaluate(() => document.getElementById("script-time")?.textContent);
        const boxContentBefore = await page.evaluate(() => document.getElementById("box-1")?.textContent);

        await page.evaluate(() => document.querySelector('a[data-morph-target="#box-1"]').click());
        await page.waitForTimeout(500);

        const scriptCountAfter = await page.evaluate(() => document.getElementById("script-time")?.textContent);
        const boxContentAfter = await page.evaluate(() => document.getElementById("box-1")?.textContent);

        expect(scriptCountAfter).toBe(scriptCountBefore);
        expect(boxContentAfter).not.toBe(boxContentBefore);
    });

    test("data-morph-swap=innerHTML replaces target children", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        await page.evaluate(() => document.querySelector('a[data-morph-target="#content-area"]').click());
        await page.waitForTimeout(500);

        const content = await page.evaluate(() => document.getElementById("content-area")?.textContent || "");
        expect(content).toContain("Current animal:");
    });

    test("data-morph-swap=beforeend appends content", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        const countBefore = await page.evaluate(() => document.getElementById("append-target").children.length);

        await page.evaluate(() => document.querySelector('a[data-morph-swap="beforeend"]').click());
        await page.waitForTimeout(500);

        const countAfter = await page.evaluate(() => document.getElementById("append-target").children.length);
        expect(countAfter).toBeGreaterThan(countBefore);
    });

    test("data-morph-swap=afterbegin prepends content", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        const countBefore = await page.evaluate(() => document.getElementById("prepend-target").children.length);

        await page.evaluate(() => document.querySelector('a[data-morph-swap="afterbegin"]').click());
        await page.waitForTimeout(500);

        const countAfter = await page.evaluate(() => document.getElementById("prepend-target").children.length);
        expect(countAfter).toBeGreaterThan(countBefore);
    });

    test("form with data-morph-target updates only the result div", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        const scriptCountBefore = await page.evaluate(() => document.getElementById("script-time")?.textContent);

        await page.fill('input[name="name"]', "E2E Test");
        await page.evaluate(() => document.querySelector('form[data-morph-target]').requestSubmit());
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => document.getElementById("form-result")?.textContent || "");
        expect(result).toContain("Hello, E2E Test!");

        const scriptCountAfter = await page.evaluate(() => document.getElementById("script-time")?.textContent);
        expect(scriptCountAfter).toBe(scriptCountBefore);
    });

    test("partial morph does not update page title", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        await page.evaluate(() => document.querySelector('a[data-morph-target="#box-1"]').click());
        await page.waitForTimeout(500);

        await expect(page).toHaveTitle("Partial Target");
    });

    test("partial morph does not push to history by default", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(200);

        const historyBefore = await page.evaluate(() => history.length);

        await page.evaluate(() => document.querySelector('a[data-morph-target="#box-1"][data-morph-push="false"]').click());
        await page.waitForTimeout(500);

        const historyAfter = await page.evaluate(() => history.length);
        expect(historyAfter).toBe(historyBefore);
    });

    test("DjangoMorph.navigate API is available", async ({ page }) => {
        await page.goto("/partial-target/");

        const hasAPI = await page.evaluate(() => {
            return typeof DjangoMorph !== "undefined"
                && typeof DjangoMorph.navigate === "function"
                && typeof DjangoMorph.refresh === "function";
        });
        expect(hasAPI).toBe(true);
    });

    test("django-morph:updated event includes target for partial morphs", async ({ page }) => {
        await page.goto("/partial-target/");
        await page.waitForTimeout(300);

        const eventDetail = await page.evaluate(() => {
            return new Promise((resolve) => {
                const handler = (e) => {
                    window.removeEventListener("django-morph:updated", handler);
                    resolve(e.detail);
                };
                window.addEventListener("django-morph:updated", handler);
                document.querySelector('a[data-morph-target="#box-1"]').click();
            });
        });

        expect(eventDetail.target).toBe("#box-1");
    });
});
