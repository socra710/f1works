import { Modal, ModalContents, ModalOpenButton } from "./Modal";

const ModalAbout = () => {
  return (
    <Modal >
      <ModalOpenButton>
        <button id="btn-about" className="modal-about">About</button>
      </ModalOpenButton>
      <ModalContents title="About">
        <br></br>
        오리지널 게임이 보고 싶다면 >> <a href="https://www.nytimes.com/games/wordle/index.html" target="_Blank">여기!!</a>
        <br></br>
        피드백 : <a href="mailto:admin@codefeat.store">admin@codefeat.store</a>
      </ModalContents>
    </Modal>
  )
}

export default ModalAbout;
