// import shadows from '@material-ui/core/styles/shadows';
import { Modal, ModalContents, ModalOpenButton } from '../../common/Modal';
import { useState, useEffect } from 'react';

const ModalHelp2 = (props) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const infoCardStyle = {
    border: '1px solid rgba(102, 126, 234, 0.16)',
    borderRadius: '12px',
    background:
      'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.08)',
    padding: '1.25rem 1.35rem',
    minHeight: 0,
    fontSize: '0.85rem',
  };

  const infoGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr',
    gap: '1rem',
    width: '100%',
  };

  const specStyle = {
    background: '#f9fafc',
    border: '1px solid #e5e7ef',
  };

  const infoSupStyle = {
    top: '4px',
    fontSize: '12px',
    background: '#667eea',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '6px',
    marginLeft: '6px',
  };

  return (
    <Modal>
      <ModalOpenButton>
        <button id="btn-help" className="modal-help hidden">
          Help
        </button>
      </ModalOpenButton>
      <ModalContents title="도움말">
        <hr
          style={{
            margin: '0.5rem 0 1rem 0',
            border: 'none',
            borderTop: '1px solid #e5e7ef',
          }}
        />
        <div id="modalContainer">
          <div style={infoGridStyle}>
            <div style={infoCardStyle}>
              <p>
                <sup style={infoSupStyle}>필독</sup>
                <b>휴대용 모니터 사용 지침</b>
              </p>
              <ul>
                <li>예약 신청 후 사용 가능합니다.</li>
                <li>
                  다른 사용자를 위해 <b>3일 초과 예약</b>은 자제해 주세요.
                </li>
                <li>사용 후 케이블 등 부속을 케이스에 함께 보관해 주세요.</li>
                <li>
                  <b>제품 이상</b> 발견 시 관리팀에 즉시 문의해 주세요.
                </li>
                <li>
                  사용자 부주의 파손 시 <b>본인 부담</b>으로 수리 또는
                  구매합니다.
                </li>
              </ul>
            </div>
            <div style={{ ...infoCardStyle, ...specStyle }}>
              <p>
                <b>모니터 정보</b>
              </p>
              <ul>
                <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                <li>
                  관리번호 : <b>A-261</b>
                  <sup
                    style={{
                      backgroundColor: '#808080',
                      marginLeft: '6px',
                    }}
                  >
                    미사용
                  </sup>
                </li>
                <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                <li>
                  관리번호 : <b>A-262</b>
                  <sup
                    id="supNoA-262"
                    style={{
                      backgroundColor: '#808080',
                      marginLeft: '6px',
                    }}
                  >
                    미사용
                  </sup>
                </li>
                <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                <li>
                  관리번호 : <b>A-263</b>
                  <sup
                    id="supNoA-263"
                    style={{
                      backgroundColor: '#808080',
                      marginLeft: '6px',
                    }}
                  >
                    미사용
                  </sup>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ModalContents>
    </Modal>
  );
};

export default ModalHelp2;
