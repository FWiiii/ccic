"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function FeedbackPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

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
                        placeholder={"联系电话"}
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
                        placeholder={"邮箱"}
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
                        placeholder={"反馈内容"}
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
            {"提交"}
          </button>
        </form>

        <div id="complaintshow" className="complaintShowDiv" style={{ display: showSuccess ? "block" : "none" }}>
          <div className="complaintShowDivTwo">
            <div className="complaintShowDivThree">
              <span>{"反馈成功"}</span>
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


