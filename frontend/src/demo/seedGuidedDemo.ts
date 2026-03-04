import { client } from '../api/client';
import type { Block, LayoutPreset, ThemeTokens } from '../api/types';

export const DEMO_THEME_NAME = 'demo-festive-ru';
export const DEMO_PRESENTATION_NAME = 'Демо: Автопоказ возможностей';

type ProgressCallback = (message: string) => void;

type SeedResult = {
  themeId: string;
  presentationId: string;
  showcaseThemeIds: string[];
};

function festiveTokens(): ThemeTokens {
  return {
    color: {
      bgCanvas: '#fff8f2',
      textPrimary: '#3f3730',
      accent: '#d95f18',
      accentSecondary: '#b3933b',
      success: '#4e9d63',
      warn: '#d14b56',
      info: '#3f8fd6',
    },
    typography: {
      titleSize: 64,
      subtitleSize: 30,
      bodySize: 28,
      lineHeight: 1.35,
      profile: 'sales',
      fontPreset: 'modern',
    },
    spacing: {
      radius: 10,
      borderWidth: 1,
    },
    chart: {
      palette: ['#d95f18', '#b3933b', '#5f8d4a', '#6f93a0'],
      mode: 'contrast',
      axisLabelSize: 20,
      dataLabelSize: 18,
      lineWidth: 6,
      pointRadius: 5,
    },
    table: {
      headerBg: '#f2e8dc',
      headerText: '#3f3730',
      mode: 'normal',
    },
    decor: {
      presetPack: 'balanced',
      intensity: 1.7,
      safeZoneAlpha: 0.04,
      titleMultiplier: 1.15,
      contentMultiplier: 1,
      gridEnabled: true,
      textGlowEnabled: false,
      cardShadowEnabled: true,
      tableShadowEnabled: true,
      chartShadowEnabled: true,
      imageShadowEnabled: true,
      logoEnabled: true,
      logoText: 'ПРАЗДНИЧНАЯ',
      logoImageUrl: '',
      serviceTag: 'DEMO v1',
      logoAnchor: 'top-right',
      logoSize: 14,
      logoOpacity: 0.95,
      badgeVariant: 'outlined',
      badgeOnTitle: true,
      badgeOnContent: true,
      shapeLeftLineEnabled: true,
      shapeLeftLineAnchor: 'left',
      shapeLeftLineSize: 1,
      shapeLeftLineOpacity: 0.65,
      shapeTriangleEnabled: true,
      shapeTriangleAnchor: 'bottom-right',
      shapeTriangleSize: 1.15,
      shapeTriangleOpacity: 0.4,
      shapeBlobEnabled: true,
      shapeBlobAnchor: 'top-right',
      shapeBlobSize: 1.1,
      shapeBlobOpacity: 0.45,
      shapeStyle: 'soft',
    },
  };
}

function pickPresetByNameKey(presets: LayoutPreset[], nameKey: string, fallbackNamePart: string) {
  return (
    presets.find((item) => item.nameKey === nameKey) ||
    presets.find((item) => item.name.toLowerCase().includes(fallbackNamePart.toLowerCase())) ||
    null
  );
}

function slotAssignmentsFor(blockIds: string[], preset: LayoutPreset | null) {
  if (!preset?.schema?.slots?.length) return [];
  return preset.schema.slots
    .map((slot, index) => (blockIds[index] ? { slotId: slot.id, blockId: blockIds[index] } : null))
    .filter(Boolean) as Array<{ slotId: string; blockId: string }>;
}

async function createBlock(slideId: string, type: Block['type'], config: Record<string, unknown>) {
  const created = await client.createBlock(slideId, { type, config });
  return created.id;
}

export async function seedGuidedDemo(onProgress?: ProgressCallback): Promise<SeedResult> {
  const report = (msg: string) => onProgress?.(msg);

  report('Подготовка темы...');
  const themes = await client.listThemes();
  const baseThemeId = themes.find((item) => item.id === 'theme-universal-warm')?.id || themes[0]?.id || 'theme-universal-warm';
  const existingDemoTheme = themes.find((item) => item.name === DEMO_THEME_NAME && !item.isSystem);
  let demoThemeId = existingDemoTheme?.id || '';
  if (existingDemoTheme) {
    const updated = await client.patchTheme(existingDemoTheme.id, {
      name: DEMO_THEME_NAME,
      tokens: festiveTokens(),
    });
    demoThemeId = updated.id;
  } else {
    const created = await client.createTheme({
      name: DEMO_THEME_NAME,
      baseThemeId,
      tokens: festiveTokens(),
    });
    demoThemeId = created.id;
  }

  report('Подготовка презентации...');
  const presentations = await client.listPresentations();
  const existingDemoDeck = presentations.find((item) => item.name === DEMO_PRESENTATION_NAME);
  const deck = existingDemoDeck
    ? await client.patchPresentation(existingDemoDeck.id, { themeId: demoThemeId })
    : await client.createPresentation({ name: DEMO_PRESENTATION_NAME, themeId: demoThemeId });
  const presentationId = deck.id;

  report('Очистка старых слайдов и датасетов...');
  const [slidesBefore, datasetsBefore] = await Promise.all([
    client.listSlides(presentationId),
    client.listDatasets(presentationId),
  ]);
  for (const slide of slidesBefore) {
    // eslint-disable-next-line no-await-in-loop
    await client.deleteSlide(slide.id);
  }
  for (const dataset of datasetsBefore) {
    // eslint-disable-next-line no-await-in-loop
    await client.deleteDataset(dataset.id);
  }

  report('Создание демо-датасета...');
  const dataset = await client.createDataset(presentationId, {
    name: 'sales_overview',
    sourceType: 'manual_table',
    columns: [
      { key: 'month', label: 'Месяц', type: 'string', nullable: false },
      { key: 'revenue', label: 'Выручка', type: 'number', nullable: false },
      { key: 'orders', label: 'Заказы', type: 'number', nullable: false },
      { key: 'region', label: 'Регион', type: 'string', nullable: false },
      { key: 'manager', label: 'Менеджер', type: 'string', nullable: false },
      { key: 'growth', label: 'Рост', type: 'number', nullable: true },
    ],
    rows: [
      { month: 'Январь', revenue: 100000, orders: 420, region: 'Север', manager: 'Алекс', growth: 12 },
      { month: 'Февраль', revenue: 200000, orders: 690, region: 'Север', manager: 'Алекс', growth: 18 },
      { month: 'Март', revenue: 150000, orders: 560, region: 'Юг', manager: 'Нина', growth: 9 },
      { month: 'Апрель', revenue: 175000, orders: 610, region: 'Юг', manager: 'Нина', growth: 14 },
      { month: 'Май', revenue: 210000, orders: 740, region: 'Восток', manager: 'Иван', growth: 11 },
      { month: 'Июнь', revenue: 230000, orders: 780, region: 'Восток', manager: 'Иван', growth: 16 },
    ],
  });

  report('Создание структуры слайдов...');
  const presets = await client.listLayoutPresets();
  const singleColumn = pickPresetByNameKey(presets, 'layout.singleColumn', 'single');
  const twoColumns = pickPresetByNameKey(presets, 'layout.twoColumns', 'two');
  const grid2x2 = pickPresetByNameKey(presets, 'layout.grid2x2', '2x2');

  await client.createSlide(presentationId, {
    type: 'title',
    title: 'Демо сценарий конструктора',
  }).then((slide) => client.patchSlide(slide.id, {
    subtitle: 'Автосборка, темы, экспорт и быстрые правки',
  }));

  const slideText = await client.createSlide(presentationId, {
    type: 'content',
    title: '1. Базовый контентный слайд',
  });
  await client.patchSlide(slideText.id, {
    subtitle: 'Проверяем типографику, отступы и ритм текста',
  });
  const textOnlyBlockId = await createBlock(slideText.id, 'text', {
    html: '<h3>Зачем этот слайд</h3><p>Этот слайд показывает, как выглядит обычный текстовый контент после автосборки.</p><ul><li>Заголовок и подзаголовок</li><li>Параграфы с переносами</li><li>Списки и акценты</li></ul>',
  });
  if (singleColumn) {
    await client.patchSlideLayout(slideText.id, {
      layoutPresetId: singleColumn.id,
      slotAssignments: slotAssignmentsFor([textOnlyBlockId], singleColumn),
    });
  }

  const slideSplit = await client.createSlide(presentationId, {
    type: 'content',
    title: '2. Две колонки: текст + график',
  });
  await client.patchSlide(slideSplit.id, {
    subtitle: 'Показываем комбинирование блоков и лейаут слотов',
  });
  const splitTextId = await createBlock(slideSplit.id, 'text', {
    html: '<h3>Что проверяем</h3><p>Слева объяснение, справа визуализация из датасета. Это типичный рабочий формат еженедельного отчета.</p>',
  });
  const splitChartId = await createBlock(slideSplit.id, 'chart', {
    datasetId: dataset.id,
    kind: 'bar',
    xField: 'month',
    valueField: 'revenue',
    seriesField: '',
    filterField: '',
    filterValues: [],
    showLabels: true,
  });
  if (twoColumns) {
    await client.patchSlideLayout(slideSplit.id, {
      layoutPresetId: twoColumns.id,
      slotAssignments: slotAssignmentsFor([splitTextId, splitChartId], twoColumns),
    });
  }

  const slideGrid = await client.createSlide(presentationId, {
    type: 'content',
    title: '3. Сетка 2x2: демонстрация смешанных блоков',
  });
  await client.patchSlide(slideGrid.id, {
    subtitle: 'На нем показываем быструю смену тем без правки контента',
  });
  const gridTextId = await createBlock(slideGrid.id, 'text', {
    html: '<h3>Функционал слайда</h3><p>Здесь сразу 4 типа блоков. На этом слайде в демо мы будем переключать темы и показывать мгновенную смену стиля.</p>',
  });
  const gridTableId = await createBlock(slideGrid.id, 'table', {
    datasetId: dataset.id,
    limit: 6,
    transpose: false,
  });
  const gridChartId = await createBlock(slideGrid.id, 'chart', {
    datasetId: dataset.id,
    kind: 'line',
    xField: 'month',
    valueField: 'orders',
    seriesField: '',
    filterField: '',
    filterValues: [],
    showLabels: true,
  });
  const gridKpiId = await createBlock(slideGrid.id, 'kpi', {
    mode: 'dataset',
    datasetId: dataset.id,
    labelField: 'month',
    valueField: 'revenue',
    growthField: 'growth',
    filterField: '',
    filterValues: [],
    limit: 4,
  });
  if (grid2x2) {
    await client.patchSlideLayout(slideGrid.id, {
      layoutPresetId: grid2x2.id,
      slotAssignments: slotAssignmentsFor([gridTextId, gridChartId, gridTableId, gridKpiId], grid2x2),
    });
  }

  const slideExport = await client.createSlide(presentationId, {
    type: 'content',
    title: '4. Конструктор блоков: все типы контента',
  });
  await client.patchSlide(slideExport.id, {
    subtitle: 'Показываем добавление текстов, изображений, таблиц, графиков и карточек',
  });
  const exportTextId = await createBlock(slideExport.id, 'text', {
    html: '<h3>Что проверяем на этом слайде</h3><p>В автодемо этот слайд заполняется блоками разных типов и показывает, как быстро меняется структура презентации.</p>',
  });
  if (singleColumn) {
    await client.patchSlideLayout(slideExport.id, {
      layoutPresetId: singleColumn.id,
      slotAssignments: slotAssignmentsFor([exportTextId], singleColumn),
    });
  }

  const slideFinal = await client.createSlide(presentationId, {
    type: 'content',
    title: '5. Экспорт и финал демо',
  });
  await client.patchSlide(slideFinal.id, {
    subtitle: 'Подсвечиваем 3 режима выгрузки и объясняем, когда какой использовать',
  });
  const finalTextId = await createBlock(slideFinal.id, 'text', {
    html: '<h3>Финальный шаг</h3><ul><li><b>PDF</b> — для отправки.</li><li><b>PPTX (Картинка)</b> — максимальная стабильность.</li><li><b>PPTX (Блоки)</b> — редактируемый текст и отдельные объекты.</li></ul><p>В демо кнопки подсвечиваются без автоматического скачивания.</p>',
  });
  if (singleColumn) {
    await client.patchSlideLayout(slideFinal.id, {
      layoutPresetId: singleColumn.id,
      slotAssignments: slotAssignmentsFor([finalTextId], singleColumn),
    });
  }

  report('Подготовка списка тем для показа...');
  const themesAfter = await client.listThemes();
  const pick = (id: string) => themesAfter.find((t) => t.id === id)?.id || '';
  const showcaseThemeIds = [
    pick(demoThemeId),
    pick('theme-factory-blueprint') || pick('factory-blueprint'),
    pick('theme-cyberpunk') || pick('cyberpunk'),
    pick('theme-eurofoods') || pick('eurofoods'),
  ].filter(Boolean);

  report('Демо готово');
  return {
    themeId: demoThemeId,
    presentationId,
    showcaseThemeIds,
  };
}
