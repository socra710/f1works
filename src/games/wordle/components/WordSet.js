// WordSet.js

import React, { useState, useRef, useEffect } from "react";
import JSConfetti from "js-confetti";
import axios from "axios";
// import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { toast } from 'react-toastify';
import Inko from 'inko';
import ClipLoader from "react-spinners/ClipLoader"; //설치한 cliploader을 import한다
import ModalOk from "./ModalOk";
import ModalNo from "./ModalNo";
import KeyBoard from "./KeyBoard";

import 'react-toastify/dist/ReactToastify.css';

const gameStatKey = 'gameStats';
const defaultStats = {
  winDistribution: [0, 0, 0, 0, 0, 0],
  gamesFailed: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalGames: 0,
  successRate: 0,
  todayIdx: 99,
}
const getRandomIndex = (max) => Math.floor(Math.random() * max);

const WordSet = ({ updateTodayWordNo, updateGameStats }) => {
  const jsConfetti = new JSConfetti();

  const [quizData, setQuizData] = useState([]);
  const [answersSets, setAnswersSets] = useState([]);
  const inputRefsSets = useRef([]);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [realQuizAnswer, setRealQuizAnswer] = useState('');
  const [allSetsSubmitted, setAllSetsSubmitted] = useState(false);
  const [isSubmittedSets, setIsSubmittedSets] = useState(Array(6).fill(false));
  const [remainingTimeSets, setRemainingTimeSets] = useState(0);
  const [isCorrectAnswerSubmitted, setIsCorrectAnswerSubmitted] = useState(false);
  const [activeSet, setActiveSet] = useState(0);
  const [activeInputSet, setActiveInputSet] = useState(0);
  const [fetchedData, setFetchedData] = useState([]);
  const [wordNo, setWordNo] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [submitFlag, setSubmitFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameStats, setGameStats] = useState(null);

  useEffect(() => {
    // Load stats from local storage on component mount
    const stats = localStorage.getItem(gameStatKey);
    setGameStats(stats ? JSON.parse(stats) : defaultStats);
    updateGameStats(stats ? JSON.parse(stats) : defaultStats);
  }, []);

  useEffect(() => {
    // Save stats to local storage whenever the gameStats state changes
    if (gameStats) {
      localStorage.setItem(gameStatKey, JSON.stringify(gameStats));
      updateGameStats(gameStats);
    }
  }, [gameStats]);

  // 다른 곳을 클릭할 때 포커스를 잃지 않도록 하는 이벤트 핸들러
  const handleDocumentClick = (event) => {
    event.preventDefault();
    // inputRefsSets.current[activeSet][activeInputSet].current.focus();
  };

  // 컴포넌트가 마운트될 때 document에 이벤트 핸들러 추가
  useEffect(() => {
    document.addEventListener('mousedown', handleDocumentClick);

    // 컴포넌트가 언마운트될 때 이벤트 핸들러 제거
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  useEffect(() => {

    if (isCorrectAnswerSubmitted) {
      setTimeout(() => {
        document.querySelector('#btn-ok').click();
      }, 1000);
    }
    if (activeSet === 6) {
      setTimeout(() => {
        document.querySelector('#btn-no').click();
      }, 1000);
    }
  }, [activeSet, isCorrectAnswerSubmitted]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (
      inputRefsSets.current[activeSet] &&
      inputRefsSets.current[activeSet][activeInputSet] &&
      inputRefsSets.current[activeSet][activeInputSet].current
    ) {
      inputRefsSets.current[activeSet][activeInputSet].current.focus();
    }
  }, [activeSet, activeInputSet, inputRefsSets.current]);

  useEffect(() => {

    const options = {
      method: 'GET',
      url: 'https://f1lab.co.kr/com/api/games/jvWordle',
      params: {
        factoryCode: '000001',
        userId: visitorId
      }
    };

    axios.request(options).then(function (response) {

      if (response.data.success === "false") {
        alert('시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' + response.data.message);
        return;
      }

      setWordNo(response.data.wordNo);
      updateTodayWordNo(response.data.wordNo);

      const storedGuessNo = window.localStorage.getItem('guessNo');
      if (storedGuessNo) {
        if (response.data.wordNo !== storedGuessNo) {
          if (window.localStorage.getItem('guessData')) {
            window.localStorage.removeItem('guessData');
          }
        }
      } else {
        window.localStorage.removeItem('guessData');
      }

      let item = response.data.todayWord[0];
      let todaysWord = item.word.toUpperCase();

      const quizData = [{ question: todaysWord, answer: todaysWord }];
      setQuizData(quizData);

      if (quizData.length > 0) {
        const currentQuizIndex = getRandomIndex(quizData.length);

        if (quizData.length > 0 && currentQuizIndex !== null) {
          const quizItem = quizData[currentQuizIndex];
          const { question: quizQuestion, answer: realQuizAnswer } = quizItem;

          setQuizQuestion(quizQuestion);
          setRealQuizAnswer(realQuizAnswer);

          setAnswersSets(Array(6).fill(Array(quizQuestion.length).fill("")));
          inputRefsSets.current = Array(6).fill(null).map(() => Array(quizQuestion.length).fill(null).map(() => React.createRef()));

          // 로컬 스토리지에서 데이터 가져오기
          const storedGuessString = window.localStorage.getItem('guessData');
          if (storedGuessString) {
            const storedGuess = JSON.parse(storedGuessString);
            setFetchedData(storedGuess);
          }

          setLoading(false);
        }
      }

    }).catch(function (error) {
      console.error(error);
    });
  }, []);

  // useEffect(() => {
  //   // 핑거프린트 무료 버전 사용시
  //   const fpPromise = FingerprintJS.load()
  //     ; (async () => {
  //       // Get the visitor identifier when you need it.
  //       const fp = await fpPromise
  //       const result = await fp.get()

  //       // This is the visitor identifier:
  //       const visitorId = result.visitorId
  //       // console.log(visitorId)

  //       setVisitorId(visitorId);

  //       const options = {
  //         method: 'GET',
  //         url: 'https://f1lab.co.kr/com/api/games/jvWordle',
  //         params: {
  //           factoryCode: '000001',
  //           userId: visitorId
  //         }
  //       };

  //       axios.request(options).then(function (response) {

  //         if (response.data.success === "false") {
  //           alert('시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' + response.data.message);
  //           return;
  //         }

  //         setWordNo(response.data.wordNo);
  //         updateTodayWordNo(response.data.wordNo);

  //         let item = response.data.todayWord[0];
  //         let todaysWord = item.word.toUpperCase();

  //         const quizData = [{ question: todaysWord, answer: todaysWord }];
  //         setQuizData(quizData);

  //         if (quizData.length > 0) {
  //           const currentQuizIndex = getRandomIndex(quizData.length);

  //           if (quizData.length > 0 && currentQuizIndex !== null) {
  //             const quizItem = quizData[currentQuizIndex];
  //             const { question: quizQuestion, answer: realQuizAnswer } = quizItem;

  //             setQuizQuestion(quizQuestion);
  //             setRealQuizAnswer(realQuizAnswer);

  //             setAnswersSets(Array(6).fill(Array(quizQuestion.length).fill("")));
  //             inputRefsSets.current = Array(6).fill(null).map(() => Array(quizQuestion.length).fill(null).map(() => React.createRef()));

  //             const sampleData = {};
  //             for (var i = 0; i < response.data.saveWordList.length; i++) {
  //               var workItem = response.data.saveWordList[i];
  //               sampleData[i] = { userAnswer: workItem.SUBMIT_WORD };
  //             }
  //             // const sampleData = response.data.saveWordList;

  //             setFetchedData(sampleData);
  //           }
  //         }

  //       }).catch(function (error) {
  //         console.error(error);
  //       });
  //     })()
  // }, []);

  useEffect(() => {
    if (quizData.length > 0 && fetchedData[activeSet] && !loading) {

      if (answersSets[activeSet]) {
        setAnswersSets((prevSets) => {
          const newSets = [...prevSets];
          newSets[activeSet] = fetchedData[activeSet].userAnswer.split("");
          return newSets;
        });
      }

      setIsSubmittedSets((prevSets) => {
        const newSets = [...prevSets];
        newSets[activeSet] = true;
        return newSets;
      });

      if (fetchedData[activeSet].userAnswer === realQuizAnswer) {
        jsConfetti.addConfetti();
        setIsCorrectAnswerSubmitted(true);
      } else {
        setActiveSet((prevSet) => {
          const nextSet = prevSet + 1;
          if (nextSet === answersSets.length) {
            setAllSetsSubmitted(true);
          }
          return nextSet;
        });
      }


      // updateCssFulll(activeSet, fetchedData[activeSet].userAnswer);
    }
  }, [activeSet, fetchedData, loading]);

  const isCorrectAnswerSets = (setIndex) => {
    if (answersSets[setIndex]) {
      return answersSets[setIndex].join("") === realQuizAnswer;
    } else {
      return false;
    }
  };

  const activateNextSet = () => {
    setActiveSet((prevSet) => {
      const nextSet = prevSet + 1;
      if (nextSet === answersSets.length) {
        setAllSetsSubmitted(true);
      }
      return nextSet;
    });
  };

  const handleInputChangeSetsProps = (targetValue) => {

    let inko = new Inko();
    // Validate input to allow only uppercase letters
    const isOnlyUppercaseLetters = /^[A-Z]*$/;

    var value = inko.ko2en(targetValue);
    value = targetValue.toUpperCase();

    if (
      !isSubmittedSets[activeSet] &&
      isOnlyUppercaseLetters.test(targetValue) &&
      activeSet !== 6
    ) {
      setSubmitFlag(false);
      setAnswersSets((prevSets) => {
        const newSets = [...prevSets];
        const newAnswers = [...newSets[activeSet]];
        newAnswers[activeInputSet] = targetValue;

        if (targetValue !== "" && activeInputSet < newAnswers.length - 1) {
          inputRefsSets.current[activeSet][activeInputSet + 1].current.focus();
          setActiveInputSet(activeInputSet + 1);
        }
        newSets[activeSet] = newAnswers;
        return newSets;
      });
    }
  };

  const handleInputChangeSets = (setIndex, index, event) => {

    let inko = new Inko();
    // Validate input to allow only uppercase letters
    const isOnlyUppercaseLetters = /^[A-Z]*$/;

    var value = inko.ko2en(event.target.value);
    value = value.toUpperCase();

    if (
      !isSubmittedSets[setIndex] &&
      isOnlyUppercaseLetters.test(value)
    ) {

      event.target.value = '';
      setAnswersSets((prevSets) => {
        const newSets = [...prevSets];
        const newAnswers = [...newSets[setIndex]];
        newAnswers[index] = value;

        if (value !== "" && index < newAnswers.length - 1) {
          inputRefsSets.current[setIndex][index + 1].current.focus();
          setActiveInputSet(index + 1);
        }
        newSets[setIndex] = newAnswers;
        return newSets;
      });
    }
  };

  const handleInputKeyPressProps = (event) => {

    if (
      isSubmittedSets[activeSet] ||
      activeSet === 6
    ) {
      return;
    }

    if (event === 'Enter') {
      const value = inputRefsSets.current[activeSet][activeInputSet].current.value;
      if (value !== '' && activeInputSet < quizQuestion.length - 1) {
        inputRefsSets.current[activeSet][activeInputSet + 1].current.focus();
        setActiveInputSet(activeInputSet + 1);
      } else if (activeSet < answersSets.length) {
        handleSubmitSets(activeSet);
      }
    } else if (event === 'Backspace') {
      setSubmitFlag(false);
      setAnswersSets((prevSets) => {
        const newSets = [...prevSets];
        const newAnswers = [...newSets[activeSet]];
        newAnswers[activeInputSet] = '';
        newSets[activeSet] = newAnswers;
        return newSets;
      });
      if (activeInputSet > 0) {
        inputRefsSets.current[activeSet][activeInputSet - 1].current.focus();
        setActiveInputSet(activeInputSet - 1);
      }
    }
  };

  const handleInputKeyPress = (setIndex, index, event) => {

    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.target.value !== '' && index < quizQuestion.length - 1) {
        inputRefsSets.current[setIndex][index + 1].current.focus();
        setActiveInputSet(index + 1);
      } else if (setIndex < answersSets.length) {
        handleSubmitSets(setIndex);
      }
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      setSubmitFlag(false);
      setAnswersSets((prevSets) => {
        const newSets = [...prevSets];
        const newAnswers = [...newSets[setIndex]];
        newAnswers[index] = '';
        newSets[setIndex] = newAnswers;
        return newSets;
      });
      if (index > 0) {
        inputRefsSets.current[setIndex][index - 1].current.focus();
        setActiveInputSet(index - 1);
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      setSubmitFlag(false);
    }
    else {
      if (event.nativeEvent.code !== 'Enter') {
        setSubmitFlag(false);
        event.target.value = '';
        if ("KeyA" <= event.code && event.code <= "KeyZ") {
          // event.preventDefault();
          // setAnswersSets((prevSets) => {
          //   const newSets = [...prevSets];
          //   const newAnswers = [...newSets[setIndex]];
          //   newAnswers[index] = '';
          //   newSets[setIndex] = newAnswers;
          //   return newSets;
          // });
        }
      }
    }
  };

  const handleSubmitSets = (setIndex) => {
    const userAnswer = answersSets[setIndex].join("");

    let isThere = false;
    inputRefsSets.current[setIndex].forEach((inputRef, index) => {
      if (answersSets[setIndex][index].trim() === "") {
        isThere = true;
        inputRef.current.classList.add("empty-input");
        setTimeout(() => {
          inputRef.current.classList.remove("empty-input");
        }, 500);
      }

      if (answersSets[setIndex][index].trim().length > 1) {
        isThere = true;
        inputRef.current.classList.add("empty-input");
        setTimeout(() => {
          inputRef.current.classList.remove("empty-input");
        }, 500);
      }
    });

    if (isThere) {
      return;
    }

    if (submitFlag) {
      return;
    }

    const options = {
      method: 'GET',
      url: 'https://wordsapiv1.p.rapidapi.com/words/',
      params: { letterPattern: `^${userAnswer.toLowerCase()}$` },
      headers: {
        'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com',
        'x-rapidapi-key': '7062598bb2msh8a616fc8ed0b1ffp142e61jsn5ac113667ab4'
      }
    };

    axios.request(options).then(function (response) {
      // if the word exist in the dictionary
      if (response.data.results.total === 1) {

        const apiEndpoint = 'https://f1lab.co.kr/com/api/games/jvSetWordle'; // Replace with your actual API endpoint

        const requestBody = {
          factoryCode: '000001',
          wordNo: wordNo,
          userId: visitorId,
          setIndex: setIndex,
          userAnswer: userAnswer
        };

        axios.post(apiEndpoint, requestBody)
          .then(function (response) {
            // Handle success
            if (response.data.success === "false") {
              alert('시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' + response.data.message);
              return;
            }

            setIsSubmittedSets((prevSets) => {
              const newSets = [...prevSets];
              newSets[setIndex] = true;
              return newSets;
            });

            // updateCssFulll(setIndex, userAnswer);

            if (userAnswer === realQuizAnswer) {
              jsConfetti.addConfetti();
              setIsCorrectAnswerSubmitted(true);

              let stats = { ...gameStats };
              stats.winDistribution[activeSet] += 1
              stats.currentStreak += 1

              if (stats.bestStreak < stats.currentStreak) {
                stats.bestStreak = stats.currentStreak
              }
              stats.totalGames += 1;
              stats.successRate = getSuccessRate(stats)

              setGameStats((prevStats) => ({
                ...prevStats,
                winDistribution: stats.winDistribution,
                gamesFailed: stats.gamesFailed,
                currentStreak: stats.currentStreak,
                bestStreak: stats.bestStreak,
                totalGames: stats.totalGames,
                successRate: stats.successRate,
                todayIdx: setIndex
              }))
            } else {
              activateNextSet();
              setActiveInputSet(0);

              if (activeSet === 5) {
                let stats = { ...gameStats };
                stats.currentStreak = 0
                stats.gamesFailed += 1
                stats.totalGames += 1;
                stats.successRate = getSuccessRate(stats)

                setGameStats((prevStats) => ({
                  ...prevStats,
                  gamesFailed: stats.gamesFailed,
                  currentStreak: stats.currentStreak,
                  totalGames: stats.totalGames,
                  successRate: getSuccessRate(stats),
                  todayIdx: 99
                }))
              }
            }

            let guess = {};
            answersSets.map((answerSet, setIndex) => {
              if (answersSets[setIndex].join("") !== '') {
                guess[setIndex] = { userAnswer: answersSets[setIndex].join("") };
              }
            });

            // guess 배열을 문자열로 변환
            const guessString = JSON.stringify(guess);
            window.localStorage.setItem('guessData', guessString);
            window.localStorage.setItem('guessNo', wordNo);
          })
          .catch(function (error) {
            // Handle error
            console.error(error);
          });
      } else {
        setSubmitFlag(true);

        inputRefsSets.current[setIndex].forEach((inputRef, index) => {
          inputRef.current.classList.add("empty-input");
          setTimeout(() => {
            inputRef.current.classList.remove("empty-input");
          }, 500);
        });

        toast.warn("단어사전에 없는 단어입니다.", {
          position: "bottom-center",
          autoClose: 500,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          progress: undefined,
          theme: "dark",
        });
      }
    }).catch(function (error) {
      console.error(error);
    });
  };

  const updateCss = async (setIndex, answer) => {
    let originWord = realQuizAnswer;
    let css = 'input-answer';

    for (let c = 0; c < 5; c++) {
      let currTile = inputRefsSets.current[setIndex][c].current;
      let letter = answer[c];

      // is it in the right position?
      if (originWord[c] === letter) {
        currTile.classList.add("correct-answer");
      } else {
        // is it in the word?
        if (originWord.includes(letter)) {
          let index = originWord.indexOf(letter);
          // check if it's not already marked as correct
          if (originWord[index] !== answer[index] && !Array.from(answer).slice(0, c).includes(letter)) {
            currTile.classList.add("yellow-answer");
          } else {
            currTile.classList.add("normal-answer");
          }
        } else {
          currTile.classList.add("normal-answer");
        }
      }
      await sleep(500); // 각 타일에 순차적으로 애니메이션을 적용하기 위한 딜레이
    }
  };

  const updateCssFulll = (setIndex, answer, c) => {
    let originWord = realQuizAnswer;
    let css = 'input-answer';

    if (!isSubmittedSets[setIndex] && answer[c] !== '') {
      css += ' no-empty-input';
      return css;
    }

    let currTile = inputRefsSets.current[setIndex][c].current;
    let letter = answer[c];

    if (letter) {
      if (originWord[c] === letter) {
        css += ' correct-answer';
      } else {
        if ((originWord.includes(letter))) {
          let index = originWord.indexOf(letter);
          // check if it's not already marked as correct
          if (originWord[index] !== answer[index] && !answer.slice(0, c).includes(letter)) {
            css += ' yellow-answer';
          } else {
            css += ' normal-answer';
          }
        } else {
          css += isSubmittedSets[setIndex] ? ' normal-answer' : '';
        }
      }
    }

    return css;
  };

  const getSuccessRate = (gameStats) => {
    return Math.round(
      (100 * (gameStats.totalGames - gameStats.gamesFailed)) / Math.max(gameStats.totalGames, 1)
    )
  }

  // 딜레이 함수
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const renderInputsSets = (setIndex) => {
    return answersSets[setIndex].map((answer, index) => (
      <div key={index} className="input-div">
        <input
          ref={inputRefsSets.current[setIndex][index]}
          // className={`input-answer ${isSubmittedSets[setIndex] && realQuizAnswer[index] === answer ? 'correct-answer' : realQuizAnswer.includes(answer) ? 'yellow-answer' : answer} ${answer.trim() !== '' ? 'no-empty-input' : ''}`}
          className={updateCssFulll(setIndex, answersSets[setIndex], index)}
          maxLength="1"
          value={answer}
          style={{ pointerEvents: 'none' }}
          onChange={(e) => handleInputChangeSets(setIndex, index, e)}
          onKeyDown={(e) => handleInputKeyPress(setIndex, index, e)}
          readOnly={setIndex !== activeSet}
          disabled={isSubmittedSets[setIndex]}
          inputMode="none"
        // style={{ transition: isSubmittedSets[setIndex] && realQuizAnswer[index] === answer ? 'all 1s ease' : 'none' }}
        />
      </div>
    ));
  };

  const renderSubmitButton = (setIndex) => {
    const isAnswerCorrect = isCorrectAnswerSets(setIndex);
    const isSetSubmitted = isSubmittedSets[setIndex];

    let buttonText;

    if (setIndex === activeSet) {
      buttonText = isSetSubmitted ? (isAnswerCorrect ? '정답' : '오답') : '제출';
    } else {
      buttonText = '제출';
    }

    return (
      <button
        key={setIndex}
        onClick={() => handleSubmitSets(setIndex)}
        className={
          isSetSubmitted && isAnswerCorrect ? 'active' : ''
        }
        disabled={setIndex !== activeSet || isSubmittedSets[setIndex]}
        style={{ display: 'none' }}
      >
        {buttonText}
      </button>
    );
  };

  return (
    <div className="horizontal-container">

      {loading ? (
        <div className='container'>
          <ClipLoader
            color='#f88c6b'
            loading={loading} //useState로 관리
            size={150}
          />
        </div>
      ) : (
        <>
          {answersSets.map((_, setIndex) => (
            <div key={setIndex} className="horizontal-set">
              {renderInputsSets(setIndex)}
              {renderSubmitButton(setIndex)}
            </div>
          ))}
          <KeyBoard answersSets={answersSets} handleInputChangeSetsProps={handleInputChangeSetsProps} handleInputKeyPressProps={handleInputKeyPressProps} isSubmittedSets={isSubmittedSets} realQuizAnswer={realQuizAnswer} />
          <ModalOk answersSets={answersSets} isSubmittedSets={isSubmittedSets} realQuizAnswer={realQuizAnswer} gameStats={gameStats} />
          <ModalNo answersSets={answersSets} isSubmittedSets={isSubmittedSets} realQuizAnswer={realQuizAnswer} gameStats={gameStats} />
        </>
      )}
    </div>
  );
};

export default WordSet;
