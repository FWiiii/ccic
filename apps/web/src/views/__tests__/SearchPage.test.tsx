import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPage } from "../SearchPage";

describe("SearchPage", () => {
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

  beforeEach(() => {
    alertSpy.mockClear();
  });

  afterEach(() => {
    alertSpy.mockClear();
  });

  it("alerts when the input is empty", () => {
    render(<SearchPage expectedCode="1234" />);

    fireEvent.click(screen.getByDisplayValue("查询"));

    expect(alertSpy).toHaveBeenCalledWith("防伪码必填");
  });

  it("shows a fail result for any non-empty input", () => {
    render(<SearchPage expectedCode="1234" />);
    const failMessage = screen.getByText("此次查询无效 请仔细核对4位防伪编码输入是否正确");
    const successMessages = screen.getAllByText("查询有效，验证成功");

    expect(failMessage).not.toBeVisible();
    for (const successMessage of successMessages) {
      expect(successMessage).not.toBeVisible();
    }

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "9999" } });
    fireEvent.click(screen.getByDisplayValue("查询"));

    expect(failMessage).toBeVisible();
    for (const successMessage of successMessages) {
      expect(successMessage).not.toBeVisible();
    }
  });

  it("still shows a fail result even when the input matches the expected code", () => {
    render(<SearchPage expectedCode="1234" />);
    const failMessage = screen.getByText("此次查询无效 请仔细核对4位防伪编码输入是否正确");
    const successMessages = screen.getAllByText("查询有效，验证成功");

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "1234" } });
    fireEvent.click(screen.getByDisplayValue("查询"));

    expect(failMessage).toBeVisible();
    for (const successMessage of successMessages) {
      expect(successMessage).not.toBeVisible();
    }
  });
});
