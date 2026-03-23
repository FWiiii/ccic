interface InspectionErrorStateProps {
  message: string;
}

export function InspectionErrorState({ message }: InspectionErrorStateProps) {
  const normalizedMessage = String(message ?? "").trim() || "此追溯码无效。";

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <div id="codeunsetshow" className="unsetshowdiv" style={{ display: "block" }}>
          <div className="unsetshowdoublediv">
            <div className="unsetshowthreediv">
              <span>{normalizedMessage}</span>
              <span className="c-pt-0">{"可联系中检溯源服务热线 0512-67998071 咨询。"}</span>
              <span className="c-pt-0">{"或拨打 01058619556（工作日 9:00~12:00 / 13:30~17:30）。"}</span>
            </div>
            <div className="ht50">
              <div id="enterccic" className="unsetshowfourdiv">
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
