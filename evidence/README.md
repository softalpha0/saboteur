# Evidence

Proof that every number in the README came from a real Kane CLI run. Fill this in from real runs only.

## 1. Showcase run

| Field | Value |
|---|---|
| Run id | |
| Date (Lagos) | |
| Kane CLI version (`cli_version` from the `stream_start` event) | |
| Before score | |
| After score | |
| Report | `reports/showcase/report.md` |
| Credits used (from `kane-cli balance` before/after) | |

## 2. Per-mutant Kane results

| Mutant | Verdict before | Caught by | Kane failure message | Test Manager / share link | Evidence pack (release asset) |
|---|---|---|---|---|---|
| M01 | | | | | |
| M02 | | | | | |
| M03 | | | | | |
| M04 | | | | | |
| M05 | | | | | |
| M06 | | | | | |
| M07 | | | | | |
| M08 | | | | | |
| M09 | | | | | |
| M10 | | | | | |

## 3. Closed-loop transcripts

`runs/<run-id>/fill-<mutant>.md` — one per survivor. Highlight one where Kane's feedback changed Claude's test:

- 

## 4. Raw logs

`runs/<run-id>/kane-*.ndjson` (Kane stdout) and `progress-*.log` (stderr). Evidence packs (`.evidence` zips) are not committed (Kane docs: run artifacts); the showcase packs are attached to GitHub Release `showcase` and open with `kane-cli evidence serve <pack>`.

## 5. Launch posts

| Platform | Link | Date |
|---|---|---|
| | | |
| | | |
