import React, { useMemo } from 'react';
import styles from './DocumentWidget.module.css';

export default function DocumentWidget(props) {
  const { value, options } = props;
  const text = value || '';
  const hideTitle = options?.hideTitle;

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

  return (
    <div className={styles.wrapper}>
      {!hideTitle && title ? <div className={styles.title}>{title}</div> : null}
      <div className={styles.body}>{body}</div>
    </div>
  );
}
