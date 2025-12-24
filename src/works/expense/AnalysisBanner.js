import React, { useState } from 'react';

export default function AnalysisBanner({ comment, isLoading }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!comment || isLoading) return null;

  return (
    <div
      style={{
        background: '#f3f0ff',
        border: '1px solid #e5deff',
        borderRadius: '12px',
        padding: '0',
        marginBottom: '32px',
        marginTop: '24px',
        marginLeft: '-20px',
        marginRight: '-20px',
        color: '#5b4b8a',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '16px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          background: 'rgba(139, 92, 246, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 256 256"
            style={{
              color: '#7c3aed',
              flexShrink: 0,
            }}
          >
            <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z"></path>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#6d28d9',
                margin: 0,
                lineHeight: '1.4',
              }}
            >
              AI 요약
            </h4>
          </div>
        </div>
        <span
          style={{
            fontSize: '16px',
            transition: 'transform 0.3s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#7c3aed',
            flexShrink: 0,
            marginLeft: '16px',
          }}
        >
          ▼
        </span>
      </div>
      {isExpanded && (
        <div
          style={{
            padding: '20px 24px',
            fontSize: '14px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            borderTop: '1px solid rgba(139, 92, 246, 0.1)',
            color: '#5b4b8a',
          }}
          dangerouslySetInnerHTML={{ __html: comment }}
        />
      )}
    </div>
  );
}
