import { effectiveStatus, statusSortOrder, type Call } from './catalogue';

export type ExplorerSort = 'status' | 'title' | 'province';

function compareByStatus(first: Call, second: Call, locale: string) {
  const priorityDifference = statusSortOrder.indexOf(effectiveStatus(first)) - statusSortOrder.indexOf(effectiveStatus(second));
  if (priorityDifference !== 0) return priorityDifference;

  const deadlineDifference = (first.deadline ?? '9999').localeCompare(second.deadline ?? '9999');
  return deadlineDifference || first.title.localeCompare(second.title, locale);
}

function compareByProvince(first: Call, second: Call, locale: string) {
  const provinceDifference = (first.province ?? 'zzz').localeCompare(second.province ?? 'zzz', locale);
  return provinceDifference || first.title.localeCompare(second.title, locale);
}

function compareByTitle(first: Call, second: Call, locale: string) {
  return first.title.localeCompare(second.title, locale);
}

const comparators: Record<ExplorerSort, (first: Call, second: Call, locale: string) => number> = {
  status: compareByStatus,
  title: compareByTitle,
  province: compareByProvince,
};

export function sortCalls(calls: readonly Call[], sort: ExplorerSort, locale: string): Call[] {
  return calls.toSorted((first, second) => comparators[sort](first, second, locale));
}
