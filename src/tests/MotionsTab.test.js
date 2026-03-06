import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MotionsTab } from "../components/MotionsTab";

const makeMotion = (id, motion, opts = {}) => ({
  id,
  motion,
  infoslide: opts.infoslide || "",
  sessionName: opts.sessionName || `Session ${id}`,
  date: opts.date || "2026-03-05",
});

describe("MotionsTab", () => {
  it("renders loading spinner when loading", () => {
    const { container } = render(<MotionsTab motions={[]} loading={true} />);
    expect(container.querySelector(".glass-spinner")).toBeTruthy();
  });

  it("renders empty state when no motions", () => {
    render(<MotionsTab motions={[]} loading={false} />);
    expect(screen.getByText("No motions yet")).toBeInTheDocument();
    expect(screen.getByText(/Motions from completed debate sessions/)).toBeInTheDocument();
  });

  it("renders motions list", () => {
    const motions = [
      makeMotion("1", "THW ban social media for minors"),
      makeMotion("2", "THBT capitalism is failing"),
    ];
    render(<MotionsTab motions={motions} loading={false} />);
    expect(screen.getByText(/THW ban social media for minors/)).toBeInTheDocument();
    expect(screen.getByText(/THBT capitalism is failing/)).toBeInTheDocument();
  });

  it("shows motion count", () => {
    const motions = [
      makeMotion("1", "Motion 1"),
      makeMotion("2", "Motion 2"),
      makeMotion("3", "Motion 3"),
    ];
    render(<MotionsTab motions={motions} loading={false} />);
    expect(screen.getByText("3 motions from past sessions")).toBeInTheDocument();
  });

  it("shows singular text for 1 motion", () => {
    const motions = [makeMotion("1", "Solo motion")];
    render(<MotionsTab motions={motions} loading={false} />);
    expect(screen.getByText("1 motion from past sessions")).toBeInTheDocument();
  });

  it("filters motions by search text", () => {
    const motions = [
      makeMotion("1", "THW ban social media"),
      makeMotion("2", "THBT AI is dangerous"),
    ];
    render(<MotionsTab motions={motions} loading={false} />);

    const searchInput = screen.getByPlaceholderText("Search motions...");
    fireEvent.change(searchInput, { target: { value: "AI" } });

    expect(screen.queryByText(/THW ban social media/)).not.toBeInTheDocument();
    expect(screen.getByText(/THBT AI is dangerous/)).toBeInTheDocument();
  });

  it("filters motions by session name", () => {
    const motions = [
      makeMotion("1", "Motion A", { sessionName: "Week 1 Practice" }),
      makeMotion("2", "Motion B", { sessionName: "Tournament Finals" }),
    ];
    render(<MotionsTab motions={motions} loading={false} />);

    fireEvent.change(screen.getByPlaceholderText("Search motions..."), {
      target: { value: "Tournament" },
    });

    expect(screen.queryByText(/Motion A/)).not.toBeInTheDocument();
    expect(screen.getByText(/Motion B/)).toBeInTheDocument();
  });

  it("shows 'no results' when search matches nothing", () => {
    const motions = [makeMotion("1", "Some motion")];
    render(<MotionsTab motions={motions} loading={false} />);

    fireEvent.change(screen.getByPlaceholderText("Search motions..."), {
      target: { value: "zzzzz" },
    });

    expect(screen.getByText("No motions match your search.")).toBeInTheDocument();
  });

  it("shows infoslide toggle when infoslide exists", () => {
    const motions = [
      makeMotion("1", "Motion with info", { infoslide: "Background context here" }),
    ];
    render(<MotionsTab motions={motions} loading={false} />);

    expect(screen.getByText("Info slide")).toBeInTheDocument();
    // Infoslide should be hidden initially
    expect(screen.queryByText("Background context here")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("Info slide"));
    expect(screen.getByText("Background context here")).toBeInTheDocument();
  });

  it("does not show infoslide toggle when no infoslide", () => {
    const motions = [makeMotion("1", "Motion without info")];
    render(<MotionsTab motions={motions} loading={false} />);
    expect(screen.queryByText("Info slide")).not.toBeInTheDocument();
  });

  it("displays session name and formatted date", () => {
    const motions = [
      makeMotion("1", "Test motion", { sessionName: "Practice Round", date: "2026-03-05" }),
    ];
    render(<MotionsTab motions={motions} loading={false} />);
    expect(screen.getByText("Practice Round")).toBeInTheDocument();
    expect(screen.getByText("Mar 5, 2026")).toBeInTheDocument();
  });
});
