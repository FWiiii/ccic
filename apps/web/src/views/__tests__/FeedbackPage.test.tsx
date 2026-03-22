import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackPage } from "../FeedbackPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("FeedbackPage", () => {
  it("opens the success dialog after a valid submit", () => {
    render(<FeedbackPage />);

    fireEvent.change(screen.getByPlaceholderText("反馈人姓名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByPlaceholderText("联系电话"), { target: { value: "13800000000" } });
    fireEvent.change(screen.getByPlaceholderText("邮箱"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("反馈内容"), { target: { value: "已收到" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(screen.getByText("反馈成功")).toBeInTheDocument();
  });
});
