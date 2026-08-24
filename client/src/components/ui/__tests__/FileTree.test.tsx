import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FileTree, { TreeNode } from "../FileTree";

const mockTree: TreeNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      {
        name: "index.ts",
        path: "src/index.ts",
        type: "file",
        size: 500,
        file_id: "file1",
        file_type: "ts",
        language: "typescript",
      },
      {
        name: "utils.ts",
        path: "src/utils.ts",
        type: "file",
        size: 800,
        file_id: "file2",
        file_type: "ts",
        language: "typescript",
      },
    ],
  },
  {
    name: "package.json",
    path: "package.json",
    type: "file",
    size: 250,
    file_id: "file3",
    file_type: "json",
    language: "json",
  },
];

describe("FileTree Component Tests", () => {
  it("should render root folders and files correctly", () => {
    const handleSelect = jest.fn();
    render(
      <FileTree
        tree={mockTree}
        selectedPath={null}
        onSelectFile={handleSelect}
      />
    );

    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
  });

  it("should call onSelectFile when a file item is clicked", () => {
    const handleSelect = jest.fn();
    render(
      <FileTree
        tree={mockTree}
        selectedPath={null}
        onSelectFile={handleSelect}
      />
    );

    const fileNode = screen.getByText("package.json");
    fireEvent.click(fileNode);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "package.json",
        path: "package.json",
        type: "file",
      })
    );
  });

  it("should toggle folder expansion when clicked", () => {
    const handleSelect = jest.fn();
    render(
      <FileTree
        tree={mockTree}
        selectedPath={null}
        onSelectFile={handleSelect}
      />
    );

    const folderNode = screen.getByText("src");
    // Top-level starts open -> click to collapse
    fireEvent.click(folderNode);
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();

    // Click again to re-expand
    fireEvent.click(folderNode);
    expect(screen.getByText("index.ts")).toBeInTheDocument();
  });

  it("should filter files when search term is typed", () => {
    const handleSelect = jest.fn();
    render(
      <FileTree
        tree={mockTree}
        selectedPath={null}
        onSelectFile={handleSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText("Filter files...");
    fireEvent.change(searchInput, { target: { value: "utils" } });

    expect(screen.getByText("utils.ts")).toBeInTheDocument();
    expect(screen.queryByText("package.json")).not.toBeInTheDocument();
  });
});
