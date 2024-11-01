
import { Modal, ModalContents, ModalOpenButton } from "./Modal";
import { useState, useEffect } from "react";

const ModalStats = (props) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(props.isOpen);
  }, [props.isOpen]); // Empty dependency array ensures the effect runs only once after mount

  const renderGraph = () => {

    if (!props.gameStats) {
      return;
    }

    const values = props.gameStats?.winDistribution;
    const calculatedTotal = values.reduce((sum, value) => sum + value, 0);
    const calculatedPercentages = values.map(value => (value / calculatedTotal) * 100);

    return (
      <div className="guess-distribution-container">
        {values.map((value, index) => (
          <div className="guess-item" key={index}>
            <div className="guess-number" aria-hidden="true">{index + 1}</div>
            <div className="guess-graph" aria-hidden="true">
              <div className={`graph-bar ${props.gameStats?.todayIdx == index ? 'correct' : ''}`} style={{ width: `${calculatedPercentages[index] === 0 ? 6 : calculatedPercentages[index]}%` }}>
                <div className="graph-text">{values[index]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Modal>
      <ModalOpenButton>
        <button id="btn-stats" className="modal-stats hidden"></button>
      </ModalOpenButton>
      <ModalContents title="통계">
        <div className="stats-container">
          <ul className="statistics-list" style={{ padding: '0' }}>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{props.gameStats?.totalGames}</div>
              <div className="statistic-label" aria-hidden="true">플레이수</div>
            </li>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{props.gameStats?.successRate}%</div>
              <div className="statistic-label" aria-hidden="true">성공률%</div>
            </li>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{props.gameStats?.currentStreak}</div>
              <div className="statistic-label" aria-hidden="true">현재연속</div>
            </li>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{props.gameStats?.bestStreak}</div>
              <div className="statistic-label" aria-hidden="true">최대연속</div>
            </li>
          </ul>
        </div>
        {renderGraph()}
        <hr></hr>
        <div className="div-time">매일 자정 새로운 단어가 공개됩니다.</div>
      </ModalContents>
    </Modal>
  );
};

export default ModalStats;
