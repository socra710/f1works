import './Notice.css';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // 추가

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Notice() {
  // useParams를 통해 파라미터를 받아옵니다.
  const { id, gbn, usrId } = useParams();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    document.body.appendChild(script);

    onViewNotice(id, gbn, usrId);
  }, [id, gbn]);

  // 예: 공지사항 데이터를 가져오는 API 호출
  const onViewNotice = (id, gbn, usrId) => {
    const query =
      'factoryCode=000001&userId=' +
      atob(usrId) +
      '&number=' +
      atob(id) +
      '&gbn=' +
      atob(gbn);

    fetch(`${API_BASE_URL}/jvWorksGetNotice?${query}`, {})
      .then((response) => response.json())
      .then((data) => {
        if (data.success === 'false') {
          alert(
            '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
              data.message
          );
          return;
        }

        if (data.data.length === 0) {
          return;
        }

        const item = data.data[0];
        const asideNotice = document.querySelector('#asideNotice');

        asideNotice.innerHTML = '';
        if (item.GBN === '01') {
          asideNotice.innerHTML +=
            '<header style="padding:0;"><h2 style="font-size:30px;">ERP 공지</h2></header>';
        } else if (item.GBN === '02') {
          asideNotice.innerHTML +=
            '<header style="padding:0;"><h2 style="font-size:30px;">소담뷔페</h2></header>';
        } else if (item.GBN === '03') {
          asideNotice.innerHTML +=
            '<header style="padding:0;"><h2 style="font-size:30px;">F1Works 공지</h2></header>';
        }
        asideNotice.innerHTML +=
          '<p style="font-size:18px;">제목 : ' + item.TITLE + '</p>';

        let div = document.createElement('div');
        div.innerHTML = item.COMMENT;

        asideNotice.append(div);

        // navigate("/works/notice");
      })
      .catch((error) => {
        console.error('Error fetching notice:', error);
      });
  };

  return (
    <>
      <Helmet>
        <title>F1Works - 공지사항</title>
        <meta property="og:title" content="F1Works - 공지사항" />
        <meta property="og:description" content="F1Soft 공지사항 입니다." />
        <meta
          property="og:image"
          content="https://f1lab.co.kr:444/mail_sign/sign_logo01.jpg"
        />
        <meta
          property="og:url"
          content={`https://codefeat.netlify.app/works/notice`}
        />
      </Helmet>
      <section className="section-notice">
        <ins
          class="kakao_ad_area"
          data-ad-unit="DAN-WSf7c9qwAyXmLZqp"
          data-ad-width="728"
          data-ad-height="90"
        ></ins>
        <aside id="asideNotice"></aside>
      </section>
    </>
  );
}
