import React from 'react';
import styles from '../Hardware.module.css';

const HardwareInfo = () => {
  return (
    <div className={styles.hardwareInfo}>
      <ul>
        <li data-number="1">
          <strong>다품목일 경우 각각 작성</strong>
        </li>
        <li data-number="2">
          <strong>접수번호</strong>는 백지선 선임에게 수령후 기재하여 H/W 뒷면에
          부착
        </li>
        <li data-number="3">
          <strong>A/S 접수</strong>가 필요시 각 담당자가 박스 포장 후 A/S를
          접수하여 관리팀에 통보
        </li>
        <li data-number="4">
          <strong>구매 또는 A/S 대행비, 설치비, 출장비</strong> 등 견적 포함
          금액은 사전 관리팀과 상의
        </li>
        <li data-number="5">
          <strong>구매품의서를 작성</strong>하여야 하며 고객사의 구매 발주서
          또는 발주 요청 메일을 구매품의서에 첨부하여 대표이사 승인 후 진행
          <div className={styles['sub-item']}>
            (단, A/S는 수리처에서 견적 금액 확인되면 출장비 포함하여 구매품의서
            결제 올릴 것)
          </div>
        </li>
      </ul>
    </div>
  );
};

export default HardwareInfo;
