# Grid performance baseline

The benchmark mounts the grid inside a production Storybook build. The four standard workloads
use six columns. The two hierarchical workloads use the same 2,000 tasks in 50 expanded branches
or groups. The 50-row
workload represents one already-fetched server page. Only that workload renders every row.
Two additional workloads exercise the same 500 expanded child rows with 17 custom cell slots,
a pinned column, and a content-height detail grid. They use a 640 px wide grid and vary overscan.

- **First mount** measures the first grid mount on a freshly loaded story. Dataset construction,
  Storybook startup, asset loading, and server fetch time are outside the measurement.
- **Warm mount and update** measure from the action through Vue's DOM commit and synchronous
  layout. The update changes a field on ten displayed rows through the `rows` prop and retains
  their keys. These timings stop before paint.
- **Scrolling** sets the scroll position in 96 px steps over 60 animation frames per run,
  reversing at the end of the range. The report pools frame intervals and counts those over
  25 ms. This measures scripted scrolling in a headless browser.
- **Custom-cell updates** change one value. The sparse update keeps unchanged child objects,
  while the snapshot update replaces them all. The detail measurement ends after DOM commit
  and layout. The native jump runs with the detail open and ends when the last row is laid out.

Two warm-up runs precede seven measured runs per workload. The first warm-up supplies the first
mount measurement. All workloads use a 448 px high grid at a 1280 × 900 browser viewport. The
virtual workloads use 36 px rows. The standard workloads use six rows of overscan.

## Results

Measured with the 0.27.0 grid on 2026-11-28 on a Ryzen 7 5800X with 14 logical CPUs available, Arch Linux
7.3.6, Node 24.19.0, and headless Chromium 159.0.8154.6.

| Workload                         | Rows rendered at top | First mount | Median warm mount | Median 10-row update | Scroll p95 | Frames over 25 ms |
| -------------------------------- | -------------------: | ----------: | ----------------: | -------------------: | ---------: | ----------------: |
| 50-row server page               |                   50 |     57.7 ms |           24.2 ms |               5.5 ms |    16.8 ms |           0 / 420 |
| 2,000-task virtual tree          |                   19 |     42.5 ms |           20.2 ms |               9.8 ms |    16.8 ms |          18 / 420 |
| 2,000-task virtual grouped table |                   19 |    136.6 ms |           15.2 ms |               8.1 ms |    16.7 ms |           3 / 420 |
| 10,000-row virtual flat table    |                   19 |     75.4 ms |           16.8 ms |               7.3 ms |    16.8 ms |           0 / 420 |

| Overscan | Rows at top | First mount | Warm mount | Sparse update | Snapshot update | Open detail | Native jump | Frames over 25 ms |
| -------: | ----------: | ----------: | ---------: | ------------: | --------------: | ----------: | ----------: | ----------------: |
|        2 |          15 |     76.1 ms |    21.9 ms |        3.9 ms |          7.7 ms |      5.8 ms |     30.0 ms |          11 / 420 |
|        6 |          19 |     92.8 ms |    25.1 ms |        5.1 ms |         11.1 ms |      7.9 ms |     36.2 ms |           3 / 420 |

The smaller window mounted four fewer rows and had lower median action times in this run, with
more long scroll frames. These sequential local measurements are sensitive to machine load.
Evaluate overscan with the expected cell content and scrolling pattern. The global default is six.

## Reproduce

Run against the production Storybook build.

```sh
npm run build-storybook -- --quiet
npx vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort
```

In a second shell, run the benchmark with Playwright Chromium installed.

```sh
STORYBOOK_URL=http://127.0.0.1:6006 npm run --silent benchmark:grid > grid-benchmark.json
```

Set `BENCHMARK_RUNS` to change the sample count. The JSON records the environment, frame counts,
and individual warm mount and update samples. Run the same workloads in the same browser and
environment when comparing changes. Portable CI pass/fail thresholds are outside this baseline.
