import { useEffect, useState } from "react";
import { fetchInspectionBySn, PublicInspectionRequestError, type PublicInspectionData } from "../api/publicInspection";

interface UseInspectionQueryOptions {
  querySn: string;
  isSearchPage: boolean;
  isFeedbackPage: boolean;
}

export function useInspectionQuery({ querySn, isSearchPage, isFeedbackPage }: UseInspectionQueryOptions) {
  const [inspectionData, setInspectionData] = useState<PublicInspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showTraceNotFoundPage, setShowTraceNotFoundPage] = useState(false);

  useEffect(() => {
    if (isSearchPage || isFeedbackPage) {
      setIsLoading(false);
      setErrorMessage("");
      setShowTraceNotFoundPage(false);
      return;
    }

    const sn = querySn.trim();

    if (!sn) {
      setInspectionData(null);
      setShowTraceNotFoundPage(false);
      setErrorMessage("链接缺少 sn 参数，请检查二维码地址。");
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    setIsLoading(true);
    setErrorMessage("");
    setShowTraceNotFoundPage(false);

    fetchInspectionBySn(sn, abortController.signal)
      .then((data) => {
        setInspectionData(data);
        setShowTraceNotFoundPage(false);
        setErrorMessage("");
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        setInspectionData(null);

        const isInspectionNotFound =
          (error instanceof PublicInspectionRequestError && error.status === 404) ||
          (error instanceof Error && /inspection not found/i.test(error.message));

        if (isInspectionNotFound) {
          setShowTraceNotFoundPage(true);
          setErrorMessage("");
          return;
        }

        const message =
          error instanceof Error && error.message ? error.message : "查询失败，请稍后重试。";
        setShowTraceNotFoundPage(false);
        setErrorMessage(message);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [querySn, isSearchPage, isFeedbackPage]);

  return {
    inspectionData,
    isLoading,
    errorMessage,
    showTraceNotFoundPage,
  };
}