/**
 * 법적 고지 문서 · 관리자가 `site_contents` 에 적고(`/admin/content/*`) 여기서 읽는다.
 *
 * PC 는 `/legal/<doc>`, 모바일은 예전 그대로 `/terms` `/privacy`(500px 틀). 두 길이
 * 같은 `/api/site-contents/<doc>` 을 읽으므로 글은 한 벌이다.
 */
export const LEGAL_DOCUMENTS = {
  terms: { title: "이용약관" },
  privacy: { title: "개인정보처리방침" },
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;

export const LEGAL_DOCUMENT_KEYS = Object.keys(
  LEGAL_DOCUMENTS,
) as LegalDocumentKey[];

export function isLegalDocumentKey(value: string): value is LegalDocumentKey {
  return value in LEGAL_DOCUMENTS;
}

export const legalDocumentHref = (key: LegalDocumentKey) => `/legal/${key}`;
