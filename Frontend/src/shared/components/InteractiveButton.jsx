import React, { useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';

/**
 * InteractiveButton Component
 * Features:
 * - Magnetic pull & 3D tilt tracking with GSAP spring physics
 * - Dynamic cursor spotlight reflection (--mouse-x, --mouse-y)
 * - Holographic border shimmer / luminous neon glow
 * - Elastic icon micro-animations & click ripple
 */
export const InteractiveButton = ({
  to,
  onClick,
  variant = 'primary',
  icon,
  children,
  className = '',
  ...props
}) => {
  const buttonRef = useRef(null);
  const glowRef = useRef(null);
  const iconRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = buttonRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Center coordinates for magnetic tilt
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;

    // Set CSS variables for radial cursor spotlight
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    // Magnetic pull and 3D tilt with GSAP
    gsap.to(el, {
      x: deltaX * 8,
      y: deltaY * 8,
      rotateX: -deltaY * 10,
      rotateY: deltaX * 10,
      duration: 0.3,
      ease: 'power2.out',
      transformPerspective: 600,
    });

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        x: deltaX * 4,
        y: deltaY * 4,
        duration: 0.25,
        ease: 'power2.out',
      });
    }
  };

  const handleMouseLeave = () => {
    const el = buttonRef.current;
    if (!el) return;

    // Elastic snap back to origin
    gsap.to(el, {
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      duration: 0.7,
      ease: 'elastic.out(1.1, 0.4)',
    });

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1.1, 0.4)',
      });
    }
  };

  const handleMouseDown = (e) => {
    const el = buttonRef.current;
    if (!el) return;

    // Create subtle tactile press
    gsap.to(el, {
      scale: 0.94,
      duration: 0.12,
      ease: 'power2.inOut',
    });
  };

  const handleMouseUp = () => {
    const el = buttonRef.current;
    if (!el) return;

    gsap.to(el, {
      scale: 1,
      duration: 0.4,
      ease: 'elastic.out(1.2, 0.5)',
    });
  };

  const content = (
    <>
      <span className="df-btn-interactive__spotlight" ref={glowRef} />
      <span className="df-btn-interactive__shimmer" />
      <span className="df-btn-interactive__inner">
        {icon && (
          <span className="df-btn-interactive__icon" ref={iconRef}>
            {icon}
          </span>
        )}
        <span className="df-btn-interactive__label">{children}</span>
      </span>
      <span className="df-btn-interactive__border-glow" />
    </>
  );

  const combinedClasses = `df-btn-interactive df-btn-interactive--${variant} ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        ref={buttonRef}
        className={combinedClasses}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      ref={buttonRef}
      className={combinedClasses}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {content}
    </button>
  );
};

export default InteractiveButton;
