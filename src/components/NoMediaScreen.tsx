import React, { useState } from 'react';
import { getBranding } from '../services/branding';
import { SplitHeroLayout } from './SplitHeroLayout';
import { QrCodeBlock } from './QrCodeBlock';
import './NoMediaScreen.css';

interface NoMediaScreenProps {
  screenCode: string;
}

export const NoMediaScreen: React.FC<NoMediaScreenProps> = ({ screenCode }) => {
  const branding = getBranding();
  const [logoFailed, setLogoFailed] = useState(false);
  const showImageLogo = Boolean(branding.logoUrl) && !logoFailed;

  return (
    <SplitHeroLayout variant="noMedia" heroImageSrc={branding.noMediaHeroUrl}>
      <div className="no-media-panel">
        <header className="no-media-panel__brand">
          {showImageLogo ? (
            <img
              className="no-media-panel__logo-img"
              src={branding.logoUrl}
              alt=""
              onError={() => setLogoFailed(true)}
            />
          ) : (
              <span className="no-media-panel__logo-mark" aria-hidden>
              {branding.logoText}
            </span>
          )}
          {/*<span className="no-media-panel__brand-text">{branding.appTitle}</span>*/}
        </header>

        <div className="no-media-panel__main">
          <h1 className="no-media-panel__title">No content assigned to player</h1>
          <p className="no-media-panel__subtitle">
            Your player is successfully registered, but no content is assigned.
          </p>
        </div>

        <footer className="no-media-panel__footer">
          <QrCodeBlock value={branding.cmsAssignUrl} size={104} />
          <div className="no-media-panel__footer-copy">
            <p className="no-media-panel__footer-question">How to assign content to your player?</p>
            <p className="no-media-panel__footer-url">{branding.assignHelpLabel}</p>
            <p className="no-media-panel__footer-id" translate="no">
              Screen: {screenCode}
            </p>
          </div>
        </footer>
      </div>
    </SplitHeroLayout>
  );
};
