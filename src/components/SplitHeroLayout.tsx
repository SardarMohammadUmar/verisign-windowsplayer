import React from 'react';
import './SplitHeroLayout.css';

interface SplitHeroLayoutProps {
  /** `pairing`: ~50/50; `noMedia`: ~40/60 info vs hero */
  variant: 'pairing' | 'noMedia';
  heroImageSrc: string;
  children: React.ReactNode;
}

export const SplitHeroLayout: React.FC<SplitHeroLayoutProps> = ({
  variant,
  heroImageSrc,
  children,
}) => {
  return (
    <div className={`split-hero split-hero--${variant}`}>
      <div className="split-hero__left">{children}</div>
      <div className="split-hero__right" aria-hidden>
        <img
          className="split-hero__image"
          src={heroImageSrc}
          alt=""
          decoding="async"
        />
      </div>
    </div>
  );
};
