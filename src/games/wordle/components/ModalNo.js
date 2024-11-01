

import React, { useEffect } from "react";
import { Modal, ModalContents, ModalOpenButton } from "./Modal";
import shareImg from "./share.png";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Countdown from 'react-countdown'

const ModalNo = ({ answersSets, isSubmittedSets, realQuizAnswer, gameStats }) => {
  const kakaoKey = '3fa896607919e30770625261ee855697';

  useEffect(() => {
    // Kakao SDK 스크립트 동적으로 로드
    const script = document.createElement('script');
    script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Kakao SDK 초기화
      window.Kakao.init(kakaoKey);
    };

    return () => {
      // 컴포넌트 언마운트 시 스크립트 제거
      document.head.removeChild(script);
    };
  }, [kakaoKey]);

  const generateEmojiGrid = () => {
    let guess = '';
    answersSets.map((_, setIndex) => {
      if (isSubmittedSets[setIndex]) {
        let originWord = realQuizAnswer;

        for (let c = 0; c < 5; c++) {
          let answer = answersSets[setIndex];
          let letter = answer[c];

          // is it in the right position?
          if (originWord[c] === letter) {
            guess += '🟥';
          } else {
            // is it in the word?
            if (originWord.includes(letter)) {
              let index = originWord.indexOf(letter);
              // check if it's not already marked as correct
              if (originWord[index] !== answer[index] && !Array.from(answer).slice(0, c).includes(letter)) {
                guess += '🟨';
              } else {
                guess += '⬜';
              }
            } else {
              guess += '⬜';
            }
          }
        }
        guess += '\n';
      }
    })

    return guess;
  }

  const handleShare = () => {
    // 공유할 메시지 작성
    const shareMessage = {
      objectType: 'text',
      text: '클론 게임 "오늘의 단어"를 즐겨보세요! 🎮 단어 추리 게임의 재미를 느껴보세요. 🧠🔍\n\n' + generateEmojiGrid(),
      link: {
        webUrl: 'https://codefeat.store/games/wordle',  // 공유할 링크 URL
        mobileWebUrl: 'https://codefeat.store/games/wordle',  // 모바일에서 열릴 링크 URL (선택 사항)
      },
      serverCallbackArgs: { // 콜백 파라미터 설정
        key: 'value'
      }
    };

    // 카카오 공유 API 호출
    window.Kakao.Link.sendDefault(shareMessage);
  };

  const handleShareCopy = () => {

    navigator.clipboard.writeText(
      '클론 게임 "오늘의 단어"를 즐겨보세요! 🎮 단어 추리 게임의 재미를 느껴보세요. 🧠🔍\n\n' +
      generateEmojiGrid() +
      '\n👉 https://codefeat.store/games/wordle'
    )


    toast.info("복사되었습니다.\n원하는 곳에 붙여넣기(Ctrl+V)해주세요.", {
      position: "bottom-center",
      autoClose: 500,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
      theme: "dark",
    });
  };

  const renderDivSets = () => {
    return answersSets.map((_, setIndex) => (
      <div key={setIndex} className={`${isSubmittedSets[setIndex] ? 'div-sets' : 'div-sets-none'}`}>
        {renderDivSetsDetail(setIndex)}
      </div>
    ))
  };

  const renderDivSetsDetail = (setIndex) => {
    const result = [];

    for (let c = 0; c < answersSets[setIndex].length; c++) {
      let answer = answersSets[setIndex];
      let letter = answer[c];
      const classNames = ['div-answer'];

      if (isSubmittedSets[setIndex]) {
        if (realQuizAnswer[c] === letter) {
          classNames.push('correct-answer');
        } else {
          // is it in the word?
          if (realQuizAnswer.includes(letter)) {
            let index = realQuizAnswer.indexOf(letter);
            // check if it's not already marked as correct
            if (realQuizAnswer[index] !== answer[index] && !Array.from(answer).slice(0, c).includes(letter)) {
              classNames.push('yellow-answer');
            } else {
              classNames.push('answer');
            }
          } else {
            classNames.push('answer');
          }
        }
      }

      result.push(
        React.createElement('div', {
          key: c,
          className: classNames.join(' ')
        })
      );
    }

    return result;
  };

  const gameTimeInMs = () => {
    const epochMs = 1643122800000
    const now = Date.now()
    const msInDay = 86400000
    return {
      elapsed: (now - epochMs),
      msInDay,
      epochMs
    }
  }

  const nextRound = () => {
    const { elapsed, msInDay, epochMs } = gameTimeInMs()
    const index = Math.floor(elapsed / msInDay)
    return (index + 1) * msInDay + epochMs
  }

  const renderGraph = () => {

    if (!gameStats) {
      return;
    }

    const values = gameStats?.winDistribution;
    const calculatedTotal = values.reduce((sum, value) => sum + value, 0);
    const calculatedPercentages = values.map(value => (value / calculatedTotal) * 100);

    return (
      <div className="guess-distribution-container">
        {values.map((value, index) => (
          <div className="guess-item" key={index}>
            <div className="guess-number" aria-hidden="true">{index + 1}</div>
            <div className="guess-graph" aria-hidden="true">
              <div className={`graph-bar ${gameStats?.todayIdx == index ? 'correct' : ''}`} style={{ width: `${calculatedPercentages[index] === 0 ? 6 : calculatedPercentages[index]}%` }}>
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
        <button id="btn-no" className="modal-static hidden"></button>
      </ModalOpenButton>
      <ModalContents title="내일 다시 만나요 ㅠ">
        <div className="custom-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="18" x2="18" y2="6" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        <div className="stats-container">
          <ul className="statistics-list" style={{ padding: '0' }}>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{gameStats?.totalGames}</div>
              <div className="statistic-label" aria-hidden="true">플레이수</div>
            </li>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{gameStats?.successRate}%</div>
              <div className="statistic-label" aria-hidden="true">성공률%</div>
            </li>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{gameStats?.currentStreak}</div>
              <div className="statistic-label" aria-hidden="true">현재연속</div>
            </li>
            <li className="statistic-item">
              <div className="statistic-value" aria-hidden="true">{gameStats?.bestStreak}</div>
              <div className="statistic-label" aria-hidden="true">최대연속</div>
            </li>
          </ul>
        </div>
        {renderGraph()}
        {/* <div className="modal-div">
          {renderDivSets()}
        </div> */}
        <div className="div-time"><b>{realQuizAnswer}</b></div>
        <br />
        <div className="div-time">매일 자정 새로운 단어가 공개됩니다.</div>
        <div className="div-time"><Countdown date={nextRound()} daysInHours /></div>
        <hr></hr>
        <div className="bottom-div">
          <a className="a-kakao" id="kakaotalk-sharing-btn" href="#">
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png"
              alt="카카오톡 공유 보내기 버튼" onClick={handleShare} />
          </a>
          <a href="#">
            <img src={shareImg}
              alt="복사하기" onClick={handleShareCopy} /></a>
        </div>
      </ModalContents>
    </Modal>
  );
};

export default ModalNo;
