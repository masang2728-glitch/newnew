import { useEffect, useState } from "react";
import { TankShape } from "./BrandLogo";

// 배경 사진 자리. public/brand/ 에 사진 파일을 넣으면 그 사진을 쓰고,
// 없으면 산 능선 + 전차 실루엣 그림으로 대신한다.
export const SPLASH_PHOTO = "/brand/splash.jpg";
export const LOGIN_PHOTO = "/brand/login.jpg";

// 사진이 있다고 보고 시작한다 (불러오는 동안 대체 그림이 잠깐 비치지 않게). 실패할 때만 대체 그림으로 바꾼다.
export function usePhoto(src: string) {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  return ok;
}

// compact: 입장 화면 아래처럼 낮고 넓은 자리에 맞게 산을 낮게 눌러 그린다 (산꼭대기가 잘리지 않게).
export default function Scenery({ tank = true, compact = false }: { tank?: boolean; compact?: boolean }) {
  return (
    <svg
      className="scenery"
      viewBox={compact ? "0 100 400 120" : "0 0 400 220"}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <g transform={compact ? "translate(0 88) scale(1 0.6)" : undefined}>
      <path d="M0 120 L50 80 L95 105 L150 55 L210 100 L260 70 L320 110 L370 75 L400 95 V220 H0 Z" fill="#9AA79A" opacity="0.55" />
      <path d="M0 150 L60 115 L120 140 L190 100 L250 135 L310 112 L400 140 V220 H0 Z" fill="#6F7F68" opacity="0.75" />
      <path d="M0 175 Q100 160 200 172 T400 168 V220 H0 Z" fill="#4E5D45" />
      <path d="M0 198 Q120 188 240 196 T400 192 V220 H0 Z" fill="#3A4733" />
      </g>
      {tank && (
        <g transform="translate(150 120) scale(1.15)">
          <TankShape color="#2F3A2A" wheel="#58664F" />
        </g>
      )}
    </svg>
  );
}
