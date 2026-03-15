import { useEffect, useState } from "react";
import { fetchInspectionBySn, PublicInspectionRequestError, type PublicInspectionData } from "../api/publicInspection";

interface UseInspectionQueryOptions {
  querySn: string;
  isSearchPage: boolean;
  isFeedbackPage: boolean;
}

export type InspectionQueryStatus = "idle" | "loading" | "success" | "not_found" | "error";

interface InspectionQueryState {
  status: InspectionQueryStatus;
  inspectionData: PublicInspectionData | null;
  errorMessage: string;
}

export function useInspectionQuery({ querySn, isSearchPage, isFeedbackPage }: UseInspectionQueryOptions) {
  const [state, setState] = useState<InspectionQueryState>({
    status: "idle",
    inspectionData: null,
    errorMessage: "",
  });

  useEffect(() => {
    if (isSearchPage || isFeedbackPage) {
      setState((prev) => ({
        ...prev,
        status: "idle",
        errorMessage: "",
      }));
      return;
    }

    const sn = querySn.trim();

    if (!sn) {
      setState({
        status: "error",
        inspectionData: null,
        errorMessage: "\u94fe\u63a5\u7f3a\u5c11 sn \u53c2\u6570\uff0c\u8bf7\u68c0\u67e5\u4e8c\u7ef4\u7801\u5730\u5740\u3002",
      });
      return;
    }

    const abortController = new AbortController();

    setState((prev) => ({
      ...prev,
      status: "loading",
      errorMessage: "",
    }));

    fetchInspectionBySn(sn, abortController.signal)
      .then((data) => {
        setState({
          status: "success",
          inspectionData: data,
          errorMessage: "",
        });
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        const isInspectionNotFound =
          (error instanceof PublicInspectionRequestError && error.status === 404) ||
          (error instanceof Error && /inspection not found/i.test(error.message));

        if (isInspectionNotFound) {
          setState({
            status: "not_found",
            inspectionData: null,
            errorMessage: "",
          });
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : "\u67e5\u8be2\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";

        setState({
          status: "error",
          inspectionData: null,
          errorMessage: message,
        });
      });

    return () => abortController.abort();
  }, [querySn, isSearchPage, isFeedbackPage]);

  return state;
}