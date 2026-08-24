import "@testing-library/jest-dom";
import Prism from "prismjs";

// Make Prism globally available for its language plugins
(global as any).Prism = Prism;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});
