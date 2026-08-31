import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { PeriodTabs, type StatisticsPeriod } from "./period-tabs";

function PeriodTabsHarness() {
  const [period, setPeriod] = useState<StatisticsPeriod>(30);
  return <PeriodTabs value={period} onChange={setPeriod} />;
}

describe("PeriodTabs", () => {
  it("identifies the active period and changes it", async () => {
    const user = userEvent.setup();
    render(<PeriodTabsHarness />);

    expect(screen.getByRole("button", { name: "30 días" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "7 días" }));

    expect(screen.getByRole("button", { name: "7 días" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "30 días" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
