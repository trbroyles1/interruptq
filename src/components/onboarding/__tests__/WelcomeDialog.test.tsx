// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeDialog } from "../WelcomeDialog";

describe("WelcomeDialog", () => {
  it("renders the welcome title and description when open", () => {
    render(
      <WelcomeDialog open={true} onTakeTour={vi.fn()} onSkip={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Welcome to InterruptQ")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/tracks where your time goes/),
    ).toBeInTheDocument();
  });

  it("renders all three classification types", () => {
    render(
      <WelcomeDialog open={true} onTakeTour={vi.fn()} onSkip={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("On-Target")).toBeInTheDocument();
    expect(within(dialog).getByText("Re-Prioritized")).toBeInTheDocument();
    expect(within(dialog).getByText("Interrupted")).toBeInTheDocument();
  });

  it("renders classification descriptions", () => {
    render(
      <WelcomeDialog open={true} onTakeTour={vi.fn()} onSkip={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/Work matching your sprint goals/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Matches current priorities, not sprint goals/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Unplanned work outside goals and priorities/),
    ).toBeInTheDocument();
  });

  it("calls onTakeTour when 'Take the tour' is clicked", async () => {
    const onTakeTour = vi.fn();
    const user = userEvent.setup();

    render(
      <WelcomeDialog open={true} onTakeTour={onTakeTour} onSkip={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Take the tour" }));
    expect(onTakeTour).toHaveBeenCalledOnce();
  });

  it("calls onSkip when 'Skip for now' is clicked", async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();

    render(
      <WelcomeDialog open={true} onTakeTour={vi.fn()} onSkip={onSkip} />,
    );

    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("renders both action buttons", () => {
    render(
      <WelcomeDialog open={true} onTakeTour={vi.fn()} onSkip={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Take the tour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
  });
});
