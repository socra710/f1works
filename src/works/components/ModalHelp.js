import { Modal, ModalContents, ModalOpenButton } from '../../common/Modal';
import { useState, useEffect } from 'react';

const ModalHelp = (props) => {
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
      <ModalContents title="도움말" maxWidth="md" fullWidth>
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
                <b>업무용 차량 운용 및 배차 요령</b>
              </p>
              <ul>
                <li>
                  신청은 1일 전에 신청하되 급한 용무에 한해 당일 배차 가능
                  <mark>(단, 선배차된 사용자 우선)</mark>
                </li>
                <li>
                  차량 관리 : 최정욱 부장, 키 수령 : 백지선 선임 자리 책꽂이,
                  최정욱 부장 자리 옆 칸막이
                </li>
                <li>
                  사용 후 특이사항에 주차위치 기재, 출발전과 복귀후 반드시
                  이동거리 및 유량(%)을 체크할 것.
                </li>
                <li>주유 및 주차비는 영수증 첨부하여 개별 경비 청구할 것.</li>
                <li>
                  운전자 부주의로 법규 미준수하여 과태료
                  <mark>(과속, 주정차 등)</mark> 부과시 본인 부담으로 과태료
                  납부할 것.
                </li>
                <li>
                  차량에 이상 발생<mark>(파손, 사고, 고장증세 등)</mark>시
                  특이사항에 기재할 것.
                </li>
                <li>
                  <b>사용 후 키를 반드시 관리팀에 반납할 것.</b>
                  <mark>
                    (외부에서 퇴근하여 바로 반납이 불가한 경우에는 관리팀에
                    알려주시기 바랍니다.)
                  </mark>
                </li>
                <li>
                  <b>차량내 금연</b>해주시고 <b>연비 운전</b> 부탁드립니다.
                  <mark>
                    (차간거리 충분히 유지, 탄력운전, 급출발 및 급제동 지양 등)
                  </mark>
                </li>
                <li>
                  <b>출발 및 복귀</b> 시간을 정확하게 입력 부탁드립니다.
                  <mark>
                    (복귀 시간이 다음날을 넘어갈 경우 복귀일을 정확하게
                    입력할것.)
                  </mark>
                </li>
              </ul>
            </div>
            <div style={{ ...infoCardStyle, ...specStyle }}>
              <p>
                <b>🚗 차량 정보</b>
              </p>
              <ul>
                <li>모델명 : 기아 더뉴 카니발 9인승 럭셔리</li>
                <li>
                  차량번호 : <b>245로 4279</b>
                </li>
                <li>
                  유종 및 배기량 : <b>디젤</b>(2199CC)
                </li>
                <li>연월식 : 18년 5월식(19년형)</li>
                <li>주행거리 : 98,000KM</li>
                <li>
                  구매처 : K CAR 안양직영점(이성원 차량평가사,0501-13740-3514)
                </li>
                <li>구매일 : 2022년 8월 30일</li>
                <li>
                  하이패스 : <b>있음</b>
                </li>
                <li>
                  주유카드 :{' '}
                  <b style={{ color: '#ef4444' }}>
                    중앙 팔걸이 보관함 비닐 케이스에 있음
                  </b>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ModalContents>
    </Modal>
  );
};

export default ModalHelp;
