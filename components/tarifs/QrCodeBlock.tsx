'use client';

import { QRCodeSVG } from 'qrcode.react';

type Props = {
  url: string;
  size?: number;
};

export function QrCodeBlock({ url, size = 180 }: Props) {
  return (
    <div className="inline-flex flex-col items-center gap-3 p-5 rounded-3xl bg-white border-2 border-[#C9A84C]/40 shadow-xl shadow-[#C9A84C]/20">
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        bgColor="#FFFFFF"
        fgColor="#0A1434"
        marginSize={0}
      />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1434]">
        Scanner pour accéder
      </span>
    </div>
  );
}
