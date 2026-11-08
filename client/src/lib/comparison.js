function timeValue(record) {
  const time = new Date(record?.analyzedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function recordKey(record) {
  return record?.id || record?.analysisId || null;
}

export function sortChronologically(records, direction = 'asc') {
  const sorted = [...records].sort((a, b) => timeValue(a) - timeValue(b));
  return direction === 'desc' ? sorted.reverse() : sorted;
}

export function getPreviousRecord(record, records) {
  if (!record) return null;
  const currentTime = timeValue(record);
  const currentKey = recordKey(record);
  const candidates = (records || [])
    .filter(
      (candidate) =>
        (!currentKey || recordKey(candidate) !== currentKey) &&
        candidate.hostname === record.hostname &&
        timeValue(candidate) <= currentTime,
    )
    .sort((a, b) => timeValue(b) - timeValue(a));
  return candidates[0] || null;
}

export function getDomainRecords(records, hostname) {
  return sortChronologically(
    (records || []).filter((record) => record.hostname === hostname),
    'asc',
  );
}

export function buildComparison(current, records) {
  const previous = getPreviousRecord(current, records);
  const currentKey = recordKey(current);
  const series = [
    ...(records || []).filter(
      (record) =>
        record.hostname === current.hostname &&
        (!currentKey || recordKey(record) !== currentKey) &&
        timeValue(record) <= timeValue(current),
    ),
    current,
  ]
    .filter(Boolean)
    .sort((a, b) => timeValue(a) - timeValue(b))
    .map((record) => ({
      id: record.id,
      date: record.analyzedAt,
      score: Number(record.score),
      label: new Date(record.analyzedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));

  if (!previous) {
    return {
      previous: null,
      delta: null,
      series,
      improved: [],
      declined: [],
      hasComparison: false,
    };
  }

  const previousById = new Map((previous.criteria || []).map((criterion) => [criterion.id, criterion]));
  const improved = [];
  const declined = [];

  for (const criterion of current.criteria || []) {
    const before = previousById.get(criterion.id);
    if (!before) continue;
    const wasPass = before.status === 'pass';
    const isPass = criterion.status === 'pass';
    if (!wasPass && isPass) {
      improved.push({
        id: criterion.id,
        name: criterion.name,
        from: before.status,
        to: criterion.status,
      });
    }
    if (wasPass && !isPass) {
      declined.push({
        id: criterion.id,
        name: criterion.name,
        from: before.status,
        to: criterion.status,
      });
    }
  }

  return {
    previous,
    delta: Number(current.score) - Number(previous.score),
    series,
    improved,
    declined,
    hasComparison: true,
  };
}
