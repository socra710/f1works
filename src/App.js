// import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // 이 구문을 넣으면 됨

import './App.css';

// import Home from './home/Home';
import Works from './works/index';
import Notice from './works/Notice';
import Dispatch from './works/Dispatch';
import Car from './works/Car';
import Monitor from './works/Monitor';
import Wordle from './games/wordle/Wordle';
import Tetris from './games/tetris/Tetris';
import Feed from './feed/index';
import Calendar from './works/Calendar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Works />}></Route>
        <Route path="/works" element={<Works />}></Route>
        <Route path="/works/notice" element={<Works />}></Route>
        <Route path="/works/dispatch" element={<Dispatch />}></Route>
        <Route path="/works/dispatch/car" element={<Car />}></Route>
        <Route path="/works/dispatch/monitor" element={<Monitor />}></Route>
        <Route
          path="/works/notice/:id/:gbn/:usrId"
          element={<Notice />}
        ></Route>
        <Route path="/works/calendar" element={<Calendar />}></Route>
        {/* <Route path="/works/dispatch/:id" element={<Dispatch />}></Route> */}
        <Route path="/games/wordle" element={<Wordle />}></Route>
        <Route path="/games/tetris" element={<Tetris />}></Route>
        <Route path="/feed" element={<Feed />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
