import { Modal, ModalContents, ModalOpenButton } from "./Modal";
import { useState, useEffect } from "react";

const ModalHow = (props) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(props.isOpen);
  }, [props.isOpen]); // Empty dependency array ensures the effect runs only once after mount

  return (
    <Modal>
      <ModalOpenButton>
        <button id="btn-how" className="modal-how hidden">How</button>
      </ModalOpenButton>
      <ModalContents title="플레이 방법">
        <h3 style={{ margin: 0, fontSize: '15px' }}>"오늘의 단어"를 6번 만에 맞춰보세요.</h3>
        <ul style={{ padding: '0 20px' }}>
          <li style={{ margin: 0, fontSize: '14px' }}>생각나는 5글자 영단어를 적고 엔터를 누르세요.</li>
          <li style={{ margin: 0, fontSize: '14px' }}>추측한 영단어는 유효한 5글자 단어여야 합니다.</li>
          <li style={{ margin: 0, fontSize: '14px' }}>타일의 색상이 변경되어 당신이 추측한 단어가 "오늘의 단어"에 얼마나 근접했는지 아래 예시를 통해 확인해보세요.</li>
        </ul>
        <b>예시</b>
        <div className={`div-sets ${isFlipped ? "flipped" : ""}`} style={{ justifyContent: 'start' }}>
          <div className="div-answer correct-answer white">Q</div>
          <div className="div-answer no-answer">U</div>
          <div className="div-answer no-answer">E</div>
          <div className="div-answer no-answer">S</div>
          <div className="div-answer no-answer">T</div>
        </div>
        <p style={{ marginTop: 0, fontSize: '14px' }}><b>Q</b>는 "오늘의 단어"에 포함되어 있으며, 정확한 위치에 있습니다.</p>
        <div className={`div-sets ${isFlipped ? "flipped" : ""}`} style={{ justifyContent: 'start' }}>
          <div className="div-answer no-answer">C</div>
          <div className="div-answer yellow-answer white">A</div>
          <div className="div-answer no-answer">N</div>
          <div className="div-answer no-answer">D</div>
          <div className="div-answer no-answer">Y</div>
        </div>
        <p style={{ marginTop: 0, fontSize: '14px' }}><b>A</b>는 "오늘의 단어"에 포함되어 있으나, 다른 위치에 있습니다.</p>
        <div className={`div-sets ${isFlipped ? "flipped" : ""}`} style={{ justifyContent: 'start' }}>
          <div className="div-answer no-answer">T</div>
          <div className="div-answer no-answer">O</div>
          <div className="div-answer no-answer">D</div>
          <div className="div-answer no-answer">A</div>
          <div className="div-answer answer white">Y</div>
        </div>
        <p style={{ marginTop: 0, fontSize: '14px' }}><b>Y</b>는 "오늘의 단어"에 포함되어 있지 않고 어떤 위치에도 있지 않습니다.</p>
        <hr></hr>
        <p>매일 자정 새로운 단어가 공개됩니다.</p>
      </ModalContents>
    </Modal >
  )
}

export default ModalHow;
