# PrezGen Manual Test Checklist

Date: __________
Tester: __________
Branch/Commit: __________

## 1. Startup

- [ ] Backend starts: `npm run api`
- [ ] Frontend starts: `npm --prefix frontend run dev`
- [ ] Presentations list opens without errors

## 2. Presentations and Slides

- [ ] Create a new presentation
- [ ] Open presentation editor
- [ ] Add 2+ slides
- [ ] Reorder slides with drag handle
- [ ] Edit slide title/subtitle and verify autosave after page reload

## 3. Blocks CRUD

- [ ] Add `text` block
- [ ] Add `image` block
- [ ] Add `table` block
- [ ] Add `chart` block
- [ ] Add `kpi` block
- [ ] Reorder blocks with drag handle
- [ ] Delete one block and confirm it stays deleted after reload

## 4. Text Block (HTML)

- [ ] Paste HTML sample (below) into text block
- [ ] Preview renders headings/lists/emphasis correctly
- [ ] Refresh Preview keeps latest content

### HTML Sample To Paste

```html
<h3>Q1 Summary</h3>
<p><b>Revenue:</b> 450,000</p>
<ul>
  <li class="bullet">January growth: 12%</li>
  <li class="bullet">February growth: 18%</li>
  <li class="bullet">March growth: 9%</li>
</ul>
<h3>Notes</h3>
<p>Focus on conversion, repeat purchases, and average order value.</p>
```

## 5. Image Block

- [ ] Upload image via file picker
- [ ] Upload image via drag-and-drop
- [ ] Uploaded image appears in preview
- [ ] Image still visible after Refresh Preview
- [ ] Image still visible after full page reload

## 6. Datasets (Manual Editor)

- [ ] Create new manual dataset
- [ ] Open `Edit dataset` modal
- [ ] Change dataset name and save
- [ ] Edit a few cells and save
- [ ] Add row and save
- [ ] Add column and save
- [ ] Remove row and save
- [ ] Remove column and save
- [ ] Unsaved-change guard works (`Close/Cancel/Esc` prompts before discard)

## 7. Datasets (CSV Upload)

- [ ] Upload sample CSV from `docs/test-data/manual-upload-sample.csv`
- [ ] Dataset appears in selector
- [ ] Rows/columns look correct in dataset editor

## 8. Table Block

- [ ] Select dataset in table block
- [ ] Headers use dataset labels (not `col_1`, `col_2`)
- [ ] `Limit` affects rendered row count
- [ ] `Transpose table` ON changes orientation
- [ ] In transposed mode, first header uses first column label (e.g. `Month`)
- [ ] Refresh Preview preserves correct table state

## 9. Chart Block

- [ ] Configure line chart (x/value)
- [ ] Configure bar chart
- [ ] Configure horizontal bar chart
- [ ] Row filtering works (`filterField` + values)
- [ ] Chart updates after Refresh Preview

## 10. KPI Block

- [ ] Dataset mode works (label/value fields)
- [ ] `Limit` works
- [ ] Row filtering works (`filterField` + values)
- [ ] KPI cards update in preview correctly

## 11. PDF Export

- [ ] Start export with `Export PDF`
- [ ] Job reaches `done`
- [ ] Download/open PDF
- [ ] PDF visually matches preview for text/image/table/chart/kpi slides

## 12. Theme / UI Mode

- [ ] Switch presentation theme and verify preview updates
- [ ] Toggle constructor `Dark UI/Light UI`
- [ ] Core editor actions still work in both modes

## 13. Final Regression Pass

- [ ] Close and reopen app
- [ ] Open same presentation
- [ ] Confirm slides, blocks, datasets, image URLs, and table transpose are persisted

## Notes / Bugs Found

- ________________________________________________
- ________________________________________________
- ________________________________________________
