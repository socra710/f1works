// import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // 이 구문을 넣으면 됨

import './App.css';
import { ToastProvider } from './common/Toast';

// import Home from './home/Home';
import Works from './works/index';
import Notice from './works/Notice';
import Car from './works/dispatch/Car';
import Monitor from './works/dispatch/Monitor';
import Expense from './works/expense/Expense';
import ExpenseManagement from './works/expense/ExpenseManagement';
import SpecialItems from './works/expense/SpecialItems';
import ExpenseSummary from './works/expense/ExpenseSummary';
import AdminPage from './works/admin/AdminPage';
import AssetHW from './works/asset/index';
import CustomerContact from './works/customer/CustomerContact';
import Wordle from './games/wordle/Wordle';
import Tetris from './games/tetris/Tetris';
import Runner from './games/runner/Runner';
import Feed from './feed/index';
import Calendar from './works/Calendar';
import NotFound from './NotFound';
import IFormPage from './works/iform';
import UserForm from './works/iform/user/UserForm';
import UserDocumentView from './works/iform/user/UserDocumentView';
import ManagerDocumentView from './works/iform/manager/ManagerDocumentView';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Works />}></Route>
          <Route path="/works" element={<Works />}></Route>
          <Route path="/works/notice" element={<Works />}></Route>
          <Route path="/works/dispatch/car" element={<Car />}></Route>
          <Route path="/works/dispatch/monitor" element={<Monitor />}></Route>
          <Route
            path="/works/notice/:id/:gbn/:usrId"
            element={<Notice />}
          ></Route>
          <Route path="/works/calendar" element={<Calendar />}></Route>
          <Route path="/works/expense" element={<Expense />}></Route>
          <Route path="/works/expense/:expenseId" element={<Expense />} />
          <Route path="/works/admin" element={<AdminPage />}></Route>
          <Route
            path="/works/expense-management"
            element={<ExpenseManagement />}
          ></Route>
          <Route path="/works/special-items" element={<SpecialItems />}></Route>
          <Route
            path="/works/expense-summary"
            element={<ExpenseSummary />}
          ></Route>
          <Route
            path="/works/expense-summary/:encodedYear"
            element={<ExpenseSummary />}
          ></Route>
          <Route path="/works/asset/hw" element={<AssetHW />}></Route>
          <Route
            path="/works/customer/contact"
            element={<CustomerContact />}
          ></Route>
          <Route path="/works/iform" element={<IFormPage />}></Route>
          <Route path="/works/iform/user" element={<UserForm />}></Route>
          <Route
            path="/works/iform/user/:docId"
            element={<UserDocumentView />}
          ></Route>
          <Route
            path="/works/iform/manager/:docId"
            element={<ManagerDocumentView />}
          ></Route>
          {/* <Route path="/works/dispatch/:id" element={<Dispatch />}></Route> */}
          <Route path="/games/wordle" element={<Wordle />}></Route>
          <Route path="/games/tetris" element={<Tetris />}></Route>
          <Route path="/games/runner" element={<Runner />}></Route>
          <Route path="/feed" element={<Feed />}></Route>
          <Route path="*" element={<NotFound />}></Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
