// Node's test runner is a trusted server runtime, but does not have Next's bundler.
// Stub only the import guard; no authentication, crypto or datastore behavior is mocked.
// Avoid --conditions=react-server: the project's stable React 18 does not support it.
const id = require.resolve('server-only');
require.cache[id] = { id, filename: id, loaded: true, exports: {} };
