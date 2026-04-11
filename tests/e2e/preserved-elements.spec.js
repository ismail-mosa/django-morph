import { test, expect } from "@playwright/test";

test.describe("Element preservation", () => {
    test("data-morph-preserve audio element survives morph navigation", async ({ page }) => {
        await page.goto("/");

        const audioExists = await page.evaluate(() => {
            const audio = document.querySelector("#audio-player audio");
            return !!audio;
        });
        expect(audioExists).toBe(true);

        await page.click('a[href="/about/"]');
        await page.waitForURL("/about/");

        const stillExists = await page.evaluate(() => {
            return !!document.querySelector("#audio-player audio");
        });
        expect(stillExists).toBe(true);
    });

    test("data-morph-preserve element is not cloned or duplicated", async ({ page }) => {
        await page.goto("/");

        await page.click('a[href="/contact/"]');
        await page.waitForURL("/contact/");

        await page.click('a[href="/"]');
        await page.waitForURL("/");

        const count = await page.evaluate(() => {
            return document.querySelectorAll("#audio-player").length;
        });
        expect(count).toBe(1);
    });

    test("live clock on live page keeps ticking across morph", async ({ page }) => {
        await page.goto("/live/");
        await page.waitForTimeout(1000);

        const time1 = await page.evaluate(() => {
            return document.getElementById("live-clock")?.textContent;
        });
        expect(time1).not.toBe("--:--:--");

        await page.waitForTimeout(2000);

        const time2 = await page.evaluate(() => {
            return document.getElementById("live-clock")?.textContent;
        });
        expect(time2).not.toBe(time1);
    });
});
