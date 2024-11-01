
import React, { useEffect } from "react";

const KeyBoard = (props) => {

  useEffect(() => {
    const answersSets = props.answersSets;
    const isSubmittedSets = props.isSubmittedSets;
    for (var setIndex = 0; setIndex < answersSets.length; setIndex++) {
      if (isSubmittedSets[setIndex]) {
        for (let c = 0; c < answersSets[setIndex].length; c++) {
          let answer = answersSets[setIndex];
          let letter = answer[c];

          if (props.realQuizAnswer[c] === letter) {
            document.querySelector('#btn' + letter).classList.remove('keyboard-yellow');
            document.querySelector('#btn' + letter).classList.add('keyboard-correct');
          } else {
            // is it in the word?
            if (props.realQuizAnswer.includes(letter)) {
              let index = props.realQuizAnswer.indexOf(letter);
              // check if it's not already marked as correct
              if (props.realQuizAnswer[index] !== answer[index] && !Array.from(answer).slice(0, c).includes(letter)) {
                if (document.querySelector('#btn' + letter) && document.querySelector('#btn' + letter).className !== 'keyboard-correct') {
                  document.querySelector('#btn' + letter).classList.add('keyboard-yellow');
                }
              }
            } else {
              document.querySelector('#btn' + letter).classList.add('keyboard-normal');
            }
          }
        }
      }
    }
  }, [props]);

  const keyPressed = (key) => {
    if (key === 'Enter' || key === 'Backspace') {
      props.handleInputKeyPressProps(key);
    } else {
      props.handleInputChangeSetsProps(key);
    }
  }

  return (
    <>
      <br></br>
      <div className="keyboard">
        <button id="btnQ" onClick={() => keyPressed('Q')}>Q</button>
        <button id="btnW" onClick={() => keyPressed('W')}>W</button>
        <button id="btnE" onClick={() => keyPressed('E')}>E</button>
        <button id="btnR" onClick={() => keyPressed('R')}>R</button>
        <button id="btnT" onClick={() => keyPressed('T')}>T</button>
        <button id="btnY" onClick={() => keyPressed('Y')}>Y</button>
        <button id="btnU" onClick={() => keyPressed('U')}>U</button>
        <button id="btnI" onClick={() => keyPressed('I')}>I</button>
        <button id="btnO" onClick={() => keyPressed('O')}>O</button>
        <button id="btnP" style={{ marginRight: '0' }} onClick={() => keyPressed('P')}>P</button>
      </div>
      <div className="keyboard">
        <div data-testid="spacer" className="spacer"></div>
        <button id="btnA" onClick={() => keyPressed('A')}>A</button>
        <button id="btnS" onClick={() => keyPressed('S')}>S</button>
        <button id="btnD" onClick={() => keyPressed('D')}>D</button>
        <button id="btnF" onClick={() => keyPressed('F')}>F</button>
        <button id="btnG" onClick={() => keyPressed('G')}>G</button>
        <button id="btnH" onClick={() => keyPressed('H')}>H</button>
        <button id="btnJ" onClick={() => keyPressed('J')}>J</button>
        <button id="btnK" onClick={() => keyPressed('K')}>K</button>
        <button id="btnL" style={{ marginRight: '0' }} onClick={() => keyPressed('L')}>L</button>
        <div data-testid="spacer" className="spacer"></div>
      </div>
      <div className="keyboard">
        <button id="btnEnter" style={{ flex: 1.5, fontSize: '13px' }} onClick={() => keyPressed('Enter')}>Enter</button>
        <button id="btnZ" onClick={() => keyPressed('Z')}>Z</button>
        <button id="btnX" onClick={() => keyPressed('X')}>X</button>
        <button id="btnC" onClick={() => keyPressed('C')}>C</button>
        <button id="btnV" onClick={() => keyPressed('V')}>V</button>
        <button id="btnB" onClick={() => keyPressed('B')}>B</button>
        <button id="btnN" onClick={() => keyPressed('N')}>N</button>
        <button id="btnM" onClick={() => keyPressed('M')}>M</button>
        <button id="btnBack" style={{ flex: 1.5, marginRight: '0' }} onClick={() => keyPressed('Backspace')}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" className="game-icon"><path fill="var(--color-tone-1)" d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"></path></svg></button>
      </div>
    </>
  )
}

export default KeyBoard;