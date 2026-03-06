import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VideosTab } from "../components/VideosTab";

const makeVideo = (id, title, videoId = "dQw4w9WgXcQ") => ({
  id,
  title,
  description: `Description for ${title}`,
  youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
  youtubeVideoId: videoId,
  createdBy: "Admin",
  createdAt: "2026-03-05T10:00:00.000Z",
});

describe("VideosTab", () => {
  const noopFn = () => {};

  it("renders loading spinner when loading", () => {
    const { container } = render(
      <VideosTab videos={[]} loading={true} isAdmin={false} />
    );
    expect(container.querySelector(".glass-spinner")).toBeTruthy();
  });

  it("renders empty state for viewers", () => {
    render(<VideosTab videos={[]} loading={false} isAdmin={false} />);
    expect(screen.getByText("No videos yet")).toBeInTheDocument();
    expect(screen.getByText(/Check back later/)).toBeInTheDocument();
  });

  it("renders videos in grid", () => {
    const videos = [
      makeVideo("v1", "Opening Strategy"),
      makeVideo("v2", "Closing Technique"),
    ];
    render(<VideosTab videos={videos} loading={false} isAdmin={false} />);
    expect(screen.getByText("Opening Strategy")).toBeInTheDocument();
    expect(screen.getByText("Closing Technique")).toBeInTheDocument();
  });

  it("shows video count", () => {
    const videos = [makeVideo("v1", "Vid 1"), makeVideo("v2", "Vid 2")];
    render(<VideosTab videos={videos} loading={false} isAdmin={false} />);
    expect(screen.getByText("2 debate videos")).toBeInTheDocument();
  });

  it("shows singular text for 1 video", () => {
    render(
      <VideosTab videos={[makeVideo("v1", "Solo")]} loading={false} isAdmin={false} />
    );
    expect(screen.getByText("1 debate video")).toBeInTheDocument();
  });

  it("does not show Add Video button for non-admin", () => {
    render(<VideosTab videos={[]} loading={false} isAdmin={false} />);
    expect(screen.queryByText("Add Video")).not.toBeInTheDocument();
  });

  it("shows Add Video button for admin", () => {
    render(
      <VideosTab
        videos={[]}
        loading={false}
        isAdmin={true}
        onAddVideo={noopFn}
        onUpdateVideo={noopFn}
        onDeleteVideo={noopFn}
      />
    );
    expect(screen.getByText("Add Video")).toBeInTheDocument();
  });

  it("shows add form when Add Video is clicked", () => {
    render(
      <VideosTab
        videos={[]}
        loading={false}
        isAdmin={true}
        onAddVideo={noopFn}
        onUpdateVideo={noopFn}
        onDeleteVideo={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Video"));
    expect(screen.getByPlaceholderText(/youtube\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Video title")).toBeInTheDocument();
  });

  it("validates YouTube URL before submission", () => {
    render(
      <VideosTab
        videos={[]}
        loading={false}
        isAdmin={true}
        onAddVideo={noopFn}
        onUpdateVideo={noopFn}
        onDeleteVideo={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Video"));

    // Fill in title but invalid URL
    fireEvent.change(screen.getByPlaceholderText("Video title"), {
      target: { value: "My Video" },
    });
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: "not-a-url" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /add video/i }));
    expect(screen.getByText("Please enter a valid YouTube URL")).toBeInTheDocument();
  });

  it("validates title is required", () => {
    render(
      <VideosTab
        videos={[]}
        loading={false}
        isAdmin={true}
        onAddVideo={noopFn}
        onUpdateVideo={noopFn}
        onDeleteVideo={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Video"));

    // Fill URL but no title
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add video/i }));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("shows thumbnail preview for valid YouTube URL", () => {
    render(
      <VideosTab
        videos={[]}
        loading={false}
        isAdmin={true}
        onAddVideo={noopFn}
        onUpdateVideo={noopFn}
        onDeleteVideo={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Video"));
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    const thumbnail = screen.getByAltText("Video thumbnail");
    expect(thumbnail.src).toContain("dQw4w9WgXcQ");
  });

  it("does not show edit/delete buttons for non-admin", () => {
    const videos = [makeVideo("v1", "Test Video")];
    const { container } = render(
      <VideosTab videos={videos} loading={false} isAdmin={false} />
    );
    // No trash or edit buttons
    expect(container.querySelectorAll('[title*="Remove"]')).toHaveLength(0);
  });

  it("calls onAddVideo with correct data", async () => {
    const onAdd = jest.fn().mockResolvedValue();
    render(
      <VideosTab
        videos={[]}
        loading={false}
        isAdmin={true}
        onAddVideo={onAdd}
        onUpdateVideo={noopFn}
        onDeleteVideo={noopFn}
      />
    );

    fireEvent.click(screen.getByText("Add Video"));
    fireEvent.change(screen.getByPlaceholderText("Video title"), {
      target: { value: "Great Debate" },
    });
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    fireEvent.change(screen.getByPlaceholderText("Brief description..."), {
      target: { value: "A great debate video" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add video/i }));

    expect(onAdd).toHaveBeenCalledWith({
      title: "Great Debate",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      description: "A great debate video",
    });
  });
});
