import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  parseMarkdownChartBlock,
  type MarkdownChartSpec,
  type MarkdownChartType,
} from '../../utils/chartBlocks';
import { parseChartDataInput } from '../../utils/chartDataImport';
import MarkdownChartBlock from '../markdown/MarkdownChartBlock';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  CHART_TYPE_OPTIONS,
  INITIAL_CHART_DATA_INPUT,
  buildChartPreview,
  createChartEditorFields,
  getChartValidationError,
  getNumericChartColumns,
  type ChartEditorFields,
} from './chartEditorModel';

interface InlineChartBlockEditorProps {
  raw: string;
  onApplySpec: (spec: MarkdownChartSpec) => void;
  onRemove?: () => void;
}

type SurfaceMode = 'preview' | 'edit';

export default function InlineChartBlockEditor({ raw, onApplySpec, onRemove }: InlineChartBlockEditorProps) {
  const idPrefix = useId();
  const fieldIds = useMemo(
    () => ({
      chartType: `${idPrefix}-chart-type`,
      title: `${idPrefix}-title`,
      height: `${idPrefix}-height`,
      description: `${idPrefix}-description`,
      dataInput: `${idPrefix}-data-input`,
      xKey: `${idPrefix}-x-key`,
      nameKey: `${idPrefix}-name-key`,
      valueKey: `${idPrefix}-value-key`,
      seriesPrefix: `${idPrefix}-series`,
      stacked: `${idPrefix}-stacked`,
    }),
    [idPrefix]
  );

  const [chartType, setChartType] = useState<MarkdownChartType>('line');
  const [chartTitle, setChartTitle] = useState('New Chart');
  const [description, setDescription] = useState('');
  const [height, setHeight] = useState('300');
  const [dataInput, setDataInput] = useState(INITIAL_CHART_DATA_INPUT);
  const [xKey, setXKey] = useState('');
  const [nameKey, setNameKey] = useState('');
  const [valueKey, setValueKey] = useState('');
  const [seriesKeys, setSeriesKeys] = useState<string[]>([]);
  const [stacked, setStacked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('preview');
  const initializedSignatureRef = useRef<string | null>(null);

  const parsedRaw = useMemo(() => parseMarkdownChartBlock(raw), [raw]);
  const rawSignature = useMemo(() => {
    if (parsedRaw.ok) {
      return `ok:${JSON.stringify(parsedRaw.spec)}`;
    }
    return `invalid:${raw}`;
  }, [parsedRaw, raw]);

  useEffect(() => {
    if (initializedSignatureRef.current === rawSignature) {
      return;
    }

    initializedSignatureRef.current = rawSignature;
    setSubmitError(null);
    setSurfaceMode('preview');

    const fields = createChartEditorFields(parsedRaw.ok ? parsedRaw.spec : null);
    setChartType(fields.chartType);
    setChartTitle(fields.chartTitle);
    setDescription(fields.description);
    setHeight(fields.height);
    setDataInput(fields.dataInput);
    setXKey(fields.xKey);
    setNameKey(fields.nameKey);
    setValueKey(fields.valueKey);
    setSeriesKeys(fields.seriesKeys);
    setStacked(fields.stacked);
  }, [parsedRaw, rawSignature]);

  const parsedData = useMemo(() => parseChartDataInput(dataInput), [dataInput]);
  const columns = parsedData.ok ? parsedData.columns : [];
  const numericColumns = useMemo(() => getNumericChartColumns(parsedData), [parsedData]);

  useEffect(() => {
    if (!parsedData.ok) return;

    if (chartType === 'pie') {
      setNameKey((prev) => (columns.includes(prev) ? prev : (columns[0] || '')));
      setValueKey((prev) => (numericColumns.includes(prev) ? prev : (numericColumns[0] || '')));
      return;
    }

    setXKey((prev) => (columns.includes(prev) ? prev : (columns[0] || '')));
  }, [chartType, columns, numericColumns, parsedData]);

  useEffect(() => {
    if (chartType === 'pie') return;
    if (!parsedData.ok) return;

    const nextSeries = numericColumns.filter((key) => key !== xKey);
    setSeriesKeys((prev) => {
      const preserved = prev.filter((key) => nextSeries.includes(key));
      return preserved.length > 0 ? preserved : (nextSeries.slice(0, 1));
    });
  }, [chartType, numericColumns, parsedData, xKey]);

  const editorFields = useMemo<ChartEditorFields>(() => ({
    chartType,
    chartTitle,
    description,
    dataInput,
    height,
    nameKey,
    seriesKeys,
    stacked,
    valueKey,
    xKey,
  }), [chartType, chartTitle, description, dataInput, height, nameKey, seriesKeys, stacked, valueKey, xKey]);
  const validationError = useMemo(
    () => getChartValidationError(editorFields, parsedData),
    [editorFields, parsedData],
  );
  const previewState = useMemo(
    () => buildChartPreview(editorFields, parsedData),
    [editorFields, parsedData],
  );

  const toggleSeries = (key: string) => {
    setSeriesKeys((prev) =>
      prev.includes(key)
        ? prev.filter((value) => value !== key)
        : [...prev, key]
    );
  };

  const handleApply = () => {
    setSubmitError(null);
    if (!previewState.spec || validationError) {
      setSubmitError(validationError || previewState.error || 'Unable to apply chart changes.');
      return;
    }
    onApplySpec(previewState.spec);
    setSurfaceMode('preview');
  };

  const previewRaw = previewState.raw || raw;

  return (
    <div className="group/rich-block my-1 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="w-7">
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0 text-[hsl(var(--ed-error))] opacity-0 pointer-events-none transition-opacity group-hover/rich-block:opacity-100 group-hover/rich-block:pointer-events-auto group-focus-within/rich-block:opacity-100 group-focus-within/rich-block:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-[hsl(var(--ed-error)/0.12)] hover:text-[hsl(var(--ed-error))]"
              onClick={onRemove}
              aria-label="Remove chart block"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="inline-flex border border-border/70 bg-background/85">
        <Button
          type="button"
          variant={surfaceMode === 'preview' ? 'outline' : 'ghost'}
          size="sm"
          className="h-7 px-2"
          onClick={() => setSurfaceMode('preview')}
        >
          Preview
        </Button>
        <Button
          type="button"
          variant={surfaceMode === 'edit' ? 'outline' : 'ghost'}
          size="sm"
          className="h-7 border-l border-border px-2"
          onClick={() => setSurfaceMode('edit')}
        >
          Edit
        </Button>
        </div>
      </div>

      <div className="[&>*]:!my-0">
        <MarkdownChartBlock raw={previewRaw} />
      </div>

      {surfaceMode === 'edit' ? (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          {!parsedRaw.ok ? (
            <div className="border border-[hsl(var(--ed-warning))]/40 bg-[hsl(var(--ed-warning))]/10 px-2 py-1.5 text-xs text-[hsl(var(--ed-warning))]">
              Existing chart JSON is invalid. Update fields below to rebuild this chart block.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="ed-label mb-1 block" htmlFor={fieldIds.chartType}>Chart Type</label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as MarkdownChartType)}>
                <SelectTrigger id={fieldIds.chartType} className="w-full border-border bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="ed-label mb-1 block" htmlFor={fieldIds.title}>Title</label>
              <Input
                id={fieldIds.title}
                value={chartTitle}
                onChange={(event) => setChartTitle(event.target.value)}
                placeholder="Quarterly Trend"
              />
            </div>

            <div>
              <label className="ed-label mb-1 block" htmlFor={fieldIds.height}>Height</label>
              <Input
                id={fieldIds.height}
                type="number"
                min={220}
                max={520}
                value={height}
                onChange={(event) => setHeight(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="ed-label mb-1 block" htmlFor={fieldIds.description}>Description (optional)</label>
            <Input
              id={fieldIds.description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this chart communicates"
            />
          </div>

          <div>
            <label className="ed-label mb-1 block" htmlFor={fieldIds.dataInput}>Data (JSON, CSV, TSV)</label>
            <textarea
              id={fieldIds.dataInput}
              value={dataInput}
              onChange={(event) => setDataInput(event.target.value)}
              className="min-h-[140px] w-full border border-border bg-background/40 p-3 font-mono text-xs text-foreground focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
              placeholder={'label,value\nA,1\nB,2'}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {chartType === 'pie' ? (
              <>
                <div>
                  <label className="ed-label mb-1 block" htmlFor={fieldIds.nameKey}>Label Column</label>
                  <Select value={nameKey} onValueChange={setNameKey}>
                    <SelectTrigger id={fieldIds.nameKey} className="w-full border-border bg-transparent">
                      <SelectValue placeholder="Select label column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="ed-label mb-1 block" htmlFor={fieldIds.valueKey}>Value Column</label>
                  <Select value={valueKey} onValueChange={setValueKey}>
                    <SelectTrigger id={fieldIds.valueKey} className="w-full border-border bg-transparent">
                      <SelectValue placeholder="Select value column" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="ed-label mb-1 block" htmlFor={fieldIds.xKey}>X Axis Column</label>
                  <Select value={xKey} onValueChange={setXKey}>
                    <SelectTrigger id={fieldIds.xKey} className="w-full border-border bg-transparent">
                      <SelectValue placeholder="Select x-axis column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <fieldset>
                  <legend className="ed-label mb-1 block">Series Columns</legend>
                  <div className="max-h-[120px] space-y-1 overflow-y-auto border border-border bg-background/40 p-2">
                    {numericColumns.filter((column) => column !== xKey).map((column) => (
                      <label
                        key={column}
                        className="flex items-center gap-2 text-sm text-foreground"
                        htmlFor={`${fieldIds.seriesPrefix}-${column}`}
                      >
                        <input
                          id={`${fieldIds.seriesPrefix}-${column}`}
                          type="checkbox"
                          checked={seriesKeys.includes(column)}
                          onChange={() => toggleSeries(column)}
                        />
                        <span>{column}</span>
                      </label>
                    ))}
                    {numericColumns.filter((column) => column !== xKey).length === 0 ? (
                      <div className="text-xs text-muted-foreground">No numeric series columns found.</div>
                    ) : null}
                  </div>
                </fieldset>
              </>
            )}
          </div>

          {chartType !== 'pie' ? (
            <label className="flex items-center gap-2 text-sm text-foreground" htmlFor={fieldIds.stacked}>
              <input
                id={fieldIds.stacked}
                type="checkbox"
                checked={stacked}
                onChange={(event) => setStacked(event.target.checked)}
              />
              <span>Stack series</span>
            </label>
          ) : null}

          <div className="text-xs text-muted-foreground">
            {parsedData.ok
              ? `Loaded ${parsedData.data.length} rows from ${parsedData.format.toUpperCase()} with ${columns.length} columns.`
              : parsedData.message}
          </div>

          {(validationError || submitError) ? (
            <div className="text-xs text-[hsl(var(--ed-error))]">
              {submitError || validationError}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleApply} disabled={Boolean(validationError)}>
              Apply Chart Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
