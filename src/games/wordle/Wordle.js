import React from 'react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ToastContainer, toast } from 'react-toastify';

import WordSet from './components/WordSet';
import ModalHow from './components/ModalHow';
// import ModalAbout from "./components/ModalAbout";
import ModalStats from './components/ModalStats';
import './Wordle.css';

const Wordle = () => {
  const [toDayWordNo, setTodayWordNo] = useState(false);
  const [gameStats, setGameStats] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openHow = () => {
    document.querySelector('#btn-how').click();
    setIsOpen(true);
  };

  const openStats = () => {
    document.querySelector('#btn-stats').click();
    // setIsOpen(true);
  };

  const updateTodayWordNo = (newState) => {
    setTodayWordNo(newState);
  };

  const updateGameStats = (newState) => {
    setGameStats(newState);
  };

  return (
    <>
      <Helmet>
        <title>오늘의 단어</title>
        <meta property="og:title" content="오늘의 단어" />
        <meta
          property="og:description"
          content="유명한 게임을 따라 만든 클론게임입니다."
        />
        <meta
          property="og:url"
          content={`https://f1works.netlify.app/games/wordle`}
        />
      </Helmet>

      <div className="bottom-div-kakao">
        <ins
          className="kakao_ad_area"
          data-ad-unit="DAN-1cbuU6Ob5PrJfshE"
          data-ad-width="728"
          data-ad-height="90"
        ></ins>
      </div>

      <div className="bottom-div-kakao-mobile">
        <ins
          className="kakao_ad_area"
          data-ad-unit="DAN-FJnIosM8fDO8y0l3"
          data-ad-width="320"
          data-ad-height="50"
        ></ins>
      </div>
      <header className="header-initial">
        <div className="menu-div-start"></div>
        <h1 className="cute-font">클론 게임</h1>
        <div className="menu-div-end">
          <button className="menu-icon1" onClick={openHow}>
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              height="28"
              viewBox="4 4 24 24"
              width="28"
              data-testid="icon-help"
            >
              <path
                fill="var(--color-tone-1)"
                d="M14.8333 23H17.1666V20.6667H14.8333V23ZM15.9999 4.33334C9.55992 4.33334 4.33325 9.56001 4.33325 16C4.33325 22.44 9.55992 27.6667 15.9999 27.6667C22.4399 27.6667 27.6666 22.44 27.6666 16C27.6666 9.56001 22.4399 4.33334 15.9999 4.33334ZM15.9999 25.3333C10.8549 25.3333 6.66659 21.145 6.66659 16C6.66659 10.855 10.8549 6.66668 15.9999 6.66668C21.1449 6.66668 25.3333 10.855 25.3333 16C25.3333 21.145 21.1449 25.3333 15.9999 25.3333ZM15.9999 9.00001C13.4216 9.00001 11.3333 11.0883 11.3333 13.6667H13.6666C13.6666 12.3833 14.7166 11.3333 15.9999 11.3333C17.2833 11.3333 18.3333 12.3833 18.3333 13.6667C18.3333 16 14.8333 15.7083 14.8333 19.5H17.1666C17.1666 16.875 20.6666 16.5833 20.6666 13.6667C20.6666 11.0883 18.5783 9.00001 15.9999 9.00001Z"
              ></path>
            </svg>
          </button>
          <button className="menu-icon1" onClick={openStats}>
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              height="28"
              viewBox="4 4 24 24"
              width="28"
              className="game-icon"
              data-testid="icon-statistics"
            >
              <path
                fill="var(--color-tone-1)"
                d="M20.6666 14.8333V5.5H11.3333V12.5H4.33325V26.5H27.6666V14.8333H20.6666ZM13.6666 7.83333H18.3333V24.1667H13.6666V7.83333ZM6.66659 14.8333H11.3333V24.1667H6.66659V14.8333ZM25.3333 24.1667H20.6666V17.1667H25.3333V24.1667Z"
              ></path>
            </svg>
          </button>
        </div>
      </header>

      <section className="section-initial">
        <h2 className="quiz-question-title">오늘의 단어 #{toDayWordNo}</h2>
        <WordSet
          updateTodayWordNo={updateTodayWordNo}
          updateGameStats={updateGameStats}
        />
      </section>
      {/* <div className="bottom-div">
        <ModalAbout />
      </div> */}
      <ToastContainer />
      <ModalHow isOpen={isOpen} />
      <ModalStats isOpen={isOpen} gameStats={gameStats} />
    </>
  );
};

export default Wordle;
