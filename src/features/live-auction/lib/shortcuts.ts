import { GRADE_CLEAR_KEY, GRADE_HOTKEYS } from "./grade";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export interface ShortcutRow {
  /** 함께 누르거나(`Shift` + `↑`) 둘 중 하나거나(`+` · `-`) · 보이는 그대로 */
  keys: string[];
  label: string;
  /** 뜻에 적힌 금액을 이 줄에서 고친다 · 연필이 붙는 한 줄 */
  editsStep?: boolean;
}

export interface ShortcutGroup {
  id: string;
  title: string;
  rows: ShortcutRow[];
}

/**
 * 단축키 목록 · 말풍선과 칸 `title` 에 흩어져 있던 키를 한자리에 모은다.
 *
 * 등급 줄은 `GRADE_HOTKEYS` 에서 끌어낸다 — 등급이 늘면 안내도 같이 늘어야 한다.
 * 금액 줄은 설정한 눈금(`bidStep`)을 그대로 적는다. 「100원」 이라고 박아 두면
 * 눈금을 1원으로 바꾼 사람에게는 목록 자체가 틀린 말이 된다.
 *
 * 무리는 모드가 아니라 하는 일로 가른다. 입찰칸은 고르기·쓰기 두 모드지만 그렇게
 * 나누면 「지금 내가 어느 모드지」 를 먼저 답해야 제 줄을 찾을 수 있다. 대신 옮기는
 * 키는 「개체/부위/관심 탭」 에, 값을 만지는 키는 「입찰하기」 에 둔다 — `↑↓` 처럼
 * 모드마다 뜻이 갈리는 키는 양쪽에 한 번씩 나오지만, 찾는 사람은 모드가 아니라
 * 하려는 일을 들고 오므로 그 편이 먼저 눈에 걸린다.
 *
 * 뜻은 이름씨로만 적는다(「입찰칸 이동」, 「탭 이동」). 문장으로 풀면 키 한 벌당 두세
 * 마디가 붙어 눈이 왼쪽 끝까지 되돌아가야 하는데, 이건 읽는 목록이 아니라 찾는
 * 목록이다 — 아는 말을 눈으로 훑어 제 줄을 집어내는 데는 짧을수록 좋다.
 */
export function buildShortcutGroups(step: number): ShortcutGroup[] {
  return [
    {
      id: "grade",
      title: "등급 필터",
      rows: [
        ...GRADE_HOTKEYS.map(({ key, value }) => ({
          keys: [key],
          label: value,
        })),
        { keys: [GRADE_CLEAR_KEY], label: "전체" },
      ],
    },
    {
      id: "search",
      title: "검색",
      rows: [
        { keys: ["/"], label: "개체/부위 검색" },
        { keys: ["?"], label: "단축키" },
      ],
    },
    {
      id: "axis",
      title: "개체/부위/관심 탭",
      rows: [
        { keys: ["B"], label: "탭 이동" },
        { keys: ["←", "→"], label: "개체/부위 이동" },
        { keys: ["↑", "↓"], label: "입찰칸 이동" },
      ],
    },
    {
      id: "bid",
      title: "입찰하기",
      rows: [
        { keys: ["0-9"], label: "숫자 입력" },
        { keys: ["Enter"], label: "수정 · 입찰" },
        { keys: ["Esc"], label: "되돌리기 · 나가기" },
        { keys: ["↑", "↓"], label: won(step), editsStep: true },
        { keys: ["Shift", "↑↓"], label: won(1000) },
        { keys: ["Alt", "↑↓"], label: won(1) },
        { keys: ["Backspace"], label: "값 지우기" },
      ],
    },
  ];
}
