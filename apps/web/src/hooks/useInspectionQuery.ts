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
        errorMessage: "链接缺少 sn 参数，请检查二维码地址。",
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
            : "查询失败，请稍后重试。";

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