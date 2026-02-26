import type { Dataset, Block } from '../api/types';

type Props = {
  type: Block['type'];
  config: Record<string, unknown>;
  datasets: Dataset[];
  onTypeChange: (next: Block['type']) => void;
  onConfigChange: (next: Record<string, unknown>) => void;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function update(
  config: Record<string, unknown>,
  key: string,
  value: unknown,
  onConfigChange: (next: Record<string, unknown>) => void,
) {
  onConfigChange({ ...config, [key]: value });
}

export function getDefaultConfig(type: Block['type']): Record<string, unknown> {
  if (type === 'text') return { html: '<p>Text</p>' };
  if (type === 'image') return { url: 'https://placehold.co/400x240' };
  if (type === 'chart') return { datasetId: '', kind: 'line', xField: '', valueField: '', seriesField: '' };
  if (type === 'table') return { datasetId: '', columns: [], limit: 10 };
  return { mode: 'manual', items: [{ label: 'KPI', value: '100', unit: '', growth: '' }] };
}

export function BlockConfigForm({ type, config, datasets, onTypeChange, onConfigChange }: Props) {
  const datasetId = asString(config.datasetId);
  const selectedDataset = datasets.find((d) => d.id === datasetId);
  const fieldOptions = selectedDataset?.columns.map((c) => c.key) || [];

  const renderFieldSelect = (label: string, key: string) => (
    <label>
      {label}
      <select value={asString(config[key])} onChange={(e) => update(config, key, e.target.value, onConfigChange)}>
        <option value="">Select field</option>
        {fieldOptions.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="properties">
      <label>
        Block type
        <select
          value={type}
          onChange={(e) => {
            const nextType = e.target.value as Block['type'];
            onTypeChange(nextType);
            onConfigChange(getDefaultConfig(nextType));
          }}
        >
          <option value="text">text</option>
          <option value="image">image</option>
          <option value="chart">chart</option>
          <option value="table">table</option>
          <option value="kpi">kpi</option>
        </select>
      </label>

      {type === 'text' && (
        <label>
          HTML
          <textarea
            rows={12}
            value={asString(config.html)}
            onChange={(e) => update(config, 'html', e.target.value, onConfigChange)}
          />
        </label>
      )}

      {type === 'image' && (
        <label>
          Image URL
          <input value={asString(config.url)} onChange={(e) => update(config, 'url', e.target.value, onConfigChange)} />
        </label>
      )}

      {type === 'chart' && (
        <>
          <label>
            Dataset
            <select value={datasetId} onChange={(e) => update(config, 'datasetId', e.target.value, onConfigChange)}>
              <option value="">Select dataset</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kind
            <select value={asString(config.kind)} onChange={(e) => update(config, 'kind', e.target.value, onConfigChange)}>
              <option value="line">line</option>
              <option value="bar">bar</option>
              <option value="horizontalBar">horizontalBar</option>
            </select>
          </label>
          {renderFieldSelect('X field', 'xField')}
          {renderFieldSelect('Value field', 'valueField')}
          {renderFieldSelect('Series field (optional)', 'seriesField')}
          <label>
            Limit
            <input
              type="number"
              value={asNumber(config.limit)}
              onChange={(e) => update(config, 'limit', e.target.value ? Number(e.target.value) : undefined, onConfigChange)}
            />
          </label>
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={asBoolean(config.showLabels, true)}
              onChange={(e) => update(config, 'showLabels', e.target.checked, onConfigChange)}
            />
            Show labels
          </label>
        </>
      )}

      {type === 'table' && (
        <>
          <label>
            Dataset
            <select value={datasetId} onChange={(e) => update(config, 'datasetId', e.target.value, onConfigChange)}>
              <option value="">Select dataset</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Columns (comma-separated)
            <input
              value={Array.isArray(config.columns) ? (config.columns as string[]).join(',') : ''}
              onChange={(e) =>
                update(
                  config,
                  'columns',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  onConfigChange,
                )
              }
            />
          </label>
          <label>
            Sort by
            <input
              value={asString((config.sort as Record<string, unknown> | undefined)?.by)}
              onChange={(e) =>
                update(
                  config,
                  'sort',
                  { ...(typeof config.sort === 'object' && config.sort ? (config.sort as Record<string, unknown>) : {}), by: e.target.value },
                  onConfigChange,
                )
              }
            />
          </label>
          <label>
            Sort direction
            <select
              value={asString((config.sort as Record<string, unknown> | undefined)?.direction) || 'desc'}
              onChange={(e) =>
                update(
                  config,
                  'sort',
                  {
                    ...(typeof config.sort === 'object' && config.sort ? (config.sort as Record<string, unknown>) : {}),
                    direction: e.target.value,
                  },
                  onConfigChange,
                )
              }
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </label>
          <label>
            Limit
            <input
              type="number"
              value={asNumber(config.limit)}
              onChange={(e) => update(config, 'limit', e.target.value ? Number(e.target.value) : undefined, onConfigChange)}
            />
          </label>
        </>
      )}

      {type === 'kpi' && (
        <>
          <label>
            Mode
            <select value={asString(config.mode) || 'manual'} onChange={(e) => update(config, 'mode', e.target.value, onConfigChange)}>
              <option value="manual">manual</option>
              <option value="dataset">dataset</option>
            </select>
          </label>
          {asString(config.mode) !== 'dataset' && (
            <>
              <label>
                KPI label
                <input
                  value={asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.label : '') || '')}
                  onChange={(e) =>
                    update(
                      config,
                      'items',
                      [
                        {
                          label: e.target.value,
                          value: asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.value : '') || ''),
                          unit: asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.unit : '') || ''),
                          growth: asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.growth : '') || ''),
                        },
                      ],
                      onConfigChange,
                    )
                  }
                />
              </label>
              <label>
                KPI value
                <input
                  value={asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.value : '') || '')}
                  onChange={(e) =>
                    update(
                      config,
                      'items',
                      [
                        {
                          label: asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.label : '') || ''),
                          value: e.target.value,
                          unit: asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.unit : '') || ''),
                          growth: asString((Array.isArray(config.items) ? (config.items[0] as Record<string, unknown> | undefined)?.growth : '') || ''),
                        },
                      ],
                      onConfigChange,
                    )
                  }
                />
              </label>
            </>
          )}
          {asString(config.mode) === 'dataset' && (
            <>
              <label>
                Dataset
                <select value={datasetId} onChange={(e) => update(config, 'datasetId', e.target.value, onConfigChange)}>
                  <option value="">Select dataset</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              {renderFieldSelect('Label field', 'labelField')}
              {renderFieldSelect('Value field', 'valueField')}
              {renderFieldSelect('Unit field (optional)', 'unitField')}
              {renderFieldSelect('Growth field (optional)', 'growthField')}
              <label>
                Limit
                <input
                  type="number"
                  value={asNumber(config.limit)}
                  onChange={(e) => update(config, 'limit', e.target.value ? Number(e.target.value) : undefined, onConfigChange)}
                />
              </label>
            </>
          )}
        </>
      )}
    </div>
  );
}

