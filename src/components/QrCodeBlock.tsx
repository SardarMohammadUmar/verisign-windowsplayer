import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import './QrCodeBlock.css';

interface QrCodeBlockProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeBlock: React.FC<QrCodeBlockProps> = ({ value, size = 112, className = '' }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!value) return null;

  return (
    <div className={`qr-code-block ${className}`.trim()} style={{ width: size, height: size }}>
      {dataUrl ? (
        <img src={dataUrl} width={size} height={size} alt="" className="qr-code-block__img" />
      ) : (
        <div className="qr-code-block__placeholder" style={{ width: size, height: size }} />
      )}
    </div>
  );
};
