import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Custom React Hook for smooth GSAP staggered entrance animations.
 * @param {Object} options Configuration options
 * @param {string} options.selector CSS selector for target items (default: '.gsap-stagger-item')
 * @param {number} options.delay Initial delay in seconds (default: 0.05)
 * @param {number} options.stagger Stagger duration between items (default: 0.07)
 * @param {number} options.duration Total animation duration per item (default: 0.6)
 * @param {number} options.yOffset Starting Y offset in pixels (default: 20)
 * @param {Array} dependencies React dependency array to re-trigger animation
 * @returns {React.RefObject} Ref to attach to the container element
 */
export const useStaggerEntrance = (
  {
    selector = '.gsap-stagger-item',
    delay = 0.05,
    stagger = 0.07,
    duration = 0.6,
    yOffset = 20,
  } = {},
  dependencies = []
) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.querySelectorAll(selector);
    if (!items || items.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        {
          opacity: 0,
          y: yOffset,
        },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, dependencies);

  return containerRef;
};
