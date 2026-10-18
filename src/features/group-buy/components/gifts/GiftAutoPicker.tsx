'use client';

import { cn } from '@/lib/utils';
import { gradeKeyCompact } from '../../lib/pools';
import { specFromDraft, specLabelOf, type GiftAutoGroup, type GiftCellDraft } from '../../lib/giftAuto';
import { GiftMenu } from './GiftMenu';

const PART_SECTIONS = [
  { label: '구이', names: ['등심', '안심', '채끝', '치마', '부채', '업진', '토시·제비'] },
  { label: '불고기', names: ['목심', '양지', '우둔', '설도', '앞다리'] },
  { label: '국거리', names: ['사태'] },
] as const;

/** 칸을 고른 뒤 부위·등급 드롭다운으로 채운다 · 등급은 부위와 상관없이 항상 보인다 */
export function GiftAutoPicker({
  picking,
  drafts,
  partGroups,
  grades,
  groups,
  onChange,
  onSelectCell,
}: {
  picking: number | null;
  drafts: GiftCellDraft[];
  partGroups: string[];
  grades: string[];
  groups: GiftAutoGroup[];
  onChange: (cellNo: number, next: GiftCellDraft) => void;
  onSelectCell: (cellNo: number) => void;
}) {
  const draft = picking ? drafts[picking - 1] : undefined;
  const placed = new Set<string>(PART_SECTIONS.flatMap((section) => [...section.names]));
  const partSections = [
    ...PART_SECTIONS.map((section) => ({
      label: section.label,
      options: section.names.filter((name) => partGroups.includes(name)).map((name) => ({ value: name, label: name })),
    })),
    {
      label: '그 외',
      options: partGroups.filter((name) => !placed.has(name)).map((name) => ({ value: name, label: name })),
    },
  ].filter((section) => section.options.length > 0);

  return (
    <div>
      <ul className="space-y-1.5">
        {drafts.map((item, index) => {
          const cellNo = index + 1;
          const spec = specFromDraft(item);
          const group = groups.find((entry) => entry.cellNos.includes(cellNo));
          const active = picking === cellNo;
          return (
            <li key={cellNo}>
              <button
                type="button"
                onClick={() => onSelectCell(cellNo)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left',
                  active ? 'border-ink' : 'border-line hover:border-content-faint',
                )}
              >
                <span className="text-[13px] font-bold text-content">{cellNo}칸</span>
                <span className={cn('min-w-0 truncate text-[13px]', spec ? 'text-content' : 'text-content-faint')}>
                  {spec ? specLabelOf(spec) : '고르기'}
                </span>
                {group?.error ? <span className="truncate text-[12px] text-rose-600">{group.error}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      {picking && draft ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <GiftMenu
            label={`${picking}칸 부위`}
            value={draft.partGroup}
            placeholder="부위 고르기"
            groups={partSections}
            onChange={(part) => onChange(picking, { partGroup: part, gradeKey: draft.gradeKey })}
          />
          <GiftMenu
            label={`${picking}칸 등급`}
            value={draft.gradeKey}
            placeholder="등급 고르기"
            options={grades.map((grade) => ({ value: grade, label: gradeKeyCompact(grade) }))}
            onChange={(grade) => onChange(picking, { partGroup: draft.partGroup, gradeKey: grade })}
          />
        </div>
      ) : null}
    </div>
  );
}
