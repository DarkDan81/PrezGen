import { useState } from 'react';
import type { Dataset, Block } from '../api/types';

const LIMITS = {
  chartLimit: 12,
  tableLimit: 14,
  kpiLimit: 6,
  textHtmlLength: 6000,
} as const;

type Props = {
  presentationId: string;
  type: Block['type'];
  config: Record<string, unknown>;
  datasets: Dataset[];
  onTypeChange: (next: Block['type']) => void;
  onConfigChange: (next: Record<string, unknown>) => void;
  onImageUpload: (file: File) => Promise<string>;
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
  if (type === 'chart') {
    return {
      datasetId: '',
      kind: 'line',
      xField: '',
      valueField: '',
      seriesField: '',
      filterField: '',
      filterValues: [],
      limit: 10,
    };
  }
  if (type === 'table') return { datasetId: '', transpose: false, limit: 10 };
  return { mode: 'manual', items: [{ label: 'KPI', value: '100', unit: '', growth: '' }] };
}

export function BlockConfigForm({
  presentationId,
  type,
  config,
  datasets,
  onTypeChange,
  onConfigChange,
  onImageUpload,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const datasetId = asString(config.datasetId);
  const selectedDataset = datasets.find((d) => d.id === datasetId);
  const fieldOptions = selectedDataset?.columns.map((c) => ({ key: c.key, label: c.label || c.key })) || [];
  const filterField = asString(config.filterField);
  const filterValues = Array.isArray(config.filterValues) ? (config.filterValues as string[]) : [];
  const selectedTableColumns = Array.isArray(config.columns) ? (config.columns as string[]) : [];

  const filterValueOptions =
    selectedDataset && filterField
      ? Array.from(new Set((selectedDataset.rows || []).map((row) => String(row[filterField] ?? '')).filter(Boolean)))
      : [];

  const runImageUpload = async (file: File) => {
    if (!presentationId) return;
    setUploadError('');
    setUploading(true);
    try {
      const uploadedUrl = await onImageUpload(file);
      onConfigChange({ ...config, url: uploadedUrl });
    } catch (e) {
      setUploadError((e as Error).message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const renderFieldSelect = (label: string, key: string) => (
    <label>
      {label}
      <select value={asString(config[key])} onChange={(e) => update(config, key, e.target.value, onConfigChange)}>
        <option value="">Select field</option>
        {fieldOptions.map((field) => (
          <option key={field.key} value={field.key}>
            {field.label}
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
            maxLength={LIMITS.textHtmlLength}
            onChange={(e) => update(config, 'html', e.target.value, onConfigChange)}
          />
        </label>
      )}

      {type === 'image' && (
        <>
          <label>
            Image URL
            <input value={asString(config.url)} onChange={(e) => update(config, 'url', e.target.value, onConfigChange)} />
          </label>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void runImageUpload(file);
            }}
            style={{ border: '1px dashed var(--border)', padding: 10, borderRadius: 8 }}
          >
            Upload image file (drag & drop)
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runImageUpload(file);
              }}
            />
          </label>
          {uploading && <p>Uploading...</p>}
          {uploadError && <p className="error">{uploadError}</p>}
        </>
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
          {renderFieldSelect('Row filter field (optional)', 'filterField')}
          {filterField && (
            <label>
              Row filter values
              <select
                multiple
                value={filterValues}
                onChange={(e) =>
                  update(
                    config,
                    'filterValues',
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                    onConfigChange,
                  )
                }
              >
                {filterValueOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Limit
            <input
              type="number"
              value={asNumber(config.limit)}
              min={1}
              max={LIMITS.chartLimit}
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
          {selectedTableColumns.length > 0 && (
            <p className="hint">Column filtering is disabled for stable render. All dataset columns are shown.</p>
          )}
          <label>
            Limit
            <input
              type="number"
              value={asNumber(config.limit)}
              min={1}
              max={LIMITS.tableLimit}
              onChange={(e) => update(config, 'limit', e.target.value ? Number(e.target.value) : undefined, onConfigChange)}
            />
          </label>
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={asBoolean(config.transpose, false)}
              onChange={(e) => update(config, 'transpose', e.target.checked, onConfigChange)}
            />
            Transpose table
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
              {renderFieldSelect('Row filter field (optional)', 'filterField')}
              {filterField && (
                <label>
                  Row filter values
                  <select
                    multiple
                    value={filterValues}
                    onChange={(e) =>
                      update(
                        config,
                        'filterValues',
                        Array.from(e.target.selectedOptions).map((o) => o.value),
                        onConfigChange,
                      )
                    }
                  >
                    {filterValueOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Limit
                <input
                  type="number"
                  value={asNumber(config.limit)}
                  min={1}
                  max={LIMITS.kpiLimit}
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
