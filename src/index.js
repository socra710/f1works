import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Modal from 'react-modal';
import reportWebVitals from './reportWebVitals';
// import { FpjsProvider } from '@fingerprintjs/fingerprintjs-pro-react'
import { HelmetProvider } from 'react-helmet-async'; // 이부분 추가

Modal.setAppElement('#root');

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// if (container.hasChildNodes()) {
//   ReactDOM.hydrateRoot(
//     container,
//     <React.StrictMode>
//       <HelmetProvider>
//         <App />
//       </HelmetProvider>
//     </React.StrictMode>
//   );
// } else {
//   root.render(
//     <React.StrictMode>
//       <HelmetProvider>
//         <App />
//       </HelmetProvider>
//     </React.StrictMode>
//   );
// }

// const root = ReactDOM.createRoot(document.getElementById('root'));
// const app = (
//   <HelmetProvider>
//     <App />
//   </HelmetProvider>
// )
// root.render(
//   <HelmetProvider>
//     <App />
//   </HelmetProvider>
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
