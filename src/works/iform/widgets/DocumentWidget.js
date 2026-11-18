import React, { useMemo } from 'react';
import styles from './DocumentWidget.module.css';

export default function DocumentWidget(props) {
  const { value, options } = props;
  const text = value || '';
  const hideTitle = options?.hideTitle;
  const usePledgeFormatting = options?.usePledgeFormatting;

  const { title, body } = useMemo(() => {
    const useFirstLineAsTitle = options?.useFirstLineAsTitle;
    let docTitle = options?.title;
    let docBody = text;

    if (useFirstLineAsTitle) {
      const lines = text.split('\n');
      if (!docTitle && lines.length > 0) {
        docTitle = lines[0].trim();
      }
      docBody = lines.slice(1).join('\n');
      docBody = docBody.replace(/^\s*\n+/, '');
    }

    return { title: docTitle, body: docBody };
  }, [text, options]);

  if (usePledgeFormatting) {
    return (
      <div className={`${styles.wrapper} ${styles.pledgeWrapper}`}>
        {!hideTitle && title ? (
          <h2 className={styles.pledgeTitle}>{title}</h2>
        ) : null}
        <div className={styles.pledgeBody}>
          {body.split('\n').map((line, index) => {
            const content = line.trim();
            if (!content) {
              return (
                <div
                  key={`spacer-${index}`}
                  className={styles.pledgeSpacer}
                  aria-hidden="true"
                />
              );
            }

            if (content === '— 다 음 —') {
              return (
                <p key={index} className={styles.pledgeSectionTitle}>
                  {content}
                </p>
              );
            }

            const clause = content.match(/^(\d+\.)\s*(.*?)\s*:\s*(.*)$/);
            if (clause) {
              return (
                <p key={index} className={styles.pledgeClause}>
                  <span>{clause[1]}</span>
                  <span>
                    <strong>{clause[2]}</strong> : {clause[3]}
                  </span>
                </p>
              );
            }

            return (
              <p
                key={index}
                className={
                  content.startsWith('에프원소프트')
                    ? styles.pledgeRecipient
                    : styles.pledgeParagraph
                }
              >
                {content}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {!hideTitle && title ? <div className={styles.title}>{title}</div> : null}
      <div className={styles.body}>{body}</div>
    </div>
  );
}
