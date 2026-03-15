import { FormEvent, useState } from "react";

const goBack = () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "/";
};

export function FeedbackPage() {
  const [contacts, setContacts] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowSuccess(true);
  };

  const closeSuccess = () => setShowSuccess(false);

  return (
    <div className="page-group">
      <div className="page page-current complaintPageCurrent" id="feedback-page">
        <header className="bar bar-nav complaintHeader">
          <button className="button button-link button-nav pull-left complaintHeaderIn" type="button" onClick={goBack}>
            <div>
              <span className="icon icon-left complaints-a complaintA"></span>
              <span className="complaints-span">{"返回"}</span>
            </div>
          </button>
          <h1 className="title complaints-h1">{"消费反馈"}</h1>
        </header>

        <form className="content complaintContent" onSubmit={handleSubmit}>
          <div className="list-block complaintListBlock">
            <ul>
              <li>
                <div className="item-content complaintItemContent">
                  <div className="item-inner">
                    <div className="item-input">
                      <input
                        type="text"
                        required
                        className="complaintItemInput"
                        name="contacts"
                        placeholder={"反馈人姓名"}
                        id="co-name"
                        value={contacts}
                        onChange={(event) => setContacts(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </li>

              <li>
                <div className="item-content complaintItemContent">
                  <div className="item-inner">
                    <div className="item-input">
                      <input
                        type="text"
                        required
                        placeholder={"\u8054\u7cfb\u7535\u8bdd"}
                        name="mobile"
                        className="complaintItemInput"
                        id="co-phonenum"
                        value={mobile}
                        onChange={(event) => setMobile(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </li>

              <li>
                <div className="item-content complaintItemContent">
                  <div className="item-inner">
                    <div className="item-input">
                      <input
                        type="email"
                        required
                        placeholder={"\u90ae\u7bb1"}
                        name="email"
                        className="complaintItemInput"
                        id="co-email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </li>

              <li className="align-top">
                <div className="item-content complaintItemContent complaint-height-auto">
                  <div className="item-inner">
                    <div className="item-input">
                      <textarea
                        placeholder={"\u53cd\u9988\u5185\u5bb9"}
                        name="content"
                        required
                        className="complaintItemInput"
                        id="co-content"
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="complaintItemInfor">
            <span id="complaintssuccess"></span>
          </div>

          <button className="complaints-span2" id="complaintsbutton" type="submit">
            {"\u63d0\u4ea4"}
          </button>
        </form>

        <div id="complaintshow" className="complaintShowDiv" style={{ display: showSuccess ? "block" : "none" }}>
          <div className="complaintShowDivTwo">
            <div className="complaintShowDivThree">
              <span>{"\u53cd\u9988\u6210\u529f"}</span>
            </div>
            <div className="complaintShowDivFour">
              <div id="showcomplaints" className="complaintShowDivFive" onClick={closeSuccess}>
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



