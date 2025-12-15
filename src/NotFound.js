import { useNavigate } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title"></h1>
        <h2 className="not-found-subtitle">
          죄송합니다. 페이지를 이용할 수 없습니다.
        </h2>
        <p className="not-found-message">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <button className="not-found-button" onClick={() => navigate('/')}>
          돌아가기
        </button>
      </div>
      <footer className="not-found-footer">
        <p>© 2025 F1Works는 직원들의 업무 효율성 향상을 위해 만들어졌습니다.</p>
      </footer>
    </div>
  );
}

export default NotFound;
