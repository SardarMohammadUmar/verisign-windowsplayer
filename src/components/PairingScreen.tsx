import React, { useEffect, useState } from 'react';
import { getBranding } from '../services/branding';
import { formatRegistrationCode } from '../utils/registrationCode';
import { SplitHeroLayout } from './SplitHeroLayout';
import './PairingScreen.css';

interface PairingScreenProps {
  screenCode: string;
}

const REGISTRATION_STEPS: { title: string; body: string }[] = [
  { title: 'STEP 1', body: 'Log in to your CMS account.' },
  { title: 'STEP 2', body: "Open the Display section in your dashboard." },
  { title: 'STEP 3', body: 'Add or pair this screen using the registration code above.' },
  { title: 'STEP 4', body: 'Follow the on-screen instructions to assign content.' },
];

export const PairingScreen: React.FC<PairingScreenProps> = ({ screenCode }) => {
  const branding = getBranding();
  const [logoFailed, setLogoFailed] = useState(false);
  const [fingerprints, setFingerprints] = useState<{ serial1: string; serial2: string } | null>(null);

  const showImageLogo = Boolean(branding.logoUrl) && !logoFailed;

  useEffect(() => {
    const load = async () => {
      try {
        if (window.electronAPI?.getPlayerFingerprints) {
          const fp = await window.electronAPI.getPlayerFingerprints();
          setFingerprints(fp);
        }
      } catch {
        setFingerprints(null);
      }
    };
    void load();
  }, []);

  const displayCode = screenCode;

  return (
    <SplitHeroLayout variant="pairing" heroImageSrc={branding.pairingHeroUrl}>
      <div className="pairing-panel">
        <div className="pairing-panel__brand" aria-hidden="true">
          {showImageLogo ? (
            <img
              className="pairing-panel__logo-img"
              src={branding.logoUrl}
              alt=""
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="pairing-panel__logo-text">{branding.logoText}</span>
          )}
          {/*<span className="pairing-panel__brand-name">{branding.appTitle}</span>*/}
        </div>

        <div className="pairing-panel__body">
          <p className="pairing-panel__kicker">Registration code</p>
          <p className="pairing-panel__code" translate="no">
            {displayCode}
          </p>
          <p className="pairing-panel__register-line">
            Register this screen at:{' '}
            <span className="pairing-panel__register-host">{branding.cmsRegisterHost}</span>
          </p>

          <div className="pairing-panel__columns">
            <div className="pairing-panel__col">
              <h2 className="pairing-panel__col-title">Registration steps</h2>
              <ul className="pairing-panel__steps">
                {REGISTRATION_STEPS.map((step) => (
                  <li key={step.title} className="pairing-panel__step">
                    <span className="pairing-panel__step-label">{step.title}</span>
                    <span className="pairing-panel__step-body">{step.body}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pairing-panel__col">
              <h2 className="pairing-panel__col-title">Tech support info</h2>
              <ul className="pairing-panel__support-list">
                <li>
                  <span className="pairing-panel__support-key">Screen ID</span>
                  <span className="pairing-panel__support-val" translate="no">
                    {screenCode}
                  </span>
                </li>
                {/*<li>*/}
                {/*  <span className="pairing-panel__support-key">Serial #1</span>*/}
                {/*  <span className="pairing-panel__support-val pairing-panel__support-val--mono" translate="no">*/}
                {/*    {fingerprints?.serial1 ?? '—'}*/}
                {/*  </span>*/}
                {/*</li>*/}
                {/*<li>*/}
                {/*  <span className="pairing-panel__support-key">Serial #2</span>*/}
                {/*  <span className="pairing-panel__support-val pairing-panel__support-val--mono" translate="no">*/}
                {/*    {fingerprints?.serial2 ?? '—'}*/}
                {/*  </span>*/}
                {/*</li>*/}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SplitHeroLayout>
  );
};
