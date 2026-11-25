# G5 shipping-boundary resource limits

The shipped artifact is a static browser distribution. It contains no HTTP
server, request parser, upload handler, archive extractor or decompression
endpoint, so request body, header, connection and decompression limits belong
to the static host that serves `dist/`. This is a deliberate boundary: the
legacy Node server stays development-only and fail-closed for production
startup.

## Static host limits

Deployments must enforce these limits at the reverse proxy or static host. The
values are recommendations for the current artifact; they are not application
configuration.

| Surface | Limit | Reason |
| --- | --- | --- |
| Request methods | `GET` and `HEAD` only | No write or upload endpoint exists. |
| Request body | 1 MiB maximum, rejected with 413 | The artifact accepts no body. |
| Request headers | 8 KiB per header block, 100 headers | Bound header parsing work. |
| Request line | 2 KiB | Bound URL parsing work. |
| Header timeout | 10 seconds | Bound slow-header clients. |
| Body timeout | 10 seconds | Bound slow-body clients. |
| Keep-alive timeout | 5 seconds, 100 requests per connection | Bound idle connections. |
| Concurrent connections | Host capacity, with per-IP rate limiting | Bound connection exhaustion. |
| Response compression | Disabled, or bounded to 1 MiB with a CPU limit | No attacker-controlled decompression. |
| Uploads and archives | Not routed | No upload or archive capability ships. |

## Client-side bounds

The browser runtime applies the reviewed safe-object primitive to settings,
local storage and dotted-path writes:

- reserved keys (`__proto__`, `prototype`, `constructor`) are rejected;
- accessors, inherited enumerable state, symbols, cycles and unsupported
  objects are rejected;
- nesting deeper than 64 levels is rejected;
- arrays require an explicit `replace` or `concat` policy.

These bounds keep hostile stored data from consuming unbounded work in the
client. The regression suites `g5-hostile-input.test.cjs` and
`g5-dos-boundaries.test.cjs` exercise them against the shipped bundle, and
`g5-shipping-boundary.test.cjs` verifies that the distribution exposes no
server-side request surface.
