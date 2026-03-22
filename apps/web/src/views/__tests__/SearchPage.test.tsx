import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchPage } from "../SearchPage";

describe("SearchPage", () => {
  it("shows a fail result when the entered code does not match the expected code", () => {
    render(<SearchPage expectedCode="1234" />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "9999" } });
    fireEvent.click(screen.getByDisplayValue("查询"));

    expect(screen.getByText("此次查询无效 请仔细核对4位防伪编码输入是否正确")).toBeInTheDocument();
  });
});
