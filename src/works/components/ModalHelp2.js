import shadows from "@material-ui/core/styles/shadows";
import { Modal, ModalContents, ModalOpenButton } from "../../common/Modal";

const ModalHelp2 = (props) => {

  return (
    <Modal>
      <ModalOpenButton>
        <button id="btn-help" className="modal-help hidden">Help</button>
      </ModalOpenButton>
      <ModalContents title="도움말">
        <div id="modalContainer">
          <section>
            <div className="div-space-between">
              <aside style={{ border: '1px solid var(--color-bg-secondary)', boxShadow: 'none' }}>
                <p><sup>필독</sup><b>휴대용 모니터 사용 지침</b></p>
                <ul>
                  <li>예약신청한 이후에 사용 가능</li>
                  <li>다른 사용자를 위해 3일을 초과하는 예약 자제</li>
                  <li>사용 후 케이블 등 부속과 함께 케이스에 보관</li>
                  <li>제품 이상 발견 시 관리팀에 문의</li>
                  <li>사용자 부주의로 파손 시 본인 부담으로 수리 또는 구매</li>
                </ul>
              </aside>
              <aside style={{ border: '1px solid var(--color-bg-secondary)', boxShadow: 'none' }}>
                <p><b>모니터 정보</b></p>
                <ul>
                  <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                  <li>관리번호 : <b>A-261</b></li>
                  <br></br>
                  <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                  <li>관리번호 : <b>A-262</b></li>
                  <br></br>
                  <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                  <li>관리번호 : <b>A-263</b></li>
                </ul>
              </aside>
            </div>
          </section>
        </div>
      </ModalContents>
    </Modal>
  )
}

export default ModalHelp2;
