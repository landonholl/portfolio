import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './CornerMark.css';

function decodeEmail() {
  const codes = [108,97,110,100,111,110,46,109,46,104,111,108,108,97,110,100,64,103,109,97,105,108,46,99,111,109];
  return String.fromCharCode(...codes);
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
}

export default function CornerMark({
  name = 'Landon Holland',
  year = new Date().getFullYear(),
  scale = 1,
  opacity = 0.88,
  visible = true,
  className = '',
  style = {},
  copiedMs = 1400,
  flashyMs = 260,
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef(null);
  const pulseRef = useRef(null);

  const defaultText = useMemo(() => `© ${name} ${year}`, [name, year]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (pulseRef.current) window.clearTimeout(pulseRef.current);
    };
  }, []);

  const onActivate = useCallback(async () => {
    setExpanded(true);
    setPulse(true);

    if (pulseRef.current) window.clearTimeout(pulseRef.current);
    pulseRef.current = window.setTimeout(() => setPulse(false), flashyMs);

    const email = decodeEmail();
    const ok = await copyToClipboard(email);

    setCopied(ok);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      setExpanded(false);
    }, copiedMs);
  }, [copiedMs, flashyMs]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  }, [onActivate]);

  return (
    <button
      type="button"
      className={[
        'corner-mark',
        visible ? 'is-visible' : '',
        expanded ? 'is-expanded' : '',
        copied ? 'is-copied' : '',
        pulse ? 'is-pulse' : '',
        className
      ].join(' ')}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      aria-label="Copy email address"
      style={{
        '--corner-scale': scale,
        '--corner-opacity': opacity,
        ...style
      }}
    >
    <span className="corner-mark__label" style={{ display: 'block' }}>
     {copied ? 'Email address copied!' : defaultText}
    </span>
    </button>
  );
}
