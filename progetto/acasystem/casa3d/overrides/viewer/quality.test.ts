// Tests of quality.ts (T5): the three levels, the names of the original viewer, the pixel ratio of every level and
// the rule that spaces the drawn frames in Light.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { displayPeriodMeter, mustWait, normalizeQuality, pixelRatioFor, QUALITIES, TIERS, toLegacyQuality } from "./quality.ts";

describe("quality levels", () => {
  it("has Light, Medium and High, each one with its own parameters", () => {
    assert.deepEqual([...QUALITIES], ["light", "medium", "high"]);
    for (const level of QUALITIES) assert.ok(TIERS[level].pixelRatioCap >= 1);
  });

  it("gets heavier from Light to High", () => {
    assert.ok(TIERS.light.pixelRatioCap <= TIERS.medium.pixelRatioCap);
    assert.ok(TIERS.medium.pixelRatioCap <= TIERS.high.pixelRatioCap);
    assert.ok(TIERS.light.drawGapMs > TIERS.medium.drawGapMs);
    assert.equal(TIERS.light.antialias, false);
    assert.equal(TIERS.medium.antialias, false);
    assert.equal(TIERS.high.antialias, true);
    assert.equal(TIERS.light.powerPreference, "low-power");
  });

  it("starts from Light for anything it does not know, the old «auto» and «low» too", () => {
    for (const value of ["light", "auto", "low", "", "LIGHT", "ultra", null, undefined, 3, {}]) assert.equal(normalizeQuality(value), "light");
    assert.equal(normalizeQuality("medium"), "medium");
    assert.equal(normalizeQuality("high"), "high");
  });

  it("keeps Light at one buffer pixel per CSS pixel on any screen", () => {
    for (const ratio of [1, 1.5, 2, 2.625, 3, 3.5]) assert.equal(pixelRatioFor("light", ratio), 1);
  });

  it("caps Medium at 1.25 and High at 2", () => {
    assert.equal(pixelRatioFor("medium", 1), 1);
    assert.equal(pixelRatioFor("medium", 1.5), 1.25);
    assert.equal(pixelRatioFor("medium", 3), 1.25);
    assert.equal(pixelRatioFor("high", 1.5), 1.5);
    assert.equal(pixelRatioFor("high", 3), 2);
  });

  it("does not trust a missing or absurd device pixel ratio", () => {
    for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.ok(pixelRatioFor("high", ratio) >= 1 && pixelRatioFor("high", ratio) <= 2);
    }
  });

  it("maps to the names the time travel replay uses", () => {
    assert.equal(toLegacyQuality("light"), "low");
    assert.equal(toLegacyQuality("medium"), "auto");
    assert.equal(toLegacyQuality("high"), "high");
  });
});

describe("spacing of the drawn frames", () => {
  const gap = TIERS.light.drawGapMs;

  it("never waits where there is no gap (Medium, High)", () => {
    assert.equal(mustWait(1000, 995, TIERS.high.drawGapMs, 11), false);
    assert.equal(mustWait(1000, 999, TIERS.medium.drawGapMs, 11), false);
  });

  it("waits when the last drawn frame is too close, and draws the frame that falls after the gap", () => {
    assert.equal(mustWait(1011, 1000, gap, 11), true);
    assert.equal(mustWait(1020, 1000, gap, 11), true);
    assert.equal(mustWait(1022, 1000, gap, 11), false);
  });

  it("leaves a 60 Hz screen (and one not measured yet) at every display frame", () => {
    assert.equal(mustWait(1017, 1000, gap, 16.7), false);
    assert.equal(mustWait(1011, 1000, gap, 99), false);
  });

  it("keeps the full rate on 60 Hz and about 45 or 40 fps on 90 and 120 Hz (never fewer than the 30 fps of T11)", () => {
    const run = (hz: number) => {
      const step = 1000 / hz;
      let last = 0;
      let drawn = 0;
      for (let t = step; t <= 10_000; t += step) {
        if (mustWait(t, last, gap, step)) continue;
        last = t;
        drawn += 1;
      }
      return drawn / 10;
    };
    assert.ok(run(60) >= 59 && run(60) <= 61, `60 Hz: ${run(60)}`);
    assert.ok(run(75) >= 36 && run(75) <= 38, `75 Hz: ${run(75)}`);
    assert.ok(run(90) >= 44 && run(90) <= 46, `90 Hz: ${run(90)}`);
    assert.ok(run(120) >= 39 && run(120) <= 41, `120 Hz: ${run(120)}`);
  });

  it("draws the first frame at once and after a long pause", () => {
    assert.equal(mustWait(5000, 0, gap, 11), false);
    assert.equal(mustWait(5000, 1000, gap, 11), false);
  });

  it("does not hold a frame back when the clock went backwards", () => {
    assert.equal(mustWait(900, 1000, gap, 11), false);
  });
});

describe("display period", () => {
  const feed = (hz: number, frames: number, from = 1000) => {
    const note = displayPeriodMeter();
    let period = 0;
    for (let i = 0; i < frames; i += 1) period = note(from + (i * 1000) / hz);
    return period;
  };

  it("counts as slow (no spacing) until the second frame", () => {
    assert.ok(feed(90, 1) > 14);
  });

  it("measures 60, 90 and 120 Hz screens", () => {
    assert.ok(Math.abs(feed(60, 10) - 16.67) < 0.1);
    assert.ok(Math.abs(feed(90, 10) - 11.11) < 0.1);
    assert.ok(Math.abs(feed(120, 10) - 8.33) < 0.1);
  });

  it("is not fooled by a slow frame or by a pause", () => {
    const note = displayPeriodMeter();
    let t = 1000;
    let period = 0;
    for (let i = 0; i < 6; i += 1) period = note((t += 11.1));
    period = note((t += 33)); // a frame that took three display frames
    period = note((t += 5000)); // nothing asked a frame for five seconds
    assert.ok(period >= 11.1 && period <= 12.3, `period: ${period}`);
  });
});
