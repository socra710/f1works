import "./index.css";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from "react-helmet-async"; // 추가
import ClipLoader from "react-spinners/ClipLoader"; //설치한 cliploader을 import한다

export default function Feed() {

  const [newsTop, setNewsTop] = useState([]);
  const [newsNew, setNewsNew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {

    const fetchNews = async (items) => {
      try {
        const response = await axios.get(
          `https://f1lab.co.kr/com/api/jvWorksGetNewsDesc?factoryCode=000001&userId=`
        );


        setTimeout(() => {
          setNewsNew(response.data.data);
          setNewsTop(items);
          setLoading(false);


          const script = document.createElement("script");
          script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
          script.async = true;
          document.body.appendChild(script);

          return () => {
            document.body.removeChild(script);
          };
        }, 1000);

      } catch (error) {
        setError('Error fetching news data.');
      } finally {
      }
    };

    const fetchNewsTop = async () => {
      try {
        const response = await axios.get(
          `https://f1lab.co.kr/com/api/jvWorksGetNewsTop?factoryCode=000001&userId=`
        );

        fetchNews(response.data.data);

      } catch (error) {
        setError('Error fetching news data.');
      } finally {
      }
    };

    fetchNewsTop();

  }, []);

  const onImageError = (e) => {
    e.target.src = 'https://f1lab.co.kr:444/wf_ftp/image/news/default-news' + getRandomNumber() + '.jpg';
  }

  const onImageError2 = (e) => {
    e.target.src = 'https://f1lab.co.kr:444/wf_ftp/image/news/internet.png';
  }

  function getRandomNumber() {
    return Math.floor(Math.random() * 11) + 1; // Generates a random number between 1 and 10
  }

  return (
    <>
      <Helmet>
        <title>SwiftFeed</title>
        <meta property="og:title" content="SwiftFeed" />
        <meta property="og:description" content="신속하고 간결한 뉴스 피드를 위한 플랫폼" />
        <meta property="og:image" content="https://f1lab.co.kr:444/mail_sign/no-image.jpg" />
        <meta property="og:url" content={`https://codefeat.netlify.app/feed/`} />
      </Helmet>
      <div className="News">
        <header className="top-header">
          <h2 className="top-header-h2">Works 사용자를 위한 뉴스 피드</h2>
        </header>
        <header className="top-header">
          <h3>신속하고 간결한 뉴스 피드를 위한 플랫폼</h3>
        </header>
        <main>

          {loading ? (
            <section className='loading-container'>
              <ClipLoader
                color='#f88c6b'
                loading={loading} //useState로 관리
                size={150}
              />
            </section>
          ) : (
            <>
              <section>
                <header sty>
                  <iframe src="https://coupa.ng/ceU5PI" width="100%" height="44" frameborder="0" scrolling="no" referrerpolicy="unsafe-url" browsingtopics style={{ marginTop: '5px' }}></iframe>
                </header>
                <header>
                  <h2 style={{ marginBottom: 0 }}>🔥 인기있는 뉴스</h2>
                </header>
                {newsTop.map((article, index) => (
                  <React.Fragment key={index}>
                    {index === 2 && (
                      <aside style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ins
                          className="kakao_ad_area"
                          style={{ display: 'none' }}
                          data-ad-unit="DAN-MxD0YF8EuYmDxTVN"
                          data-ad-width="300"
                          data-ad-height="250"
                        ></ins>
                      </aside>
                    )}
                    {index === 3 && (
                      <aside style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                        <iframe src="https://ads-partners.coupang.com/widgets.html?id=750690&template=carousel&trackingCode=AF6973392&subId=&width=300&height=380&tsource=" width="300" height="380" frameborder="0" scrolling="no" referrerpolicy="unsafe-url" browsingtopics></iframe>
                        <p><b>이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</b></p>
                      </aside>
                    )}
                    <aside key={index}>
                      <a style={{ color: '#000' }} href={article.NEWS_URL} target="_blank">
                        <img src={article.URL_TO_IMAGE} alt={article.URL_TO_IMAGE + index} onError={onImageError} />
                        <h3>{article.TITLE}</h3>
                        <p>{article.DESCRIPTION}</p>
                        <p><span style={{ color: '#FF7B9C' }}>{article.SOURCE_NAME}</span> {article.PUB_DATE}</p>
                      </a>
                    </aside>
                  </React.Fragment>
                ))}
              </section>
              <hr></hr>
              <section>
                <header className="news-new-header">
                  <h2>👋 지난 뉴스</h2><p>최신순</p>
                </header>
                {newsNew.map((article, index) => (
                  <React.Fragment key={index}>
                    {/* 광고를 넣을 조건을 지정 */}
                    {index === 2 && (
                      <aside style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ins
                          className="kakao_ad_area"
                          style={{ display: 'none' }}
                          data-ad-unit="DAN-IlUVPvYWrMOUwWwU"
                          data-ad-width="300"
                          data-ad-height="250"
                        ></ins>
                      </aside>
                    )}
                    {index === 7 && (
                      <aside style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ins
                          className="kakao_ad_area"
                          style={{ display: 'none' }}
                          data-ad-unit="DAN-FAPtZZdG8gm4UMF0"
                          data-ad-width="300"
                          data-ad-height="250">
                        </ins>
                      </aside>
                    )}
                    {index === 13 && (
                      <aside style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ins
                          className="kakao_ad_area"
                          style={{ display: 'none' }}
                          data-ad-unit="DAN-UaSPyesPGtlIGxj3"
                          data-ad-width="300"
                          data-ad-height="250">
                        </ins>
                      </aside>
                    )}
                    {/* {index === 23 && (
                      <aside style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ins
                          className="kakao_ad_area"
                          style={{ display: 'none' }}
                          data-ad-unit="DAN-cK1qVEbPjP4yDsor"
                          data-ad-width="250"
                          data-ad-height="250">
                        </ins>
                      </aside>
                    )} */}

                    {/* 기존의 뉴스 아이템 */}
                    <aside>
                      <a style={{ color: '#000' }} href={article.NEWS_URL} target="_blank">
                        <img src={article.URL_TO_IMAGE} alt={article.TITLE} onError={onImageError} />
                        <h3>{article.TITLE}</h3>
                        <p>{article.DESCRIPTION}</p>
                        <p className="p-source-image">
                          <img
                            className="source-iamge"
                            style={{ width: '16px', height: '16px', marginRight: '5px' }}
                            src={article.SOURCE_IMAGE}
                            alt={article.SOURCE_IMAGE}
                            onError={onImageError2}
                          />
                          {article.PUB_DATE}
                        </p>
                      </a>
                    </aside>
                  </React.Fragment>
                ))}
              </section>

            </>
          )}


        </main>
      </div >
    </>
  );
}