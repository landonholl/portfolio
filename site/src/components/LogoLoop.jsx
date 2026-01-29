import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import './LogoLoop.css';
import GlassSurface from './GlassSurface';

const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };

const toCssLength = (value) => (typeof value === 'number' ? `${value}px` : (value ?? undefined));

const useResizeObserver = (callback, elements, dependencies) => {
  useEffect(() => {
    if (!window.ResizeObserver) {
      const handleResize = () => callback();
      window.addEventListener('resize', handleResize);
      callback();
      return () => window.removeEventListener('resize', handleResize);
    }

    const observers = elements.map((ref) => {
      if (!ref.current) return null;
      const observer = new ResizeObserver(callback);
      observer.observe(ref.current);
      return observer;
    });

    callback();
    return () => observers.forEach((o) => o?.disconnect());
  }, [callback, elements, dependencies]);
};

const useImageLoader = (seqRef, onLoad, dependencies) => {
  useEffect(() => {
    const images = seqRef.current?.querySelectorAll('img') ?? [];
    if (images.length === 0) {
      onLoad();
      return;
    }

    let remaining = images.length;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) onLoad();
    };

    images.forEach((img) => {
      const htmlImg = img;
      if (htmlImg.complete) done();
      else {
        htmlImg.addEventListener('load', done, { once: true });
        htmlImg.addEventListener('error', done, { once: true });
      }
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
      });
    };
  }, [onLoad, seqRef, dependencies]);
};

/**
 * Animation loop now uses externally-provided offset/velocity refs,
 * so pointer-drag can control the infinite loop while keeping wraparound.
 */
const useAnimationLoop = (
  trackRef,
  targetVelocity,
  seqWidth,
  seqHeight,
  isHovered,
  hoverSpeed,
  isVertical,
  offsetRef,
  velocityRef,
  draggingRef
) => {
  const rafRef = useRef(null);
  const lastTimestampRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const seqSize = isVertical ? seqHeight : seqWidth;

    const applyTransform = () => {
      if (seqSize <= 0) return;

      // keep offset in [0, seqSize)
      offsetRef.current = ((offsetRef.current % seqSize) + seqSize) % seqSize;

      const t = isVertical
        ? `translate3d(0, ${-offsetRef.current}px, 0)`
        : `translate3d(${-offsetRef.current}px, 0, 0)`;
      track.style.transform = t;
    };

    // initial paint
    applyTransform();

    const animate = (timestamp) => {
      if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;

      const dt = Math.max(0, timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      // While dragging, we DON'T advance offset by velocity.
      // Drag handlers are directly updating offsetRef.
      if (!draggingRef.current) {
        const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;

        const easing = 1 - Math.exp(-dt / ANIMATION_CONFIG.SMOOTH_TAU);
        velocityRef.current += (target - velocityRef.current) * easing;

        if (seqSize > 0) {
          offsetRef.current = offsetRef.current + velocityRef.current * dt;
        }
      }

      applyTransform();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimestampRef.current = null;
    };
  }, [
    trackRef,
    targetVelocity,
    seqWidth,
    seqHeight,
    isHovered,
    hoverSpeed,
    isVertical,
    offsetRef,
    velocityRef,
    draggingRef
  ]);
};

export const LogoLoop = memo(
  ({
    logos,
    speed = 120,
    direction = 'left',
    width = '100%',
    logoHeight = 28,
    gap = 32,
    pauseOnHover,
    hoverSpeed,
    fadeOut = false,
    fadeOutColor,
    scaleOnHover = false,
    renderItem,
    ariaLabel = 'Partner logos',
    className,
    style,
    swipe = 'auto' // true/false/"auto"
  }) => {
    const containerRef = useRef(null);
    const trackRef = useRef(null);
    const seqRef = useRef(null);

    const [seqWidth, setSeqWidth] = useState(0);
    const [seqHeight, setSeqHeight] = useState(0);
    const [copyCount, setCopyCount] = useState(1);
    const [isHovered, setIsHovered] = useState(false);

    // shared motion refs (drag + loop)
    const offsetRef = useRef(0);
    const velocityRef = useRef(0);
    const draggingRef = useRef(false);

    const effectiveHoverSpeed = useMemo(() => {
      if (hoverSpeed !== undefined) return hoverSpeed;
      if (pauseOnHover === true) return 0;
      if (pauseOnHover === false) return undefined;
      return 0;
    }, [hoverSpeed, pauseOnHover]);

    const isVertical = direction === 'up' || direction === 'down';

    const isSwipe = useMemo(() => {
      if (swipe === true) return true;
      if (swipe === false) return false;
      return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    }, [swipe]);

    const targetVelocity = useMemo(() => {
      const magnitude = Math.abs(speed);
      let dirMul;
      if (isVertical) dirMul = direction === 'up' ? 1 : -1;
      else dirMul = direction === 'left' ? 1 : -1;
      const speedMul = speed < 0 ? -1 : 1;
      return magnitude * dirMul * speedMul;
    }, [speed, direction, isVertical]);

    const updateDimensions = useCallback(() => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const rect = seqRef.current?.getBoundingClientRect?.();
      const sequenceWidth = rect?.width ?? 0;
      const sequenceHeight = rect?.height ?? 0;

      if (isVertical) {
        const parentHeight = containerRef.current?.parentElement?.clientHeight ?? 0;
        if (containerRef.current && parentHeight > 0) {
          const targetH = Math.ceil(parentHeight);
          if (containerRef.current.style.height !== `${targetH}px`) {
            containerRef.current.style.height = `${targetH}px`;
          }
        }

        if (sequenceHeight > 0) {
          setSeqHeight(Math.ceil(sequenceHeight));
          const viewport = containerRef.current?.clientHeight ?? parentHeight ?? sequenceHeight;
          const copiesNeeded = Math.ceil(viewport / sequenceHeight) + ANIMATION_CONFIG.COPY_HEADROOM;
          setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
        }
      } else if (sequenceWidth > 0) {
        setSeqWidth(Math.ceil(sequenceWidth));
        const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
        setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
      }
    }, [isVertical]);

    useResizeObserver(updateDimensions, [containerRef, seqRef], [logos, gap, logoHeight, isVertical]);
    useImageLoader(seqRef, updateDimensions, [logos, gap, logoHeight, isVertical]);

    // infinite loop animation always on (drag just takes control of offsetRef)
    useAnimationLoop(
      trackRef,
      targetVelocity,
      seqWidth,
      seqHeight,
      isHovered,
      effectiveHoverSpeed,
      isVertical,
      offsetRef,
      velocityRef,
      draggingRef
    );

    // Pointer-drag that still preserves infinite loop (updates offsetRef)
    useEffect(() => {
      if (!isSwipe) return;

      const el = containerRef.current;
      if (!el) return;

      const DRAG_THRESHOLD = 6; // px

      let activePointerId = null;
      let startAxis = 0;
      let startOffset = 0;

      let lastAxis = 0;
      let lastT = 0;
      let lastVel = 0;

      let didDrag = false;
      let startedOnLink = false;

      const axisOf = (e) => (isVertical ? e.clientY : e.clientX);

      const onDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        activePointerId = e.pointerId;

        startAxis = axisOf(e);
        startOffset = offsetRef.current;

        lastAxis = startAxis;
        lastT = performance.now();
        lastVel = 0;

        didDrag = false;
        startedOnLink = !!e.target?.closest?.('a.logoloop__link');

        // Do NOT capture / do NOT set draggingRef yet.
      };

      const onMove = (e) => {
        if (activePointerId === null || e.pointerId !== activePointerId) return;

        const axis = axisOf(e);
        const delta = axis - startAxis;

        if (!didDrag) {
          if (Math.abs(delta) < DRAG_THRESHOLD) return;

          didDrag = true;

          el.setPointerCapture?.(activePointerId);
          draggingRef.current = true;
          el.classList.add('logoloop--dragging');

          // stop auto easing while user grabs
          velocityRef.current = 0;
        }

        offsetRef.current = startOffset - delta;

        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        lastVel = ((axis - lastAxis) / dt) * 1000;
        lastAxis = axis;
        lastT = now;

        // Once we are actually dragging, prevent default so it doesn't scroll/click.
        e.preventDefault?.();
      };

      const end = (e) => {
        if (activePointerId === null || e.pointerId !== activePointerId) return;

        if (didDrag) {
          el.releasePointerCapture?.(activePointerId);

          draggingRef.current = false;
          el.classList.remove('logoloop--dragging');

          const momentum = Math.max(-1400, Math.min(1400, -lastVel));
          velocityRef.current = momentum;
        }

        activePointerId = null;
        didDrag = false;
        startedOnLink = false;
      };

      // This cancels the click ONLY when a drag happened (so links still work on tap/click).
      const onClickCapture = (e) => {
        if (!draggingRef.current && !didDrag) return;
        e.preventDefault();
        e.stopPropagation();
      };

      el.addEventListener('pointerdown', onDown, { passive: false });
      el.addEventListener('pointermove', onMove, { passive: false });
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);

      // capture clicks so we can suppress navigation after a drag
      el.addEventListener('click', onClickCapture, true);

      return () => {
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', end);
        el.removeEventListener('pointercancel', end);
        el.removeEventListener('click', onClickCapture, true);
      };
    }, [isSwipe, isVertical]);


    const cssVariables = useMemo(
      () => ({
        '--logoloop-gap': `${gap}px`,
        '--logoloop-logoHeight': `${logoHeight}px`,
        ...(fadeOutColor && { '--logoloop-fadeColor': fadeOutColor })
      }),
      [gap, logoHeight, fadeOutColor]
    );

    const rootClassName = useMemo(
      () =>
        [
          'logoloop',
          isVertical ? 'logoloop--vertical' : 'logoloop--horizontal',
          fadeOut && 'logoloop--fade',
          scaleOnHover && 'logoloop--scale-hover',
          isSwipe && 'logoloop--swipe',
          className
        ]
          .filter(Boolean)
          .join(' '),
      [isVertical, fadeOut, scaleOnHover, isSwipe, className]
    );

    const handleMouseEnter = useCallback(() => {
      if (effectiveHoverSpeed !== undefined) setIsHovered(true);
    }, [effectiveHoverSpeed]);

    const handleMouseLeave = useCallback(() => {
      if (effectiveHoverSpeed !== undefined) setIsHovered(false);
    }, [effectiveHoverSpeed]);

    const renderLogoItem = useCallback(
      (item, key) => {
        if (renderItem) {
          return (
            <li className="logoloop__item" key={key} role="listitem">
              {renderItem(item, key)}
            </li>
          );
        }

        const isNodeItem = 'node' in item;

        const content = isNodeItem ? (
          <span className="logoloop__node" aria-hidden={!!item.href && !item.ariaLabel}>
            {item.node}
          </span>
        ) : (
          <img
            src={item.src}
            srcSet={item.srcSet}
            sizes={item.sizes}
            width={item.width}
            height={item.height}
            alt={item.alt ?? ''}
            title={item.title}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        );

        const itemAriaLabel = isNodeItem ? (item.ariaLabel ?? item.title) : (item.alt ?? item.title);

        const itemContent = item.href ? (
          <a
            className="logoloop__link"
            href={item.href}
            aria-label={itemAriaLabel || 'logo link'}
            target="_blank"
            rel="noreferrer noopener"
            download={item.download ? (item.downloadName ?? '') : undefined}
            draggable={false}
          >
            {content}
          </a>
        ) : (
          content
        );

      return (
        <li className="logoloop__item" key={key} role="listitem">
          <GlassSurface
            className="logoloop__chipGlass"
            width="var(--logoloop-chipSize)"
            height="var(--logoloop-chipSize)"
            borderRadius={999}
            backgroundOpacity={0.10}
            blur={8}
            saturation={1.1}
            displace={0.18}
            style={{ display: 'inline-flex' }}
          >
            <div className="logoloop__chipInner">
              {itemContent}
            </div>
          </GlassSurface>
        </li>
      );

      },
      [renderItem]
    );

    const logoLists = useMemo(
      () =>
        Array.from({ length: copyCount }, (_, copyIndex) => (
          <ul
            className="logoloop__list"
            key={`copy-${copyIndex}`}
            role="list"
            aria-hidden={copyIndex > 0}
            ref={copyIndex === 0 ? seqRef : undefined}
          >
            {logos.map((item, itemIndex) => renderLogoItem(item, `${copyIndex}-${itemIndex}`))}
          </ul>
        )),
      [copyCount, logos, renderLogoItem]
    );

    const containerStyle = useMemo(
      () => ({
        width: isVertical
          ? toCssLength(width) === '100%'
            ? undefined
            : toCssLength(width)
          : (toCssLength(width) ?? '100%'),
        ...cssVariables,
        ...style,
        // allow page scroll in the opposite axis while still supporting drag
        touchAction: isVertical ? 'pan-x' : 'pan-y',
        cursor: isSwipe ? 'grab' : undefined
      }),
      [width, cssVariables, style, isVertical, isSwipe]
    );

    return (
      <div
        ref={containerRef}
        className={rootClassName}
        style={containerStyle}
        role="region"
        aria-label={ariaLabel}
      >
        <div
          className="logoloop__track"
          ref={trackRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {logoLists}
        </div>
      </div>
    );

  }
);

LogoLoop.displayName = 'LogoLoop';
export default LogoLoop;
