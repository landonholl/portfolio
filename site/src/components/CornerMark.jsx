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
  visible = true,
  scale = 1,
  opacity = 0.88,
  copiedMs = 1400,
  flashyMs = 260,
  className = '',
  style = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pulse, setPulse] = useState(false);

  // measured width in px (includes padding)
  const [w, setW] = useState(null);

  const timerRef = useRef(null);
  const pulseRef = useRef(null);
  const measureRef = useRef(null);

  const defaultText = useMemo(() => `© ${name} ${year}`, [name, year]);
  const copiedText = 'E-mail address copied to clipboard!';
  const currentText = copied ? copiedText : defaultText;

  // Measure the *actual rendered* text width on-device and keep updated
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const update = () => {
      // +1-2px safety for iOS rounding
      const px = Math.ceil(el.getBoundingClientRect().width) + 2;
      setW(px);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    // if fonts load after first render, re-measure
    if (document.fonts?.ready) {
      document.fonts.ready.then(update).catch(() => {});
    }

    return () => ro.disconnect();
  }, [currentText, scale]);

  const onActivate = useCallback(async () => {
    setExpanded(true);
    setPulse(true);

    if (pulseRef.current) window.clearTimeout(pulseRef.current);
    pulseRef.current = window.setTimeout(() => setPulse(false), flashyMs);

    const ok = await copyToClipboard(decodeEmail());
    setCopied(ok);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      setExpanded(false);
    }, copiedMs);
  }, [copiedMs, flashyMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (pulseRef.current) window.clearTimeout(pulseRef.current);
    };
  }, []);

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
      aria-label="Copy email address"
      style={{
        '--corner-scale': scale,
        '--corner-opacity': opacity,
        // width = measured text width + your horizontal padding (we add padding in CSS, so measure text only)
        '--corner-w': w ? `${w}px` : 'auto',
        ...style
      }}
    >
      <span className="corner-mark__label">{currentText}</span>

      {/* Hidden measurer: same font + same text, no padding */}
      <span className="corner-mark__measure" ref={measureRef} aria-hidden="true">
        {currentText}
      </span>
    </button>
  );
}
