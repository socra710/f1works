import "./Home.css";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";

export default function Home() {

  useEffect(() => {

    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>구시렁거리다</title>
        <meta property="og:title" content="구시렁거리다" />
        <meta property="og:description" content="구시렁구시렁" />
        <meta property="og:image" content="https://codefeat.netlify.app/codefeat.png" />
        <meta property="og:url" content="https://codefeat.netlify.app" />
      </Helmet>
      <header className="header-home">
        <h1>구시렁거리다</h1>
      </header>
      <section>
        <ins className="kakao_ad_area"
          style={{ display: 'none' }}
          data-ad-unit="DAN-4JeQ2Ghy92y8EBnw"
          data-ad-width="728"
          data-ad-height="90"></ins>
      </section>
      <section className="section-home">
        <h2>나에 대해</h2>
        <p>
          구시렁구시렁..
        </p>
      </section>

      <section className="default-section">
        <h2>내 프로젝트</h2>
        <p>몇 가지 개인 프로젝트는 아래와 같습니다:</p>
        <ul>
          <li>
            <strong><a href="/works" target="_self">F1Works - 회사 자원 공유 앱(비공개)</a></strong>
            <br></br>
            회사 내에서 자원을 효율적으로 공유하고 소통하는 데 도움이 되는 앱입니다.직원들 간의 협업을 강화하고
            업무 효율성을 높이는데 기여합니다.
          </li >
          <li>
            <strong><a href="/games/wordle" target="_self">클론게임 - 오늘의 단어를 무엇일까요?(공개)</a></strong>
            <br></br>
            유명한 영어 단어게임을 클론해서 만들어 보았습니다.
          </li>
          <li>
            <strong><a href="/feed" target="_self">SwiftFeed - Works 사용자를 위한 뉴스 피드(공개)</a></strong>
            <br></br>
            신속하고 간결한 뉴스 피드를 위한 플랫폼
          </li>
        </ul >
      </section >

      <section className="default-section">
        <h2>연락처</h2>
        <p>
          언제든지 연락 주세요! 제 포트폴리오에 대한 질문이나 협업 제안이 있다면 아래의 이메일 주소로 연락해 주세요
          <br></br>
          <a href="mailto:admin@codefeat.store">admin@codefeat.store</a>
        </p>
      </section>
    </>
  );
}