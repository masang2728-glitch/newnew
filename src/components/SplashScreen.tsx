import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";
import { SPLASH_PHOTO, usePhoto } from "./Scenery";
import SplashScene from "./SplashScene";

const SHOW_MS = 2500;
const FADE_MS = 400;

// 앱에 들어올 때마다(링크·바로가기 아이콘 모두) 2.5초 보여주는 시작화면.
export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const hasPhoto = usePhoto(SPLASH_PHOTO);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), SHOW_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setVisible(false), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!visible) return null;

  return (
    <div className={`splash${leaving ? " splash-leaving" : ""}${hasPhoto ? " splash-photo" : ""}`}>
      <div className="splash-brand">
        {/* 사진 위(어두운 초록 하늘)에서는 흰 로고, 그림 배경(밝은 하늘)에서는 초록 로고 */}
        <BrandLogo size={132} color={hasPhoto ? "#fff" : undefined} outline={hasPhoto ? "#1D4934" : undefined} />
        <h1 className="splash-title">
          장비단
          <br />
          휴가관리 시스템
        </h1>
        <p className="splash-tagline">
          근무는 든든하게,
          <br />
          휴가는 편안하게
        </p>
      </div>
      {!hasPhoto && <SplashScene />}
    </div>
  );
}
