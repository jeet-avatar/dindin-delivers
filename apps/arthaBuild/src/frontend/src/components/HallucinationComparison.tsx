import React, { useState, useEffect, useRef, useCallback } from 'react';

type Segment = { text: string; wrong?: boolean };

type Example = {
  question: string;
  gptSegments: Segment[];
  gptBadge: string;
  arthaBuildAnswer: string;
  arthaBuildSource: string;
};

const EXAMPLES: Example[] = [
  {
    question: 'How do I count line items on a Sales Order in SuiteScript 2.0?',
    gptSegments: [
      { text: 'var count = ' },
      { text: 'nlapiGetLineItemCount', wrong: true },
      { text: '(', wrong: true },
      { text: 'record', wrong: true },
      { text: ", 'item');", wrong: true },
    ],
    gptBadge: '⚠️ SS1.0 API — throws at runtime in SS2.0',
    arthaBuildAnswer: "const count = currentRecord.getLineCount({ sublistId: 'item' });",
    arthaBuildSource: '📄 N/currentRecord module · SuiteScript 2.0 API Docs',
  },
  {
    question: 'How do I send an email from a scheduled SuiteScript?',
    gptSegments: [
      { text: "require(['" },
      { text: 'N/smtp', wrong: true },
      { text: "', 'N/record'], function(smtp, record) {" },
    ],
    gptBadge: "⚠️ N/smtp doesn't exist — will fail to load",
    arthaBuildAnswer: "define(['N/email', 'N/record'], function(email, record) { email.send({...",
    arthaBuildSource: '📄 N/email module · NetSuite Help Center',
  },
  {
    question: "What field holds the customer's PO number on a Sales Order?",
    gptSegments: [
      { text: 'Use the ' },
      { text: 'custbody_po_number', wrong: true },
      { text: ' custom field — this is standard on all Sales Orders.' },
    ],
    gptBadge: "⚠️ custbody_ fields are account-specific, not standard",
    arthaBuildAnswer:
      "The standard field is otherrefnum (labeled 'PO #'). Run record.getValue({ fieldId: 'otherrefnum' }).",
    arthaBuildSource: '📄 Transaction Body Fields · NetSuite Records Browser',
  },
];

type Phase = 'typing' | 'highlight' | 'done';

export default function HallucinationComparison(): JSX.Element {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [charIdx, setCharIdx] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (advanceRef.current !== null) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, []);

  // Resize listener for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main animation driver
  useEffect(() => {
    clearAll();
    setCharIdx(0);
    setPhase('typing');
  }, [activeIdx, clearAll]);

  useEffect(() => {
    if (phase !== 'typing') return;

    const example = EXAMPLES[activeIdx];
    const gptFull = example.gptSegments.map((s) => s.text).join('');
    const total = gptFull.length + example.arthaBuildAnswer.length;

    intervalRef.current = setInterval(() => {
      setCharIdx((prev) => {
        if (prev >= total) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          timeoutRef.current = setTimeout(() => {
            setPhase('highlight');
          }, 200);
          return prev;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, activeIdx]);

  useEffect(() => {
    if (phase !== 'highlight') return;

    timeoutRef.current = setTimeout(() => {
      setPhase('done');
    }, 400);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done') return;

    advanceRef.current = setTimeout(() => {
      setActiveIdx((i) => (i + 1) % 3);
    }, 9000);

    return () => {
      if (advanceRef.current !== null) {
        clearTimeout(advanceRef.current);
        advanceRef.current = null;
      }
    };
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  const example = EXAMPLES[activeIdx];
  const gptFull = example.gptSegments.map((s) => s.text).join('');
  const total = gptFull.length + example.arthaBuildAnswer.length;

  const gptChars = Math.min(charIdx, gptFull.length);
  const arthaChars = Math.max(0, charIdx - gptFull.length);
  const isTypingDone = charIdx >= total;

  // Render GPT panel content
  const renderGptContent = (): JSX.Element => {
    if (phase === 'typing' && !isTypingDone) {
      // Plain text until typing completes
      return (
        <span style={{ color: '#e4e4e7' }}>{gptFull.slice(0, gptChars)}</span>
      );
    }
    // Segment rendering with highlights
    return (
      <>
        {example.gptSegments.map((seg, i) => {
          if (seg.wrong && (phase === 'highlight' || phase === 'done')) {
            return (
              <span
                key={i}
                style={{
                  background: 'rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                  borderRadius: '3px',
                  padding: '1px 2px',
                  transition: 'all 0.4s ease',
                }}
              >
                {seg.text}
              </span>
            );
          }
          return (
            <span key={i} style={{ color: '#e4e4e7' }}>
              {seg.text}
            </span>
          );
        })}
      </>
    );
  };

  const badgeVisible = phase !== 'typing' || isTypingDone;

  const handleDotClick = (idx: number) => {
    clearAll();
    setActiveIdx(idx);
  };

  return (
    <div style={{ position: 'relative', zIndex: 10, padding: '100px 24px' }}>
      {/* Section tag */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <span className="l-section-tag">ChatGPT vs ArthaBuild</span>
      </div>

      {/* Title */}
      <h2
        className="l-section-title"
        style={{ textAlign: 'center', marginBottom: '16px' }}
      >
        When Accuracy Matters.{' '}
        <span style={{ color: '#6366f1' }}>See the Difference.</span>
      </h2>

      {/* Subtitle */}
      <p
        style={{
          color: '#A1A1AA',
          fontSize: '16px',
          maxWidth: '580px',
          margin: '0 auto 48px',
          textAlign: 'center',
          lineHeight: 1.7,
        }}
      >
        ChatGPT guesses NetSuite APIs from general knowledge.
        ArthaBuild is grounded in official SuiteScript 2.0 docs, the NetSuite Records Browser, and Help Center — and gets it right.
      </p>

      {/* Question */}
      <div
        style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '12px',
          padding: '12px 20px',
          color: '#a5b4fc',
          fontSize: '14px',
          marginBottom: '20px',
          maxWidth: '900px',
          margin: '0 auto 20px',
        }}
      >
        <strong style={{ color: '#6366f1' }}>Q:</strong> {example.question}
      </div>

      {/* Side-by-side panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        {/* ChatGPT panel */}
        <div
          style={{
            background: 'rgba(15,15,25,0.9)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: '13px',
              color: '#71717a',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: '#ef4444', fontSize: '10px' }}>●</span>
            ChatGPT
          </div>

          {/* Code block */}
          <div
            style={{
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: '13px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '10px',
              padding: '16px',
              minHeight: '56px',
              lineHeight: 1.7,
              wordBreak: 'break-all',
            }}
          >
            {renderGptContent()}
            {phase === 'typing' && gptChars < gptFull.length && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '14px',
                  background: '#6366f1',
                  marginLeft: '1px',
                  animation: 'none',
                  verticalAlign: 'middle',
                }}
              />
            )}
          </div>

          {/* Warning badge */}
          <div
            style={{
              marginTop: '16px',
              opacity: badgeVisible ? 1 : 0,
              transition: 'opacity 0.4s',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#fca5a5',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {example.gptBadge}
          </div>
        </div>

        {/* ArthaBuild panel */}
        <div
          style={{
            background: 'rgba(15,15,25,0.9)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: '13px',
              color: '#a5b4fc',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: '#6366f1', fontSize: '10px' }}>●</span>
            ArthaBuild
          </div>

          {/* Code block */}
          <div
            style={{
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: '13px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '10px',
              padding: '16px',
              minHeight: '56px',
              color: '#a5b4fc',
              lineHeight: 1.7,
              wordBreak: 'break-all',
            }}
          >
            {example.arthaBuildAnswer.slice(0, arthaChars)}
            {arthaChars < example.arthaBuildAnswer.length && arthaChars > 0 && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '14px',
                  background: '#6366f1',
                  marginLeft: '1px',
                  verticalAlign: 'middle',
                }}
              />
            )}
          </div>

          {/* Source badge */}
          <div
            style={{
              marginTop: '16px',
              opacity: badgeVisible ? 1 : 0,
              transition: 'opacity 0.4s',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#a5b4fc',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {example.arthaBuildSource}
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '28px',
        }}
      >
        {EXAMPLES.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i === activeIdx ? '#6366f1' : 'rgba(99,102,241,0.3)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.3s',
            }}
            aria-label={`Example ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
