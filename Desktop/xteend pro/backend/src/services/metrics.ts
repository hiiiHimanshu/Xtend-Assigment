export type LabelRecord = Record<string, string | number>;

const serializeLabels = (labels?: LabelRecord) => {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }
  const parts = Object.entries(labels).map(([key, value]) => `${key}="${value}"`);
  return `{${parts.join(',')}}`;
};

export class MetricsCollector {
  private counters = new Map<string, number>();

  increment(name: string, value = 1, labels?: LabelRecord) {
    const key = `${name}${serializeLabels(labels)}`;
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  snapshot() {
    return new Map(this.counters);
  }

  toPrometheus(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters.entries()) {
      lines.push(`${key} ${value}`);
    }
    return lines.join('\n');
  }
}
