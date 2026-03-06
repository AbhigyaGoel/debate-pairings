import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResourcesTab } from "../components/ResourcesTab";

const makeResource = (id, title, url = "https://example.com") => ({
  id,
  title,
  description: `Description for ${title}`,
  url,
  createdBy: "Admin",
  createdAt: "2026-03-05T10:00:00.000Z",
});

describe("ResourcesTab", () => {
  const noopFn = () => {};

  it("renders loading spinner when loading", () => {
    const { container } = render(
      <ResourcesTab resources={[]} loading={true} isAdmin={false} />
    );
    expect(container.querySelector(".glass-spinner")).toBeTruthy();
  });

  it("renders empty state for viewers", () => {
    render(<ResourcesTab resources={[]} loading={false} isAdmin={false} />);
    expect(screen.getByText("No resources yet")).toBeInTheDocument();
    expect(screen.getByText(/debate guides, articles/)).toBeInTheDocument();
  });

  it("renders resources list", () => {
    const resources = [
      makeResource("r1", "WUDC 2025 Tab"),
      makeResource("r2", "Debate Handbook"),
    ];
    render(<ResourcesTab resources={resources} loading={false} isAdmin={false} />);
    expect(screen.getByText("WUDC 2025 Tab")).toBeInTheDocument();
    expect(screen.getByText("Debate Handbook")).toBeInTheDocument();
  });

  it("shows resource count", () => {
    const resources = [makeResource("r1", "R1"), makeResource("r2", "R2")];
    render(<ResourcesTab resources={resources} loading={false} isAdmin={false} />);
    expect(screen.getByText("2 resources")).toBeInTheDocument();
  });

  it("extracts and displays domain from URL", () => {
    const resources = [makeResource("r1", "Test", "https://www.example.com/path")];
    render(<ResourcesTab resources={resources} loading={false} isAdmin={false} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("resource links open in new tab", () => {
    const resources = [makeResource("r1", "Test Link", "https://example.com/page")];
    render(<ResourcesTab resources={resources} loading={false} isAdmin={false} />);
    const link = screen.getByText("Test Link").closest("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("href", "https://example.com/page");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not show Add Resource button for non-admin", () => {
    render(<ResourcesTab resources={[]} loading={false} isAdmin={false} />);
    expect(screen.queryByText("Add Resource")).not.toBeInTheDocument();
  });

  it("shows Add Resource button for admin", () => {
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={noopFn}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );
    expect(screen.getByText("Add Resource")).toBeInTheDocument();
  });

  it("shows add form when Add Resource is clicked", () => {
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={noopFn}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    expect(screen.getByPlaceholderText("Resource title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
  });

  it("validates title is required", () => {
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={noopFn}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("validates URL is required", () => {
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={noopFn}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    fireEvent.change(screen.getByPlaceholderText("Resource title"), {
      target: { value: "Test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));

    expect(screen.getByText("URL is required")).toBeInTheDocument();
  });

  it("validates URL format", () => {
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={noopFn}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    fireEvent.change(screen.getByPlaceholderText("Resource title"), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "not-a-valid-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));

    expect(screen.getByText(/valid URL/)).toBeInTheDocument();
  });

  it("calls onAddResource with correct data", async () => {
    const onAdd = jest.fn().mockResolvedValue();
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={onAdd}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    fireEvent.change(screen.getByPlaceholderText("Resource title"), {
      target: { value: "Great Guide" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://debate.org/guide" },
    });
    fireEvent.change(screen.getByPlaceholderText("Brief description..."), {
      target: { value: "A comprehensive guide" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));

    expect(onAdd).toHaveBeenCalledWith({
      title: "Great Guide",
      url: "https://debate.org/guide",
      description: "A comprehensive guide",
    });
  });

  it("hides form after successful submission", async () => {
    const onAdd = jest.fn().mockResolvedValue();
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={onAdd}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    fireEvent.change(screen.getByPlaceholderText("Resource title"), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));

    // Form should be gone after async submission completes
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Resource title")).not.toBeInTheDocument();
    });
  });

  it("cancels add form", () => {
    render(
      <ResourcesTab
        resources={[]}
        loading={false}
        isAdmin={true}
        onAddResource={noopFn}
        onUpdateResource={noopFn}
        onDeleteResource={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Resource"));
    expect(screen.getByPlaceholderText("Resource title")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText("Resource title")).not.toBeInTheDocument();
  });
});
