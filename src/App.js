// import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // 이 구문을 넣으면 됨

import './App.css';
import { ToastProvider } from './common/Toast';

// import Home from './home/Home';
import Works from './works/index';
import Notice from './works/Notice';
import Dispatch from './works/Dispatch';
import Car from './works/Car';
import Monitor from './works/Monitor';
import Expense from './works/expense/Expense';
import ExpenseManagement from './works/expense/ExpenseManagement';
import SpecialItems from './works/expense/SpecialItems';
import ExpenseSummary from './works/expense/ExpenseSummary';
import Wordle from './games/wordle/Wordle';
// import Tetris from './games/tetris/Tetris';
import Feed from './feed/index';
import Calendar from './works/Calendar';

function App() {
  return (
    <ToastProvider>
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
          <Route path="/works/expense" element={<Expense />}></Route>
          <Route path="/works/expense/:expenseId" element={<Expense />} />
          <Route
            path="/works/expense-management"
            element={<ExpenseManagement />}
          ></Route>
          <Route path="/works/special-items" element={<SpecialItems />}></Route>
          <Route
            path="/works/expense-summary"
            element={<ExpenseSummary />}
          ></Route>
          {/* <Route path="/works/dispatch/:id" element={<Dispatch />}></Route> */}
          <Route path="/games/wordle" element={<Wordle />}></Route>
          {/* <Route path="/games/tetris" element={<Tetris />}></Route> */}
          <Route path="/feed" element={<Feed />}></Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
