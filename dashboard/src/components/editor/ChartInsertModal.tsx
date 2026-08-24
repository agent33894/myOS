import { useEffect, useId, useMemo, useState } from 'react';
import {
  type MarkdownChartSpec,
  type MarkdownChartType,
} from '../../utils/chartBlocks';
import { buildChartFence, parseChartDataInput } from '../../utils/chartDataImport';
import MarkdownChartBlock from '../markdown/MarkdownChartBlock';
import Modal from '../ui/Modal';
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

interface ChartInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertChartFence: (fence: string) => void;
  initialSpec?: MarkdownChartSpec | null;
  modalTitle?: string;
  modalSubtitle?: string;
  confirmLabel?: string;
}

export default function ChartInsertModal({
  isOpen,
  onClose,
  onInsertChartFence,
  initialSpec = null,
  modalTitle = 'Insert Chart Block',
  modalSubtitle = 'Paste JSON/CSV/TSV data, map keys, and insert a valid chart fence.',
  confirmLabel = 'Insert Chart',
}: ChartInsertModalProps) {
  const idPrefix = useId();
  const fieldIds = useMemo(
    () => ({
      chartType: `${idPrefix}-chart-type`,
      title: `${idPrefix}-title`,
      height: `${idPrefix}-height`,
      description: `${idPrefix}-description`,
      dataInput: `${idPrefix}-data-input`,
      dataHint: `${idPrefix}-data-hint`,
      xKey: `${idPrefix}-x-key`,
      nameKey: `${idPrefix}-name-key`,
      valueKey: `${idPrefix}-value-key`,
      seriesPrefix: `${idPrefix}-series`,
      stacked: `${idPrefix}-stacked`,
      parseStatus: `${idPrefix}-parse-status`,
      validationStatus: `${idPrefix}-validation-status`,
      previewHeading: `${idPrefix}-preview-heading`,
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

  const parsedData = useMemo(() => parseChartDataInput(dataInput), [dataInput]);
  const columns = parsedData.ok ? parsedData.columns : [];
  const numericColumns = useMemo(() => getNumericChartColumns(parsedData), [parsedData]);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitError(null);

    const fields = createChartEditorFields(initialSpec);
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
  }, [initialSpec, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!parsedData.ok) return;

    if (chartType === 'pie') {
      setNameKey((prev) => (columns.includes(prev) ? prev : (columns[0] || '')));
      setValueKey((prev) => (numericColumns.includes(prev) ? prev : (numericColumns[0] || '')));
      return;
    }

    setXKey((prev) => (columns.includes(prev) ? prev : (columns[0] || '')));
  }, [chartType, columns, isOpen, numericColumns, parsedData]);

  useEffect(() => {
    if (!isOpen) return;
    if (chartType === 'pie') return;
    if (!parsedData.ok) return;

    const nextSeries = numericColumns.filter((key) => key !== xKey);
    setSeriesKeys((prev) => {
      const preserved = prev.filter((key) => nextSeries.includes(key));
      return preserved.length > 0 ? preserved : (nextSeries.slice(0, 1));
    });
  }, [chartType, isOpen, numericColumns, parsedData, xKey]);

  const editorFields = useMemo<ChartEditorFields>(() => ({
    chartType,
    chartTitle,
    description,
    height,
    dataInput,
    xKey,
    nameKey,
    valueKey,
    seriesKeys,
    stacked,
  }), [chartType, chartTitle, dataInput, description, height, nameKey, seriesKeys, stacked, valueKey, xKey]);
  const validationError = useMemo(
    () => getChartValidationError(editorFields, parsedData),
    [editorFields, parsedData],
  );
  const previewState = useMemo(
    () => buildChartPreview(editorFields, parsedData),
    [editorFields, parsedData],
  );
  const canInsert = validationError === null;

  const toggleSeries = (key: string) => {
    setSeriesKeys((prev) =>
      prev.includes(key)
        ? prev.filter((value) => value !== key)
        : [...prev, key]
    );
  };

  const handleInsert = () => {
    setSubmitError(null);
    if (!previewState.spec || validationError) {
      setSubmitError(validationError || previewState.error || 'Unable to parse chart data.');
      return;
    }
    onInsertChartFence(buildChartFence(previewState.spec));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidth="max-w-4xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleInsert} disabled={!canInsert}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="ed-label block mb-1.5" htmlFor={fieldIds.chartType}>Chart Type</label>
            <Select value={chartType} onValueChange={(value) => setChartType(value as MarkdownChartType)}>
              <SelectTrigger
                id={fieldIds.chartType}
                aria-label="Chart type"
                className="w-full bg-transparent border-border"
              >
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
            <label className="ed-label block mb-1.5" htmlFor={fieldIds.title}>Title</label>
            <Input
              id={fieldIds.title}
              value={chartTitle}
              onChange={(event) => setChartTitle(event.target.value)}
              placeholder="Quarterly Trend"
            />
          </div>
          <div>
            <label className="ed-label block mb-1.5" htmlFor={fieldIds.height}>Height</label>
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
          <label className="ed-label block mb-1.5" htmlFor={fieldIds.description}>Description (optional)</label>
          <Input
            id={fieldIds.description}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this chart communicates"
          />
        </div>

        <div>
          <label className="ed-label block mb-1.5" htmlFor={fieldIds.dataInput}>
            Data Import (JSON, CSV, or TSV)
          </label>
          <textarea
            id={fieldIds.dataInput}
            value={dataInput}
            onChange={(event) => setDataInput(event.target.value)}
            className="w-full min-h-[180px] border border-border bg-secondary/20 text-foreground p-3 text-xs font-mono focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
            placeholder={'label,value\nA,1\nB,2'}
            aria-describedby={`${fieldIds.dataHint} ${fieldIds.parseStatus}`}
          />
          <div id={fieldIds.dataHint} className="mt-1 text-xs text-muted-foreground">
            Paste tabular data with a header row. Numeric columns are auto-detected.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chartType === 'pie' ? (
            <>
              <div>
                <label className="ed-label block mb-1.5" htmlFor={fieldIds.nameKey}>Label Column</label>
                <Select value={nameKey} onValueChange={setNameKey}>
                  <SelectTrigger
                    id={fieldIds.nameKey}
                    aria-label="Label column"
                    className="w-full bg-transparent border-border"
                  >
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
                <label className="ed-label block mb-1.5" htmlFor={fieldIds.valueKey}>Value Column (numeric)</label>
                <Select value={valueKey} onValueChange={setValueKey}>
                  <SelectTrigger
                    id={fieldIds.valueKey}
                    aria-label="Value column"
                    className="w-full bg-transparent border-border"
                  >
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
                <label className="ed-label block mb-1.5" htmlFor={fieldIds.xKey}>X Axis Column</label>
                <Select value={xKey} onValueChange={setXKey}>
                  <SelectTrigger
                    id={fieldIds.xKey}
                    aria-label="X axis column"
                    className="w-full bg-transparent border-border"
                  >
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
                <legend className="ed-label block mb-1.5">Series Columns (numeric)</legend>
                <div className="border border-border bg-secondary/20 p-2 max-h-[120px] overflow-y-auto space-y-1">
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
                  {numericColumns.filter((column) => column !== xKey).length === 0 && (
                    <div className="text-xs text-muted-foreground">No numeric series columns found.</div>
                  )}
                </div>
              </fieldset>
            </>
          )}
        </div>

        {chartType !== 'pie' && (
          <label className="flex items-center gap-2 text-sm text-foreground" htmlFor={fieldIds.stacked}>
            <input
              id={fieldIds.stacked}
              type="checkbox"
              checked={stacked}
              onChange={(event) => setStacked(event.target.checked)}
            />
            <span>Stack series</span>
          </label>
        )}

        <div id={fieldIds.parseStatus} role="status" aria-live="polite" className="text-xs">
          {parsedData.ok ? (
            <span className="text-muted-foreground">
              Loaded {parsedData.data.length} rows from {parsedData.format.toUpperCase()} with {columns.length} columns.
            </span>
          ) : (
            <span className="text-[hsl(var(--ed-error))]">{parsedData.message}</span>
          )}
        </div>

        {(validationError || submitError) && (
          <div id={fieldIds.validationStatus} role="alert" className="text-xs text-[hsl(var(--ed-error))]">
            {submitError || validationError}
          </div>
        )}

        <section className="border border-border bg-secondary/20" aria-labelledby={fieldIds.previewHeading}>
          <div
            id={fieldIds.previewHeading}
            className="px-3 py-2 border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground"
          >
            Live Preview
          </div>
          <div className="p-3">
            {previewState.raw ? (
              <MarkdownChartBlock raw={previewState.raw} />
            ) : (
              <div className="text-sm text-muted-foreground">
                {previewState.error || 'Provide valid chart inputs to preview.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
