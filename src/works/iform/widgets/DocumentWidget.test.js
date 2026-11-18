import React from 'react';
import { render, screen } from '@testing-library/react';
import DocumentWidget from './DocumentWidget';

test('renders pledge title and clause label with document hierarchy', () => {
  render(
    <DocumentWidget
      value={
        '불법 소프트웨어 사용 금지 서약서\n\n— 다 음 —\n\n1. 정품 소프트웨어만 사용 : 승인된 프로그램만 사용하겠습니다.'
      }
      options={{
        useFirstLineAsTitle: true,
        usePledgeFormatting: true,
      }}
    />,
  );

  const title = screen.getByRole('heading', {
    level: 2,
    name: '불법 소프트웨어 사용 금지 서약서',
  });
  const clauseLabel = screen.getByText('정품 소프트웨어만 사용', {
    selector: 'strong',
  });

  expect(title.tagName).toBe('H2');
  expect(clauseLabel.tagName).toBe('STRONG');
});
