import { useState } from 'react';
import type { Dataset, Block } from '../api/types';
import { RichTextEditor } from './RichTextEditor';
import { useI18n } from '../shared/i18n/I18nProvider';
import { FileUploadControl } from '../shared/ui/FileUploadControl';

const LIMITS = {
  tableLimit: 14,
  kpiLimit: 6,
  textHtmlLength: 6000,
} as const;

type Props = {
  presentationId: string;
  type: Block['type'];
  config: Record<string, unknown>;
  datasets: Dataset[];
  themeColors: string[];
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
  if (type === 'image') {
    return {
      url: 'https://placehold.co/400x240',
      fitMode: 'contain',
      focalPoint: 'center center',
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
    };
  }
  if (type === 'chart') {
    return {
      datasetId: '',
      kind: 'line',
      xField: '',
      valueField: '',
      seriesField: '',
      filterField: '',
      filterValues: [],
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
  themeColors,
  onTypeChange,
  onConfigChange,
  onImageUpload,
}: Props) {
  const { t } = useI18n();
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
      setUploadError((e as Error).message || t('error.imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const renderFieldSelect = (label: string, key: string) => (
    <label>
      {label}
      <select value={asString(config[key])} onChange={(e) => update(config, key, e.target.value, onConfigChange)}>
        <option value="">{t('block.selectField')}</option>
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
        {t('block.type')}
        <select
          value={type}
          onChange={(e) => {
            const nextType = e.target.value as Block['type'];
            onTypeChange(nextType);
            onConfigChange(getDefaultConfig(nextType));
          }}
        >
          <option value="text">{t('block.text')}</option>
          <option value="image">{t('block.image')}</option>
          <option value="chart">{t('block.chart')}</option>
          <option value="table">{t('block.table')}</option>
          <option value="kpi">{t('block.kpi')}</option>
        </select>
      </label>

      {type === 'text' && (
        <RichTextEditor
          value={asString(config.html).slice(0, LIMITS.textHtmlLength)}
          onChange={(next) => update(config, 'html', next.slice(0, LIMITS.textHtmlLength), onConfigChange)}
          themeColors={themeColors}
          t={t}
        />
      )}

      {type === 'image' && (
        <>
          {(() => {
            const fitMode = asString(config.fitMode) || 'contain';
            const isCover = fitMode === 'cover';
            return (
              <>
          <label>
            {t('block.imageUrl')}
            <input value={asString(config.url)} onChange={(e) => update(config, 'url', e.target.value, onConfigChange)} />
          </label>
          <label>
            {t('block.imageFit')}
            <select value={fitMode} onChange={(e) => update(config, 'fitMode', e.target.value, onConfigChange)}>
              <option value="contain">{t('block.imageFitContain')}</option>
              <option value="cover">{t('block.imageFitCover')}</option>
            </select>
          </label>
          <label>
            {t('block.imageFocus')}
            <select
              value={asString(config.focalPoint) || 'center center'}
              onChange={(e) => update(config, 'focalPoint', e.target.value, onConfigChange)}
            >
              <option value="center center">{t('block.imageFocusCenter')}</option>
              <option value="left top">{t('block.imageFocusLeftTop')}</option>
              <option value="center top">{t('block.imageFocusCenterTop')}</option>
              <option value="right top">{t('block.imageFocusRightTop')}</option>
              <option value="left center">{t('block.imageFocusLeftCenter')}</option>
              <option value="right center">{t('block.imageFocusRightCenter')}</option>
              <option value="left bottom">{t('block.imageFocusLeftBottom')}</option>
              <option value="center bottom">{t('block.imageFocusCenterBottom')}</option>
              <option value="right bottom">{t('block.imageFocusRightBottom')}</option>
            </select>
          </label>
          <label>
            {t('block.imageZoom')}
            <input
              type="range"
              min={100}
              max={300}
              step={1}
              value={asNumber(config.zoom) || 100}
              onChange={(e) => update(config, 'zoom', Number(e.target.value), onConfigChange)}
              disabled={!isCover}
            />
          </label>
          {isCover && (
            <>
              <label>
                {t('block.imageOffsetX')}
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={asNumber(config.offsetX) || 0}
                  onChange={(e) => update(config, 'offsetX', Number(e.target.value), onConfigChange)}
                />
              </label>
              <label>
                {t('block.imageOffsetY')}
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={asNumber(config.offsetY) || 0}
                  onChange={(e) => update(config, 'offsetY', Number(e.target.value), onConfigChange)}
                />
              </label>
            </>
          )}
          <FileUploadControl
            label={t('block.uploadImage')}
            buttonLabel={t('common.upload')}
            accept="image/*"
            disabled={uploading}
            fileName={asString(config.url)}
            onFileSelect={(file) => {
              void runImageUpload(file);
            }}
          />
          {uploading && <p>{t('block.uploadingImage')}</p>}
          {uploadError && <p className="error">{uploadError}</p>}
              </>
            );
          })()}
        </>
      )}

      {type === 'chart' && (
        <>
          <label>
            {t('block.dataset')}
            <select value={datasetId} onChange={(e) => update(config, 'datasetId', e.target.value, onConfigChange)}>
              <option value="">{t('block.selectDataset')}</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('block.kind')}
            <select value={asString(config.kind)} onChange={(e) => update(config, 'kind', e.target.value, onConfigChange)}>
              <option value="line">{t('block.line')}</option>
              <option value="bar">{t('block.bar')}</option>
              <option value="horizontalBar">{t('block.horizontalBar')}</option>
            </select>
          </label>
          {renderFieldSelect(t('block.xField'), 'xField')}
          {renderFieldSelect(t('block.valueField'), 'valueField')}
          {renderFieldSelect(t('block.seriesField'), 'seriesField')}
          {renderFieldSelect(t('block.rowFilterField'), 'filterField')}
          {filterField && (
            <label>
              {t('block.rowFilterValues')}
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
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={asBoolean(config.showLabels, true)}
              onChange={(e) => update(config, 'showLabels', e.target.checked, onConfigChange)}
            />
            <span>{t('block.showLabels')}</span>
          </label>
        </>
      )}

      {type === 'table' && (
        <>
          <label>
            {t('block.dataset')}
            <select value={datasetId} onChange={(e) => update(config, 'datasetId', e.target.value, onConfigChange)}>
              <option value="">{t('block.selectDataset')}</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          {selectedTableColumns.length > 0 && (
            <p className="hint">{t('block.columnFilteringDisabled')}</p>
          )}
          <label>
            {t('block.limit')}
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
            <span>{t('block.transposeTable')}</span>
          </label>
        </>
      )}

      {type === 'kpi' && (
        <>
          <label>
            {t('block.mode')}
            <select value={asString(config.mode) || 'manual'} onChange={(e) => update(config, 'mode', e.target.value, onConfigChange)}>
              <option value="manual">{t('block.manual')}</option>
              <option value="dataset">{t('block.datasetMode')}</option>
            </select>
          </label>
          {asString(config.mode) !== 'dataset' && (
            <>
              <label>
                {t('block.kpiLabel')}
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
                {t('block.kpiValue')}
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
                {t('block.dataset')}
                <select value={datasetId} onChange={(e) => update(config, 'datasetId', e.target.value, onConfigChange)}>
                  <option value="">{t('block.selectDataset')}</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              {renderFieldSelect(t('block.labelField'), 'labelField')}
              {renderFieldSelect(t('block.valueField'), 'valueField')}
              {renderFieldSelect(t('block.unitField'), 'unitField')}
              {renderFieldSelect(t('block.growthField'), 'growthField')}
              {renderFieldSelect(t('block.rowFilterField'), 'filterField')}
              {filterField && (
                <label>
                  {t('block.rowFilterValues')}
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
                {t('block.limit')}
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

