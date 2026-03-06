import { extractYouTubeId } from "../services/videoService";

describe("extractYouTubeId", () => {
  // Standard watch URLs
  describe("standard watch URLs", () => {
    it("extracts ID from standard youtube.com/watch URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID without www prefix", () => {
      expect(extractYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID with http (non-https)", () => {
      expect(extractYouTubeId("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID with extra query params after v=", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID with extra query params before v=", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?list=PLsomething&v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID with feature param", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be")).toBe("dQw4w9WgXcQ");
    });
  });

  // Mobile URLs
  describe("mobile URLs", () => {
    it("extracts ID from m.youtube.com", () => {
      expect(extractYouTubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from m.youtube.com with extra params", () => {
      expect(extractYouTubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30")).toBe("dQw4w9WgXcQ");
    });
  });

  // Short URLs
  describe("short URLs (youtu.be)", () => {
    it("extracts ID from youtu.be short URL", () => {
      expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from youtu.be with timestamp", () => {
      expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?t=60")).toBe("dQw4w9WgXcQ");
    });
  });

  // Embed URLs
  describe("embed URLs", () => {
    it("extracts ID from embed URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from m.youtube.com embed URL", () => {
      expect(extractYouTubeId("https://m.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });
  });

  // Shorts URLs
  describe("shorts URLs", () => {
    it("extracts ID from shorts URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from m.youtube.com shorts URL", () => {
      expect(extractYouTubeId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });
  });

  // Live URLs
  describe("live URLs", () => {
    it("extracts ID from live URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });
  });

  // IDs with special characters
  describe("IDs with special characters", () => {
    it("handles IDs with hyphens", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?v=abc-def_123")).toBe("abc-def_123");
    });

    it("handles IDs with underscores", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?v=abc_DEF_123")).toBe("abc_DEF_123");
    });
  });

  // Invalid inputs
  describe("invalid inputs", () => {
    it("returns null for null input", () => {
      expect(extractYouTubeId(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(extractYouTubeId(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(extractYouTubeId("")).toBeNull();
    });

    it("returns null for non-YouTube URL", () => {
      expect(extractYouTubeId("https://www.google.com")).toBeNull();
    });

    it("returns null for Vimeo URL", () => {
      expect(extractYouTubeId("https://vimeo.com/123456789")).toBeNull();
    });

    it("returns null for YouTube URL without video ID", () => {
      expect(extractYouTubeId("https://www.youtube.com/")).toBeNull();
    });

    it("returns null for YouTube channel URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/channel/UCxxxx")).toBeNull();
    });

    it("returns null for plain text", () => {
      expect(extractYouTubeId("just some random text")).toBeNull();
    });
  });
});
