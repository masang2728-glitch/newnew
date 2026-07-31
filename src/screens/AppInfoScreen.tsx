import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToFeedback, createFeedback, type FeedbackPost } from "../api/feedback";
import { APP_CREATED_AT, APP_AUTHOR } from "../constants";

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AppInfoScreen() {
  const { userName, teamName } = useSession();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToFeedback(setPosts, () =>
      toast.error("요청사항을 불러오지 못했습니다.")
    );
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createFeedback(userName ?? "익명", teamName, content.trim());
      toast.success("등록되었습니다.");
      setContent("");
    } catch {
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: "#1e293b" }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">앱 정보</h1>
            <div className="request-user">휴가/야근 신청 캘린더</div>
          </div>
          <button type="button" className="request-back" onClick={() => navigate("/main")}>
            메인으로 돌아가기 ›
          </button>
        </div>
      </div>

      <div className="content">
        <div className="info-box">
          <div className="info-row">
            <span className="info-label">생성일</span>
            <span className="info-value">{APP_CREATED_AT}</span>
          </div>
          <div className="info-row">
            <span className="info-label">제작자</span>
            <span className="info-value">{APP_AUTHOR}</span>
          </div>
        </div>

        <div className="section-title">요청사항 게시판</div>
        <p className="empty-text" style={{ marginBottom: 16 }}>
          기능 추가/수정 요청이나 버그를 자유롭게 남겨주세요.
        </p>

        <textarea
          className="text-field feedback-textarea"
          placeholder="요청사항을 입력해주세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <button
          type="button"
          className="submit-button"
          style={{ backgroundColor: "#1e293b", opacity: submitting ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          등록
        </button>

        <div className="section-title">등록된 요청사항 ({posts.length})</div>
        {posts.length === 0 ? (
          <p className="empty-text">아직 등록된 요청사항이 없습니다.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="feedback-post">
              <div className="feedback-post-top">
                <span className="feedback-post-author">
                  {p.name}
                  {p.team ? ` · ${p.team}` : ""}
                </span>
                <span className="feedback-post-date">{formatDateTime(p.createdAt)}</span>
              </div>
              <p className="feedback-post-content">{p.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
