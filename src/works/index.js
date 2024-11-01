import "./index.css";
import { Helmet } from "react-helmet-async"; // 추가

export default function Works() {

  return (
    <div>
      <Helmet>
        <title>F1Works</title>
        <meta property="og:title" content="F1Works" />
        <meta property="og:description" content="F1Soft 직원들을 위한 앱입니다." />
        <meta property="og:image" content="https://f1lab.co.kr:444/mail_sign/sign_logo01.jpg" />
        <meta property="og:url" content={`https://codefeat.netlify.app/works`} />
      </Helmet >
      <header className="header-index">
        <h1 style={{ color: '#fff' }}>F1Works</h1>
        <p>회사 자원을 효율적으로 공유하고 소통하세요.</p>
      </header>

      <section className="section-index">
        <h2>F1Works 앱을 소개합니다.</h2>
        <p>
          F1Works는 회사 내에서 자원을 효율적으로 공유하고 소통하는 데 도움이 되는 앱입니다. 직원들 간의 협업을 강화하고
          업무 효율성을 높이는데 기여합니다.
        </p>
      </section>

      <section className="default-section">
        <h2>주요 기능</h2>
        <ul>
          <li>자원 공유: 프로젝트 파일, 문서, 일정 등을 간편하게 공유하세요.</li>
          <li>
            퀵링크 기능: 웹사이트 검색 결과를 찾았나요? 퀵링크를 사용하여 F1Works 사용자와 손쉽게 정보를 공유하세요. 한
            번의 클릭으로 소통의 즐거움을 경험해보세요!
          </li>
          <li>알림 기능: 중요한 업무나 일정에 대한 알림을 신속하게 받아보세요.</li>
        </ul>
      </section>

      <section className="default-section">
        <h2>부가 기능</h2>
        <ul>
          <li>배차 신청: 차량 및 자원의 배차를 효과적으로 신청하세요.</li>
          <li>오늘의 메뉴: 오늘의 식단을 확인하고 메뉴를 공유하세요.</li>
          <li>일정 관리: 업무 및 개인 일정을 효과적으로 관리하세요.</li>
        </ul>
      </section>
    </div >
  );
}