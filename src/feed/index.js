import styles from './index.module.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async'; // 추가

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Feed() {
  const [newsTop, setNewsTop] = useState([]);
  const [newsNew, setNewsNew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setError] = useState(null);

  useEffect(() => {
    const fetchNews = async (items) => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/jvWorksGetNewsDesc?factoryCode=000001&userId=`,
        );

        setNewsNew(response.data.data);
        setNewsTop(items);
        setLoading(false);

        const script = document.createElement('script');
        script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
        script.async = true;
        document.body.appendChild(script);
      } catch (error) {
        setError('Error fetching news data.');
      } finally {
      }
    };

    const fetchNewsTop = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/jvWorksGetNewsTop?factoryCode=000001&userId=`,
        );

        fetchNews(response.data.data);
      } catch (error) {
        setError('Error fetching news data.');
      } finally {
      }
    };

    fetchNewsTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onImageError = (e) => {
    e.target.src =
      'https://f1lab.co.kr:444/wf_ftp/image/news/default-news' +
      getRandomNumber() +
      '.jpg';
  };

  const onImageError2 = (e) => {
    e.target.src = 'https://f1lab.co.kr:444/wf_ftp/image/news/internet.png';
  };

  function getRandomNumber() {
    return Math.floor(Math.random() * 11) + 1; // Generates a random number between 1 and 10
  }

  return (
    <>
      <Helmet>
        <title>SwiftFeed</title>
        <meta property="og:title" content="SwiftFeed" />
        <meta
          property="og:description"
          content="신속하고 간결한 뉴스 피드를 위한 플랫폼"
        />
        <meta property="og:url" content={`https://f1works.netlify.app/feed/`} />
      </Helmet>
      <div className={styles.feedShell}>
        <div className={styles.feedContent}>
          <header className={styles.feedHeader}>
            <h1 className={styles.feedTitle}>SwiftFeed</h1>
            <p className={styles.feedSubtitle}>
              Works 사용자를 위한 신속하고 간결한 뉴스 피드
            </p>
          </header>

          {loading ? (
            <section className={styles.loadingContainer}>
              <div
                className={styles.loadingBar}
                role="status"
                aria-label="로딩 중"
              >
                <div className={styles.loadingBarIndicator} />
              </div>
            </section>
          ) : (
            <>
              <section className={styles.feedSection}>
                <div className={styles.sectionHeader}>
                  <iframe
                    title="쿠팡 광고"
                    src="https://coupa.ng/ceU5PI"
                    width="100%"
                    height="44"
                    frameBorder="0"
                    scrolling="no"
                    referrerPolicy="unsafe-url"
                    browsingtopics="true"
                  ></iframe>
                </div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    🔥 인기있는 뉴스
                    <span className={styles.sectionBadge}>TOP</span>
                  </h2>
                </div>

                <div className={styles.newsGrid}>
                  {newsTop.map((article, index) => (
                    <React.Fragment key={index}>
                      <article className={styles.newsCard}>
                        <a
                          href={article.NEWS_URL}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className={styles.newsImageWrapper}>
                            <img
                              className={styles.newsImage}
                              src={article.URL_TO_IMAGE}
                              alt={article.TITLE}
                              onError={onImageError}
                            />
                          </div>
                          <div className={styles.newsCardContent}>
                            <h3 className={styles.newsTitle}>
                              {article.TITLE}
                            </h3>
                            <p className={styles.newsDescription}>
                              {article.DESCRIPTION}
                            </p>
                            <div className={styles.newsMeta}>
                              <span className={styles.newsSource}>
                                {article.SOURCE_NAME}
                              </span>
                              <span>•</span>
                              <span>{article.PUB_DATE}</span>
                            </div>
                          </div>
                        </a>
                      </article>
                      {index === 2 && (
                        <div className={styles.adCard}>
                          <ins
                            className="kakao_ad_area"
                            style={{ display: 'none' }}
                            data-ad-unit="DAN-ITI6ZePdGfzHjQHV"
                            data-ad-width="300"
                            data-ad-height="250"
                          ></ins>
                        </div>
                      )}
                      {index === 3 && (
                        <div className={styles.adCard}>
                          <iframe
                            title="쿠팡 파트너스 광고"
                            src="https://ads-partners.coupang.com/widgets.html?id=750690&template=carousel&trackingCode=AF6973392&subId=&width=300&height=380&tsource="
                            width="300"
                            height="380"
                            frameBorder="0"
                            scrolling="no"
                            referrerPolicy="unsafe-url"
                            browsingtopics="true"
                          ></iframe>
                          <p className={styles.adDisclaimer}>
                            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른
                            일정액의 수수료를 제공받습니다.
                          </p>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <hr className={styles.sectionDivider}></hr>

              <section className={styles.feedSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    👋 지난 뉴스
                    <span className={styles.sectionBadge}>최신순</span>
                  </h2>
                </div>

                <div className={styles.newsGrid}>
                  {newsNew.map((article, index) => (
                    <React.Fragment key={index}>
                      <article className={styles.newsCard}>
                        <a
                          href={article.NEWS_URL}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className={styles.newsImageWrapper}>
                            <img
                              className={styles.newsImage}
                              src={article.URL_TO_IMAGE}
                              alt={article.TITLE}
                              onError={onImageError}
                            />
                          </div>
                          <div className={styles.newsCardContent}>
                            <h3 className={styles.newsTitle}>
                              {article.TITLE}
                            </h3>
                            <p className={styles.newsDescription}>
                              {article.DESCRIPTION}
                            </p>
                            <div className={styles.newsMeta}>
                              <img
                                className={styles.newsSourceImage}
                                src={article.SOURCE_IMAGE}
                                alt={article.SOURCE_NAME}
                                onError={onImageError2}
                              />
                              <span>{article.PUB_DATE}</span>
                            </div>
                          </div>
                        </a>
                      </article>
                      {index === 2 && (
                        <div className={styles.adCard}>
                          <ins
                            className="kakao_ad_area"
                            style={{ display: 'none' }}
                            data-ad-unit="DAN-FLU5qpufVDBsq21A"
                            data-ad-width="300"
                            data-ad-height="250"
                          ></ins>
                        </div>
                      )}
                      {index === 7 && (
                        <div className={styles.adCard}>
                          <ins
                            className="kakao_ad_area"
                            style={{ display: 'none' }}
                            data-ad-unit="DAN-7rRSYvXdxSKsIlRm"
                            data-ad-width="300"
                            data-ad-height="250"
                          ></ins>
                        </div>
                      )}
                      {index === 13 && (
                        <div className={styles.adCard}>
                          <ins
                            className="kakao_ad_area"
                            style={{ display: 'none' }}
                            data-ad-unit="DAN-Qd9oIvXE3KbWuPVi"
                            data-ad-width="300"
                            data-ad-height="250"
                          ></ins>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
