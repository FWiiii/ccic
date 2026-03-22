import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackPage } from "../FeedbackPage";

const mockRouterBack = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
  }),
}));

describe("FeedbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pushes to home when clicking back in default history state", () => {
    render(<FeedbackPage />);

    fireEvent.click(screen.getByRole("button", { name: "返回" }));

    expect(mockRouterPush).toHaveBeenCalledWith("/");
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it("opens the success dialog after a valid submit", () => {
    render(<FeedbackPage />);
    const successMessage = screen.getByText("反馈成功");

    expect(successMessage).not.toBeVisible();

    fireEvent.change(screen.getByPlaceholderText("反馈人姓名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByPlaceholderText("联系电话"), { target: { value: "13800000000" } });
    fireEvent.change(screen.getByPlaceholderText("邮箱"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("反馈内容"), { target: { value: "已收到" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(successMessage).toBeVisible();
  });
});
