# Kane NDJSON fixtures

`testrun-killed.ndjson`, `testrun-survived.ndjson` and `testmd-*.ndjson` are **hand-built** from the event
shapes in `docs/03-KANE-INTEGRATION.md` §3 (including the failing-member line copied from Kane's own
fixture). They are for parser unit tests only, never for reports.

After the hour-1 spike, add the real captures from `evidence/spike/*.ndjson` here and point the tests
at them (docs/09-TESTING.md).

`fake-kane.mjs` is a stand-in binary for the spawn test. It replays a fixture file to stdout and exits
with a given code. It is only used by Vitest via `KANE_CLI_BIN`; Saboteur never uses it for a verdict.
