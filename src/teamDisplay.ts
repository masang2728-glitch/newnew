// 직장명 표시/정렬 관련 공용 헬퍼. FactoryDashboardScreen과 TeamDashboardScreen이 함께 쓴다.

// 직장 표시 순서: 알려진 직장은 이 순서로 고정하고, 그 외 직장은 뒤에 가나다순으로 붙인다.
// 실제 직장명이 "차체직장"처럼 접미사가 붙어 있을 수 있어 정확히 일치가 아니라 포함 여부로 비교한다.
const TEAM_ORDER_PRIORITY = ["본부", "차체", "포탑", "유압", "해체"];

function priorityIndex(team: string): number {
  return TEAM_ORDER_PRIORITY.findIndex((keyword) => team.includes(keyword));
}

export function sortTeams(teams: string[]): string[] {
  return [...teams].sort((a, b) => {
    const ia = priorityIndex(a);
    const ib = priorityIndex(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "ko");
  });
}

// 직장명에 공장명 접두어("전차차체" 등)나 "공장"이라는 글자("공장본부" 등)가 붙어 있으면
// 화면에 표시할 때는 빼서 보여준다 ("전차공장본부" → "본부").
// (실제 데이터를 조회/집계할 때 쓰는 team 값 자체는 그대로 둔다.)
export function displayTeamName(team: string): string {
  const stripped = team.replace(/전차|공장/g, "").trim();
  return stripped || team;
}
