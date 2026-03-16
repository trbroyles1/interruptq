// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreferencesPanel } from "../PreferencesPanel";
import { makePreferences } from "@/lib/__tests__/helpers";

const mockDisconnect = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ disconnect: mockDisconnect }),
}));

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Preferences" }));
  return { user, dialog: screen.getByRole("dialog") };
}

describe("PreferencesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("rendering", () => {
    it("returns null when preferences is null", () => {
      const { container } = render(
        <PreferencesPanel preferences={null} onSave={vi.fn()} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders trigger button when preferences are provided", () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      expect(
        screen.getByRole("button", { name: "Preferences" }),
      ).toBeInTheDocument();
    });

    it("opens dialog with title on trigger click", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { dialog } = await openDialog();
      expect(within(dialog).getByText("Preferences")).toBeInTheDocument();
    });

    it("displays Schedule and General section headers", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { dialog } = await openDialog();
      expect(within(dialog).getByText("Schedule")).toBeInTheDocument();
      expect(within(dialog).getByText("General")).toBeInTheDocument();
    });

    it("displays all seven days in working hours", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { dialog } = await openDialog();
      for (const day of [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]) {
        expect(within(dialog).getByRole("switch", { name: day })).toBeInTheDocument();
      }
    });

    it("displays handle input with current value", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences({ handle: "myhandle" })}
          onSave={vi.fn()}
        />,
      );
      const { dialog } = await openDialog();
      expect(within(dialog).getByDisplayValue("myhandle")).toBeInTheDocument();
    });

    it("displays on-call prefix input with current value", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences({ onCallPrefix: "CALL" })}
          onSave={vi.fn()}
        />,
      );
      const { dialog } = await openDialog();
      expect(within(dialog).getByDisplayValue("CALL")).toBeInTheDocument();
    });

    it("displays quick-pick count inputs with correct values", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences({
            quickPickRecentCount: 8,
            quickPickOncallTicketCount: 3,
            quickPickOncallOtherCount: 4,
          })}
          onSave={vi.fn()}
        />,
      );
      const { dialog } = await openDialog();
      expect(within(dialog).getByDisplayValue("8")).toBeInTheDocument();
      expect(within(dialog).getByDisplayValue("3")).toBeInTheDocument();
      expect(within(dialog).getByDisplayValue("4")).toBeInTheDocument();
    });

    it("displays week start day select with correct value", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences({ weekStartDay: 0 })}
          onSave={vi.fn()}
        />,
      );
      const { dialog } = await openDialog();
      const select = within(dialog).getByRole("combobox");
      expect(select).toHaveValue("0");
    });

    it("displays current timezone", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences({ timezone: "America/New_York" })}
          onSave={vi.fn()}
        />,
      );
      const { dialog } = await openDialog();
      expect(
        within(dialog).getByText("America/New York"),
      ).toBeInTheDocument();
    });

    it("displays replay onboarding tour button", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences()}
          onSave={vi.fn()}
          onReplayTour={vi.fn()}
        />,
      );
      const { dialog } = await openDialog();
      expect(
        within(dialog).getByRole("button", {
          name: /replay onboarding tour/i,
        }),
      ).toBeInTheDocument();
    });

    it("displays disconnect button", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { dialog } = await openDialog();
      expect(
        within(dialog).getByRole("button", { name: /disconnect/i }),
      ).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("saves handle on blur", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences({ handle: "" })}
          onSave={onSave}
        />,
      );
      const { user, dialog } = await openDialog();

      const handleInput =
        within(dialog).getByPlaceholderText("Enter a handle...");
      await user.type(handleInput, "newhandle");
      await user.tab();

      expect(onSave).toHaveBeenCalledWith({ handle: "newhandle" });
    });

    it("toggles working hours day", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences()}
          onSave={onSave}
        />,
      );
      const { user, dialog } = await openDialog();

      // Saturday is disabled by default — toggle it on
      const saturdaySwitch = within(dialog).getByRole("switch", {
        name: "Saturday",
      });
      await user.click(saturdaySwitch);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          workingHours: expect.objectContaining({
            sat: expect.objectContaining({ enabled: true }),
          }),
        }),
      );
    });

    it("saves working hours time change", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences()}
          onSave={onSave}
        />,
      );
      const { dialog } = await openDialog();

      // Monday is enabled — change its start time
      const timeInputs = within(dialog).getAllByDisplayValue("09:00");
      fireEvent.change(timeInputs[0], { target: { value: "08:00" } });

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          workingHours: expect.objectContaining({
            mon: expect.objectContaining({ start: "08:00" }),
          }),
        }),
      );

      // Change the end time
      const endInputs = within(dialog).getAllByDisplayValue("17:00");
      fireEvent.change(endInputs[0], { target: { value: "18:00" } });

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          workingHours: expect.objectContaining({
            mon: expect.objectContaining({ end: "18:00" }),
          }),
        }),
      );
    });

    it("saves on-call prefix on change", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences({ onCallPrefix: "OC" })}
          onSave={onSave}
        />,
      );
      const { dialog } = await openDialog();

      const prefixInput = within(dialog).getByLabelText(
        /on-call ticket prefix/i,
      );
      fireEvent.change(prefixInput, { target: { value: "CALL" } });

      expect(onSave).toHaveBeenCalledWith({ onCallPrefix: "CALL" });
    });

    it("saves quick-pick recent count on change", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences()}
          onSave={onSave}
        />,
      );
      const { dialog } = await openDialog();

      const recentInput = within(dialog).getByDisplayValue("10");
      fireEvent.change(recentInput, { target: { value: "15" } });

      expect(onSave).toHaveBeenCalledWith({ quickPickRecentCount: 15 });
    });

    it("saves quick-pick on-call ticket count on change", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences({
            quickPickOncallTicketCount: 5,
            quickPickOncallOtherCount: 7,
          })}
          onSave={onSave}
        />,
      );
      const { dialog } = await openDialog();

      const ticketInput = within(dialog).getByDisplayValue("5");
      fireEvent.change(ticketInput, { target: { value: "8" } });

      expect(onSave).toHaveBeenCalledWith({ quickPickOncallTicketCount: 8 });
    });

    it("saves quick-pick on-call other count on change", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences({
            quickPickOncallTicketCount: 3,
            quickPickOncallOtherCount: 5,
          })}
          onSave={onSave}
        />,
      );
      const { dialog } = await openDialog();

      const otherInput = within(dialog).getByDisplayValue("5");
      fireEvent.change(otherInput, { target: { value: "9" } });

      expect(onSave).toHaveBeenCalledWith({ quickPickOncallOtherCount: 9 });
    });

    it("saves week start day on change", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences({ weekStartDay: 1 })}
          onSave={onSave}
        />,
      );
      const { user, dialog } = await openDialog();

      const select = within(dialog).getByRole("combobox");
      await user.selectOptions(select, "0");

      expect(onSave).toHaveBeenCalledWith({ weekStartDay: 0 });
    });

    it("calls onReplayTour when replay button is clicked", async () => {
      const onReplayTour = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences()}
          onSave={vi.fn()}
          onReplayTour={onReplayTour}
        />,
      );
      const { user, dialog } = await openDialog();

      await user.click(
        within(dialog).getByRole("button", {
          name: /replay onboarding tour/i,
        }),
      );

      expect(onReplayTour).toHaveBeenCalledOnce();
    });

    it("shows confirmation on disconnect click", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { user, dialog } = await openDialog();

      await user.click(
        within(dialog).getByRole("button", { name: /disconnect/i }),
      );

      expect(within(dialog).getByText(/are you sure/i)).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: /confirm/i }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("cancels disconnect confirmation", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { user, dialog } = await openDialog();

      await user.click(
        within(dialog).getByRole("button", { name: /disconnect/i }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: /cancel/i }),
      );

      expect(
        within(dialog).queryByText(/are you sure/i),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: /disconnect/i }),
      ).toBeInTheDocument();
    });

    it("calls disconnect on confirm", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { user, dialog } = await openDialog();

      await user.click(
        within(dialog).getByRole("button", { name: /disconnect/i }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: /confirm/i }),
      );

      expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it("opens timezone picker and selects a timezone", async () => {
      const onSave = vi.fn();
      render(
        <PreferencesPanel
          preferences={makePreferences({ timezone: "America/New_York" })}
          onSave={onSave}
        />,
      );
      const { user, dialog } = await openDialog();

      // Click the timezone button to open the picker
      await user.click(within(dialog).getByText("America/New York"));

      // Search input should appear
      const searchInput =
        within(dialog).getByPlaceholderText("Search timezones...");
      expect(searchInput).toBeInTheDocument();

      // Timezone options should be visible
      expect(
        within(dialog).getByText("Europe/London"),
      ).toBeInTheDocument();

      // Select a different timezone
      await user.click(within(dialog).getByText("Europe/London"));

      expect(onSave).toHaveBeenCalledWith({ timezone: "Europe/London" });
    });

    it("filters timezone list by search text", async () => {
      render(
        <PreferencesPanel
          preferences={makePreferences({ timezone: "America/New_York" })}
          onSave={vi.fn()}
        />,
      );
      const { user, dialog } = await openDialog();

      await user.click(within(dialog).getByText("America/New York"));

      const searchInput =
        within(dialog).getByPlaceholderText("Search timezones...");
      await user.type(searchInput, "Tokyo");

      expect(within(dialog).getByText("Asia/Tokyo")).toBeInTheDocument();
      expect(
        within(dialog).queryByText("Europe/London"),
      ).not.toBeInTheDocument();
    });

    it("shows time inputs for enabled working days", async () => {
      render(
        <PreferencesPanel preferences={makePreferences()} onSave={vi.fn()} />,
      );
      const { dialog } = await openDialog();

      // Monday is enabled by default — should have time inputs
      const timeInputs = within(dialog).getAllByDisplayValue("09:00");
      expect(timeInputs.length).toBeGreaterThanOrEqual(1);

      // Saturday is disabled — its switch should be unchecked
      const satSwitch = within(dialog).getByRole("switch", {
        name: "Saturday",
      });
      expect(satSwitch).toHaveAttribute("aria-checked", "false");
    });
  });
});
