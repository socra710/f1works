import React, {
  useState,
  useContext,
  cloneElement,
  createContext
} from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";

const callAll = (...fns) => (...args) => fns.forEach((fn) => fn && fn(...args));

const ModalContext = createContext();

function Modal(props) {
  const [isOpen, setIsOpen] = useState(false);
  return <ModalContext.Provider value={[isOpen, setIsOpen]} {...props} />;
}

function ModalDismissButton({ children: child }) {
  const [, setIsOpen] = useContext(ModalContext);

  return cloneElement(child, {
    onClick: callAll(() => setIsOpen(false), child.props.onClick)
  });
}

function ModalOpenButton({ children: child }) {
  const [, setIsOpen] = useContext(ModalContext);

  return cloneElement(child, {
    onClick: callAll(() => setIsOpen(true), child.props.onClick)
  });
}

function ModalContentsBase(props) {
  const [isOpen, setIsOpen] = useContext(ModalContext);
  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} {...props}>
      {props.children}
    </Dialog>
  );
}

function ModalContents({ title, children, ...props }) {
  return (
    <ModalContentsBase {...props}>
      <div style={{ padding: "20px" }}>
        <div css={{ display: "flex", justifyContent: "flex-end" }}>
          <ModalDismissButton>
            <i
              style={{
                position: "absolute",
                top: "4px",
                right: "10px",
                cursor: "pointer",
                fontSize: "24px",
                fontFamily: "sans-serif",
                fontStyle: "normal"
              }}
            >
              x
            </i>
          </ModalDismissButton>
        </div>
        <DialogTitle style={{ padding: "0", fontWeight: '700' }}><span style={{ fontSize: '18px', fontWeight: 'bold' }}>{title}</span></DialogTitle>
        {children}
      </div>
    </ModalContentsBase>
  );
}

export { Modal, ModalDismissButton, ModalOpenButton, ModalContents };
