var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x2) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x2, {
  get: (a2, b2) => (typeof require !== "undefined" ? require : a2)[b2]
}) : x2)(function(x2) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name2) {
  return new Error(`[unenv] ${name2} is not implemented yet!`);
}
// @__NO_SIDE_EFFECTS__
function notImplemented(name2) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name2);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name2) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name2} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      static {
        __name(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name2, options) {
        this.name = name2;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
      static {
        __name(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance = class {
      static {
        __name(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e2) => e2.name !== markName) : this._entries.filter((e2) => e2.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e2) => e2.name !== measureName) : this._entries.filter((e2) => e2.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e2) => e2.entryType !== "resource" || e2.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name2, type) {
        return this._entries.filter((e2) => e2.name === name2 && (!type || e2.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e2) => e2.entryType === type);
      }
      mark(name2, options) {
        const entry = new PerformanceMark(name2, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver = class {
      static {
        __name(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream;
var init_write_stream = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class {
      static {
        __name(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x2, y2, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream;
var init_read_stream = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class {
      static {
        __name(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION;
var init_node_version = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION = "22.14.0";
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process = class _Process extends EventEmitter {
      static {
        __name(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION}`;
      }
      get versions() {
        return { node: NODE_VERSION };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      ref() {
      }
      unref() {
      }
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
      mainModule = void 0;
      domain = void 0;
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, exit, platform, nextTick, unenvProcess, abort, addListener, allowedNodeEnvironmentFlags, hasUncaughtExceptionCaptureCallback, setUncaughtExceptionCaptureCallback, loadEnvFile, sourceMapsEnabled, arch, argv, argv0, chdir, config, connected, constrainedMemory, availableMemory, cpuUsage, cwd, debugPort, dlopen, disconnect, emit, emitWarning, env, eventNames, execArgv, execPath, finalization, features, getActiveResourcesInfo, getMaxListeners, hrtime3, kill, listeners, listenerCount, memoryUsage, on, off, once, pid, ppid, prependListener, prependOnceListener, rawListeners, release, removeAllListeners, removeListener, report, resourceUsage, setMaxListeners, setSourceMapsEnabled, stderr, stdin, stdout, title, throwDeprecation, traceDeprecation, umask, uptime, version, versions, domain, initgroups, moduleLoadList, reallyExit, openStdin, assert2, binding, send, exitCode, channel, getegid, geteuid, getgid, getgroups, getuid, setegid, seteuid, setgid, setgroups, setuid, permission, mainModule, _events, _eventsCount, _exiting, _maxListeners, _debugEnd, _debugProcess, _fatalException, _getActiveHandles, _getActiveRequests, _kill, _preload_modules, _rawDebug, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, _disconnect, _handleQueue, _pendingMessage, _channel, _send, _linkedBinding, _process, process_default;
var init_process2 = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    ({ exit, platform, nextTick } = getBuiltinModule(
      "node:process"
    ));
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      nextTick
    });
    ({
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      finalization,
      features,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      on,
      off,
      once,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    } = unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// node-built-in-modules:buffer
import libDefault from "buffer";
var require_buffer = __commonJS({
  "node-built-in-modules:buffer"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault;
  }
});

// node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/safe-buffer/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var buffer = require_buffer();
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    __name(copyProps, "copyProps");
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    __name(SafeBuffer, "SafeBuffer");
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node-built-in-modules:stream
import libDefault2 from "stream";
var require_stream = __commonJS({
  "node-built-in-modules:stream"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault2;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/util/legacy-types.mjs
var isRegExp, isDate, isBoolean, isNull, isNullOrUndefined, isNumber, isString, isSymbol, isUndefined, isFunction, isBuffer, isObject, isError, isPrimitive;
var init_legacy_types = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/util/legacy-types.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    isRegExp = /* @__PURE__ */ __name((val) => val instanceof RegExp, "isRegExp");
    isDate = /* @__PURE__ */ __name((val) => val instanceof Date, "isDate");
    isBoolean = /* @__PURE__ */ __name((val) => typeof val === "boolean", "isBoolean");
    isNull = /* @__PURE__ */ __name((val) => val === null, "isNull");
    isNullOrUndefined = /* @__PURE__ */ __name((val) => val === null || val === void 0, "isNullOrUndefined");
    isNumber = /* @__PURE__ */ __name((val) => typeof val === "number", "isNumber");
    isString = /* @__PURE__ */ __name((val) => typeof val === "string", "isString");
    isSymbol = /* @__PURE__ */ __name((val) => typeof val === "symbol", "isSymbol");
    isUndefined = /* @__PURE__ */ __name((val) => val === void 0, "isUndefined");
    isFunction = /* @__PURE__ */ __name((val) => typeof val === "function", "isFunction");
    isBuffer = /* @__PURE__ */ __name((val) => {
      return val && typeof val === "object" && typeof val.copy === "function" && typeof val.fill === "function" && typeof val.readUInt8 === "function";
    }, "isBuffer");
    isObject = /* @__PURE__ */ __name((val) => val !== null && typeof val === "object" && Object.getPrototypeOf(val).isPrototypeOf(Object), "isObject");
    isError = /* @__PURE__ */ __name((val) => val instanceof Error, "isError");
    isPrimitive = /* @__PURE__ */ __name((val) => {
      if (typeof val === "object") {
        return val === null;
      }
      return typeof val !== "function";
    }, "isPrimitive");
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/util/log.mjs
var init_log = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/util/log.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/util.mjs
import types from "node:util/types";
import { default as default2 } from "node:util/types";
var TextDecoder2, TextEncoder2, _errnoException, _exceptionWithHostPort, getSystemErrorMap, getSystemErrorName, parseEnv, styleText;
var init_util = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/util.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    init_legacy_types();
    init_log();
    TextDecoder2 = globalThis.TextDecoder;
    TextEncoder2 = globalThis.TextEncoder;
    _errnoException = /* @__PURE__ */ notImplemented("util._errnoException");
    _exceptionWithHostPort = /* @__PURE__ */ notImplemented("util._exceptionWithHostPort");
    getSystemErrorMap = /* @__PURE__ */ notImplemented("util.getSystemErrorMap");
    getSystemErrorName = /* @__PURE__ */ notImplemented("util.getSystemErrorName");
    parseEnv = /* @__PURE__ */ notImplemented("util.parseEnv");
    styleText = /* @__PURE__ */ notImplemented("util.styleText");
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/util.mjs
var workerdUtil, MIMEParams, MIMEType, TextDecoder3, TextEncoder3, _extend, aborted, callbackify, debug3, debuglog, deprecate, format, formatWithOptions, getCallSite, inherits, inspect, isArray, isDeepStrictEqual, log3, parseArgs, promisify, stripVTControlCharacters, toUSVString, transferableAbortController, transferableAbortSignal, types2, util_default;
var init_util2 = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/util.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_util();
    workerdUtil = process.getBuiltinModule("node:util");
    ({
      MIMEParams,
      MIMEType,
      TextDecoder: TextDecoder3,
      TextEncoder: TextEncoder3,
      _extend: (
        // @ts-expect-error missing types?
        _extend
      ),
      aborted,
      callbackify,
      debug: debug3,
      debuglog,
      deprecate,
      format,
      formatWithOptions,
      getCallSite: (
        // @ts-expect-error unknown type
        getCallSite
      ),
      inherits,
      inspect,
      isArray,
      isDeepStrictEqual,
      log: log3,
      parseArgs,
      promisify,
      stripVTControlCharacters,
      toUSVString,
      transferableAbortController,
      transferableAbortSignal
    } = workerdUtil);
    types2 = workerdUtil.types;
    util_default = {
      /**
       * manually unroll unenv-polyfilled-symbols to make it tree-shakeable
       */
      _errnoException,
      _exceptionWithHostPort,
      // @ts-expect-error unenv has unknown type
      getSystemErrorMap,
      // @ts-expect-error unenv has unknown type
      getSystemErrorName,
      isBoolean,
      isBuffer,
      isDate,
      isError,
      isFunction,
      isNull,
      isNullOrUndefined,
      isNumber,
      isObject,
      isPrimitive,
      isRegExp,
      isString,
      isSymbol,
      isUndefined,
      // @ts-expect-error unenv has unknown type
      parseEnv,
      // @ts-expect-error unenv has unknown type
      styleText,
      /**
       * manually unroll workerd-polyfilled-symbols to make it tree-shakeable
       */
      _extend,
      aborted,
      callbackify,
      debug: debug3,
      debuglog,
      deprecate,
      format,
      formatWithOptions,
      getCallSite,
      inherits,
      inspect,
      isArray,
      isDeepStrictEqual,
      log: log3,
      MIMEParams,
      MIMEType,
      parseArgs,
      promisify,
      stripVTControlCharacters,
      TextDecoder: TextDecoder3,
      TextEncoder: TextEncoder3,
      toUSVString,
      transferableAbortController,
      transferableAbortSignal,
      // special-cased deep merged symbols
      types: types2
    };
  }
});

// node-built-in-modules:util
var require_util = __commonJS({
  "node-built-in-modules:util"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_util2();
    module.exports = util_default;
  }
});

// node_modules/jws/lib/data-stream.js
var require_data_stream = __commonJS({
  "node_modules/jws/lib/data-stream.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_safe_buffer().Buffer;
    var Stream = require_stream();
    var util = require_util();
    function DataStream(data) {
      this.buffer = null;
      this.writable = true;
      this.readable = true;
      if (!data) {
        this.buffer = Buffer2.alloc(0);
        return this;
      }
      if (typeof data.pipe === "function") {
        this.buffer = Buffer2.alloc(0);
        data.pipe(this);
        return this;
      }
      if (data.length || typeof data === "object") {
        this.buffer = data;
        this.writable = false;
        process.nextTick(function() {
          this.emit("end", data);
          this.readable = false;
          this.emit("close");
        }.bind(this));
        return this;
      }
      throw new TypeError("Unexpected data type (" + typeof data + ")");
    }
    __name(DataStream, "DataStream");
    util.inherits(DataStream, Stream);
    DataStream.prototype.write = /* @__PURE__ */ __name(function write(data) {
      this.buffer = Buffer2.concat([this.buffer, Buffer2.from(data)]);
      this.emit("data", data);
    }, "write");
    DataStream.prototype.end = /* @__PURE__ */ __name(function end(data) {
      if (data)
        this.write(data);
      this.emit("end", data);
      this.emit("close");
      this.writable = false;
      this.readable = false;
    }, "end");
    module.exports = DataStream;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/crypto/web.mjs
var subtle;
var init_web = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/crypto/web.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    subtle = globalThis.crypto?.subtle;
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/crypto/node.mjs
var webcrypto, createCipher, createDecipher, pseudoRandomBytes, Cipher, Decipher;
var init_node = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/crypto/node.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    webcrypto = new Proxy(globalThis.crypto, { get(_2, key) {
      if (key === "CryptoKey") {
        return globalThis.CryptoKey;
      }
      if (typeof globalThis.crypto[key] === "function") {
        return globalThis.crypto[key].bind(globalThis.crypto);
      }
      return globalThis.crypto[key];
    } });
    createCipher = /* @__PURE__ */ notImplemented("crypto.createCipher");
    createDecipher = /* @__PURE__ */ notImplemented("crypto.createDecipher");
    pseudoRandomBytes = /* @__PURE__ */ notImplemented("crypto.pseudoRandomBytes");
    Cipher = /* @__PURE__ */ notImplementedClass("crypto.Cipher");
    Decipher = /* @__PURE__ */ notImplementedClass("crypto.Decipher");
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/crypto.mjs
var init_crypto = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/unenv/dist/runtime/node/crypto.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_web();
    init_node();
  }
});

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/crypto.mjs
var workerdCrypto, Certificate, checkPrime, checkPrimeSync, constants, Cipheriv, createCipheriv, createDecipheriv, createDiffieHellman, createDiffieHellmanGroup, createECDH, createHash, createHmac, createPrivateKey, createPublicKey, createSecretKey, createSign, createVerify, Decipheriv, diffieHellman, DiffieHellman, DiffieHellmanGroup, ECDH, fips, generateKey, generateKeyPair, generateKeyPairSync, generateKeySync, generatePrime, generatePrimeSync, getCipherInfo, getCiphers, getCurves, getDiffieHellman, getFips, getHashes, getRandomValues, hash, Hash, hkdf, hkdfSync, Hmac, KeyObject, pbkdf2, pbkdf2Sync, privateDecrypt, privateEncrypt, publicDecrypt, publicEncrypt, randomBytes, randomFill, randomFillSync, randomInt, randomUUID, scrypt, scryptSync, secureHeapUsed, setEngine, setFips, sign, Sign, subtle2, timingSafeEqual, verify, Verify, X509Certificate, webcrypto2, crypto_default;
var init_crypto2 = __esm({
  "../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/crypto.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_crypto();
    workerdCrypto = process.getBuiltinModule("node:crypto");
    ({
      Certificate,
      checkPrime,
      checkPrimeSync,
      constants,
      Cipheriv: (
        // @ts-expect-error
        Cipheriv
      ),
      createCipheriv,
      createDecipheriv,
      createDiffieHellman,
      createDiffieHellmanGroup,
      createECDH,
      createHash,
      createHmac,
      createPrivateKey,
      createPublicKey,
      createSecretKey,
      createSign,
      createVerify,
      Decipheriv: (
        // @ts-expect-error
        Decipheriv
      ),
      diffieHellman,
      DiffieHellman,
      DiffieHellmanGroup,
      ECDH,
      fips,
      generateKey,
      generateKeyPair,
      generateKeyPairSync,
      generateKeySync,
      generatePrime,
      generatePrimeSync,
      getCipherInfo,
      getCiphers,
      getCurves,
      getDiffieHellman,
      getFips,
      getHashes,
      getRandomValues,
      hash,
      Hash,
      hkdf,
      hkdfSync,
      Hmac,
      KeyObject,
      pbkdf2,
      pbkdf2Sync,
      privateDecrypt,
      privateEncrypt,
      publicDecrypt,
      publicEncrypt,
      randomBytes,
      randomFill,
      randomFillSync,
      randomInt,
      randomUUID,
      scrypt,
      scryptSync,
      secureHeapUsed,
      setEngine,
      setFips,
      sign,
      Sign,
      subtle: subtle2,
      timingSafeEqual,
      verify,
      Verify,
      X509Certificate
    } = workerdCrypto);
    webcrypto2 = {
      // @ts-expect-error
      CryptoKey: webcrypto.CryptoKey,
      getRandomValues,
      randomUUID,
      subtle: subtle2
    };
    crypto_default = {
      /**
       * manually unroll unenv-polyfilled-symbols to make it tree-shakeable
       */
      Certificate,
      Cipher,
      Cipheriv,
      Decipher,
      Decipheriv,
      ECDH,
      Sign,
      Verify,
      X509Certificate,
      constants,
      createCipheriv,
      createDecipheriv,
      createECDH,
      createSign,
      createVerify,
      diffieHellman,
      getCipherInfo,
      hash,
      privateDecrypt,
      privateEncrypt,
      publicDecrypt,
      publicEncrypt,
      scrypt,
      scryptSync,
      sign,
      verify,
      // default-only export from unenv
      // @ts-expect-error unenv has unknown type
      createCipher,
      // @ts-expect-error unenv has unknown type
      createDecipher,
      // @ts-expect-error unenv has unknown type
      pseudoRandomBytes,
      /**
       * manually unroll workerd-polyfilled-symbols to make it tree-shakeable
       */
      DiffieHellman,
      DiffieHellmanGroup,
      Hash,
      Hmac,
      KeyObject,
      checkPrime,
      checkPrimeSync,
      createDiffieHellman,
      createDiffieHellmanGroup,
      createHash,
      createHmac,
      createPrivateKey,
      createPublicKey,
      createSecretKey,
      generateKey,
      generateKeyPair,
      generateKeyPairSync,
      generateKeySync,
      generatePrime,
      generatePrimeSync,
      getCiphers,
      getCurves,
      getDiffieHellman,
      getFips,
      getHashes,
      getRandomValues,
      hkdf,
      hkdfSync,
      pbkdf2,
      pbkdf2Sync,
      randomBytes,
      randomFill,
      randomFillSync,
      randomInt,
      randomUUID,
      secureHeapUsed,
      setEngine,
      setFips,
      subtle: subtle2,
      timingSafeEqual,
      // default-only export from workerd
      fips,
      // special-cased deep merged symbols
      webcrypto: webcrypto2
    };
  }
});

// node-built-in-modules:crypto
var require_crypto = __commonJS({
  "node-built-in-modules:crypto"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_crypto2();
    module.exports = crypto_default;
  }
});

// node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js
var require_param_bytes_for_alg = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function getParamSize(keySize) {
      var result = (keySize / 8 | 0) + (keySize % 8 === 0 ? 0 : 1);
      return result;
    }
    __name(getParamSize, "getParamSize");
    var paramBytesForAlg = {
      ES256: getParamSize(256),
      ES384: getParamSize(384),
      ES512: getParamSize(521)
    };
    function getParamBytesForAlg(alg) {
      var paramBytes = paramBytesForAlg[alg];
      if (paramBytes) {
        return paramBytes;
      }
      throw new Error('Unknown algorithm "' + alg + '"');
    }
    __name(getParamBytesForAlg, "getParamBytesForAlg");
    module.exports = getParamBytesForAlg;
  }
});

// node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js
var require_ecdsa_sig_formatter = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_safe_buffer().Buffer;
    var getParamBytesForAlg = require_param_bytes_for_alg();
    var MAX_OCTET = 128;
    var CLASS_UNIVERSAL = 0;
    var PRIMITIVE_BIT = 32;
    var TAG_SEQ = 16;
    var TAG_INT = 2;
    var ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | CLASS_UNIVERSAL << 6;
    var ENCODED_TAG_INT = TAG_INT | CLASS_UNIVERSAL << 6;
    function base64Url(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    __name(base64Url, "base64Url");
    function signatureAsBuffer(signature) {
      if (Buffer2.isBuffer(signature)) {
        return signature;
      } else if ("string" === typeof signature) {
        return Buffer2.from(signature, "base64");
      }
      throw new TypeError("ECDSA signature must be a Base64 string or a Buffer");
    }
    __name(signatureAsBuffer, "signatureAsBuffer");
    function derToJose(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var maxEncodedParamLength = paramBytes + 1;
      var inputLength = signature.length;
      var offset = 0;
      if (signature[offset++] !== ENCODED_TAG_SEQ) {
        throw new Error('Could not find expected "seq"');
      }
      var seqLength = signature[offset++];
      if (seqLength === (MAX_OCTET | 1)) {
        seqLength = signature[offset++];
      }
      if (inputLength - offset < seqLength) {
        throw new Error('"seq" specified length of "' + seqLength + '", only "' + (inputLength - offset) + '" remaining');
      }
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "r"');
      }
      var rLength = signature[offset++];
      if (inputLength - offset - 2 < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", only "' + (inputLength - offset - 2) + '" available');
      }
      if (maxEncodedParamLength < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var rOffset = offset;
      offset += rLength;
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "s"');
      }
      var sLength = signature[offset++];
      if (inputLength - offset !== sLength) {
        throw new Error('"s" specified length of "' + sLength + '", expected "' + (inputLength - offset) + '"');
      }
      if (maxEncodedParamLength < sLength) {
        throw new Error('"s" specified length of "' + sLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var sOffset = offset;
      offset += sLength;
      if (offset !== inputLength) {
        throw new Error('Expected to consume entire buffer, but "' + (inputLength - offset) + '" bytes remain');
      }
      var rPadding = paramBytes - rLength, sPadding = paramBytes - sLength;
      var dst = Buffer2.allocUnsafe(rPadding + rLength + sPadding + sLength);
      for (offset = 0; offset < rPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
      offset = paramBytes;
      for (var o2 = offset; offset < o2 + sPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
      dst = dst.toString("base64");
      dst = base64Url(dst);
      return dst;
    }
    __name(derToJose, "derToJose");
    function countPadding(buf, start, stop) {
      var padding = 0;
      while (start + padding < stop && buf[start + padding] === 0) {
        ++padding;
      }
      var needsSign = buf[start + padding] >= MAX_OCTET;
      if (needsSign) {
        --padding;
      }
      return padding;
    }
    __name(countPadding, "countPadding");
    function joseToDer(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var signatureBytes = signature.length;
      if (signatureBytes !== paramBytes * 2) {
        throw new TypeError('"' + alg + '" signatures must be "' + paramBytes * 2 + '" bytes, saw "' + signatureBytes + '"');
      }
      var rPadding = countPadding(signature, 0, paramBytes);
      var sPadding = countPadding(signature, paramBytes, signature.length);
      var rLength = paramBytes - rPadding;
      var sLength = paramBytes - sPadding;
      var rsBytes = 1 + 1 + rLength + 1 + 1 + sLength;
      var shortLength = rsBytes < MAX_OCTET;
      var dst = Buffer2.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
      var offset = 0;
      dst[offset++] = ENCODED_TAG_SEQ;
      if (shortLength) {
        dst[offset++] = rsBytes;
      } else {
        dst[offset++] = MAX_OCTET | 1;
        dst[offset++] = rsBytes & 255;
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = rLength;
      if (rPadding < 0) {
        dst[offset++] = 0;
        offset += signature.copy(dst, offset, 0, paramBytes);
      } else {
        offset += signature.copy(dst, offset, rPadding, paramBytes);
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = sLength;
      if (sPadding < 0) {
        dst[offset++] = 0;
        signature.copy(dst, offset, paramBytes);
      } else {
        signature.copy(dst, offset, paramBytes + sPadding);
      }
      return dst;
    }
    __name(joseToDer, "joseToDer");
    module.exports = {
      derToJose,
      joseToDer
    };
  }
});

// node_modules/buffer-equal-constant-time/index.js
var require_buffer_equal_constant_time = __commonJS({
  "node_modules/buffer-equal-constant-time/index.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_buffer().Buffer;
    var SlowBuffer = require_buffer().SlowBuffer;
    module.exports = bufferEq;
    function bufferEq(a2, b2) {
      if (!Buffer2.isBuffer(a2) || !Buffer2.isBuffer(b2)) {
        return false;
      }
      if (a2.length !== b2.length) {
        return false;
      }
      var c2 = 0;
      for (var i2 = 0; i2 < a2.length; i2++) {
        c2 |= a2[i2] ^ b2[i2];
      }
      return c2 === 0;
    }
    __name(bufferEq, "bufferEq");
    bufferEq.install = function() {
      Buffer2.prototype.equal = SlowBuffer.prototype.equal = /* @__PURE__ */ __name(function equal(that) {
        return bufferEq(this, that);
      }, "equal");
    };
    var origBufEqual = Buffer2.prototype.equal;
    var origSlowBufEqual = SlowBuffer.prototype.equal;
    bufferEq.restore = function() {
      Buffer2.prototype.equal = origBufEqual;
      SlowBuffer.prototype.equal = origSlowBufEqual;
    };
  }
});

// node_modules/jwa/index.js
var require_jwa = __commonJS({
  "node_modules/jwa/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_safe_buffer().Buffer;
    var crypto2 = require_crypto();
    var formatEcdsa = require_ecdsa_sig_formatter();
    var util = require_util();
    var MSG_INVALID_ALGORITHM = '"%s" is not a valid algorithm.\n  Supported algorithms are:\n  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".';
    var MSG_INVALID_SECRET = "secret must be a string or buffer";
    var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
    var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
    var supportsKeyObjects = typeof crypto2.createPublicKey === "function";
    if (supportsKeyObjects) {
      MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
      MSG_INVALID_SECRET += "or a KeyObject";
    }
    function checkIsPublicKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (!supportsKeyObjects) {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key !== "object") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.type !== "string") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.asymmetricKeyType !== "string") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.export !== "function") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
    }
    __name(checkIsPublicKey, "checkIsPublicKey");
    function checkIsPrivateKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (typeof key === "object") {
        return;
      }
      throw typeError(MSG_INVALID_SIGNER_KEY);
    }
    __name(checkIsPrivateKey, "checkIsPrivateKey");
    function checkIsSecretKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return key;
      }
      if (!supportsKeyObjects) {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (typeof key !== "object") {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (key.type !== "secret") {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (typeof key.export !== "function") {
        throw typeError(MSG_INVALID_SECRET);
      }
    }
    __name(checkIsSecretKey, "checkIsSecretKey");
    function fromBase64(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    __name(fromBase64, "fromBase64");
    function toBase64(base64url) {
      base64url = base64url.toString();
      var padding = 4 - base64url.length % 4;
      if (padding !== 4) {
        for (var i2 = 0; i2 < padding; ++i2) {
          base64url += "=";
        }
      }
      return base64url.replace(/\-/g, "+").replace(/_/g, "/");
    }
    __name(toBase64, "toBase64");
    function typeError(template) {
      var args = [].slice.call(arguments, 1);
      var errMsg = util.format.bind(util, template).apply(null, args);
      return new TypeError(errMsg);
    }
    __name(typeError, "typeError");
    function bufferOrString(obj) {
      return Buffer2.isBuffer(obj) || typeof obj === "string";
    }
    __name(bufferOrString, "bufferOrString");
    function normalizeInput(thing) {
      if (!bufferOrString(thing))
        thing = JSON.stringify(thing);
      return thing;
    }
    __name(normalizeInput, "normalizeInput");
    function createHmacSigner(bits) {
      return /* @__PURE__ */ __name(function sign2(thing, secret) {
        checkIsSecretKey(secret);
        thing = normalizeInput(thing);
        var hmac = crypto2.createHmac("sha" + bits, secret);
        var sig = (hmac.update(thing), hmac.digest("base64"));
        return fromBase64(sig);
      }, "sign");
    }
    __name(createHmacSigner, "createHmacSigner");
    var bufferEqual;
    var timingSafeEqual2 = "timingSafeEqual" in crypto2 ? /* @__PURE__ */ __name(function timingSafeEqual3(a2, b2) {
      if (a2.byteLength !== b2.byteLength) {
        return false;
      }
      return crypto2.timingSafeEqual(a2, b2);
    }, "timingSafeEqual") : /* @__PURE__ */ __name(function timingSafeEqual3(a2, b2) {
      if (!bufferEqual) {
        bufferEqual = require_buffer_equal_constant_time();
      }
      return bufferEqual(a2, b2);
    }, "timingSafeEqual");
    function createHmacVerifier(bits) {
      return /* @__PURE__ */ __name(function verify2(thing, signature, secret) {
        var computedSig = createHmacSigner(bits)(thing, secret);
        return timingSafeEqual2(Buffer2.from(signature), Buffer2.from(computedSig));
      }, "verify");
    }
    __name(createHmacVerifier, "createHmacVerifier");
    function createKeySigner(bits) {
      return /* @__PURE__ */ __name(function sign2(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto2.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign(privateKey, "base64"));
        return fromBase64(sig);
      }, "sign");
    }
    __name(createKeySigner, "createKeySigner");
    function createKeyVerifier(bits) {
      return /* @__PURE__ */ __name(function verify2(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto2.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify(publicKey, signature, "base64");
      }, "verify");
    }
    __name(createKeyVerifier, "createKeyVerifier");
    function createPSSKeySigner(bits) {
      return /* @__PURE__ */ __name(function sign2(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto2.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign({
          key: privateKey,
          padding: crypto2.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto2.constants.RSA_PSS_SALTLEN_DIGEST
        }, "base64"));
        return fromBase64(sig);
      }, "sign");
    }
    __name(createPSSKeySigner, "createPSSKeySigner");
    function createPSSKeyVerifier(bits) {
      return /* @__PURE__ */ __name(function verify2(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto2.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify({
          key: publicKey,
          padding: crypto2.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto2.constants.RSA_PSS_SALTLEN_DIGEST
        }, signature, "base64");
      }, "verify");
    }
    __name(createPSSKeyVerifier, "createPSSKeyVerifier");
    function createECDSASigner(bits) {
      var inner = createKeySigner(bits);
      return /* @__PURE__ */ __name(function sign2() {
        var signature = inner.apply(null, arguments);
        signature = formatEcdsa.derToJose(signature, "ES" + bits);
        return signature;
      }, "sign");
    }
    __name(createECDSASigner, "createECDSASigner");
    function createECDSAVerifer(bits) {
      var inner = createKeyVerifier(bits);
      return /* @__PURE__ */ __name(function verify2(thing, signature, publicKey) {
        signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
        var result = inner(thing, signature, publicKey);
        return result;
      }, "verify");
    }
    __name(createECDSAVerifer, "createECDSAVerifer");
    function createNoneSigner() {
      return /* @__PURE__ */ __name(function sign2() {
        return "";
      }, "sign");
    }
    __name(createNoneSigner, "createNoneSigner");
    function createNoneVerifier() {
      return /* @__PURE__ */ __name(function verify2(thing, signature) {
        return signature === "";
      }, "verify");
    }
    __name(createNoneVerifier, "createNoneVerifier");
    module.exports = /* @__PURE__ */ __name(function jwa(algorithm) {
      var signerFactories = {
        hs: createHmacSigner,
        rs: createKeySigner,
        ps: createPSSKeySigner,
        es: createECDSASigner,
        none: createNoneSigner
      };
      var verifierFactories = {
        hs: createHmacVerifier,
        rs: createKeyVerifier,
        ps: createPSSKeyVerifier,
        es: createECDSAVerifer,
        none: createNoneVerifier
      };
      var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/i);
      if (!match)
        throw typeError(MSG_INVALID_ALGORITHM, algorithm);
      var algo = (match[1] || match[3]).toLowerCase();
      var bits = match[2];
      return {
        sign: signerFactories[algo](bits),
        verify: verifierFactories[algo](bits)
      };
    }, "jwa");
  }
});

// node_modules/jws/lib/tostring.js
var require_tostring = __commonJS({
  "node_modules/jws/lib/tostring.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_buffer().Buffer;
    module.exports = /* @__PURE__ */ __name(function toString(obj) {
      if (typeof obj === "string")
        return obj;
      if (typeof obj === "number" || Buffer2.isBuffer(obj))
        return obj.toString();
      return JSON.stringify(obj);
    }, "toString");
  }
});

// node_modules/jws/lib/sign-stream.js
var require_sign_stream = __commonJS({
  "node_modules/jws/lib/sign-stream.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream = require_stream();
    var toString = require_tostring();
    var util = require_util();
    function base64url(string, encoding) {
      return Buffer2.from(string, encoding).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    __name(base64url, "base64url");
    function jwsSecuredInput(header, payload, encoding) {
      encoding = encoding || "utf8";
      var encodedHeader = base64url(toString(header), "binary");
      var encodedPayload = base64url(toString(payload), encoding);
      return util.format("%s.%s", encodedHeader, encodedPayload);
    }
    __name(jwsSecuredInput, "jwsSecuredInput");
    function jwsSign(opts) {
      var header = opts.header;
      var payload = opts.payload;
      var secretOrKey = opts.secret || opts.privateKey;
      var encoding = opts.encoding;
      var algo = jwa(header.alg);
      var securedInput = jwsSecuredInput(header, payload, encoding);
      var signature = algo.sign(securedInput, secretOrKey);
      return util.format("%s.%s", securedInput, signature);
    }
    __name(jwsSign, "jwsSign");
    function SignStream(opts) {
      var secret = opts.secret || opts.privateKey || opts.key;
      var secretStream = new DataStream(secret);
      this.readable = true;
      this.header = opts.header;
      this.encoding = opts.encoding;
      this.secret = this.privateKey = this.key = secretStream;
      this.payload = new DataStream(opts.payload);
      this.secret.once("close", function() {
        if (!this.payload.writable && this.readable)
          this.sign();
      }.bind(this));
      this.payload.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.sign();
      }.bind(this));
    }
    __name(SignStream, "SignStream");
    util.inherits(SignStream, Stream);
    SignStream.prototype.sign = /* @__PURE__ */ __name(function sign2() {
      try {
        var signature = jwsSign({
          header: this.header,
          payload: this.payload.buffer,
          secret: this.secret.buffer,
          encoding: this.encoding
        });
        this.emit("done", signature);
        this.emit("data", signature);
        this.emit("end");
        this.readable = false;
        return signature;
      } catch (e2) {
        this.readable = false;
        this.emit("error", e2);
        this.emit("close");
      }
    }, "sign");
    SignStream.sign = jwsSign;
    module.exports = SignStream;
  }
});

// node_modules/jws/lib/verify-stream.js
var require_verify_stream = __commonJS({
  "node_modules/jws/lib/verify-stream.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream = require_stream();
    var toString = require_tostring();
    var util = require_util();
    var JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
    function isObject2(thing) {
      return Object.prototype.toString.call(thing) === "[object Object]";
    }
    __name(isObject2, "isObject");
    function safeJsonParse(thing) {
      if (isObject2(thing))
        return thing;
      try {
        return JSON.parse(thing);
      } catch (e2) {
        return void 0;
      }
    }
    __name(safeJsonParse, "safeJsonParse");
    function headerFromJWS(jwsSig) {
      var encodedHeader = jwsSig.split(".", 1)[0];
      return safeJsonParse(Buffer2.from(encodedHeader, "base64").toString("binary"));
    }
    __name(headerFromJWS, "headerFromJWS");
    function securedInputFromJWS(jwsSig) {
      return jwsSig.split(".", 2).join(".");
    }
    __name(securedInputFromJWS, "securedInputFromJWS");
    function signatureFromJWS(jwsSig) {
      return jwsSig.split(".")[2];
    }
    __name(signatureFromJWS, "signatureFromJWS");
    function payloadFromJWS(jwsSig, encoding) {
      encoding = encoding || "utf8";
      var payload = jwsSig.split(".")[1];
      return Buffer2.from(payload, "base64").toString(encoding);
    }
    __name(payloadFromJWS, "payloadFromJWS");
    function isValidJws(string) {
      return JWS_REGEX.test(string) && !!headerFromJWS(string);
    }
    __name(isValidJws, "isValidJws");
    function jwsVerify(jwsSig, algorithm, secretOrKey) {
      if (!algorithm) {
        var err = new Error("Missing algorithm parameter for jws.verify");
        err.code = "MISSING_ALGORITHM";
        throw err;
      }
      jwsSig = toString(jwsSig);
      var signature = signatureFromJWS(jwsSig);
      var securedInput = securedInputFromJWS(jwsSig);
      var algo = jwa(algorithm);
      return algo.verify(securedInput, signature, secretOrKey);
    }
    __name(jwsVerify, "jwsVerify");
    function jwsDecode(jwsSig, opts) {
      opts = opts || {};
      jwsSig = toString(jwsSig);
      if (!isValidJws(jwsSig))
        return null;
      var header = headerFromJWS(jwsSig);
      if (!header)
        return null;
      var payload = payloadFromJWS(jwsSig);
      if (header.typ === "JWT" || opts.json)
        payload = JSON.parse(payload, opts.encoding);
      return {
        header,
        payload,
        signature: signatureFromJWS(jwsSig)
      };
    }
    __name(jwsDecode, "jwsDecode");
    function VerifyStream(opts) {
      opts = opts || {};
      var secretOrKey = opts.secret || opts.publicKey || opts.key;
      var secretStream = new DataStream(secretOrKey);
      this.readable = true;
      this.algorithm = opts.algorithm;
      this.encoding = opts.encoding;
      this.secret = this.publicKey = this.key = secretStream;
      this.signature = new DataStream(opts.signature);
      this.secret.once("close", function() {
        if (!this.signature.writable && this.readable)
          this.verify();
      }.bind(this));
      this.signature.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.verify();
      }.bind(this));
    }
    __name(VerifyStream, "VerifyStream");
    util.inherits(VerifyStream, Stream);
    VerifyStream.prototype.verify = /* @__PURE__ */ __name(function verify2() {
      try {
        var valid = jwsVerify(this.signature.buffer, this.algorithm, this.key.buffer);
        var obj = jwsDecode(this.signature.buffer, this.encoding);
        this.emit("done", valid, obj);
        this.emit("data", valid);
        this.emit("end");
        this.readable = false;
        return valid;
      } catch (e2) {
        this.readable = false;
        this.emit("error", e2);
        this.emit("close");
      }
    }, "verify");
    VerifyStream.decode = jwsDecode;
    VerifyStream.isValid = isValidJws;
    VerifyStream.verify = jwsVerify;
    module.exports = VerifyStream;
  }
});

// node_modules/jws/index.js
var require_jws = __commonJS({
  "node_modules/jws/index.js"(exports) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SignStream = require_sign_stream();
    var VerifyStream = require_verify_stream();
    var ALGORITHMS = [
      "HS256",
      "HS384",
      "HS512",
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512"
    ];
    exports.ALGORITHMS = ALGORITHMS;
    exports.sign = SignStream.sign;
    exports.verify = VerifyStream.verify;
    exports.decode = VerifyStream.decode;
    exports.isValid = VerifyStream.isValid;
    exports.createSign = /* @__PURE__ */ __name(function createSign2(opts) {
      return new SignStream(opts);
    }, "createSign");
    exports.createVerify = /* @__PURE__ */ __name(function createVerify2(opts) {
      return new VerifyStream(opts);
    }, "createVerify");
  }
});

// node_modules/jsonwebtoken/decode.js
var require_decode = __commonJS({
  "node_modules/jsonwebtoken/decode.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var jws = require_jws();
    module.exports = function(jwt2, options) {
      options = options || {};
      var decoded = jws.decode(jwt2, options);
      if (!decoded) {
        return null;
      }
      var payload = decoded.payload;
      if (typeof payload === "string") {
        try {
          var obj = JSON.parse(payload);
          if (obj !== null && typeof obj === "object") {
            payload = obj;
          }
        } catch (e2) {
        }
      }
      if (options.complete === true) {
        return {
          header: decoded.header,
          payload,
          signature: decoded.signature
        };
      }
      return payload;
    };
  }
});

// node_modules/jsonwebtoken/lib/JsonWebTokenError.js
var require_JsonWebTokenError = __commonJS({
  "node_modules/jsonwebtoken/lib/JsonWebTokenError.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var JsonWebTokenError = /* @__PURE__ */ __name(function(message, error3) {
      Error.call(this, message);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
      this.name = "JsonWebTokenError";
      this.message = message;
      if (error3) this.inner = error3;
    }, "JsonWebTokenError");
    JsonWebTokenError.prototype = Object.create(Error.prototype);
    JsonWebTokenError.prototype.constructor = JsonWebTokenError;
    module.exports = JsonWebTokenError;
  }
});

// node_modules/jsonwebtoken/lib/NotBeforeError.js
var require_NotBeforeError = __commonJS({
  "node_modules/jsonwebtoken/lib/NotBeforeError.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var JsonWebTokenError = require_JsonWebTokenError();
    var NotBeforeError = /* @__PURE__ */ __name(function(message, date) {
      JsonWebTokenError.call(this, message);
      this.name = "NotBeforeError";
      this.date = date;
    }, "NotBeforeError");
    NotBeforeError.prototype = Object.create(JsonWebTokenError.prototype);
    NotBeforeError.prototype.constructor = NotBeforeError;
    module.exports = NotBeforeError;
  }
});

// node_modules/jsonwebtoken/lib/TokenExpiredError.js
var require_TokenExpiredError = __commonJS({
  "node_modules/jsonwebtoken/lib/TokenExpiredError.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var JsonWebTokenError = require_JsonWebTokenError();
    var TokenExpiredError = /* @__PURE__ */ __name(function(message, expiredAt) {
      JsonWebTokenError.call(this, message);
      this.name = "TokenExpiredError";
      this.expiredAt = expiredAt;
    }, "TokenExpiredError");
    TokenExpiredError.prototype = Object.create(JsonWebTokenError.prototype);
    TokenExpiredError.prototype.constructor = TokenExpiredError;
    module.exports = TokenExpiredError;
  }
});

// node_modules/jsonwebtoken/node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/jsonwebtoken/node_modules/ms/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var s2 = 1e3;
    var m2 = s2 * 60;
    var h2 = m2 * 60;
    var d2 = h2 * 24;
    var w2 = d2 * 7;
    var y2 = d2 * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse2(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse2(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n2 = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n2 * y2;
        case "weeks":
        case "week":
        case "w":
          return n2 * w2;
        case "days":
        case "day":
        case "d":
          return n2 * d2;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n2 * h2;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n2 * m2;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n2 * s2;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n2;
        default:
          return void 0;
      }
    }
    __name(parse2, "parse");
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d2) {
        return Math.round(ms / d2) + "d";
      }
      if (msAbs >= h2) {
        return Math.round(ms / h2) + "h";
      }
      if (msAbs >= m2) {
        return Math.round(ms / m2) + "m";
      }
      if (msAbs >= s2) {
        return Math.round(ms / s2) + "s";
      }
      return ms + "ms";
    }
    __name(fmtShort, "fmtShort");
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d2) {
        return plural(ms, msAbs, d2, "day");
      }
      if (msAbs >= h2) {
        return plural(ms, msAbs, h2, "hour");
      }
      if (msAbs >= m2) {
        return plural(ms, msAbs, m2, "minute");
      }
      if (msAbs >= s2) {
        return plural(ms, msAbs, s2, "second");
      }
      return ms + " ms";
    }
    __name(fmtLong, "fmtLong");
    function plural(ms, msAbs, n2, name2) {
      var isPlural = msAbs >= n2 * 1.5;
      return Math.round(ms / n2) + " " + name2 + (isPlural ? "s" : "");
    }
    __name(plural, "plural");
  }
});

// node_modules/jsonwebtoken/lib/timespan.js
var require_timespan = __commonJS({
  "node_modules/jsonwebtoken/lib/timespan.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var ms = require_ms();
    module.exports = function(time3, iat) {
      var timestamp = iat || Math.floor(Date.now() / 1e3);
      if (typeof time3 === "string") {
        var milliseconds = ms(time3);
        if (typeof milliseconds === "undefined") {
          return;
        }
        return Math.floor(timestamp + milliseconds / 1e3);
      } else if (typeof time3 === "number") {
        return timestamp + time3;
      } else {
        return;
      }
    };
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var debug4 = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug4;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug4 = require_debug();
    exports = module.exports = {};
    var re2 = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t2 = exports.t = {};
    var R2 = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = /* @__PURE__ */ __name((value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    }, "makeSafeRegex");
    var createToken = /* @__PURE__ */ __name((name2, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R2++;
      debug4(name2, index, value);
      t2[name2] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    }, "createToken");
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t2.NONNUMERICIDENTIFIER]}|${src[t2.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t2.NONNUMERICIDENTIFIER]}|${src[t2.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t2.PRERELEASEIDENTIFIER]}(?:\\.${src[t2.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t2.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t2.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t2.BUILDIDENTIFIER]}(?:\\.${src[t2.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t2.MAINVERSION]}${src[t2.PRERELEASE]}?${src[t2.BUILD]}?`);
    createToken("FULL", `^${src[t2.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t2.MAINVERSIONLOOSE]}${src[t2.PRERELEASELOOSE]}?${src[t2.BUILD]}?`);
    createToken("LOOSE", `^${src[t2.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t2.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t2.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:${src[t2.PRERELEASE]})?${src[t2.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:${src[t2.PRERELEASELOOSE]})?${src[t2.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t2.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t2.COERCEPLAIN] + `(?:${src[t2.PRERELEASE]})?(?:${src[t2.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t2.COERCE], true);
    createToken("COERCERTLFULL", src[t2.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t2.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t2.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t2.GTLT]}\\s*(${src[t2.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]}|${src[t2.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t2.XRANGEPLAIN]})\\s+-\\s+(${src[t2.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t2.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t2.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = /* @__PURE__ */ __name((options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    }, "parseOptions");
    module.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = /* @__PURE__ */ __name((a2, b2) => {
      const anum = numeric.test(a2);
      const bnum = numeric.test(b2);
      if (anum && bnum) {
        a2 = +a2;
        b2 = +b2;
      }
      return a2 === b2 ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a2 < b2 ? -1 : 1;
    }, "compareIdentifiers");
    var rcompareIdentifiers = /* @__PURE__ */ __name((a2, b2) => compareIdentifiers(b2, a2), "rcompareIdentifiers");
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var debug4 = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re2, t: t2 } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      static {
        __name(this, "SemVer");
      }
      constructor(version2, options) {
        options = parseOptions(options);
        if (version2 instanceof _SemVer) {
          if (version2.loose === !!options.loose && version2.includePrerelease === !!options.includePrerelease) {
            return version2;
          } else {
            version2 = version2.version;
          }
        } else if (typeof version2 !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version2}".`);
        }
        if (version2.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug4("SemVer", version2, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m2 = version2.trim().match(options.loose ? re2[t2.LOOSE] : re2[t2.FULL]);
        if (!m2) {
          throw new TypeError(`Invalid Version: ${version2}`);
        }
        this.raw = version2;
        this.major = +m2[1];
        this.minor = +m2[2];
        this.patch = +m2[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m2[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m2[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m2[5] ? m2[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug4("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i2 = 0;
        do {
          const a2 = this.prerelease[i2];
          const b2 = other.prerelease[i2];
          debug4("prerelease compare", i2, a2, b2);
          if (a2 === void 0 && b2 === void 0) {
            return 0;
          } else if (b2 === void 0) {
            return 1;
          } else if (a2 === void 0) {
            return -1;
          } else if (a2 === b2) {
            continue;
          } else {
            return compareIdentifiers(a2, b2);
          }
        } while (++i2);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i2 = 0;
        do {
          const a2 = this.build[i2];
          const b2 = other.build[i2];
          debug4("build compare", i2, a2, b2);
          if (a2 === void 0 && b2 === void 0) {
            return 0;
          } else if (b2 === void 0) {
            return 1;
          } else if (a2 === void 0) {
            return -1;
          } else if (a2 === b2) {
            continue;
          } else {
            return compareIdentifiers(a2, b2);
          }
        } while (++i2);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release2, identifier, identifierBase) {
        if (release2.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re2[t2.PRERELEASELOOSE] : re2[t2.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release2) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i2 = this.prerelease.length;
              while (--i2 >= 0) {
                if (typeof this.prerelease[i2] === "number") {
                  this.prerelease[i2]++;
                  i2 = -2;
                }
              }
              if (i2 === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release2}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var parse2 = /* @__PURE__ */ __name((version2, options, throwErrors = false) => {
      if (version2 instanceof SemVer) {
        return version2;
      }
      try {
        return new SemVer(version2, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    }, "parse");
    module.exports = parse2;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var parse2 = require_parse();
    var valid = /* @__PURE__ */ __name((version2, options) => {
      const v2 = parse2(version2, options);
      return v2 ? v2.version : null;
    }, "valid");
    module.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var parse2 = require_parse();
    var clean = /* @__PURE__ */ __name((version2, options) => {
      const s2 = parse2(version2.trim().replace(/^[=v]+/, ""), options);
      return s2 ? s2.version : null;
    }, "clean");
    module.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var inc = /* @__PURE__ */ __name((version2, release2, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version2 instanceof SemVer ? version2.version : version2,
          options
        ).inc(release2, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    }, "inc");
    module.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var parse2 = require_parse();
    var diff = /* @__PURE__ */ __name((version1, version2) => {
      const v1 = parse2(version1, null, true);
      const v2 = parse2(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    }, "diff");
    module.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var major = /* @__PURE__ */ __name((a2, loose) => new SemVer(a2, loose).major, "major");
    module.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var minor = /* @__PURE__ */ __name((a2, loose) => new SemVer(a2, loose).minor, "minor");
    module.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var patch = /* @__PURE__ */ __name((a2, loose) => new SemVer(a2, loose).patch, "patch");
    module.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var parse2 = require_parse();
    var prerelease = /* @__PURE__ */ __name((version2, options) => {
      const parsed = parse2(version2, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    }, "prerelease");
    module.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var compare = /* @__PURE__ */ __name((a2, b2, loose) => new SemVer(a2, loose).compare(new SemVer(b2, loose)), "compare");
    module.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var rcompare = /* @__PURE__ */ __name((a2, b2, loose) => compare(b2, a2, loose), "rcompare");
    module.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var compareLoose = /* @__PURE__ */ __name((a2, b2) => compare(a2, b2, true), "compareLoose");
    module.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var compareBuild = /* @__PURE__ */ __name((a2, b2, loose) => {
      const versionA = new SemVer(a2, loose);
      const versionB = new SemVer(b2, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    }, "compareBuild");
    module.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compareBuild = require_compare_build();
    var sort = /* @__PURE__ */ __name((list, loose) => list.sort((a2, b2) => compareBuild(a2, b2, loose)), "sort");
    module.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compareBuild = require_compare_build();
    var rsort = /* @__PURE__ */ __name((list, loose) => list.sort((a2, b2) => compareBuild(b2, a2, loose)), "rsort");
    module.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var gt2 = /* @__PURE__ */ __name((a2, b2, loose) => compare(a2, b2, loose) > 0, "gt");
    module.exports = gt2;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var lt2 = /* @__PURE__ */ __name((a2, b2, loose) => compare(a2, b2, loose) < 0, "lt");
    module.exports = lt2;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var eq = /* @__PURE__ */ __name((a2, b2, loose) => compare(a2, b2, loose) === 0, "eq");
    module.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var neq = /* @__PURE__ */ __name((a2, b2, loose) => compare(a2, b2, loose) !== 0, "neq");
    module.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var gte = /* @__PURE__ */ __name((a2, b2, loose) => compare(a2, b2, loose) >= 0, "gte");
    module.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var compare = require_compare();
    var lte = /* @__PURE__ */ __name((a2, b2, loose) => compare(a2, b2, loose) <= 0, "lte");
    module.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var eq = require_eq();
    var neq = require_neq();
    var gt2 = require_gt();
    var gte = require_gte();
    var lt2 = require_lt();
    var lte = require_lte();
    var cmp = /* @__PURE__ */ __name((a2, op, b2, loose) => {
      switch (op) {
        case "===":
          if (typeof a2 === "object") {
            a2 = a2.version;
          }
          if (typeof b2 === "object") {
            b2 = b2.version;
          }
          return a2 === b2;
        case "!==":
          if (typeof a2 === "object") {
            a2 = a2.version;
          }
          if (typeof b2 === "object") {
            b2 = b2.version;
          }
          return a2 !== b2;
        case "":
        case "=":
        case "==":
          return eq(a2, b2, loose);
        case "!=":
          return neq(a2, b2, loose);
        case ">":
          return gt2(a2, b2, loose);
        case ">=":
          return gte(a2, b2, loose);
        case "<":
          return lt2(a2, b2, loose);
        case "<=":
          return lte(a2, b2, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    }, "cmp");
    module.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var parse2 = require_parse();
    var { safeRe: re2, t: t2 } = require_re();
    var coerce = /* @__PURE__ */ __name((version2, options) => {
      if (version2 instanceof SemVer) {
        return version2;
      }
      if (typeof version2 === "number") {
        version2 = String(version2);
      }
      if (typeof version2 !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version2.match(options.includePrerelease ? re2[t2.COERCEFULL] : re2[t2.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re2[t2.COERCERTLFULL] : re2[t2.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version2)) && (!match || match.index + match[0].length !== version2.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse2(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    }, "coerce");
    module.exports = coerce;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var LRUCache = class {
      static {
        __name(this, "LRUCache");
      }
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      static {
        __name(this, "Range");
      }
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r2) => this.parseRange(r2.trim())).filter((c2) => c2.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c2) => !isNullSet(c2[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c2 of this.set) {
              if (c2.length === 1 && isAny(c2[0])) {
                this.set = [c2];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i2 = 0; i2 < this.set.length; i2++) {
            if (i2 > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i2];
            for (let k2 = 0; k2 < comps.length; k2++) {
              if (k2 > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k2].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re2[t2.HYPHENRANGELOOSE] : re2[t2.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug4("hyphen replace", range);
        range = range.replace(re2[t2.COMPARATORTRIM], comparatorTrimReplace);
        debug4("comparator trim", range);
        range = range.replace(re2[t2.TILDETRIM], tildeTrimReplace);
        debug4("tilde trim", range);
        range = range.replace(re2[t2.CARETTRIM], caretTrimReplace);
        debug4("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug4("loose invalid filter", comp, this.options);
            return !!comp.match(re2[t2.COMPARATORLOOSE]);
          });
        }
        debug4("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version2) {
        if (!version2) {
          return false;
        }
        if (typeof version2 === "string") {
          try {
            version2 = new SemVer(version2, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i2 = 0; i2 < this.set.length; i2++) {
          if (testSet(this.set[i2], version2, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug4 = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re2,
      t: t2,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = /* @__PURE__ */ __name((c2) => c2.value === "<0.0.0-0", "isNullSet");
    var isAny = /* @__PURE__ */ __name((c2) => c2.value === "", "isAny");
    var isSatisfiable = /* @__PURE__ */ __name((comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    }, "isSatisfiable");
    var parseComparator = /* @__PURE__ */ __name((comp, options) => {
      debug4("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug4("caret", comp);
      comp = replaceTildes(comp, options);
      debug4("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug4("xrange", comp);
      comp = replaceStars(comp, options);
      debug4("stars", comp);
      return comp;
    }, "parseComparator");
    var isX = /* @__PURE__ */ __name((id) => !id || id.toLowerCase() === "x" || id === "*", "isX");
    var replaceTildes = /* @__PURE__ */ __name((comp, options) => {
      return comp.trim().split(/\s+/).map((c2) => replaceTilde(c2, options)).join(" ");
    }, "replaceTildes");
    var replaceTilde = /* @__PURE__ */ __name((comp, options) => {
      const r2 = options.loose ? re2[t2.TILDELOOSE] : re2[t2.TILDE];
      return comp.replace(r2, (_2, M2, m2, p2, pr) => {
        debug4("tilde", comp, _2, M2, m2, p2, pr);
        let ret;
        if (isX(M2)) {
          ret = "";
        } else if (isX(m2)) {
          ret = `>=${M2}.0.0 <${+M2 + 1}.0.0-0`;
        } else if (isX(p2)) {
          ret = `>=${M2}.${m2}.0 <${M2}.${+m2 + 1}.0-0`;
        } else if (pr) {
          debug4("replaceTilde pr", pr);
          ret = `>=${M2}.${m2}.${p2}-${pr} <${M2}.${+m2 + 1}.0-0`;
        } else {
          ret = `>=${M2}.${m2}.${p2} <${M2}.${+m2 + 1}.0-0`;
        }
        debug4("tilde return", ret);
        return ret;
      });
    }, "replaceTilde");
    var replaceCarets = /* @__PURE__ */ __name((comp, options) => {
      return comp.trim().split(/\s+/).map((c2) => replaceCaret(c2, options)).join(" ");
    }, "replaceCarets");
    var replaceCaret = /* @__PURE__ */ __name((comp, options) => {
      debug4("caret", comp, options);
      const r2 = options.loose ? re2[t2.CARETLOOSE] : re2[t2.CARET];
      const z2 = options.includePrerelease ? "-0" : "";
      return comp.replace(r2, (_2, M2, m2, p2, pr) => {
        debug4("caret", comp, _2, M2, m2, p2, pr);
        let ret;
        if (isX(M2)) {
          ret = "";
        } else if (isX(m2)) {
          ret = `>=${M2}.0.0${z2} <${+M2 + 1}.0.0-0`;
        } else if (isX(p2)) {
          if (M2 === "0") {
            ret = `>=${M2}.${m2}.0${z2} <${M2}.${+m2 + 1}.0-0`;
          } else {
            ret = `>=${M2}.${m2}.0${z2} <${+M2 + 1}.0.0-0`;
          }
        } else if (pr) {
          debug4("replaceCaret pr", pr);
          if (M2 === "0") {
            if (m2 === "0") {
              ret = `>=${M2}.${m2}.${p2}-${pr} <${M2}.${m2}.${+p2 + 1}-0`;
            } else {
              ret = `>=${M2}.${m2}.${p2}-${pr} <${M2}.${+m2 + 1}.0-0`;
            }
          } else {
            ret = `>=${M2}.${m2}.${p2}-${pr} <${+M2 + 1}.0.0-0`;
          }
        } else {
          debug4("no pr");
          if (M2 === "0") {
            if (m2 === "0") {
              ret = `>=${M2}.${m2}.${p2}${z2} <${M2}.${m2}.${+p2 + 1}-0`;
            } else {
              ret = `>=${M2}.${m2}.${p2}${z2} <${M2}.${+m2 + 1}.0-0`;
            }
          } else {
            ret = `>=${M2}.${m2}.${p2} <${+M2 + 1}.0.0-0`;
          }
        }
        debug4("caret return", ret);
        return ret;
      });
    }, "replaceCaret");
    var replaceXRanges = /* @__PURE__ */ __name((comp, options) => {
      debug4("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c2) => replaceXRange(c2, options)).join(" ");
    }, "replaceXRanges");
    var replaceXRange = /* @__PURE__ */ __name((comp, options) => {
      comp = comp.trim();
      const r2 = options.loose ? re2[t2.XRANGELOOSE] : re2[t2.XRANGE];
      return comp.replace(r2, (ret, gtlt, M2, m2, p2, pr) => {
        debug4("xRange", comp, ret, gtlt, M2, m2, p2, pr);
        const xM = isX(M2);
        const xm = xM || isX(m2);
        const xp = xm || isX(p2);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m2 = 0;
          }
          p2 = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M2 = +M2 + 1;
              m2 = 0;
              p2 = 0;
            } else {
              m2 = +m2 + 1;
              p2 = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M2 = +M2 + 1;
            } else {
              m2 = +m2 + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M2}.${m2}.${p2}${pr}`;
        } else if (xm) {
          ret = `>=${M2}.0.0${pr} <${+M2 + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M2}.${m2}.0${pr} <${M2}.${+m2 + 1}.0-0`;
        }
        debug4("xRange return", ret);
        return ret;
      });
    }, "replaceXRange");
    var replaceStars = /* @__PURE__ */ __name((comp, options) => {
      debug4("replaceStars", comp, options);
      return comp.trim().replace(re2[t2.STAR], "");
    }, "replaceStars");
    var replaceGTE0 = /* @__PURE__ */ __name((comp, options) => {
      debug4("replaceGTE0", comp, options);
      return comp.trim().replace(re2[options.includePrerelease ? t2.GTE0PRE : t2.GTE0], "");
    }, "replaceGTE0");
    var hyphenReplace = /* @__PURE__ */ __name((incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    }, "hyphenReplace");
    var testSet = /* @__PURE__ */ __name((set, version2, options) => {
      for (let i2 = 0; i2 < set.length; i2++) {
        if (!set[i2].test(version2)) {
          return false;
        }
      }
      if (version2.prerelease.length && !options.includePrerelease) {
        for (let i2 = 0; i2 < set.length; i2++) {
          debug4(set[i2].semver);
          if (set[i2].semver === Comparator.ANY) {
            continue;
          }
          if (set[i2].semver.prerelease.length > 0) {
            const allowed = set[i2].semver;
            if (allowed.major === version2.major && allowed.minor === version2.minor && allowed.patch === version2.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    }, "testSet");
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static {
        __name(this, "Comparator");
      }
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug4("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug4("comp", this);
      }
      parse(comp) {
        const r2 = this.options.loose ? re2[t2.COMPARATORLOOSE] : re2[t2.COMPARATOR];
        const m2 = comp.match(r2);
        if (!m2) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m2[1] !== void 0 ? m2[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m2[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m2[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version2) {
        debug4("Comparator.test", version2, this.options.loose);
        if (this.semver === ANY || version2 === ANY) {
          return true;
        }
        if (typeof version2 === "string") {
          try {
            version2 = new SemVer(version2, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version2, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re2, t: t2 } = require_re();
    var cmp = require_cmp();
    var debug4 = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Range = require_range();
    var satisfies = /* @__PURE__ */ __name((version2, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version2);
    }, "satisfies");
    module.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Range = require_range();
    var toComparators = /* @__PURE__ */ __name((range, options) => new Range(range, options).set.map((comp) => comp.map((c2) => c2.value).join(" ").trim().split(" ")), "toComparators");
    module.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = /* @__PURE__ */ __name((versions2, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions2.forEach((v2) => {
        if (rangeObj.test(v2)) {
          if (!max || maxSV.compare(v2) === -1) {
            max = v2;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    }, "maxSatisfying");
    module.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = /* @__PURE__ */ __name((versions2, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions2.forEach((v2) => {
        if (rangeObj.test(v2)) {
          if (!min || minSV.compare(v2) === 1) {
            min = v2;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    }, "minSatisfying");
    module.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var Range = require_range();
    var gt2 = require_gt();
    var minVersion = /* @__PURE__ */ __name((range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i2 = 0; i2 < range.set.length; ++i2) {
        const comparators = range.set[i2];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt2(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt2(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    }, "minVersion");
    module.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Range = require_range();
    var validRange = /* @__PURE__ */ __name((range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    }, "validRange");
    module.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt2 = require_gt();
    var lt2 = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = /* @__PURE__ */ __name((version2, range, hilo, options) => {
      version2 = new SemVer(version2, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt2;
          ltefn = lte;
          ltfn = lt2;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt2;
          ltefn = gte;
          ltfn = gt2;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version2, range, options)) {
        return false;
      }
      for (let i2 = 0; i2 < range.set.length; ++i2) {
        const comparators = range.set[i2];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version2, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version2, low.semver)) {
          return false;
        }
      }
      return true;
    }, "outside");
    module.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var outside = require_outside();
    var gtr = /* @__PURE__ */ __name((version2, range, options) => outside(version2, range, ">", options), "gtr");
    module.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var outside = require_outside();
    var ltr = /* @__PURE__ */ __name((version2, range, options) => outside(version2, range, "<", options), "ltr");
    module.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Range = require_range();
    var intersects = /* @__PURE__ */ __name((r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    }, "intersects");
    module.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var satisfies = require_satisfies();
    var compare = require_compare();
    module.exports = (versions2, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v2 = versions2.sort((a2, b2) => compare(a2, b2, options));
      for (const version2 of v2) {
        const included = satisfies(version2, range, options);
        if (included) {
          prev = version2;
          if (!first) {
            first = version2;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v2[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v2[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = /* @__PURE__ */ __name((sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    }, "subset");
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = /* @__PURE__ */ __name((sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt2, lt2;
      for (const c2 of sub) {
        if (c2.operator === ">" || c2.operator === ">=") {
          gt2 = higherGT(gt2, c2, options);
        } else if (c2.operator === "<" || c2.operator === "<=") {
          lt2 = lowerLT(lt2, c2, options);
        } else {
          eqSet.add(c2.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt2 && lt2) {
        gtltComp = compare(gt2.semver, lt2.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt2.operator !== ">=" || lt2.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt2 && !satisfies(eq, String(gt2), options)) {
          return null;
        }
        if (lt2 && !satisfies(eq, String(lt2), options)) {
          return null;
        }
        for (const c2 of dom) {
          if (!satisfies(eq, String(c2), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt2 && !options.includePrerelease && lt2.semver.prerelease.length ? lt2.semver : false;
      let needDomGTPre = gt2 && !options.includePrerelease && gt2.semver.prerelease.length ? gt2.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt2.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c2 of dom) {
        hasDomGT = hasDomGT || c2.operator === ">" || c2.operator === ">=";
        hasDomLT = hasDomLT || c2.operator === "<" || c2.operator === "<=";
        if (gt2) {
          if (needDomGTPre) {
            if (c2.semver.prerelease && c2.semver.prerelease.length && c2.semver.major === needDomGTPre.major && c2.semver.minor === needDomGTPre.minor && c2.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c2.operator === ">" || c2.operator === ">=") {
            higher = higherGT(gt2, c2, options);
            if (higher === c2 && higher !== gt2) {
              return false;
            }
          } else if (gt2.operator === ">=" && !satisfies(gt2.semver, String(c2), options)) {
            return false;
          }
        }
        if (lt2) {
          if (needDomLTPre) {
            if (c2.semver.prerelease && c2.semver.prerelease.length && c2.semver.major === needDomLTPre.major && c2.semver.minor === needDomLTPre.minor && c2.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c2.operator === "<" || c2.operator === "<=") {
            lower = lowerLT(lt2, c2, options);
            if (lower === c2 && lower !== lt2) {
              return false;
            }
          } else if (lt2.operator === "<=" && !satisfies(lt2.semver, String(c2), options)) {
            return false;
          }
        }
        if (!c2.operator && (lt2 || gt2) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt2 && hasDomLT && !lt2 && gtltComp !== 0) {
        return false;
      }
      if (lt2 && hasDomGT && !gt2 && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    }, "simpleSubset");
    var higherGT = /* @__PURE__ */ __name((a2, b2, options) => {
      if (!a2) {
        return b2;
      }
      const comp = compare(a2.semver, b2.semver, options);
      return comp > 0 ? a2 : comp < 0 ? b2 : b2.operator === ">" && a2.operator === ">=" ? b2 : a2;
    }, "higherGT");
    var lowerLT = /* @__PURE__ */ __name((a2, b2, options) => {
      if (!a2) {
        return b2;
      }
      const comp = compare(a2.semver, b2.semver, options);
      return comp < 0 ? a2 : comp > 0 ? b2 : b2.operator === "<" && a2.operator === "<=" ? b2 : a2;
    }, "lowerLT");
    module.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var internalRe = require_re();
    var constants2 = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse2 = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt2 = require_gt();
    var lt2 = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse: parse2,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt: gt2,
      lt: lt2,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants2.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants2.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/jsonwebtoken/lib/asymmetricKeyDetailsSupported.js
var require_asymmetricKeyDetailsSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/asymmetricKeyDetailsSupported.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var semver = require_semver2();
    module.exports = semver.satisfies(process.version, ">=15.7.0");
  }
});

// node_modules/jsonwebtoken/lib/rsaPssKeyDetailsSupported.js
var require_rsaPssKeyDetailsSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/rsaPssKeyDetailsSupported.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var semver = require_semver2();
    module.exports = semver.satisfies(process.version, ">=16.9.0");
  }
});

// node_modules/jsonwebtoken/lib/validateAsymmetricKey.js
var require_validateAsymmetricKey = __commonJS({
  "node_modules/jsonwebtoken/lib/validateAsymmetricKey.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var ASYMMETRIC_KEY_DETAILS_SUPPORTED = require_asymmetricKeyDetailsSupported();
    var RSA_PSS_KEY_DETAILS_SUPPORTED = require_rsaPssKeyDetailsSupported();
    var allowedAlgorithmsForKeys = {
      "ec": ["ES256", "ES384", "ES512"],
      "rsa": ["RS256", "PS256", "RS384", "PS384", "RS512", "PS512"],
      "rsa-pss": ["PS256", "PS384", "PS512"]
    };
    var allowedCurves = {
      ES256: "prime256v1",
      ES384: "secp384r1",
      ES512: "secp521r1"
    };
    module.exports = function(algorithm, key) {
      if (!algorithm || !key) return;
      const keyType = key.asymmetricKeyType;
      if (!keyType) return;
      const allowedAlgorithms = allowedAlgorithmsForKeys[keyType];
      if (!allowedAlgorithms) {
        throw new Error(`Unknown key type "${keyType}".`);
      }
      if (!allowedAlgorithms.includes(algorithm)) {
        throw new Error(`"alg" parameter for "${keyType}" key type must be one of: ${allowedAlgorithms.join(", ")}.`);
      }
      if (ASYMMETRIC_KEY_DETAILS_SUPPORTED) {
        switch (keyType) {
          case "ec":
            const keyCurve = key.asymmetricKeyDetails.namedCurve;
            const allowedCurve = allowedCurves[algorithm];
            if (keyCurve !== allowedCurve) {
              throw new Error(`"alg" parameter "${algorithm}" requires curve "${allowedCurve}".`);
            }
            break;
          case "rsa-pss":
            if (RSA_PSS_KEY_DETAILS_SUPPORTED) {
              const length = parseInt(algorithm.slice(-3), 10);
              const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
              if (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm) {
                throw new Error(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`);
              }
              if (saltLength !== void 0 && saltLength > length >> 3) {
                throw new Error(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`);
              }
            }
            break;
        }
      }
    };
  }
});

// node_modules/jsonwebtoken/lib/psSupported.js
var require_psSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/psSupported.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var semver = require_semver2();
    module.exports = semver.satisfies(process.version, "^6.12.0 || >=8.0.0");
  }
});

// node_modules/jsonwebtoken/verify.js
var require_verify = __commonJS({
  "node_modules/jsonwebtoken/verify.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var JsonWebTokenError = require_JsonWebTokenError();
    var NotBeforeError = require_NotBeforeError();
    var TokenExpiredError = require_TokenExpiredError();
    var decode = require_decode();
    var timespan = require_timespan();
    var validateAsymmetricKey = require_validateAsymmetricKey();
    var PS_SUPPORTED = require_psSupported();
    var jws = require_jws();
    var { KeyObject: KeyObject2, createSecretKey: createSecretKey2, createPublicKey: createPublicKey2 } = require_crypto();
    var PUB_KEY_ALGS = ["RS256", "RS384", "RS512"];
    var EC_KEY_ALGS = ["ES256", "ES384", "ES512"];
    var RSA_KEY_ALGS = ["RS256", "RS384", "RS512"];
    var HS_ALGS = ["HS256", "HS384", "HS512"];
    if (PS_SUPPORTED) {
      PUB_KEY_ALGS.splice(PUB_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
      RSA_KEY_ALGS.splice(RSA_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
    }
    module.exports = function(jwtString, secretOrPublicKey, options, callback) {
      if (typeof options === "function" && !callback) {
        callback = options;
        options = {};
      }
      if (!options) {
        options = {};
      }
      options = Object.assign({}, options);
      let done;
      if (callback) {
        done = callback;
      } else {
        done = /* @__PURE__ */ __name(function(err, data) {
          if (err) throw err;
          return data;
        }, "done");
      }
      if (options.clockTimestamp && typeof options.clockTimestamp !== "number") {
        return done(new JsonWebTokenError("clockTimestamp must be a number"));
      }
      if (options.nonce !== void 0 && (typeof options.nonce !== "string" || options.nonce.trim() === "")) {
        return done(new JsonWebTokenError("nonce must be a non-empty string"));
      }
      if (options.allowInvalidAsymmetricKeyTypes !== void 0 && typeof options.allowInvalidAsymmetricKeyTypes !== "boolean") {
        return done(new JsonWebTokenError("allowInvalidAsymmetricKeyTypes must be a boolean"));
      }
      const clockTimestamp = options.clockTimestamp || Math.floor(Date.now() / 1e3);
      if (!jwtString) {
        return done(new JsonWebTokenError("jwt must be provided"));
      }
      if (typeof jwtString !== "string") {
        return done(new JsonWebTokenError("jwt must be a string"));
      }
      const parts = jwtString.split(".");
      if (parts.length !== 3) {
        return done(new JsonWebTokenError("jwt malformed"));
      }
      let decodedToken;
      try {
        decodedToken = decode(jwtString, { complete: true });
      } catch (err) {
        return done(err);
      }
      if (!decodedToken) {
        return done(new JsonWebTokenError("invalid token"));
      }
      const header = decodedToken.header;
      let getSecret;
      if (typeof secretOrPublicKey === "function") {
        if (!callback) {
          return done(new JsonWebTokenError("verify must be called asynchronous if secret or public key is provided as a callback"));
        }
        getSecret = secretOrPublicKey;
      } else {
        getSecret = /* @__PURE__ */ __name(function(header2, secretCallback) {
          return secretCallback(null, secretOrPublicKey);
        }, "getSecret");
      }
      return getSecret(header, function(err, secretOrPublicKey2) {
        if (err) {
          return done(new JsonWebTokenError("error in secret or public key callback: " + err.message));
        }
        const hasSignature = parts[2].trim() !== "";
        if (!hasSignature && secretOrPublicKey2) {
          return done(new JsonWebTokenError("jwt signature is required"));
        }
        if (hasSignature && !secretOrPublicKey2) {
          return done(new JsonWebTokenError("secret or public key must be provided"));
        }
        if (!hasSignature && !options.algorithms) {
          return done(new JsonWebTokenError('please specify "none" in "algorithms" to verify unsigned tokens'));
        }
        if (secretOrPublicKey2 != null && !(secretOrPublicKey2 instanceof KeyObject2)) {
          try {
            secretOrPublicKey2 = createPublicKey2(secretOrPublicKey2);
          } catch (_2) {
            try {
              secretOrPublicKey2 = createSecretKey2(typeof secretOrPublicKey2 === "string" ? Buffer.from(secretOrPublicKey2) : secretOrPublicKey2);
            } catch (_3) {
              return done(new JsonWebTokenError("secretOrPublicKey is not valid key material"));
            }
          }
        }
        if (!options.algorithms) {
          if (secretOrPublicKey2.type === "secret") {
            options.algorithms = HS_ALGS;
          } else if (["rsa", "rsa-pss"].includes(secretOrPublicKey2.asymmetricKeyType)) {
            options.algorithms = RSA_KEY_ALGS;
          } else if (secretOrPublicKey2.asymmetricKeyType === "ec") {
            options.algorithms = EC_KEY_ALGS;
          } else {
            options.algorithms = PUB_KEY_ALGS;
          }
        }
        if (options.algorithms.indexOf(decodedToken.header.alg) === -1) {
          return done(new JsonWebTokenError("invalid algorithm"));
        }
        if (header.alg.startsWith("HS") && secretOrPublicKey2.type !== "secret") {
          return done(new JsonWebTokenError(`secretOrPublicKey must be a symmetric key when using ${header.alg}`));
        } else if (/^(?:RS|PS|ES)/.test(header.alg) && secretOrPublicKey2.type !== "public") {
          return done(new JsonWebTokenError(`secretOrPublicKey must be an asymmetric key when using ${header.alg}`));
        }
        if (!options.allowInvalidAsymmetricKeyTypes) {
          try {
            validateAsymmetricKey(header.alg, secretOrPublicKey2);
          } catch (e2) {
            return done(e2);
          }
        }
        let valid;
        try {
          valid = jws.verify(jwtString, decodedToken.header.alg, secretOrPublicKey2);
        } catch (e2) {
          return done(e2);
        }
        if (!valid) {
          return done(new JsonWebTokenError("invalid signature"));
        }
        const payload = decodedToken.payload;
        if (typeof payload.nbf !== "undefined" && !options.ignoreNotBefore) {
          if (typeof payload.nbf !== "number") {
            return done(new JsonWebTokenError("invalid nbf value"));
          }
          if (payload.nbf > clockTimestamp + (options.clockTolerance || 0)) {
            return done(new NotBeforeError("jwt not active", new Date(payload.nbf * 1e3)));
          }
        }
        if (typeof payload.exp !== "undefined" && !options.ignoreExpiration) {
          if (typeof payload.exp !== "number") {
            return done(new JsonWebTokenError("invalid exp value"));
          }
          if (clockTimestamp >= payload.exp + (options.clockTolerance || 0)) {
            return done(new TokenExpiredError("jwt expired", new Date(payload.exp * 1e3)));
          }
        }
        if (options.audience) {
          const audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
          const target = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
          const match = target.some(function(targetAudience) {
            return audiences.some(function(audience) {
              return audience instanceof RegExp ? audience.test(targetAudience) : audience === targetAudience;
            });
          });
          if (!match) {
            return done(new JsonWebTokenError("jwt audience invalid. expected: " + audiences.join(" or ")));
          }
        }
        if (options.issuer) {
          const invalid_issuer = typeof options.issuer === "string" && payload.iss !== options.issuer || Array.isArray(options.issuer) && options.issuer.indexOf(payload.iss) === -1;
          if (invalid_issuer) {
            return done(new JsonWebTokenError("jwt issuer invalid. expected: " + options.issuer));
          }
        }
        if (options.subject) {
          if (payload.sub !== options.subject) {
            return done(new JsonWebTokenError("jwt subject invalid. expected: " + options.subject));
          }
        }
        if (options.jwtid) {
          if (payload.jti !== options.jwtid) {
            return done(new JsonWebTokenError("jwt jwtid invalid. expected: " + options.jwtid));
          }
        }
        if (options.nonce) {
          if (payload.nonce !== options.nonce) {
            return done(new JsonWebTokenError("jwt nonce invalid. expected: " + options.nonce));
          }
        }
        if (options.maxAge) {
          if (typeof payload.iat !== "number") {
            return done(new JsonWebTokenError("iat required when maxAge is specified"));
          }
          const maxAgeTimestamp = timespan(options.maxAge, payload.iat);
          if (typeof maxAgeTimestamp === "undefined") {
            return done(new JsonWebTokenError('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
          }
          if (clockTimestamp >= maxAgeTimestamp + (options.clockTolerance || 0)) {
            return done(new TokenExpiredError("maxAge exceeded", new Date(maxAgeTimestamp * 1e3)));
          }
        }
        if (options.complete === true) {
          const signature = decodedToken.signature;
          return done(null, {
            header,
            payload,
            signature
          });
        }
        return done(null, payload);
      });
    };
  }
});

// node_modules/lodash.includes/index.js
var require_lodash = __commonJS({
  "node_modules/lodash.includes/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var freeParseInt = parseInt;
    function arrayMap(array, iteratee) {
      var index = -1, length = array ? array.length : 0, result = Array(length);
      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }
    __name(arrayMap, "arrayMap");
    function baseFindIndex(array, predicate, fromIndex, fromRight) {
      var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
      while (fromRight ? index-- : ++index < length) {
        if (predicate(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }
    __name(baseFindIndex, "baseFindIndex");
    function baseIndexOf(array, value, fromIndex) {
      if (value !== value) {
        return baseFindIndex(array, baseIsNaN, fromIndex);
      }
      var index = fromIndex - 1, length = array.length;
      while (++index < length) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }
    __name(baseIndexOf, "baseIndexOf");
    function baseIsNaN(value) {
      return value !== value;
    }
    __name(baseIsNaN, "baseIsNaN");
    function baseTimes(n2, iteratee) {
      var index = -1, result = Array(n2);
      while (++index < n2) {
        result[index] = iteratee(index);
      }
      return result;
    }
    __name(baseTimes, "baseTimes");
    function baseValues(object, props) {
      return arrayMap(props, function(key) {
        return object[key];
      });
    }
    __name(baseValues, "baseValues");
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    __name(overArg, "overArg");
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var nativeKeys = overArg(Object.keys, Object);
    var nativeMax = Math.max;
    function arrayLikeKeys(value, inherited) {
      var result = isArray2(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    __name(arrayLikeKeys, "arrayLikeKeys");
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    __name(baseKeys, "baseKeys");
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    __name(isIndex, "isIndex");
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    __name(isPrototype, "isPrototype");
    function includes(collection, value, fromIndex, guard) {
      collection = isArrayLike(collection) ? collection : values(collection);
      fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
      var length = collection.length;
      if (fromIndex < 0) {
        fromIndex = nativeMax(length + fromIndex, 0);
      }
      return isString2(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
    }
    __name(includes, "includes");
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    __name(isArguments, "isArguments");
    var isArray2 = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction2(value);
    }
    __name(isArrayLike, "isArrayLike");
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    __name(isArrayLikeObject, "isArrayLikeObject");
    function isFunction2(value) {
      var tag = isObject2(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    __name(isFunction2, "isFunction");
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    __name(isLength, "isLength");
    function isObject2(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    __name(isObject2, "isObject");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isString2(value) {
      return typeof value == "string" || !isArray2(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
    }
    __name(isString2, "isString");
    function isSymbol2(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    __name(isSymbol2, "isSymbol");
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign2 = value < 0 ? -1 : 1;
        return sign2 * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    __name(toFinite, "toFinite");
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    __name(toInteger, "toInteger");
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol2(value)) {
        return NAN;
      }
      if (isObject2(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject2(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    __name(toNumber, "toNumber");
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    __name(keys, "keys");
    function values(object) {
      return object ? baseValues(object, keys(object)) : [];
    }
    __name(values, "values");
    module.exports = includes;
  }
});

// node_modules/lodash.isboolean/index.js
var require_lodash2 = __commonJS({
  "node_modules/lodash.isboolean/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var boolTag = "[object Boolean]";
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function isBoolean2(value) {
      return value === true || value === false || isObjectLike(value) && objectToString.call(value) == boolTag;
    }
    __name(isBoolean2, "isBoolean");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    module.exports = isBoolean2;
  }
});

// node_modules/lodash.isinteger/index.js
var require_lodash3 = __commonJS({
  "node_modules/lodash.isinteger/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var INFINITY = 1 / 0;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function isInteger(value) {
      return typeof value == "number" && value == toInteger(value);
    }
    __name(isInteger, "isInteger");
    function isObject2(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    __name(isObject2, "isObject");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isSymbol2(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    __name(isSymbol2, "isSymbol");
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign2 = value < 0 ? -1 : 1;
        return sign2 * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    __name(toFinite, "toFinite");
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    __name(toInteger, "toInteger");
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol2(value)) {
        return NAN;
      }
      if (isObject2(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject2(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    __name(toNumber, "toNumber");
    module.exports = isInteger;
  }
});

// node_modules/lodash.isnumber/index.js
var require_lodash4 = __commonJS({
  "node_modules/lodash.isnumber/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var numberTag = "[object Number]";
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isNumber2(value) {
      return typeof value == "number" || isObjectLike(value) && objectToString.call(value) == numberTag;
    }
    __name(isNumber2, "isNumber");
    module.exports = isNumber2;
  }
});

// node_modules/lodash.isplainobject/index.js
var require_lodash5 = __commonJS({
  "node_modules/lodash.isplainobject/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var objectTag = "[object Object]";
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e2) {
        }
      }
      return result;
    }
    __name(isHostObject, "isHostObject");
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    __name(overArg, "overArg");
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var objectCtorString = funcToString.call(Object);
    var objectToString = objectProto.toString;
    var getPrototype = overArg(Object.getPrototypeOf, Object);
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isPlainObject(value) {
      if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
        return false;
      }
      var proto = getPrototype(value);
      if (proto === null) {
        return true;
      }
      var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
    }
    __name(isPlainObject, "isPlainObject");
    module.exports = isPlainObject;
  }
});

// node_modules/lodash.isstring/index.js
var require_lodash6 = __commonJS({
  "node_modules/lodash.isstring/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var stringTag = "[object String]";
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    var isArray2 = Array.isArray;
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isString2(value) {
      return typeof value == "string" || !isArray2(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
    }
    __name(isString2, "isString");
    module.exports = isString2;
  }
});

// node_modules/lodash.once/index.js
var require_lodash7 = __commonJS({
  "node_modules/lodash.once/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var FUNC_ERROR_TEXT = "Expected a function";
    var INFINITY = 1 / 0;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function before(n2, func) {
      var result;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      n2 = toInteger(n2);
      return function() {
        if (--n2 > 0) {
          result = func.apply(this, arguments);
        }
        if (n2 <= 1) {
          func = void 0;
        }
        return result;
      };
    }
    __name(before, "before");
    function once2(func) {
      return before(2, func);
    }
    __name(once2, "once");
    function isObject2(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    __name(isObject2, "isObject");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isSymbol2(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    __name(isSymbol2, "isSymbol");
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign2 = value < 0 ? -1 : 1;
        return sign2 * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    __name(toFinite, "toFinite");
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    __name(toInteger, "toInteger");
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol2(value)) {
        return NAN;
      }
      if (isObject2(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject2(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    __name(toNumber, "toNumber");
    module.exports = once2;
  }
});

// node_modules/jsonwebtoken/sign.js
var require_sign = __commonJS({
  "node_modules/jsonwebtoken/sign.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var timespan = require_timespan();
    var PS_SUPPORTED = require_psSupported();
    var validateAsymmetricKey = require_validateAsymmetricKey();
    var jws = require_jws();
    var includes = require_lodash();
    var isBoolean2 = require_lodash2();
    var isInteger = require_lodash3();
    var isNumber2 = require_lodash4();
    var isPlainObject = require_lodash5();
    var isString2 = require_lodash6();
    var once2 = require_lodash7();
    var { KeyObject: KeyObject2, createSecretKey: createSecretKey2, createPrivateKey: createPrivateKey2 } = require_crypto();
    var SUPPORTED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "HS256", "HS384", "HS512", "none"];
    if (PS_SUPPORTED) {
      SUPPORTED_ALGS.splice(3, 0, "PS256", "PS384", "PS512");
    }
    var sign_options_schema = {
      expiresIn: { isValid: /* @__PURE__ */ __name(function(value) {
        return isInteger(value) || isString2(value) && value;
      }, "isValid"), message: '"expiresIn" should be a number of seconds or string representing a timespan' },
      notBefore: { isValid: /* @__PURE__ */ __name(function(value) {
        return isInteger(value) || isString2(value) && value;
      }, "isValid"), message: '"notBefore" should be a number of seconds or string representing a timespan' },
      audience: { isValid: /* @__PURE__ */ __name(function(value) {
        return isString2(value) || Array.isArray(value);
      }, "isValid"), message: '"audience" must be a string or array' },
      algorithm: { isValid: includes.bind(null, SUPPORTED_ALGS), message: '"algorithm" must be a valid string enum value' },
      header: { isValid: isPlainObject, message: '"header" must be an object' },
      encoding: { isValid: isString2, message: '"encoding" must be a string' },
      issuer: { isValid: isString2, message: '"issuer" must be a string' },
      subject: { isValid: isString2, message: '"subject" must be a string' },
      jwtid: { isValid: isString2, message: '"jwtid" must be a string' },
      noTimestamp: { isValid: isBoolean2, message: '"noTimestamp" must be a boolean' },
      keyid: { isValid: isString2, message: '"keyid" must be a string' },
      mutatePayload: { isValid: isBoolean2, message: '"mutatePayload" must be a boolean' },
      allowInsecureKeySizes: { isValid: isBoolean2, message: '"allowInsecureKeySizes" must be a boolean' },
      allowInvalidAsymmetricKeyTypes: { isValid: isBoolean2, message: '"allowInvalidAsymmetricKeyTypes" must be a boolean' }
    };
    var registered_claims_schema = {
      iat: { isValid: isNumber2, message: '"iat" should be a number of seconds' },
      exp: { isValid: isNumber2, message: '"exp" should be a number of seconds' },
      nbf: { isValid: isNumber2, message: '"nbf" should be a number of seconds' }
    };
    function validate(schema, allowUnknown, object, parameterName) {
      if (!isPlainObject(object)) {
        throw new Error('Expected "' + parameterName + '" to be a plain object.');
      }
      Object.keys(object).forEach(function(key) {
        const validator = schema[key];
        if (!validator) {
          if (!allowUnknown) {
            throw new Error('"' + key + '" is not allowed in "' + parameterName + '"');
          }
          return;
        }
        if (!validator.isValid(object[key])) {
          throw new Error(validator.message);
        }
      });
    }
    __name(validate, "validate");
    function validateOptions(options) {
      return validate(sign_options_schema, false, options, "options");
    }
    __name(validateOptions, "validateOptions");
    function validatePayload(payload) {
      return validate(registered_claims_schema, true, payload, "payload");
    }
    __name(validatePayload, "validatePayload");
    var options_to_payload = {
      "audience": "aud",
      "issuer": "iss",
      "subject": "sub",
      "jwtid": "jti"
    };
    var options_for_objects = [
      "expiresIn",
      "notBefore",
      "noTimestamp",
      "audience",
      "issuer",
      "subject",
      "jwtid"
    ];
    module.exports = function(payload, secretOrPrivateKey, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      } else {
        options = options || {};
      }
      const isObjectPayload = typeof payload === "object" && !Buffer.isBuffer(payload);
      const header = Object.assign({
        alg: options.algorithm || "HS256",
        typ: isObjectPayload ? "JWT" : void 0,
        kid: options.keyid
      }, options.header);
      function failure(err) {
        if (callback) {
          return callback(err);
        }
        throw err;
      }
      __name(failure, "failure");
      if (!secretOrPrivateKey && options.algorithm !== "none") {
        return failure(new Error("secretOrPrivateKey must have a value"));
      }
      if (secretOrPrivateKey != null && !(secretOrPrivateKey instanceof KeyObject2)) {
        try {
          secretOrPrivateKey = createPrivateKey2(secretOrPrivateKey);
        } catch (_2) {
          try {
            secretOrPrivateKey = createSecretKey2(typeof secretOrPrivateKey === "string" ? Buffer.from(secretOrPrivateKey) : secretOrPrivateKey);
          } catch (_3) {
            return failure(new Error("secretOrPrivateKey is not valid key material"));
          }
        }
      }
      if (header.alg.startsWith("HS") && secretOrPrivateKey.type !== "secret") {
        return failure(new Error(`secretOrPrivateKey must be a symmetric key when using ${header.alg}`));
      } else if (/^(?:RS|PS|ES)/.test(header.alg)) {
        if (secretOrPrivateKey.type !== "private") {
          return failure(new Error(`secretOrPrivateKey must be an asymmetric key when using ${header.alg}`));
        }
        if (!options.allowInsecureKeySizes && !header.alg.startsWith("ES") && secretOrPrivateKey.asymmetricKeyDetails !== void 0 && //KeyObject.asymmetricKeyDetails is supported in Node 15+
        secretOrPrivateKey.asymmetricKeyDetails.modulusLength < 2048) {
          return failure(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
        }
      }
      if (typeof payload === "undefined") {
        return failure(new Error("payload is required"));
      } else if (isObjectPayload) {
        try {
          validatePayload(payload);
        } catch (error3) {
          return failure(error3);
        }
        if (!options.mutatePayload) {
          payload = Object.assign({}, payload);
        }
      } else {
        const invalid_options = options_for_objects.filter(function(opt) {
          return typeof options[opt] !== "undefined";
        });
        if (invalid_options.length > 0) {
          return failure(new Error("invalid " + invalid_options.join(",") + " option for " + typeof payload + " payload"));
        }
      }
      if (typeof payload.exp !== "undefined" && typeof options.expiresIn !== "undefined") {
        return failure(new Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
      }
      if (typeof payload.nbf !== "undefined" && typeof options.notBefore !== "undefined") {
        return failure(new Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
      }
      try {
        validateOptions(options);
      } catch (error3) {
        return failure(error3);
      }
      if (!options.allowInvalidAsymmetricKeyTypes) {
        try {
          validateAsymmetricKey(header.alg, secretOrPrivateKey);
        } catch (error3) {
          return failure(error3);
        }
      }
      const timestamp = payload.iat || Math.floor(Date.now() / 1e3);
      if (options.noTimestamp) {
        delete payload.iat;
      } else if (isObjectPayload) {
        payload.iat = timestamp;
      }
      if (typeof options.notBefore !== "undefined") {
        try {
          payload.nbf = timespan(options.notBefore, timestamp);
        } catch (err) {
          return failure(err);
        }
        if (typeof payload.nbf === "undefined") {
          return failure(new Error('"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
      }
      if (typeof options.expiresIn !== "undefined" && typeof payload === "object") {
        try {
          payload.exp = timespan(options.expiresIn, timestamp);
        } catch (err) {
          return failure(err);
        }
        if (typeof payload.exp === "undefined") {
          return failure(new Error('"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
      }
      Object.keys(options_to_payload).forEach(function(key) {
        const claim = options_to_payload[key];
        if (typeof options[key] !== "undefined") {
          if (typeof payload[claim] !== "undefined") {
            return failure(new Error('Bad "options.' + key + '" option. The payload already has an "' + claim + '" property.'));
          }
          payload[claim] = options[key];
        }
      });
      const encoding = options.encoding || "utf8";
      if (typeof callback === "function") {
        callback = callback && once2(callback);
        jws.createSign({
          header,
          privateKey: secretOrPrivateKey,
          payload,
          encoding
        }).once("error", callback).once("done", function(signature) {
          if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
            return callback(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
          }
          callback(null, signature);
        });
      } else {
        let signature = jws.sign({ header, payload, secret: secretOrPrivateKey, encoding });
        if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
          throw new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`);
        }
        return signature;
      }
    };
  }
});

// node_modules/jsonwebtoken/index.js
var require_jsonwebtoken = __commonJS({
  "node_modules/jsonwebtoken/index.js"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = {
      decode: require_decode(),
      verify: require_verify(),
      sign: require_sign(),
      JsonWebTokenError: require_JsonWebTokenError(),
      NotBeforeError: require_NotBeforeError(),
      TokenExpiredError: require_TokenExpiredError()
    };
  }
});

// worker.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono-base.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/compose.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i2) {
      if (i2 <= index) {
        throw new Error("next() called multiple times");
      }
      index = i2;
      let res;
      let isError2 = false;
      let handler;
      if (middleware[i2]) {
        handler = middleware[i2][0][0];
        context2.req.routeIndex = i2;
      } else {
        handler = i2 === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i2 + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError2 = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError2)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i2 = groups.length - 1; i2 >= 0; i2--) {
    const [mark] = groups[i2];
    for (let j2 = paths.length - 1; j2 >= 0; j2--) {
      if (paths[j2].includes(mark)) {
        paths[j2] = paths[j2].replace(mark, groups[i2][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf(
    "/",
    url.charCodeAt(9) === 58 ? 13 : 8
  );
  let i2 = start;
  for (; i2 < url.length; i2++) {
    const charCode = url.charCodeAt(i2);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i2);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i2);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v2, i2, a2) => a2.indexOf(v2) === i2);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name2 = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name2 = _decodeURI(name2);
    }
    keyIndex = nextKeyIndex;
    if (name2 === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name2] && Array.isArray(results[name2]))) {
        results[name2] = [];
      }
      ;
      results[name2].push(value);
    } else {
      results[name2] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : void 0;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name2) {
    if (name2) {
      return this.raw.headers.get(name2) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c2) => c2({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k2, v2] of this.#res.headers.entries()) {
        if (k2 === "content-type") {
          continue;
        }
        if (k2 === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k2, v2);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  header = /* @__PURE__ */ __name((name2, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name2);
    } else if (options?.append) {
      headers.append(name2, value);
    } else {
      headers.set(name2, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k2, v2] of Object.entries(headers)) {
        if (typeof v2 === "string") {
          responseHeaders.set(k2, v2);
        } else {
          responseHeaders.delete(k2);
          for (const v22 of v2) {
            responseHeaders.append(k2, v22);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c2) => {
  return c2.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c2) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c2.newResponse(res.body, res);
  }
  console.error(err);
  return c2.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p2 of [path].flat()) {
        this.#path = p2;
        for (const m2 of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m2.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r2) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r2.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c2, next) => (await compose([], app2.errorHandler)(c2, () => r2.handler(c2, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r2.handler;
      }
      subApp.#addRoute(r2.method, r2.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c2) => {
      const options2 = optionHandler(c2);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c2) => {
      let executionContext = void 0;
      try {
        executionContext = c2.executionCtx;
      } catch {
      }
      return [c2.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c2, next) => {
      const res = await applicationHandler(replaceRequest(c2.req.raw), ...getOptions(c2));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r2 = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r2]);
    this.routes.push(r2);
  }
  #handleError(err, c2) {
    if (err instanceof Error) {
      return this.errorHandler(err, c2);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c2 = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c2, async () => {
          c2.res = await this.#notFoundHandler(c2);
        });
      } catch (err) {
        return this.#handleError(err, c2);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c2.finalized ? c2.res : this.#notFoundHandler(c2))
      ).catch((err) => this.#handleError(err, c2)) : res ?? this.#notFoundHandler(c2);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c2);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c2);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a2, b2) {
  if (a2.length === 1) {
    return b2.length === 1 ? a2 < b2 ? -1 : 1 : -1;
  }
  if (b2.length === 1) {
    return 1;
  }
  if (a2 === ONLY_WILDCARD_REG_EXP_STR || a2 === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b2 === ONLY_WILDCARD_REG_EXP_STR || b2 === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a2 === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b2 === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a2.length === b2.length ? a2 < b2 ? -1 : 1 : b2.length - a2.length;
}
__name(compareKey, "compareKey");
var Node = class {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name2 = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name2 && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k2) => k2 !== ONLY_WILDCARD_REG_EXP_STR && k2 !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name2 !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name2 !== "") {
        paramMap.push([name2, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k2) => k2.length > 1 && k2 !== ONLY_WILDCARD_REG_EXP_STR && k2 !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k2) => {
      const c2 = this.#children[k2];
      return (typeof c2.#varIndex === "number" ? `(${k2})@${c2.#varIndex}` : regExpMetaChars.has(k2) ? `\\${k2}` : k2) + c2.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i2 = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m2) => {
        const mark = `@\\${i2}`;
        groups[i2] = [mark, m2];
        i2++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i2 = groups.length - 1; i2 >= 0; i2--) {
      const [mark] = groups[i2];
      for (let j2 = tokens.length - 1; j2 >= 0; j2--) {
        if (tokens[j2].indexOf(mark) !== -1) {
          tokens[j2] = tokens[j2].replace(mark, groups[i2][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_2, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_2, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i2 = 0, j2 = -1, len = routesWithStaticPathFlag.length; i2 < len; i2++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i2];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h2]) => [h2, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j2++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j2, pathErrorCheckOnly);
    } catch (e2) {
      throw e2 === PATH_ERROR ? new UnsupportedPathError(path) : e2;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j2] = handlers.map(([h2, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h2, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i2 = 0, len = handlerData.length; i2 < len; i2++) {
    for (let j2 = 0, len2 = handlerData[i2].length; j2 < len2; j2++) {
      const map = handlerData[i2][j2]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k2 = 0, len3 = keys.length; k2 < len3; k2++) {
        map[keys[k2]] = paramReplacementMap[map[keys[k2]]];
      }
    }
  }
  const handlerMap = [];
  for (const i2 in indexReplacementMap) {
    handlerMap[i2] = handlerData[indexReplacementMap[i2]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k2 of Object.keys(middleware).sort((a2, b2) => b2.length - a2.length)) {
    if (buildWildcardRegExp(k2).test(path)) {
      return [...middleware[k2]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p2) => {
          handlerMap[method][p2] = [...handlerMap[METHOD_NAME_ALL][p2]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re2 = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m2) => {
          middleware[m2][path] ||= findMiddleware(middleware[m2], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m2) => {
        if (method === METHOD_NAME_ALL || method === m2) {
          Object.keys(middleware[m2]).forEach((p2) => {
            re2.test(p2) && middleware[m2][p2].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m2) => {
        if (method === METHOD_NAME_ALL || method === m2) {
          Object.keys(routes[m2]).forEach(
            (p2) => re2.test(p2) && routes[m2][p2].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i2 = 0, len = paths.length; i2 < len; i2++) {
      const path2 = paths[i2];
      Object.keys(routes).forEach((m2) => {
        if (method === METHOD_NAME_ALL || method === m2) {
          routes[m2][path2] ||= [
            ...findMiddleware(middleware[m2], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m2][path2].push([handler, paramCount - len + i2 + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r2) => {
      const ownRoute = r2[method] ? Object.keys(r2[method]).map((path) => [path, r2[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r2[METHOD_NAME_ALL]).map((path) => [path, r2[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i2 = 0;
    let res;
    for (; i2 < len; i2++) {
      const router = routers[i2];
      try {
        for (let i22 = 0, len2 = routes.length; i22 < len2; i22++) {
          router.add(...routes[i22]);
        }
        res = router.match(method, path);
      } catch (e2) {
        if (e2 instanceof UnsupportedPathError) {
          continue;
        }
        throw e2;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i2 === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  static {
    __name(this, "Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m2 = /* @__PURE__ */ Object.create(null);
      m2[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m2];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i2 = 0, len = parts.length; i2 < len; i2++) {
      const p2 = parts[i2];
      const nextP = parts[i2 + 1];
      const pattern = getPattern(p2, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p2;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v2, i2, a2) => a2.indexOf(v2) === i2),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i2 = 0, len = node.#methods.length; i2 < len; i2++) {
      const m2 = node.#methods[i2];
      const handlerSet = m2[method] || m2[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i22 = 0, len2 = handlerSet.possibleKeys.length; i22 < len2; i22++) {
            const key = handlerSet.possibleKeys[i22];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i2 = 0, len = parts.length; i2 < len; i2++) {
      const part = parts[i2];
      const isLast = i2 === len - 1;
      const tempNodes = [];
      for (let j2 = 0, len2 = curNodes.length; j2 < len2; j2++) {
        const node = curNodes[j2];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k2 = 0, len3 = node.#patterns.length; k2 < len3; k2++) {
          const pattern = node.#patterns[k2];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          if (!part) {
            continue;
          }
          const [key, name2, matcher] = pattern;
          const child = node.#children[key];
          const restPathString = parts.slice(i2).join("/");
          if (matcher instanceof RegExp) {
            const m2 = matcher.exec(restPathString);
            if (m2) {
              params[name2] = m2[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m2[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name2] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a2, b2) => {
        return a2.score - b2.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i2 = 0, len = results.length; i2 < len; i2++) {
        this.#node.insert(method, results[i2], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c2, next) {
    function set(key, value) {
      c2.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = findAllowOrigin(c2.req.header("origin") || "", c2);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      const existingVary = c2.req.header("Vary");
      if (existingVary) {
        set("Vary", existingVary);
      } else {
        set("Vary", "Origin");
      }
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c2.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = findAllowMethods(c2.req.header("origin") || "", c2);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c2.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c2.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c2.res.headers.delete("Content-Length");
      c2.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c2.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
  }, "cors2");
}, "cors");

// node_modules/hono/dist/helper/cookie/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/utils/cookie.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = /* @__PURE__ */ __name((cookie, name2) => {
  if (name2 && cookie.indexOf(name2) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name2 && name2 !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name2) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");
var _serialize = /* @__PURE__ */ __name((name2, value, opt = {}) => {
  let cookie = `${name2}=${value}`;
  if (name2.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name2.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) {
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) {
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
}, "_serialize");
var serialize = /* @__PURE__ */ __name((name2, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name2, value, opt);
}, "serialize");

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c2, key, prefix) => {
  const cookie = c2.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");
var setCookie = /* @__PURE__ */ __name((c2, name2, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name2, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name2, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = serialize(name2, value, { path: "/", ...opt });
  }
  c2.header("Set-Cookie", cookie, { append: true });
}, "setCookie");

// worker.js
var import_jsonwebtoken = __toESM(require_jsonwebtoken());

// node_modules/exifr/dist/full.esm.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var e = "undefined" != typeof self ? self : global;
var t = "undefined" != typeof navigator;
var i = t && "undefined" == typeof HTMLImageElement;
var n = !("undefined" == typeof global || "undefined" == typeof process || !process.versions || !process.versions.node);
var s = e.Buffer;
var r = e.BigInt;
var a = !!s;
var o = /* @__PURE__ */ __name((e2) => e2, "o");
function l(e2, t2 = o) {
  if (n) try {
    return "function" == typeof __require ? Promise.resolve(t2(__require(e2))) : import(
      /* webpackIgnore: true */
      e2
    ).then(t2);
  } catch (t3) {
    console.warn(`Couldn't load ${e2}`);
  }
}
__name(l, "l");
var h = e.fetch;
var u = /* @__PURE__ */ __name((e2) => h = e2, "u");
if (!e.fetch) {
  const e2 = l("http", (e3) => e3), t2 = l("https", (e3) => e3), i2 = /* @__PURE__ */ __name((n2, { headers: s2 } = {}) => new Promise(async (r2, a2) => {
    let { port: o2, hostname: l2, pathname: h2, protocol: u2, search: c2 } = new URL(n2);
    const f2 = { method: "GET", hostname: l2, path: encodeURI(h2) + c2, headers: s2 };
    "" !== o2 && (f2.port = Number(o2));
    const d2 = ("https:" === u2 ? await t2 : await e2).request(f2, (e3) => {
      if (301 === e3.statusCode || 302 === e3.statusCode) {
        let t3 = new URL(e3.headers.location, n2).toString();
        return i2(t3, { headers: s2 }).then(r2).catch(a2);
      }
      r2({ status: e3.statusCode, arrayBuffer: /* @__PURE__ */ __name(() => new Promise((t3) => {
        let i3 = [];
        e3.on("data", (e4) => i3.push(e4)), e3.on("end", () => t3(Buffer.concat(i3)));
      }), "arrayBuffer") });
    });
    d2.on("error", a2), d2.end();
  }), "i");
  u(i2);
}
function c(e2, t2, i2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: i2, enumerable: true, configurable: true, writable: true }) : e2[t2] = i2, e2;
}
__name(c, "c");
var f = /* @__PURE__ */ __name((e2) => p(e2) ? void 0 : e2, "f");
var d = /* @__PURE__ */ __name((e2) => void 0 !== e2, "d");
function p(e2) {
  return void 0 === e2 || (e2 instanceof Map ? 0 === e2.size : 0 === Object.values(e2).filter(d).length);
}
__name(p, "p");
function g(e2) {
  let t2 = new Error(e2);
  throw delete t2.stack, t2;
}
__name(g, "g");
function m(e2) {
  return "" === (e2 = function(e3) {
    for (; e3.endsWith("\0"); ) e3 = e3.slice(0, -1);
    return e3;
  }(e2).trim()) ? void 0 : e2;
}
__name(m, "m");
function S(e2) {
  let t2 = function(e3) {
    let t3 = 0;
    return e3.ifd0.enabled && (t3 += 1024), e3.exif.enabled && (t3 += 2048), e3.makerNote && (t3 += 2048), e3.userComment && (t3 += 1024), e3.gps.enabled && (t3 += 512), e3.interop.enabled && (t3 += 100), e3.ifd1.enabled && (t3 += 1024), t3 + 2048;
  }(e2);
  return e2.jfif.enabled && (t2 += 50), e2.xmp.enabled && (t2 += 2e4), e2.iptc.enabled && (t2 += 14e3), e2.icc.enabled && (t2 += 6e3), t2;
}
__name(S, "S");
var C = /* @__PURE__ */ __name((e2) => String.fromCharCode.apply(null, e2), "C");
var y = "undefined" != typeof TextDecoder ? new TextDecoder("utf-8") : void 0;
function b(e2) {
  return y ? y.decode(e2) : a ? Buffer.from(e2).toString("utf8") : decodeURIComponent(escape(C(e2)));
}
__name(b, "b");
var I = class _I {
  static {
    __name(this, "I");
  }
  static from(e2, t2) {
    return e2 instanceof this && e2.le === t2 ? e2 : new _I(e2, void 0, void 0, t2);
  }
  constructor(e2, t2 = 0, i2, n2) {
    if ("boolean" == typeof n2 && (this.le = n2), Array.isArray(e2) && (e2 = new Uint8Array(e2)), 0 === e2) this.byteOffset = 0, this.byteLength = 0;
    else if (e2 instanceof ArrayBuffer) {
      void 0 === i2 && (i2 = e2.byteLength - t2);
      let n3 = new DataView(e2, t2, i2);
      this._swapDataView(n3);
    } else if (e2 instanceof Uint8Array || e2 instanceof DataView || e2 instanceof _I) {
      void 0 === i2 && (i2 = e2.byteLength - t2), (t2 += e2.byteOffset) + i2 > e2.byteOffset + e2.byteLength && g("Creating view outside of available memory in ArrayBuffer");
      let n3 = new DataView(e2.buffer, t2, i2);
      this._swapDataView(n3);
    } else if ("number" == typeof e2) {
      let t3 = new DataView(new ArrayBuffer(e2));
      this._swapDataView(t3);
    } else g("Invalid input argument for BufferView: " + e2);
  }
  _swapArrayBuffer(e2) {
    this._swapDataView(new DataView(e2));
  }
  _swapBuffer(e2) {
    this._swapDataView(new DataView(e2.buffer, e2.byteOffset, e2.byteLength));
  }
  _swapDataView(e2) {
    this.dataView = e2, this.buffer = e2.buffer, this.byteOffset = e2.byteOffset, this.byteLength = e2.byteLength;
  }
  _lengthToEnd(e2) {
    return this.byteLength - e2;
  }
  set(e2, t2, i2 = _I) {
    return e2 instanceof DataView || e2 instanceof _I ? e2 = new Uint8Array(e2.buffer, e2.byteOffset, e2.byteLength) : e2 instanceof ArrayBuffer && (e2 = new Uint8Array(e2)), e2 instanceof Uint8Array || g("BufferView.set(): Invalid data argument."), this.toUint8().set(e2, t2), new i2(this, t2, e2.byteLength);
  }
  subarray(e2, t2) {
    return t2 = t2 || this._lengthToEnd(e2), new _I(this, e2, t2);
  }
  toUint8() {
    return new Uint8Array(this.buffer, this.byteOffset, this.byteLength);
  }
  getUint8Array(e2, t2) {
    return new Uint8Array(this.buffer, this.byteOffset + e2, t2);
  }
  getString(e2 = 0, t2 = this.byteLength) {
    return b(this.getUint8Array(e2, t2));
  }
  getLatin1String(e2 = 0, t2 = this.byteLength) {
    let i2 = this.getUint8Array(e2, t2);
    return C(i2);
  }
  getUnicodeString(e2 = 0, t2 = this.byteLength) {
    const i2 = [];
    for (let n2 = 0; n2 < t2 && e2 + n2 < this.byteLength; n2 += 2) i2.push(this.getUint16(e2 + n2));
    return C(i2);
  }
  getInt8(e2) {
    return this.dataView.getInt8(e2);
  }
  getUint8(e2) {
    return this.dataView.getUint8(e2);
  }
  getInt16(e2, t2 = this.le) {
    return this.dataView.getInt16(e2, t2);
  }
  getInt32(e2, t2 = this.le) {
    return this.dataView.getInt32(e2, t2);
  }
  getUint16(e2, t2 = this.le) {
    return this.dataView.getUint16(e2, t2);
  }
  getUint32(e2, t2 = this.le) {
    return this.dataView.getUint32(e2, t2);
  }
  getFloat32(e2, t2 = this.le) {
    return this.dataView.getFloat32(e2, t2);
  }
  getFloat64(e2, t2 = this.le) {
    return this.dataView.getFloat64(e2, t2);
  }
  getFloat(e2, t2 = this.le) {
    return this.dataView.getFloat32(e2, t2);
  }
  getDouble(e2, t2 = this.le) {
    return this.dataView.getFloat64(e2, t2);
  }
  getUintBytes(e2, t2, i2) {
    switch (t2) {
      case 1:
        return this.getUint8(e2, i2);
      case 2:
        return this.getUint16(e2, i2);
      case 4:
        return this.getUint32(e2, i2);
      case 8:
        return this.getUint64 && this.getUint64(e2, i2);
    }
  }
  getUint(e2, t2, i2) {
    switch (t2) {
      case 8:
        return this.getUint8(e2, i2);
      case 16:
        return this.getUint16(e2, i2);
      case 32:
        return this.getUint32(e2, i2);
      case 64:
        return this.getUint64 && this.getUint64(e2, i2);
    }
  }
  toString(e2) {
    return this.dataView.toString(e2, this.constructor.name);
  }
  ensureChunk() {
  }
};
function P(e2, t2) {
  g(`${e2} '${t2}' was not loaded, try using full build of exifr.`);
}
__name(P, "P");
var k = class extends Map {
  static {
    __name(this, "k");
  }
  constructor(e2) {
    super(), this.kind = e2;
  }
  get(e2, t2) {
    return this.has(e2) || P(this.kind, e2), t2 && (e2 in t2 || function(e3, t3) {
      g(`Unknown ${e3} '${t3}'.`);
    }(this.kind, e2), t2[e2].enabled || P(this.kind, e2)), super.get(e2);
  }
  keyList() {
    return Array.from(this.keys());
  }
};
var w = new k("file parser");
var T = new k("segment parser");
var A = new k("file reader");
function D(e2, n2) {
  return "string" == typeof e2 ? O(e2, n2) : t && !i && e2 instanceof HTMLImageElement ? O(e2.src, n2) : e2 instanceof Uint8Array || e2 instanceof ArrayBuffer || e2 instanceof DataView ? new I(e2) : t && e2 instanceof Blob ? x(e2, n2, "blob", R) : void g("Invalid input argument");
}
__name(D, "D");
function O(e2, i2) {
  return (s2 = e2).startsWith("data:") || s2.length > 1e4 ? v(e2, i2, "base64") : n && e2.includes("://") ? x(e2, i2, "url", M) : n ? v(e2, i2, "fs") : t ? x(e2, i2, "url", M) : void g("Invalid input argument");
  var s2;
}
__name(O, "O");
async function x(e2, t2, i2, n2) {
  return A.has(i2) ? v(e2, t2, i2) : n2 ? async function(e3, t3) {
    let i3 = await t3(e3);
    return new I(i3);
  }(e2, n2) : void g(`Parser ${i2} is not loaded`);
}
__name(x, "x");
async function v(e2, t2, i2) {
  let n2 = new (A.get(i2))(e2, t2);
  return await n2.read(), n2;
}
__name(v, "v");
var M = /* @__PURE__ */ __name((e2) => h(e2).then((e3) => e3.arrayBuffer()), "M");
var R = /* @__PURE__ */ __name((e2) => new Promise((t2, i2) => {
  let n2 = new FileReader();
  n2.onloadend = () => t2(n2.result || new ArrayBuffer()), n2.onerror = i2, n2.readAsArrayBuffer(e2);
}), "R");
var L = class extends Map {
  static {
    __name(this, "L");
  }
  get tagKeys() {
    return this.allKeys || (this.allKeys = Array.from(this.keys())), this.allKeys;
  }
  get tagValues() {
    return this.allValues || (this.allValues = Array.from(this.values())), this.allValues;
  }
};
function U(e2, t2, i2) {
  let n2 = new L();
  for (let [e3, t3] of i2) n2.set(e3, t3);
  if (Array.isArray(t2)) for (let i3 of t2) e2.set(i3, n2);
  else e2.set(t2, n2);
  return n2;
}
__name(U, "U");
function F(e2, t2, i2) {
  let n2, s2 = e2.get(t2);
  for (n2 of i2) s2.set(n2[0], n2[1]);
}
__name(F, "F");
var E = /* @__PURE__ */ new Map();
var B = /* @__PURE__ */ new Map();
var N = /* @__PURE__ */ new Map();
var G = ["chunked", "firstChunkSize", "firstChunkSizeNode", "firstChunkSizeBrowser", "chunkSize", "chunkLimit"];
var V = ["jfif", "xmp", "icc", "iptc", "ihdr"];
var z = ["tiff", ...V];
var H = ["ifd0", "ifd1", "exif", "gps", "interop"];
var j = [...z, ...H];
var W = ["makerNote", "userComment"];
var K = ["translateKeys", "translateValues", "reviveValues", "multiSegment"];
var X = [...K, "sanitize", "mergeOutput", "silentErrors"];
var _ = class {
  static {
    __name(this, "_");
  }
  get translate() {
    return this.translateKeys || this.translateValues || this.reviveValues;
  }
};
var Y = class extends _ {
  static {
    __name(this, "Y");
  }
  get needed() {
    return this.enabled || this.deps.size > 0;
  }
  constructor(e2, t2, i2, n2) {
    if (super(), c(this, "enabled", false), c(this, "skip", /* @__PURE__ */ new Set()), c(this, "pick", /* @__PURE__ */ new Set()), c(this, "deps", /* @__PURE__ */ new Set()), c(this, "translateKeys", false), c(this, "translateValues", false), c(this, "reviveValues", false), this.key = e2, this.enabled = t2, this.parse = this.enabled, this.applyInheritables(n2), this.canBeFiltered = H.includes(e2), this.canBeFiltered && (this.dict = E.get(e2)), void 0 !== i2) if (Array.isArray(i2)) this.parse = this.enabled = true, this.canBeFiltered && i2.length > 0 && this.translateTagSet(i2, this.pick);
    else if ("object" == typeof i2) {
      if (this.enabled = true, this.parse = false !== i2.parse, this.canBeFiltered) {
        let { pick: e3, skip: t3 } = i2;
        e3 && e3.length > 0 && this.translateTagSet(e3, this.pick), t3 && t3.length > 0 && this.translateTagSet(t3, this.skip);
      }
      this.applyInheritables(i2);
    } else true === i2 || false === i2 ? this.parse = this.enabled = i2 : g(`Invalid options argument: ${i2}`);
  }
  applyInheritables(e2) {
    let t2, i2;
    for (t2 of K) i2 = e2[t2], void 0 !== i2 && (this[t2] = i2);
  }
  translateTagSet(e2, t2) {
    if (this.dict) {
      let i2, n2, { tagKeys: s2, tagValues: r2 } = this.dict;
      for (i2 of e2) "string" == typeof i2 ? (n2 = r2.indexOf(i2), -1 === n2 && (n2 = s2.indexOf(Number(i2))), -1 !== n2 && t2.add(Number(s2[n2]))) : t2.add(i2);
    } else for (let i2 of e2) t2.add(i2);
  }
  finalizeFilters() {
    !this.enabled && this.deps.size > 0 ? (this.enabled = true, ee(this.pick, this.deps)) : this.enabled && this.pick.size > 0 && ee(this.pick, this.deps);
  }
};
var $ = { jfif: false, tiff: true, xmp: false, icc: false, iptc: false, ifd0: true, ifd1: false, exif: true, gps: true, interop: false, ihdr: void 0, makerNote: false, userComment: false, multiSegment: false, skip: [], pick: [], translateKeys: true, translateValues: true, reviveValues: true, sanitize: true, mergeOutput: true, silentErrors: true, chunked: true, firstChunkSize: void 0, firstChunkSizeNode: 512, firstChunkSizeBrowser: 65536, chunkSize: 65536, chunkLimit: 5 };
var J = /* @__PURE__ */ new Map();
var q = class extends _ {
  static {
    __name(this, "q");
  }
  static useCached(e2) {
    let t2 = J.get(e2);
    return void 0 !== t2 || (t2 = new this(e2), J.set(e2, t2)), t2;
  }
  constructor(e2) {
    super(), true === e2 ? this.setupFromTrue() : void 0 === e2 ? this.setupFromUndefined() : Array.isArray(e2) ? this.setupFromArray(e2) : "object" == typeof e2 ? this.setupFromObject(e2) : g(`Invalid options argument ${e2}`), void 0 === this.firstChunkSize && (this.firstChunkSize = t ? this.firstChunkSizeBrowser : this.firstChunkSizeNode), this.mergeOutput && (this.ifd1.enabled = false), this.filterNestedSegmentTags(), this.traverseTiffDependencyTree(), this.checkLoadedPlugins();
  }
  setupFromUndefined() {
    let e2;
    for (e2 of G) this[e2] = $[e2];
    for (e2 of X) this[e2] = $[e2];
    for (e2 of W) this[e2] = $[e2];
    for (e2 of j) this[e2] = new Y(e2, $[e2], void 0, this);
  }
  setupFromTrue() {
    let e2;
    for (e2 of G) this[e2] = $[e2];
    for (e2 of X) this[e2] = $[e2];
    for (e2 of W) this[e2] = true;
    for (e2 of j) this[e2] = new Y(e2, true, void 0, this);
  }
  setupFromArray(e2) {
    let t2;
    for (t2 of G) this[t2] = $[t2];
    for (t2 of X) this[t2] = $[t2];
    for (t2 of W) this[t2] = $[t2];
    for (t2 of j) this[t2] = new Y(t2, false, void 0, this);
    this.setupGlobalFilters(e2, void 0, H);
  }
  setupFromObject(e2) {
    let t2;
    for (t2 of (H.ifd0 = H.ifd0 || H.image, H.ifd1 = H.ifd1 || H.thumbnail, Object.assign(this, e2), G)) this[t2] = Z(e2[t2], $[t2]);
    for (t2 of X) this[t2] = Z(e2[t2], $[t2]);
    for (t2 of W) this[t2] = Z(e2[t2], $[t2]);
    for (t2 of z) this[t2] = new Y(t2, $[t2], e2[t2], this);
    for (t2 of H) this[t2] = new Y(t2, $[t2], e2[t2], this.tiff);
    this.setupGlobalFilters(e2.pick, e2.skip, H, j), true === e2.tiff ? this.batchEnableWithBool(H, true) : false === e2.tiff ? this.batchEnableWithUserValue(H, e2) : Array.isArray(e2.tiff) ? this.setupGlobalFilters(e2.tiff, void 0, H) : "object" == typeof e2.tiff && this.setupGlobalFilters(e2.tiff.pick, e2.tiff.skip, H);
  }
  batchEnableWithBool(e2, t2) {
    for (let i2 of e2) this[i2].enabled = t2;
  }
  batchEnableWithUserValue(e2, t2) {
    for (let i2 of e2) {
      let e3 = t2[i2];
      this[i2].enabled = false !== e3 && void 0 !== e3;
    }
  }
  setupGlobalFilters(e2, t2, i2, n2 = i2) {
    if (e2 && e2.length) {
      for (let e3 of n2) this[e3].enabled = false;
      let t3 = Q(e2, i2);
      for (let [e3, i3] of t3) ee(this[e3].pick, i3), this[e3].enabled = true;
    } else if (t2 && t2.length) {
      let e3 = Q(t2, i2);
      for (let [t3, i3] of e3) ee(this[t3].skip, i3);
    }
  }
  filterNestedSegmentTags() {
    let { ifd0: e2, exif: t2, xmp: i2, iptc: n2, icc: s2 } = this;
    this.makerNote ? t2.deps.add(37500) : t2.skip.add(37500), this.userComment ? t2.deps.add(37510) : t2.skip.add(37510), i2.enabled || e2.skip.add(700), n2.enabled || e2.skip.add(33723), s2.enabled || e2.skip.add(34675);
  }
  traverseTiffDependencyTree() {
    let { ifd0: e2, exif: t2, gps: i2, interop: n2 } = this;
    n2.needed && (t2.deps.add(40965), e2.deps.add(40965)), t2.needed && e2.deps.add(34665), i2.needed && e2.deps.add(34853), this.tiff.enabled = H.some((e3) => true === this[e3].enabled) || this.makerNote || this.userComment;
    for (let e3 of H) this[e3].finalizeFilters();
  }
  get onlyTiff() {
    return !V.map((e2) => this[e2].enabled).some((e2) => true === e2) && this.tiff.enabled;
  }
  checkLoadedPlugins() {
    for (let e2 of z) this[e2].enabled && !T.has(e2) && P("segment parser", e2);
  }
};
function Q(e2, t2) {
  let i2, n2, s2, r2, a2 = [];
  for (s2 of t2) {
    for (r2 of (i2 = E.get(s2), n2 = [], i2)) (e2.includes(r2[0]) || e2.includes(r2[1])) && n2.push(r2[0]);
    n2.length && a2.push([s2, n2]);
  }
  return a2;
}
__name(Q, "Q");
function Z(e2, t2) {
  return void 0 !== e2 ? e2 : void 0 !== t2 ? t2 : void 0;
}
__name(Z, "Z");
function ee(e2, t2) {
  for (let i2 of t2) e2.add(i2);
}
__name(ee, "ee");
c(q, "default", $);
var te = class {
  static {
    __name(this, "te");
  }
  constructor(e2) {
    c(this, "parsers", {}), c(this, "output", {}), c(this, "errors", []), c(this, "pushToErrors", (e3) => this.errors.push(e3)), this.options = q.useCached(e2);
  }
  async read(e2) {
    this.file = await D(e2, this.options);
  }
  setup() {
    if (this.fileParser) return;
    let { file: e2 } = this, t2 = e2.getUint16(0);
    for (let [i2, n2] of w) if (n2.canHandle(e2, t2)) return this.fileParser = new n2(this.options, this.file, this.parsers), e2[i2] = true;
    this.file.close && this.file.close(), g("Unknown file format");
  }
  async parse() {
    let { output: e2, errors: t2 } = this;
    return this.setup(), this.options.silentErrors ? (await this.executeParsers().catch(this.pushToErrors), t2.push(...this.fileParser.errors)) : await this.executeParsers(), this.file.close && this.file.close(), this.options.silentErrors && t2.length > 0 && (e2.errors = t2), f(e2);
  }
  async executeParsers() {
    let { output: e2 } = this;
    await this.fileParser.parse();
    let t2 = Object.values(this.parsers).map(async (t3) => {
      let i2 = await t3.parse();
      t3.assignToOutput(e2, i2);
    });
    this.options.silentErrors && (t2 = t2.map((e3) => e3.catch(this.pushToErrors))), await Promise.all(t2);
  }
  async extractThumbnail() {
    this.setup();
    let { options: e2, file: t2 } = this, i2 = T.get("tiff", e2);
    var n2;
    if (t2.tiff ? n2 = { start: 0, type: "tiff" } : t2.jpeg && (n2 = await this.fileParser.getOrFindSegment("tiff")), void 0 === n2) return;
    let s2 = await this.fileParser.ensureSegmentChunk(n2), r2 = this.parsers.tiff = new i2(s2, e2, t2), a2 = await r2.extractThumbnail();
    return t2.close && t2.close(), a2;
  }
};
async function ie(e2, t2) {
  let i2 = new te(t2);
  return await i2.read(e2), i2.parse();
}
__name(ie, "ie");
var ne = Object.freeze({ __proto__: null, parse: ie, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q });
var se = class {
  static {
    __name(this, "se");
  }
  constructor(e2, t2, i2) {
    c(this, "errors", []), c(this, "ensureSegmentChunk", async (e3) => {
      let t3 = e3.start, i3 = e3.size || 65536;
      if (this.file.chunked) if (this.file.available(t3, i3)) e3.chunk = this.file.subarray(t3, i3);
      else try {
        e3.chunk = await this.file.readChunk(t3, i3);
      } catch (t4) {
        g(`Couldn't read segment: ${JSON.stringify(e3)}. ${t4.message}`);
      }
      else this.file.byteLength > t3 + i3 ? e3.chunk = this.file.subarray(t3, i3) : void 0 === e3.size ? e3.chunk = this.file.subarray(t3) : g("Segment unreachable: " + JSON.stringify(e3));
      return e3.chunk;
    }), this.extendOptions && this.extendOptions(e2), this.options = e2, this.file = t2, this.parsers = i2;
  }
  injectSegment(e2, t2) {
    this.options[e2].enabled && this.createParser(e2, t2);
  }
  createParser(e2, t2) {
    let i2 = new (T.get(e2))(t2, this.options, this.file);
    return this.parsers[e2] = i2;
  }
  createParsers(e2) {
    for (let t2 of e2) {
      let { type: e3, chunk: i2 } = t2, n2 = this.options[e3];
      if (n2 && n2.enabled) {
        let t3 = this.parsers[e3];
        t3 && t3.append || t3 || this.createParser(e3, i2);
      }
    }
  }
  async readSegments(e2) {
    let t2 = e2.map(this.ensureSegmentChunk);
    await Promise.all(t2);
  }
};
var re = class {
  static {
    __name(this, "re");
  }
  static findPosition(e2, t2) {
    let i2 = e2.getUint16(t2 + 2) + 2, n2 = "function" == typeof this.headerLength ? this.headerLength(e2, t2, i2) : this.headerLength, s2 = t2 + n2, r2 = i2 - n2;
    return { offset: t2, length: i2, headerLength: n2, start: s2, size: r2, end: s2 + r2 };
  }
  static parse(e2, t2 = {}) {
    return new this(e2, new q({ [this.type]: t2 }), e2).parse();
  }
  normalizeInput(e2) {
    return e2 instanceof I ? e2 : new I(e2);
  }
  constructor(e2, t2 = {}, i2) {
    c(this, "errors", []), c(this, "raw", /* @__PURE__ */ new Map()), c(this, "handleError", (e3) => {
      if (!this.options.silentErrors) throw e3;
      this.errors.push(e3.message);
    }), this.chunk = this.normalizeInput(e2), this.file = i2, this.type = this.constructor.type, this.globalOptions = this.options = t2, this.localOptions = t2[this.type], this.canTranslate = this.localOptions && this.localOptions.translate;
  }
  translate() {
    this.canTranslate && (this.translated = this.translateBlock(this.raw, this.type));
  }
  get output() {
    return this.translated ? this.translated : this.raw ? Object.fromEntries(this.raw) : void 0;
  }
  translateBlock(e2, t2) {
    let i2 = N.get(t2), n2 = B.get(t2), s2 = E.get(t2), r2 = this.options[t2], a2 = r2.reviveValues && !!i2, o2 = r2.translateValues && !!n2, l2 = r2.translateKeys && !!s2, h2 = {};
    for (let [t3, r3] of e2) a2 && i2.has(t3) ? r3 = i2.get(t3)(r3) : o2 && n2.has(t3) && (r3 = this.translateValue(r3, n2.get(t3))), l2 && s2.has(t3) && (t3 = s2.get(t3) || t3), h2[t3] = r3;
    return h2;
  }
  translateValue(e2, t2) {
    return t2[e2] || t2.DEFAULT || e2;
  }
  assignToOutput(e2, t2) {
    this.assignObjectToOutput(e2, this.constructor.type, t2);
  }
  assignObjectToOutput(e2, t2, i2) {
    if (this.globalOptions.mergeOutput) return Object.assign(e2, i2);
    e2[t2] ? Object.assign(e2[t2], i2) : e2[t2] = i2;
  }
};
c(re, "headerLength", 4), c(re, "type", void 0), c(re, "multiSegment", false), c(re, "canHandle", () => false);
function ae(e2) {
  return 192 === e2 || 194 === e2 || 196 === e2 || 219 === e2 || 221 === e2 || 218 === e2 || 254 === e2;
}
__name(ae, "ae");
function oe(e2) {
  return e2 >= 224 && e2 <= 239;
}
__name(oe, "oe");
function le(e2, t2, i2) {
  for (let [n2, s2] of T) if (s2.canHandle(e2, t2, i2)) return n2;
}
__name(le, "le");
var he = class extends se {
  static {
    __name(this, "he");
  }
  constructor(...e2) {
    super(...e2), c(this, "appSegments", []), c(this, "jpegSegments", []), c(this, "unknownSegments", []);
  }
  static canHandle(e2, t2) {
    return 65496 === t2;
  }
  async parse() {
    await this.findAppSegments(), await this.readSegments(this.appSegments), this.mergeMultiSegments(), this.createParsers(this.mergedAppSegments || this.appSegments);
  }
  setupSegmentFinderArgs(e2) {
    true === e2 ? (this.findAll = true, this.wanted = new Set(T.keyList())) : (e2 = void 0 === e2 ? T.keyList().filter((e3) => this.options[e3].enabled) : e2.filter((e3) => this.options[e3].enabled && T.has(e3)), this.findAll = false, this.remaining = new Set(e2), this.wanted = new Set(e2)), this.unfinishedMultiSegment = false;
  }
  async findAppSegments(e2 = 0, t2) {
    this.setupSegmentFinderArgs(t2);
    let { file: i2, findAll: n2, wanted: s2, remaining: r2 } = this;
    if (!n2 && this.file.chunked && (n2 = Array.from(s2).some((e3) => {
      let t3 = T.get(e3), i3 = this.options[e3];
      return t3.multiSegment && i3.multiSegment;
    }), n2 && await this.file.readWhole()), e2 = this.findAppSegmentsInRange(e2, i2.byteLength), !this.options.onlyTiff && i2.chunked) {
      let t3 = false;
      for (; r2.size > 0 && !t3 && (i2.canReadNextChunk || this.unfinishedMultiSegment); ) {
        let { nextChunkOffset: n3 } = i2, s3 = this.appSegments.some((e3) => !this.file.available(e3.offset || e3.start, e3.length || e3.size));
        if (t3 = e2 > n3 && !s3 ? !await i2.readNextChunk(e2) : !await i2.readNextChunk(n3), void 0 === (e2 = this.findAppSegmentsInRange(e2, i2.byteLength))) return;
      }
    }
  }
  findAppSegmentsInRange(e2, t2) {
    t2 -= 2;
    let i2, n2, s2, r2, a2, o2, { file: l2, findAll: h2, wanted: u2, remaining: c2, options: f2 } = this;
    for (; e2 < t2; e2++) if (255 === l2.getUint8(e2)) {
      if (i2 = l2.getUint8(e2 + 1), oe(i2)) {
        if (n2 = l2.getUint16(e2 + 2), s2 = le(l2, e2, n2), s2 && u2.has(s2) && (r2 = T.get(s2), a2 = r2.findPosition(l2, e2), o2 = f2[s2], a2.type = s2, this.appSegments.push(a2), !h2 && (r2.multiSegment && o2.multiSegment ? (this.unfinishedMultiSegment = a2.chunkNumber < a2.chunkCount, this.unfinishedMultiSegment || c2.delete(s2)) : c2.delete(s2), 0 === c2.size))) break;
        f2.recordUnknownSegments && (a2 = re.findPosition(l2, e2), a2.marker = i2, this.unknownSegments.push(a2)), e2 += n2 + 1;
      } else if (ae(i2)) {
        if (n2 = l2.getUint16(e2 + 2), 218 === i2 && false !== f2.stopAfterSos) return;
        f2.recordJpegSegments && this.jpegSegments.push({ offset: e2, length: n2, marker: i2 }), e2 += n2 + 1;
      }
    }
    return e2;
  }
  mergeMultiSegments() {
    if (!this.appSegments.some((e3) => e3.multiSegment)) return;
    let e2 = function(e3, t2) {
      let i2, n2, s2, r2 = /* @__PURE__ */ new Map();
      for (let a2 = 0; a2 < e3.length; a2++) i2 = e3[a2], n2 = i2[t2], r2.has(n2) ? s2 = r2.get(n2) : r2.set(n2, s2 = []), s2.push(i2);
      return Array.from(r2);
    }(this.appSegments, "type");
    this.mergedAppSegments = e2.map(([e3, t2]) => {
      let i2 = T.get(e3, this.options);
      if (i2.handleMultiSegments) {
        return { type: e3, chunk: i2.handleMultiSegments(t2) };
      }
      return t2[0];
    });
  }
  getSegment(e2) {
    return this.appSegments.find((t2) => t2.type === e2);
  }
  async getOrFindSegment(e2) {
    let t2 = this.getSegment(e2);
    return void 0 === t2 && (await this.findAppSegments(0, [e2]), t2 = this.getSegment(e2)), t2;
  }
};
c(he, "type", "jpeg"), w.set("jpeg", he);
var ue = [void 0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4];
var ce = class extends re {
  static {
    __name(this, "ce");
  }
  parseHeader() {
    var e2 = this.chunk.getUint16();
    18761 === e2 ? this.le = true : 19789 === e2 && (this.le = false), this.chunk.le = this.le, this.headerParsed = true;
  }
  parseTags(e2, t2, i2 = /* @__PURE__ */ new Map()) {
    let { pick: n2, skip: s2 } = this.options[t2];
    n2 = new Set(n2);
    let r2 = n2.size > 0, a2 = 0 === s2.size, o2 = this.chunk.getUint16(e2);
    e2 += 2;
    for (let l2 = 0; l2 < o2; l2++) {
      let o3 = this.chunk.getUint16(e2);
      if (r2) {
        if (n2.has(o3) && (i2.set(o3, this.parseTag(e2, o3, t2)), n2.delete(o3), 0 === n2.size)) break;
      } else !a2 && s2.has(o3) || i2.set(o3, this.parseTag(e2, o3, t2));
      e2 += 12;
    }
    return i2;
  }
  parseTag(e2, t2, i2) {
    let { chunk: n2 } = this, s2 = n2.getUint16(e2 + 2), r2 = n2.getUint32(e2 + 4), a2 = ue[s2];
    if (a2 * r2 <= 4 ? e2 += 8 : e2 = n2.getUint32(e2 + 8), (s2 < 1 || s2 > 13) && g(`Invalid TIFF value type. block: ${i2.toUpperCase()}, tag: ${t2.toString(16)}, type: ${s2}, offset ${e2}`), e2 > n2.byteLength && g(`Invalid TIFF value offset. block: ${i2.toUpperCase()}, tag: ${t2.toString(16)}, type: ${s2}, offset ${e2} is outside of chunk size ${n2.byteLength}`), 1 === s2) return n2.getUint8Array(e2, r2);
    if (2 === s2) return m(n2.getString(e2, r2));
    if (7 === s2) return n2.getUint8Array(e2, r2);
    if (1 === r2) return this.parseTagValue(s2, e2);
    {
      let t3 = new (function(e3) {
        switch (e3) {
          case 1:
            return Uint8Array;
          case 3:
            return Uint16Array;
          case 4:
            return Uint32Array;
          case 5:
            return Array;
          case 6:
            return Int8Array;
          case 8:
            return Int16Array;
          case 9:
            return Int32Array;
          case 10:
            return Array;
          case 11:
            return Float32Array;
          case 12:
            return Float64Array;
          default:
            return Array;
        }
      }(s2))(r2), i3 = a2;
      for (let n3 = 0; n3 < r2; n3++) t3[n3] = this.parseTagValue(s2, e2), e2 += i3;
      return t3;
    }
  }
  parseTagValue(e2, t2) {
    let { chunk: i2 } = this;
    switch (e2) {
      case 1:
        return i2.getUint8(t2);
      case 3:
        return i2.getUint16(t2);
      case 4:
        return i2.getUint32(t2);
      case 5:
        return i2.getUint32(t2) / i2.getUint32(t2 + 4);
      case 6:
        return i2.getInt8(t2);
      case 8:
        return i2.getInt16(t2);
      case 9:
        return i2.getInt32(t2);
      case 10:
        return i2.getInt32(t2) / i2.getInt32(t2 + 4);
      case 11:
        return i2.getFloat(t2);
      case 12:
        return i2.getDouble(t2);
      case 13:
        return i2.getUint32(t2);
      default:
        g(`Invalid tiff type ${e2}`);
    }
  }
};
var fe = class extends ce {
  static {
    __name(this, "fe");
  }
  static canHandle(e2, t2) {
    return 225 === e2.getUint8(t2 + 1) && 1165519206 === e2.getUint32(t2 + 4) && 0 === e2.getUint16(t2 + 8);
  }
  async parse() {
    this.parseHeader();
    let { options: e2 } = this;
    return e2.ifd0.enabled && await this.parseIfd0Block(), e2.exif.enabled && await this.safeParse("parseExifBlock"), e2.gps.enabled && await this.safeParse("parseGpsBlock"), e2.interop.enabled && await this.safeParse("parseInteropBlock"), e2.ifd1.enabled && await this.safeParse("parseThumbnailBlock"), this.createOutput();
  }
  safeParse(e2) {
    let t2 = this[e2]();
    return void 0 !== t2.catch && (t2 = t2.catch(this.handleError)), t2;
  }
  findIfd0Offset() {
    void 0 === this.ifd0Offset && (this.ifd0Offset = this.chunk.getUint32(4));
  }
  findIfd1Offset() {
    if (void 0 === this.ifd1Offset) {
      this.findIfd0Offset();
      let e2 = this.chunk.getUint16(this.ifd0Offset), t2 = this.ifd0Offset + 2 + 12 * e2;
      this.ifd1Offset = this.chunk.getUint32(t2);
    }
  }
  parseBlock(e2, t2) {
    let i2 = /* @__PURE__ */ new Map();
    return this[t2] = i2, this.parseTags(e2, t2, i2), i2;
  }
  async parseIfd0Block() {
    if (this.ifd0) return;
    let { file: e2 } = this;
    this.findIfd0Offset(), this.ifd0Offset < 8 && g("Malformed EXIF data"), !e2.chunked && this.ifd0Offset > e2.byteLength && g(`IFD0 offset points to outside of file.
this.ifd0Offset: ${this.ifd0Offset}, file.byteLength: ${e2.byteLength}`), e2.tiff && await e2.ensureChunk(this.ifd0Offset, S(this.options));
    let t2 = this.parseBlock(this.ifd0Offset, "ifd0");
    return 0 !== t2.size ? (this.exifOffset = t2.get(34665), this.interopOffset = t2.get(40965), this.gpsOffset = t2.get(34853), this.xmp = t2.get(700), this.iptc = t2.get(33723), this.icc = t2.get(34675), this.options.sanitize && (t2.delete(34665), t2.delete(40965), t2.delete(34853), t2.delete(700), t2.delete(33723), t2.delete(34675)), t2) : void 0;
  }
  async parseExifBlock() {
    if (this.exif) return;
    if (this.ifd0 || await this.parseIfd0Block(), void 0 === this.exifOffset) return;
    this.file.tiff && await this.file.ensureChunk(this.exifOffset, S(this.options));
    let e2 = this.parseBlock(this.exifOffset, "exif");
    return this.interopOffset || (this.interopOffset = e2.get(40965)), this.makerNote = e2.get(37500), this.userComment = e2.get(37510), this.options.sanitize && (e2.delete(40965), e2.delete(37500), e2.delete(37510)), this.unpack(e2, 41728), this.unpack(e2, 41729), e2;
  }
  unpack(e2, t2) {
    let i2 = e2.get(t2);
    i2 && 1 === i2.length && e2.set(t2, i2[0]);
  }
  async parseGpsBlock() {
    if (this.gps) return;
    if (this.ifd0 || await this.parseIfd0Block(), void 0 === this.gpsOffset) return;
    let e2 = this.parseBlock(this.gpsOffset, "gps");
    return e2 && e2.has(2) && e2.has(4) && (e2.set("latitude", de(...e2.get(2), e2.get(1))), e2.set("longitude", de(...e2.get(4), e2.get(3)))), e2;
  }
  async parseInteropBlock() {
    if (!this.interop && (this.ifd0 || await this.parseIfd0Block(), void 0 !== this.interopOffset || this.exif || await this.parseExifBlock(), void 0 !== this.interopOffset)) return this.parseBlock(this.interopOffset, "interop");
  }
  async parseThumbnailBlock(e2 = false) {
    if (!this.ifd1 && !this.ifd1Parsed && (!this.options.mergeOutput || e2)) return this.findIfd1Offset(), this.ifd1Offset > 0 && (this.parseBlock(this.ifd1Offset, "ifd1"), this.ifd1Parsed = true), this.ifd1;
  }
  async extractThumbnail() {
    if (this.headerParsed || this.parseHeader(), this.ifd1Parsed || await this.parseThumbnailBlock(true), void 0 === this.ifd1) return;
    let e2 = this.ifd1.get(513), t2 = this.ifd1.get(514);
    return this.chunk.getUint8Array(e2, t2);
  }
  get image() {
    return this.ifd0;
  }
  get thumbnail() {
    return this.ifd1;
  }
  createOutput() {
    let e2, t2, i2, n2 = {};
    for (t2 of H) if (e2 = this[t2], !p(e2)) if (i2 = this.canTranslate ? this.translateBlock(e2, t2) : Object.fromEntries(e2), this.options.mergeOutput) {
      if ("ifd1" === t2) continue;
      Object.assign(n2, i2);
    } else n2[t2] = i2;
    return this.makerNote && (n2.makerNote = this.makerNote), this.userComment && (n2.userComment = this.userComment), n2;
  }
  assignToOutput(e2, t2) {
    if (this.globalOptions.mergeOutput) Object.assign(e2, t2);
    else for (let [i2, n2] of Object.entries(t2)) this.assignObjectToOutput(e2, i2, n2);
  }
};
function de(e2, t2, i2, n2) {
  var s2 = e2 + t2 / 60 + i2 / 3600;
  return "S" !== n2 && "W" !== n2 || (s2 *= -1), s2;
}
__name(de, "de");
c(fe, "type", "tiff"), c(fe, "headerLength", 10), T.set("tiff", fe);
var pe = Object.freeze({ __proto__: null, default: ne, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q, parse: ie });
var ge = { ifd0: false, ifd1: false, exif: false, gps: false, interop: false, sanitize: false, reviveValues: true, translateKeys: false, translateValues: false, mergeOutput: false };
var me = Object.assign({}, ge, { firstChunkSize: 4e4, gps: [1, 2, 3, 4] });
async function Se(e2) {
  let t2 = new te(me);
  await t2.read(e2);
  let i2 = await t2.parse();
  if (i2 && i2.gps) {
    let { latitude: e3, longitude: t3 } = i2.gps;
    return { latitude: e3, longitude: t3 };
  }
}
__name(Se, "Se");
var Ce = Object.assign({}, ge, { tiff: false, ifd1: true, mergeOutput: false });
async function ye(e2) {
  let t2 = new te(Ce);
  await t2.read(e2);
  let i2 = await t2.extractThumbnail();
  return i2 && a ? s.from(i2) : i2;
}
__name(ye, "ye");
async function be(e2) {
  let t2 = await this.thumbnail(e2);
  if (void 0 !== t2) {
    let e3 = new Blob([t2]);
    return URL.createObjectURL(e3);
  }
}
__name(be, "be");
var Ie = Object.assign({}, ge, { firstChunkSize: 4e4, ifd0: [274] });
async function Pe(e2) {
  let t2 = new te(Ie);
  await t2.read(e2);
  let i2 = await t2.parse();
  if (i2 && i2.ifd0) return i2.ifd0[274];
}
__name(Pe, "Pe");
var ke = Object.freeze({ 1: { dimensionSwapped: false, scaleX: 1, scaleY: 1, deg: 0, rad: 0 }, 2: { dimensionSwapped: false, scaleX: -1, scaleY: 1, deg: 0, rad: 0 }, 3: { dimensionSwapped: false, scaleX: 1, scaleY: 1, deg: 180, rad: 180 * Math.PI / 180 }, 4: { dimensionSwapped: false, scaleX: -1, scaleY: 1, deg: 180, rad: 180 * Math.PI / 180 }, 5: { dimensionSwapped: true, scaleX: 1, scaleY: -1, deg: 90, rad: 90 * Math.PI / 180 }, 6: { dimensionSwapped: true, scaleX: 1, scaleY: 1, deg: 90, rad: 90 * Math.PI / 180 }, 7: { dimensionSwapped: true, scaleX: 1, scaleY: -1, deg: 270, rad: 270 * Math.PI / 180 }, 8: { dimensionSwapped: true, scaleX: 1, scaleY: 1, deg: 270, rad: 270 * Math.PI / 180 } });
var we = true;
var Te = true;
if ("object" == typeof navigator) {
  let e2 = "Cloudflare-Workers";
  if (e2.includes("iPad") || e2.includes("iPhone")) {
    let t2 = e2.match(/OS (\d+)_(\d+)/);
    if (t2) {
      let [, e3, i2] = t2, n2 = Number(e3) + 0.1 * Number(i2);
      we = n2 < 13.4, Te = false;
    }
  } else if (e2.includes("OS X 10")) {
    let [, t2] = e2.match(/OS X 10[_.](\d+)/);
    we = Te = Number(t2) < 15;
  }
  if (e2.includes("Chrome/")) {
    let [, t2] = e2.match(/Chrome\/(\d+)/);
    we = Te = Number(t2) < 81;
  } else if (e2.includes("Firefox/")) {
    let [, t2] = e2.match(/Firefox\/(\d+)/);
    we = Te = Number(t2) < 77;
  }
}
async function Ae(e2) {
  let t2 = await Pe(e2);
  return Object.assign({ canvas: we, css: Te }, ke[t2]);
}
__name(Ae, "Ae");
var De = class extends I {
  static {
    __name(this, "De");
  }
  constructor(...e2) {
    super(...e2), c(this, "ranges", new Oe()), 0 !== this.byteLength && this.ranges.add(0, this.byteLength);
  }
  _tryExtend(e2, t2, i2) {
    if (0 === e2 && 0 === this.byteLength && i2) {
      let e3 = new DataView(i2.buffer || i2, i2.byteOffset, i2.byteLength);
      this._swapDataView(e3);
    } else {
      let i3 = e2 + t2;
      if (i3 > this.byteLength) {
        let { dataView: e3 } = this._extend(i3);
        this._swapDataView(e3);
      }
    }
  }
  _extend(e2) {
    let t2;
    t2 = a ? s.allocUnsafe(e2) : new Uint8Array(e2);
    let i2 = new DataView(t2.buffer, t2.byteOffset, t2.byteLength);
    return t2.set(new Uint8Array(this.buffer, this.byteOffset, this.byteLength), 0), { uintView: t2, dataView: i2 };
  }
  subarray(e2, t2, i2 = false) {
    return t2 = t2 || this._lengthToEnd(e2), i2 && this._tryExtend(e2, t2), this.ranges.add(e2, t2), super.subarray(e2, t2);
  }
  set(e2, t2, i2 = false) {
    i2 && this._tryExtend(t2, e2.byteLength, e2);
    let n2 = super.set(e2, t2);
    return this.ranges.add(t2, n2.byteLength), n2;
  }
  async ensureChunk(e2, t2) {
    this.chunked && (this.ranges.available(e2, t2) || await this.readChunk(e2, t2));
  }
  available(e2, t2) {
    return this.ranges.available(e2, t2);
  }
};
var Oe = class {
  static {
    __name(this, "Oe");
  }
  constructor() {
    c(this, "list", []);
  }
  get length() {
    return this.list.length;
  }
  add(e2, t2, i2 = 0) {
    let n2 = e2 + t2, s2 = this.list.filter((t3) => xe(e2, t3.offset, n2) || xe(e2, t3.end, n2));
    if (s2.length > 0) {
      e2 = Math.min(e2, ...s2.map((e3) => e3.offset)), n2 = Math.max(n2, ...s2.map((e3) => e3.end)), t2 = n2 - e2;
      let i3 = s2.shift();
      i3.offset = e2, i3.length = t2, i3.end = n2, this.list = this.list.filter((e3) => !s2.includes(e3));
    } else this.list.push({ offset: e2, length: t2, end: n2 });
  }
  available(e2, t2) {
    let i2 = e2 + t2;
    return this.list.some((t3) => t3.offset <= e2 && i2 <= t3.end);
  }
};
function xe(e2, t2, i2) {
  return e2 <= t2 && t2 <= i2;
}
__name(xe, "xe");
var ve = class extends De {
  static {
    __name(this, "ve");
  }
  constructor(e2, t2) {
    super(0), c(this, "chunksRead", 0), this.input = e2, this.options = t2;
  }
  async readWhole() {
    this.chunked = false, await this.readChunk(this.nextChunkOffset);
  }
  async readChunked() {
    this.chunked = true, await this.readChunk(0, this.options.firstChunkSize);
  }
  async readNextChunk(e2 = this.nextChunkOffset) {
    if (this.fullyRead) return this.chunksRead++, false;
    let t2 = this.options.chunkSize, i2 = await this.readChunk(e2, t2);
    return !!i2 && i2.byteLength === t2;
  }
  async readChunk(e2, t2) {
    if (this.chunksRead++, 0 !== (t2 = this.safeWrapAddress(e2, t2))) return this._readChunk(e2, t2);
  }
  safeWrapAddress(e2, t2) {
    return void 0 !== this.size && e2 + t2 > this.size ? Math.max(0, this.size - e2) : t2;
  }
  get nextChunkOffset() {
    if (0 !== this.ranges.list.length) return this.ranges.list[0].length;
  }
  get canReadNextChunk() {
    return this.chunksRead < this.options.chunkLimit;
  }
  get fullyRead() {
    return void 0 !== this.size && this.nextChunkOffset === this.size;
  }
  read() {
    return this.options.chunked ? this.readChunked() : this.readWhole();
  }
  close() {
  }
};
A.set("blob", class extends ve {
  async readWhole() {
    this.chunked = false;
    let e2 = await R(this.input);
    this._swapArrayBuffer(e2);
  }
  readChunked() {
    return this.chunked = true, this.size = this.input.size, super.readChunked();
  }
  async _readChunk(e2, t2) {
    let i2 = t2 ? e2 + t2 : void 0, n2 = this.input.slice(e2, i2), s2 = await R(n2);
    return this.set(s2, e2, true);
  }
});
var Me = Object.freeze({ __proto__: null, default: pe, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q, parse: ie, gpsOnlyOptions: me, gps: Se, thumbnailOnlyOptions: Ce, thumbnail: ye, thumbnailUrl: be, orientationOnlyOptions: Ie, orientation: Pe, rotations: ke, get rotateCanvas() {
  return we;
}, get rotateCss() {
  return Te;
}, rotation: Ae });
A.set("url", class extends ve {
  async readWhole() {
    this.chunked = false;
    let e2 = await M(this.input);
    e2 instanceof ArrayBuffer ? this._swapArrayBuffer(e2) : e2 instanceof Uint8Array && this._swapBuffer(e2);
  }
  async _readChunk(e2, t2) {
    let i2 = t2 ? e2 + t2 - 1 : void 0, n2 = this.options.httpHeaders || {};
    (e2 || i2) && (n2.range = `bytes=${[e2, i2].join("-")}`);
    let s2 = await h(this.input, { headers: n2 }), r2 = await s2.arrayBuffer(), a2 = r2.byteLength;
    if (416 !== s2.status) return a2 !== t2 && (this.size = e2 + a2), this.set(r2, e2, true);
  }
});
I.prototype.getUint64 = function(e2) {
  let t2 = this.getUint32(e2), i2 = this.getUint32(e2 + 4);
  return t2 < 1048575 ? t2 << 32 | i2 : void 0 !== typeof r ? (console.warn("Using BigInt because of type 64uint but JS can only handle 53b numbers."), r(t2) << r(32) | r(i2)) : void g("Trying to read 64b value but JS can only handle 53b numbers.");
};
var Re = class extends se {
  static {
    __name(this, "Re");
  }
  parseBoxes(e2 = 0) {
    let t2 = [];
    for (; e2 < this.file.byteLength - 4; ) {
      let i2 = this.parseBoxHead(e2);
      if (t2.push(i2), 0 === i2.length) break;
      e2 += i2.length;
    }
    return t2;
  }
  parseSubBoxes(e2) {
    e2.boxes = this.parseBoxes(e2.start);
  }
  findBox(e2, t2) {
    return void 0 === e2.boxes && this.parseSubBoxes(e2), e2.boxes.find((e3) => e3.kind === t2);
  }
  parseBoxHead(e2) {
    let t2 = this.file.getUint32(e2), i2 = this.file.getString(e2 + 4, 4), n2 = e2 + 8;
    return 1 === t2 && (t2 = this.file.getUint64(e2 + 8), n2 += 8), { offset: e2, length: t2, kind: i2, start: n2 };
  }
  parseBoxFullHead(e2) {
    if (void 0 !== e2.version) return;
    let t2 = this.file.getUint32(e2.start);
    e2.version = t2 >> 24, e2.start += 4;
  }
};
var Le = class extends Re {
  static {
    __name(this, "Le");
  }
  static canHandle(e2, t2) {
    if (0 !== t2) return false;
    let i2 = e2.getUint16(2);
    if (i2 > 50) return false;
    let n2 = 16, s2 = [];
    for (; n2 < i2; ) s2.push(e2.getString(n2, 4)), n2 += 4;
    return s2.includes(this.type);
  }
  async parse() {
    let e2 = this.file.getUint32(0), t2 = this.parseBoxHead(e2);
    for (; "meta" !== t2.kind; ) e2 += t2.length, await this.file.ensureChunk(e2, 16), t2 = this.parseBoxHead(e2);
    await this.file.ensureChunk(t2.offset, t2.length), this.parseBoxFullHead(t2), this.parseSubBoxes(t2), this.options.icc.enabled && await this.findIcc(t2), this.options.tiff.enabled && await this.findExif(t2);
  }
  async registerSegment(e2, t2, i2) {
    await this.file.ensureChunk(t2, i2);
    let n2 = this.file.subarray(t2, i2);
    this.createParser(e2, n2);
  }
  async findIcc(e2) {
    let t2 = this.findBox(e2, "iprp");
    if (void 0 === t2) return;
    let i2 = this.findBox(t2, "ipco");
    if (void 0 === i2) return;
    let n2 = this.findBox(i2, "colr");
    void 0 !== n2 && await this.registerSegment("icc", n2.offset + 12, n2.length);
  }
  async findExif(e2) {
    let t2 = this.findBox(e2, "iinf");
    if (void 0 === t2) return;
    let i2 = this.findBox(e2, "iloc");
    if (void 0 === i2) return;
    let n2 = this.findExifLocIdInIinf(t2), s2 = this.findExtentInIloc(i2, n2);
    if (void 0 === s2) return;
    let [r2, a2] = s2;
    await this.file.ensureChunk(r2, a2);
    let o2 = 4 + this.file.getUint32(r2);
    r2 += o2, a2 -= o2, await this.registerSegment("tiff", r2, a2);
  }
  findExifLocIdInIinf(e2) {
    this.parseBoxFullHead(e2);
    let t2, i2, n2, s2, r2 = e2.start, a2 = this.file.getUint16(r2);
    for (r2 += 2; a2--; ) {
      if (t2 = this.parseBoxHead(r2), this.parseBoxFullHead(t2), i2 = t2.start, t2.version >= 2 && (n2 = 3 === t2.version ? 4 : 2, s2 = this.file.getString(i2 + n2 + 2, 4), "Exif" === s2)) return this.file.getUintBytes(i2, n2);
      r2 += t2.length;
    }
  }
  get8bits(e2) {
    let t2 = this.file.getUint8(e2);
    return [t2 >> 4, 15 & t2];
  }
  findExtentInIloc(e2, t2) {
    this.parseBoxFullHead(e2);
    let i2 = e2.start, [n2, s2] = this.get8bits(i2++), [r2, a2] = this.get8bits(i2++), o2 = 2 === e2.version ? 4 : 2, l2 = 1 === e2.version || 2 === e2.version ? 2 : 0, h2 = a2 + n2 + s2, u2 = 2 === e2.version ? 4 : 2, c2 = this.file.getUintBytes(i2, u2);
    for (i2 += u2; c2--; ) {
      let e3 = this.file.getUintBytes(i2, o2);
      i2 += o2 + l2 + 2 + r2;
      let u3 = this.file.getUint16(i2);
      if (i2 += 2, e3 === t2) return u3 > 1 && console.warn("ILOC box has more than one extent but we're only processing one\nPlease create an issue at https://github.com/MikeKovarik/exifr with this file"), [this.file.getUintBytes(i2 + a2, n2), this.file.getUintBytes(i2 + a2 + n2, s2)];
      i2 += u3 * h2;
    }
  }
};
var Ue = class extends Le {
  static {
    __name(this, "Ue");
  }
};
c(Ue, "type", "heic");
var Fe = class extends Le {
  static {
    __name(this, "Fe");
  }
};
c(Fe, "type", "avif"), w.set("heic", Ue), w.set("avif", Fe), U(E, ["ifd0", "ifd1"], [[256, "ImageWidth"], [257, "ImageHeight"], [258, "BitsPerSample"], [259, "Compression"], [262, "PhotometricInterpretation"], [270, "ImageDescription"], [271, "Make"], [272, "Model"], [273, "StripOffsets"], [274, "Orientation"], [277, "SamplesPerPixel"], [278, "RowsPerStrip"], [279, "StripByteCounts"], [282, "XResolution"], [283, "YResolution"], [284, "PlanarConfiguration"], [296, "ResolutionUnit"], [301, "TransferFunction"], [305, "Software"], [306, "ModifyDate"], [315, "Artist"], [316, "HostComputer"], [317, "Predictor"], [318, "WhitePoint"], [319, "PrimaryChromaticities"], [513, "ThumbnailOffset"], [514, "ThumbnailLength"], [529, "YCbCrCoefficients"], [530, "YCbCrSubSampling"], [531, "YCbCrPositioning"], [532, "ReferenceBlackWhite"], [700, "ApplicationNotes"], [33432, "Copyright"], [33723, "IPTC"], [34665, "ExifIFD"], [34675, "ICC"], [34853, "GpsIFD"], [330, "SubIFD"], [40965, "InteropIFD"], [40091, "XPTitle"], [40092, "XPComment"], [40093, "XPAuthor"], [40094, "XPKeywords"], [40095, "XPSubject"]]), U(E, "exif", [[33434, "ExposureTime"], [33437, "FNumber"], [34850, "ExposureProgram"], [34852, "SpectralSensitivity"], [34855, "ISO"], [34858, "TimeZoneOffset"], [34859, "SelfTimerMode"], [34864, "SensitivityType"], [34865, "StandardOutputSensitivity"], [34866, "RecommendedExposureIndex"], [34867, "ISOSpeed"], [34868, "ISOSpeedLatitudeyyy"], [34869, "ISOSpeedLatitudezzz"], [36864, "ExifVersion"], [36867, "DateTimeOriginal"], [36868, "CreateDate"], [36873, "GooglePlusUploadCode"], [36880, "OffsetTime"], [36881, "OffsetTimeOriginal"], [36882, "OffsetTimeDigitized"], [37121, "ComponentsConfiguration"], [37122, "CompressedBitsPerPixel"], [37377, "ShutterSpeedValue"], [37378, "ApertureValue"], [37379, "BrightnessValue"], [37380, "ExposureCompensation"], [37381, "MaxApertureValue"], [37382, "SubjectDistance"], [37383, "MeteringMode"], [37384, "LightSource"], [37385, "Flash"], [37386, "FocalLength"], [37393, "ImageNumber"], [37394, "SecurityClassification"], [37395, "ImageHistory"], [37396, "SubjectArea"], [37500, "MakerNote"], [37510, "UserComment"], [37520, "SubSecTime"], [37521, "SubSecTimeOriginal"], [37522, "SubSecTimeDigitized"], [37888, "AmbientTemperature"], [37889, "Humidity"], [37890, "Pressure"], [37891, "WaterDepth"], [37892, "Acceleration"], [37893, "CameraElevationAngle"], [40960, "FlashpixVersion"], [40961, "ColorSpace"], [40962, "ExifImageWidth"], [40963, "ExifImageHeight"], [40964, "RelatedSoundFile"], [41483, "FlashEnergy"], [41486, "FocalPlaneXResolution"], [41487, "FocalPlaneYResolution"], [41488, "FocalPlaneResolutionUnit"], [41492, "SubjectLocation"], [41493, "ExposureIndex"], [41495, "SensingMethod"], [41728, "FileSource"], [41729, "SceneType"], [41730, "CFAPattern"], [41985, "CustomRendered"], [41986, "ExposureMode"], [41987, "WhiteBalance"], [41988, "DigitalZoomRatio"], [41989, "FocalLengthIn35mmFormat"], [41990, "SceneCaptureType"], [41991, "GainControl"], [41992, "Contrast"], [41993, "Saturation"], [41994, "Sharpness"], [41996, "SubjectDistanceRange"], [42016, "ImageUniqueID"], [42032, "OwnerName"], [42033, "SerialNumber"], [42034, "LensInfo"], [42035, "LensMake"], [42036, "LensModel"], [42037, "LensSerialNumber"], [42080, "CompositeImage"], [42081, "CompositeImageCount"], [42082, "CompositeImageExposureTimes"], [42240, "Gamma"], [59932, "Padding"], [59933, "OffsetSchema"], [65e3, "OwnerName"], [65001, "SerialNumber"], [65002, "Lens"], [65100, "RawFile"], [65101, "Converter"], [65102, "WhiteBalance"], [65105, "Exposure"], [65106, "Shadows"], [65107, "Brightness"], [65108, "Contrast"], [65109, "Saturation"], [65110, "Sharpness"], [65111, "Smoothness"], [65112, "MoireFilter"], [40965, "InteropIFD"]]), U(E, "gps", [[0, "GPSVersionID"], [1, "GPSLatitudeRef"], [2, "GPSLatitude"], [3, "GPSLongitudeRef"], [4, "GPSLongitude"], [5, "GPSAltitudeRef"], [6, "GPSAltitude"], [7, "GPSTimeStamp"], [8, "GPSSatellites"], [9, "GPSStatus"], [10, "GPSMeasureMode"], [11, "GPSDOP"], [12, "GPSSpeedRef"], [13, "GPSSpeed"], [14, "GPSTrackRef"], [15, "GPSTrack"], [16, "GPSImgDirectionRef"], [17, "GPSImgDirection"], [18, "GPSMapDatum"], [19, "GPSDestLatitudeRef"], [20, "GPSDestLatitude"], [21, "GPSDestLongitudeRef"], [22, "GPSDestLongitude"], [23, "GPSDestBearingRef"], [24, "GPSDestBearing"], [25, "GPSDestDistanceRef"], [26, "GPSDestDistance"], [27, "GPSProcessingMethod"], [28, "GPSAreaInformation"], [29, "GPSDateStamp"], [30, "GPSDifferential"], [31, "GPSHPositioningError"]]), U(B, ["ifd0", "ifd1"], [[274, { 1: "Horizontal (normal)", 2: "Mirror horizontal", 3: "Rotate 180", 4: "Mirror vertical", 5: "Mirror horizontal and rotate 270 CW", 6: "Rotate 90 CW", 7: "Mirror horizontal and rotate 90 CW", 8: "Rotate 270 CW" }], [296, { 1: "None", 2: "inches", 3: "cm" }]]);
var Ee = U(B, "exif", [[34850, { 0: "Not defined", 1: "Manual", 2: "Normal program", 3: "Aperture priority", 4: "Shutter priority", 5: "Creative program", 6: "Action program", 7: "Portrait mode", 8: "Landscape mode" }], [37121, { 0: "-", 1: "Y", 2: "Cb", 3: "Cr", 4: "R", 5: "G", 6: "B" }], [37383, { 0: "Unknown", 1: "Average", 2: "CenterWeightedAverage", 3: "Spot", 4: "MultiSpot", 5: "Pattern", 6: "Partial", 255: "Other" }], [37384, { 0: "Unknown", 1: "Daylight", 2: "Fluorescent", 3: "Tungsten (incandescent light)", 4: "Flash", 9: "Fine weather", 10: "Cloudy weather", 11: "Shade", 12: "Daylight fluorescent (D 5700 - 7100K)", 13: "Day white fluorescent (N 4600 - 5400K)", 14: "Cool white fluorescent (W 3900 - 4500K)", 15: "White fluorescent (WW 3200 - 3700K)", 17: "Standard light A", 18: "Standard light B", 19: "Standard light C", 20: "D55", 21: "D65", 22: "D75", 23: "D50", 24: "ISO studio tungsten", 255: "Other" }], [37385, { 0: "Flash did not fire", 1: "Flash fired", 5: "Strobe return light not detected", 7: "Strobe return light detected", 9: "Flash fired, compulsory flash mode", 13: "Flash fired, compulsory flash mode, return light not detected", 15: "Flash fired, compulsory flash mode, return light detected", 16: "Flash did not fire, compulsory flash mode", 24: "Flash did not fire, auto mode", 25: "Flash fired, auto mode", 29: "Flash fired, auto mode, return light not detected", 31: "Flash fired, auto mode, return light detected", 32: "No flash function", 65: "Flash fired, red-eye reduction mode", 69: "Flash fired, red-eye reduction mode, return light not detected", 71: "Flash fired, red-eye reduction mode, return light detected", 73: "Flash fired, compulsory flash mode, red-eye reduction mode", 77: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected", 79: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected", 89: "Flash fired, auto mode, red-eye reduction mode", 93: "Flash fired, auto mode, return light not detected, red-eye reduction mode", 95: "Flash fired, auto mode, return light detected, red-eye reduction mode" }], [41495, { 1: "Not defined", 2: "One-chip color area sensor", 3: "Two-chip color area sensor", 4: "Three-chip color area sensor", 5: "Color sequential area sensor", 7: "Trilinear sensor", 8: "Color sequential linear sensor" }], [41728, { 1: "Film Scanner", 2: "Reflection Print Scanner", 3: "Digital Camera" }], [41729, { 1: "Directly photographed" }], [41985, { 0: "Normal", 1: "Custom", 2: "HDR (no original saved)", 3: "HDR (original saved)", 4: "Original (for HDR)", 6: "Panorama", 7: "Portrait HDR", 8: "Portrait" }], [41986, { 0: "Auto", 1: "Manual", 2: "Auto bracket" }], [41987, { 0: "Auto", 1: "Manual" }], [41990, { 0: "Standard", 1: "Landscape", 2: "Portrait", 3: "Night", 4: "Other" }], [41991, { 0: "None", 1: "Low gain up", 2: "High gain up", 3: "Low gain down", 4: "High gain down" }], [41996, { 0: "Unknown", 1: "Macro", 2: "Close", 3: "Distant" }], [42080, { 0: "Unknown", 1: "Not a Composite Image", 2: "General Composite Image", 3: "Composite Image Captured While Shooting" }]]);
var Be = { 1: "No absolute unit of measurement", 2: "Inch", 3: "Centimeter" };
Ee.set(37392, Be), Ee.set(41488, Be);
var Ne = { 0: "Normal", 1: "Low", 2: "High" };
function Ge(e2) {
  return "object" == typeof e2 && void 0 !== e2.length ? e2[0] : e2;
}
__name(Ge, "Ge");
function Ve(e2) {
  let t2 = Array.from(e2).slice(1);
  return t2[1] > 15 && (t2 = t2.map((e3) => String.fromCharCode(e3))), "0" !== t2[2] && 0 !== t2[2] || t2.pop(), t2.join(".");
}
__name(Ve, "Ve");
function ze(e2) {
  if ("string" == typeof e2) {
    var [t2, i2, n2, s2, r2, a2] = e2.trim().split(/[-: ]/g).map(Number), o2 = new Date(t2, i2 - 1, n2);
    return Number.isNaN(s2) || Number.isNaN(r2) || Number.isNaN(a2) || (o2.setHours(s2), o2.setMinutes(r2), o2.setSeconds(a2)), Number.isNaN(+o2) ? e2 : o2;
  }
}
__name(ze, "ze");
function He(e2) {
  if ("string" == typeof e2) return e2;
  let t2 = [];
  if (0 === e2[1] && 0 === e2[e2.length - 1]) for (let i2 = 0; i2 < e2.length; i2 += 2) t2.push(je(e2[i2 + 1], e2[i2]));
  else for (let i2 = 0; i2 < e2.length; i2 += 2) t2.push(je(e2[i2], e2[i2 + 1]));
  return m(String.fromCodePoint(...t2));
}
__name(He, "He");
function je(e2, t2) {
  return e2 << 8 | t2;
}
__name(je, "je");
Ee.set(41992, Ne), Ee.set(41993, Ne), Ee.set(41994, Ne), U(N, ["ifd0", "ifd1"], [[50827, function(e2) {
  return "string" != typeof e2 ? b(e2) : e2;
}], [306, ze], [40091, He], [40092, He], [40093, He], [40094, He], [40095, He]]), U(N, "exif", [[40960, Ve], [36864, Ve], [36867, ze], [36868, ze], [40962, Ge], [40963, Ge]]), U(N, "gps", [[0, (e2) => Array.from(e2).join(".")], [7, (e2) => Array.from(e2).join(":")]]);
var We = class extends re {
  static {
    __name(this, "We");
  }
  static canHandle(e2, t2) {
    return 225 === e2.getUint8(t2 + 1) && 1752462448 === e2.getUint32(t2 + 4) && "http://ns.adobe.com/" === e2.getString(t2 + 4, "http://ns.adobe.com/".length);
  }
  static headerLength(e2, t2) {
    return "http://ns.adobe.com/xmp/extension/" === e2.getString(t2 + 4, "http://ns.adobe.com/xmp/extension/".length) ? 79 : 4 + "http://ns.adobe.com/xap/1.0/".length + 1;
  }
  static findPosition(e2, t2) {
    let i2 = super.findPosition(e2, t2);
    return i2.multiSegment = i2.extended = 79 === i2.headerLength, i2.multiSegment ? (i2.chunkCount = e2.getUint8(t2 + 72), i2.chunkNumber = e2.getUint8(t2 + 76), 0 !== e2.getUint8(t2 + 77) && i2.chunkNumber++) : (i2.chunkCount = 1 / 0, i2.chunkNumber = -1), i2;
  }
  static handleMultiSegments(e2) {
    return e2.map((e3) => e3.chunk.getString()).join("");
  }
  normalizeInput(e2) {
    return "string" == typeof e2 ? e2 : I.from(e2).getString();
  }
  parse(e2 = this.chunk) {
    if (!this.localOptions.parse) return e2;
    e2 = function(e3) {
      let t3 = {}, i3 = {};
      for (let e4 of Ze) t3[e4] = [], i3[e4] = 0;
      return e3.replace(et, (e4, n3, s2) => {
        if ("<" === n3) {
          let n4 = ++i3[s2];
          return t3[s2].push(n4), `${e4}#${n4}`;
        }
        return `${e4}#${t3[s2].pop()}`;
      });
    }(e2);
    let t2 = Xe.findAll(e2, "rdf", "Description");
    0 === t2.length && t2.push(new Xe("rdf", "Description", void 0, e2));
    let i2, n2 = {};
    for (let e3 of t2) for (let t3 of e3.properties) i2 = Je(t3.ns, n2), _e(t3, i2);
    return function(e3) {
      let t3;
      for (let i3 in e3) t3 = e3[i3] = f(e3[i3]), void 0 === t3 && delete e3[i3];
      return f(e3);
    }(n2);
  }
  assignToOutput(e2, t2) {
    if (this.localOptions.parse) for (let [i2, n2] of Object.entries(t2)) switch (i2) {
      case "tiff":
        this.assignObjectToOutput(e2, "ifd0", n2);
        break;
      case "exif":
        this.assignObjectToOutput(e2, "exif", n2);
        break;
      case "xmlns":
        break;
      default:
        this.assignObjectToOutput(e2, i2, n2);
    }
    else e2.xmp = t2;
  }
};
c(We, "type", "xmp"), c(We, "multiSegment", true), T.set("xmp", We);
var Ke = class _Ke {
  static {
    __name(this, "Ke");
  }
  static findAll(e2) {
    return qe(e2, /([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)=("[^"]*"|'[^']*')/gm).map(_Ke.unpackMatch);
  }
  static unpackMatch(e2) {
    let t2 = e2[1], i2 = e2[2], n2 = e2[3].slice(1, -1);
    return n2 = Qe(n2), new _Ke(t2, i2, n2);
  }
  constructor(e2, t2, i2) {
    this.ns = e2, this.name = t2, this.value = i2;
  }
  serialize() {
    return this.value;
  }
};
var Xe = class _Xe {
  static {
    __name(this, "Xe");
  }
  static findAll(e2, t2, i2) {
    if (void 0 !== t2 || void 0 !== i2) {
      t2 = t2 || "[\\w\\d-]+", i2 = i2 || "[\\w\\d-]+";
      var n2 = new RegExp(`<(${t2}):(${i2})(#\\d+)?((\\s+?[\\w\\d-:]+=("[^"]*"|'[^']*'))*\\s*)(\\/>|>([\\s\\S]*?)<\\/\\1:\\2\\3>)`, "gm");
    } else n2 = /<([\w\d-]+):([\w\d-]+)(#\d+)?((\s+?[\w\d-:]+=("[^"]*"|'[^']*'))*\s*)(\/>|>([\s\S]*?)<\/\1:\2\3>)/gm;
    return qe(e2, n2).map(_Xe.unpackMatch);
  }
  static unpackMatch(e2) {
    let t2 = e2[1], i2 = e2[2], n2 = e2[4], s2 = e2[8];
    return new _Xe(t2, i2, n2, s2);
  }
  constructor(e2, t2, i2, n2) {
    this.ns = e2, this.name = t2, this.attrString = i2, this.innerXml = n2, this.attrs = Ke.findAll(i2), this.children = _Xe.findAll(n2), this.value = 0 === this.children.length ? Qe(n2) : void 0, this.properties = [...this.attrs, ...this.children];
  }
  get isPrimitive() {
    return void 0 !== this.value && 0 === this.attrs.length && 0 === this.children.length;
  }
  get isListContainer() {
    return 1 === this.children.length && this.children[0].isList;
  }
  get isList() {
    let { ns: e2, name: t2 } = this;
    return "rdf" === e2 && ("Seq" === t2 || "Bag" === t2 || "Alt" === t2);
  }
  get isListItem() {
    return "rdf" === this.ns && "li" === this.name;
  }
  serialize() {
    if (0 === this.properties.length && void 0 === this.value) return;
    if (this.isPrimitive) return this.value;
    if (this.isListContainer) return this.children[0].serialize();
    if (this.isList) return $e(this.children.map(Ye));
    if (this.isListItem && 1 === this.children.length && 0 === this.attrs.length) return this.children[0].serialize();
    let e2 = {};
    for (let t2 of this.properties) _e(t2, e2);
    return void 0 !== this.value && (e2.value = this.value), f(e2);
  }
};
function _e(e2, t2) {
  let i2 = e2.serialize();
  void 0 !== i2 && (t2[e2.name] = i2);
}
__name(_e, "_e");
var Ye = /* @__PURE__ */ __name((e2) => e2.serialize(), "Ye");
var $e = /* @__PURE__ */ __name((e2) => 1 === e2.length ? e2[0] : e2, "$e");
var Je = /* @__PURE__ */ __name((e2, t2) => t2[e2] ? t2[e2] : t2[e2] = {}, "Je");
function qe(e2, t2) {
  let i2, n2 = [];
  if (!e2) return n2;
  for (; null !== (i2 = t2.exec(e2)); ) n2.push(i2);
  return n2;
}
__name(qe, "qe");
function Qe(e2) {
  if (function(e3) {
    return null == e3 || "null" === e3 || "undefined" === e3 || "" === e3 || "" === e3.trim();
  }(e2)) return;
  let t2 = Number(e2);
  if (!Number.isNaN(t2)) return t2;
  let i2 = e2.toLowerCase();
  return "true" === i2 || "false" !== i2 && e2.trim();
}
__name(Qe, "Qe");
var Ze = ["rdf:li", "rdf:Seq", "rdf:Bag", "rdf:Alt", "rdf:Description"];
var et = new RegExp(`(<|\\/)(${Ze.join("|")})`, "g");
var tt = Object.freeze({ __proto__: null, default: Me, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q, parse: ie, gpsOnlyOptions: me, gps: Se, thumbnailOnlyOptions: Ce, thumbnail: ye, thumbnailUrl: be, orientationOnlyOptions: Ie, orientation: Pe, rotations: ke, get rotateCanvas() {
  return we;
}, get rotateCss() {
  return Te;
}, rotation: Ae });
var at = l("fs", (e2) => e2.promises);
A.set("fs", class extends ve {
  async readWhole() {
    this.chunked = false, this.fs = await at;
    let e2 = await this.fs.readFile(this.input);
    this._swapBuffer(e2);
  }
  async readChunked() {
    this.chunked = true, this.fs = await at, await this.open(), await this.readChunk(0, this.options.firstChunkSize);
  }
  async open() {
    void 0 === this.fh && (this.fh = await this.fs.open(this.input, "r"), this.size = (await this.fh.stat(this.input)).size);
  }
  async _readChunk(e2, t2) {
    void 0 === this.fh && await this.open(), e2 + t2 > this.size && (t2 = this.size - e2);
    var i2 = this.subarray(e2, t2, true);
    return await this.fh.read(i2.dataView, 0, t2, e2), i2;
  }
  async close() {
    if (this.fh) {
      let e2 = this.fh;
      this.fh = void 0, await e2.close();
    }
  }
});
A.set("base64", class extends ve {
  constructor(...e2) {
    super(...e2), this.input = this.input.replace(/^data:([^;]+);base64,/gim, ""), this.size = this.input.length / 4 * 3, this.input.endsWith("==") ? this.size -= 2 : this.input.endsWith("=") && (this.size -= 1);
  }
  async _readChunk(e2, t2) {
    let i2, n2, r2 = this.input;
    void 0 === e2 ? (e2 = 0, i2 = 0, n2 = 0) : (i2 = 4 * Math.floor(e2 / 3), n2 = e2 - i2 / 4 * 3), void 0 === t2 && (t2 = this.size);
    let o2 = e2 + t2, l2 = i2 + 4 * Math.ceil(o2 / 3);
    r2 = r2.slice(i2, l2);
    let h2 = Math.min(t2, this.size - e2);
    if (a) {
      let t3 = s.from(r2, "base64").slice(n2, n2 + h2);
      return this.set(t3, e2, true);
    }
    {
      let t3 = this.subarray(e2, h2, true), i3 = atob(r2), s2 = t3.toUint8();
      for (let e3 = 0; e3 < h2; e3++) s2[e3] = i3.charCodeAt(n2 + e3);
      return t3;
    }
  }
});
var ot = class extends se {
  static {
    __name(this, "ot");
  }
  static canHandle(e2, t2) {
    return 18761 === t2 || 19789 === t2;
  }
  extendOptions(e2) {
    let { ifd0: t2, xmp: i2, iptc: n2, icc: s2 } = e2;
    i2.enabled && t2.deps.add(700), n2.enabled && t2.deps.add(33723), s2.enabled && t2.deps.add(34675), t2.finalizeFilters();
  }
  async parse() {
    let { tiff: e2, xmp: t2, iptc: i2, icc: n2 } = this.options;
    if (e2.enabled || t2.enabled || i2.enabled || n2.enabled) {
      let e3 = Math.max(S(this.options), this.options.chunkSize);
      await this.file.ensureChunk(0, e3), this.createParser("tiff", this.file), this.parsers.tiff.parseHeader(), await this.parsers.tiff.parseIfd0Block(), this.adaptTiffPropAsSegment("xmp"), this.adaptTiffPropAsSegment("iptc"), this.adaptTiffPropAsSegment("icc");
    }
  }
  adaptTiffPropAsSegment(e2) {
    if (this.parsers.tiff[e2]) {
      let t2 = this.parsers.tiff[e2];
      this.injectSegment(e2, t2);
    }
  }
};
c(ot, "type", "tiff"), w.set("tiff", ot);
var lt = l("zlib");
var ht = ["ihdr", "iccp", "text", "itxt", "exif"];
var ut = class extends se {
  static {
    __name(this, "ut");
  }
  constructor(...e2) {
    super(...e2), c(this, "catchError", (e3) => this.errors.push(e3)), c(this, "metaChunks", []), c(this, "unknownChunks", []);
  }
  static canHandle(e2, t2) {
    return 35152 === t2 && 2303741511 === e2.getUint32(0) && 218765834 === e2.getUint32(4);
  }
  async parse() {
    let { file: e2 } = this;
    await this.findPngChunksInRange("\x89PNG\r\n\n".length, e2.byteLength), await this.readSegments(this.metaChunks), this.findIhdr(), this.parseTextChunks(), await this.findExif().catch(this.catchError), await this.findXmp().catch(this.catchError), await this.findIcc().catch(this.catchError);
  }
  async findPngChunksInRange(e2, t2) {
    let { file: i2 } = this;
    for (; e2 < t2; ) {
      let t3 = i2.getUint32(e2), n2 = i2.getUint32(e2 + 4), s2 = i2.getString(e2 + 4, 4).toLowerCase(), r2 = t3 + 4 + 4 + 4, a2 = { type: s2, offset: e2, length: r2, start: e2 + 4 + 4, size: t3, marker: n2 };
      ht.includes(s2) ? this.metaChunks.push(a2) : this.unknownChunks.push(a2), e2 += r2;
    }
  }
  parseTextChunks() {
    let e2 = this.metaChunks.filter((e3) => "text" === e3.type);
    for (let t2 of e2) {
      let [e3, i2] = this.file.getString(t2.start, t2.size).split("\0");
      this.injectKeyValToIhdr(e3, i2);
    }
  }
  injectKeyValToIhdr(e2, t2) {
    let i2 = this.parsers.ihdr;
    i2 && i2.raw.set(e2, t2);
  }
  findIhdr() {
    let e2 = this.metaChunks.find((e3) => "ihdr" === e3.type);
    e2 && false !== this.options.ihdr.enabled && this.createParser("ihdr", e2.chunk);
  }
  async findExif() {
    let e2 = this.metaChunks.find((e3) => "exif" === e3.type);
    e2 && this.injectSegment("tiff", e2.chunk);
  }
  async findXmp() {
    let e2 = this.metaChunks.filter((e3) => "itxt" === e3.type);
    for (let t2 of e2) {
      "XML:com.adobe.xmp" === t2.chunk.getString(0, "XML:com.adobe.xmp".length) && this.injectSegment("xmp", t2.chunk);
    }
  }
  async findIcc() {
    let e2 = this.metaChunks.find((e3) => "iccp" === e3.type);
    if (!e2) return;
    let { chunk: t2 } = e2, i2 = t2.getUint8Array(0, 81), s2 = 0;
    for (; s2 < 80 && 0 !== i2[s2]; ) s2++;
    let r2 = s2 + 2, a2 = t2.getString(0, s2);
    if (this.injectKeyValToIhdr("ProfileName", a2), n) {
      let e3 = await lt, i3 = t2.getUint8Array(r2);
      i3 = e3.inflateSync(i3), this.injectSegment("icc", i3);
    }
  }
};
c(ut, "type", "png"), w.set("png", ut), U(E, "interop", [[1, "InteropIndex"], [2, "InteropVersion"], [4096, "RelatedImageFileFormat"], [4097, "RelatedImageWidth"], [4098, "RelatedImageHeight"]]), F(E, "ifd0", [[11, "ProcessingSoftware"], [254, "SubfileType"], [255, "OldSubfileType"], [263, "Thresholding"], [264, "CellWidth"], [265, "CellLength"], [266, "FillOrder"], [269, "DocumentName"], [280, "MinSampleValue"], [281, "MaxSampleValue"], [285, "PageName"], [286, "XPosition"], [287, "YPosition"], [290, "GrayResponseUnit"], [297, "PageNumber"], [321, "HalftoneHints"], [322, "TileWidth"], [323, "TileLength"], [332, "InkSet"], [337, "TargetPrinter"], [18246, "Rating"], [18249, "RatingPercent"], [33550, "PixelScale"], [34264, "ModelTransform"], [34377, "PhotoshopSettings"], [50706, "DNGVersion"], [50707, "DNGBackwardVersion"], [50708, "UniqueCameraModel"], [50709, "LocalizedCameraModel"], [50736, "DNGLensInfo"], [50739, "ShadowScale"], [50740, "DNGPrivateData"], [33920, "IntergraphMatrix"], [33922, "ModelTiePoint"], [34118, "SEMInfo"], [34735, "GeoTiffDirectory"], [34736, "GeoTiffDoubleParams"], [34737, "GeoTiffAsciiParams"], [50341, "PrintIM"], [50721, "ColorMatrix1"], [50722, "ColorMatrix2"], [50723, "CameraCalibration1"], [50724, "CameraCalibration2"], [50725, "ReductionMatrix1"], [50726, "ReductionMatrix2"], [50727, "AnalogBalance"], [50728, "AsShotNeutral"], [50729, "AsShotWhiteXY"], [50730, "BaselineExposure"], [50731, "BaselineNoise"], [50732, "BaselineSharpness"], [50734, "LinearResponseLimit"], [50735, "CameraSerialNumber"], [50741, "MakerNoteSafety"], [50778, "CalibrationIlluminant1"], [50779, "CalibrationIlluminant2"], [50781, "RawDataUniqueID"], [50827, "OriginalRawFileName"], [50828, "OriginalRawFileData"], [50831, "AsShotICCProfile"], [50832, "AsShotPreProfileMatrix"], [50833, "CurrentICCProfile"], [50834, "CurrentPreProfileMatrix"], [50879, "ColorimetricReference"], [50885, "SRawType"], [50898, "PanasonicTitle"], [50899, "PanasonicTitle2"], [50931, "CameraCalibrationSig"], [50932, "ProfileCalibrationSig"], [50933, "ProfileIFD"], [50934, "AsShotProfileName"], [50936, "ProfileName"], [50937, "ProfileHueSatMapDims"], [50938, "ProfileHueSatMapData1"], [50939, "ProfileHueSatMapData2"], [50940, "ProfileToneCurve"], [50941, "ProfileEmbedPolicy"], [50942, "ProfileCopyright"], [50964, "ForwardMatrix1"], [50965, "ForwardMatrix2"], [50966, "PreviewApplicationName"], [50967, "PreviewApplicationVersion"], [50968, "PreviewSettingsName"], [50969, "PreviewSettingsDigest"], [50970, "PreviewColorSpace"], [50971, "PreviewDateTime"], [50972, "RawImageDigest"], [50973, "OriginalRawFileDigest"], [50981, "ProfileLookTableDims"], [50982, "ProfileLookTableData"], [51043, "TimeCodes"], [51044, "FrameRate"], [51058, "TStop"], [51081, "ReelName"], [51089, "OriginalDefaultFinalSize"], [51090, "OriginalBestQualitySize"], [51091, "OriginalDefaultCropSize"], [51105, "CameraLabel"], [51107, "ProfileHueSatMapEncoding"], [51108, "ProfileLookTableEncoding"], [51109, "BaselineExposureOffset"], [51110, "DefaultBlackRender"], [51111, "NewRawImageDigest"], [51112, "RawToPreviewGain"]]);
var ct = [[273, "StripOffsets"], [279, "StripByteCounts"], [288, "FreeOffsets"], [289, "FreeByteCounts"], [291, "GrayResponseCurve"], [292, "T4Options"], [293, "T6Options"], [300, "ColorResponseUnit"], [320, "ColorMap"], [324, "TileOffsets"], [325, "TileByteCounts"], [326, "BadFaxLines"], [327, "CleanFaxData"], [328, "ConsecutiveBadFaxLines"], [330, "SubIFD"], [333, "InkNames"], [334, "NumberofInks"], [336, "DotRange"], [338, "ExtraSamples"], [339, "SampleFormat"], [340, "SMinSampleValue"], [341, "SMaxSampleValue"], [342, "TransferRange"], [343, "ClipPath"], [344, "XClipPathUnits"], [345, "YClipPathUnits"], [346, "Indexed"], [347, "JPEGTables"], [351, "OPIProxy"], [400, "GlobalParametersIFD"], [401, "ProfileType"], [402, "FaxProfile"], [403, "CodingMethods"], [404, "VersionYear"], [405, "ModeNumber"], [433, "Decode"], [434, "DefaultImageColor"], [435, "T82Options"], [437, "JPEGTables"], [512, "JPEGProc"], [515, "JPEGRestartInterval"], [517, "JPEGLosslessPredictors"], [518, "JPEGPointTransforms"], [519, "JPEGQTables"], [520, "JPEGDCTables"], [521, "JPEGACTables"], [559, "StripRowCounts"], [999, "USPTOMiscellaneous"], [18247, "XP_DIP_XML"], [18248, "StitchInfo"], [28672, "SonyRawFileType"], [28688, "SonyToneCurve"], [28721, "VignettingCorrection"], [28722, "VignettingCorrParams"], [28724, "ChromaticAberrationCorrection"], [28725, "ChromaticAberrationCorrParams"], [28726, "DistortionCorrection"], [28727, "DistortionCorrParams"], [29895, "SonyCropTopLeft"], [29896, "SonyCropSize"], [32781, "ImageID"], [32931, "WangTag1"], [32932, "WangAnnotation"], [32933, "WangTag3"], [32934, "WangTag4"], [32953, "ImageReferencePoints"], [32954, "RegionXformTackPoint"], [32955, "WarpQuadrilateral"], [32956, "AffineTransformMat"], [32995, "Matteing"], [32996, "DataType"], [32997, "ImageDepth"], [32998, "TileDepth"], [33300, "ImageFullWidth"], [33301, "ImageFullHeight"], [33302, "TextureFormat"], [33303, "WrapModes"], [33304, "FovCot"], [33305, "MatrixWorldToScreen"], [33306, "MatrixWorldToCamera"], [33405, "Model2"], [33421, "CFARepeatPatternDim"], [33422, "CFAPattern2"], [33423, "BatteryLevel"], [33424, "KodakIFD"], [33445, "MDFileTag"], [33446, "MDScalePixel"], [33447, "MDColorTable"], [33448, "MDLabName"], [33449, "MDSampleInfo"], [33450, "MDPrepDate"], [33451, "MDPrepTime"], [33452, "MDFileUnits"], [33589, "AdventScale"], [33590, "AdventRevision"], [33628, "UIC1Tag"], [33629, "UIC2Tag"], [33630, "UIC3Tag"], [33631, "UIC4Tag"], [33918, "IntergraphPacketData"], [33919, "IntergraphFlagRegisters"], [33921, "INGRReserved"], [34016, "Site"], [34017, "ColorSequence"], [34018, "IT8Header"], [34019, "RasterPadding"], [34020, "BitsPerRunLength"], [34021, "BitsPerExtendedRunLength"], [34022, "ColorTable"], [34023, "ImageColorIndicator"], [34024, "BackgroundColorIndicator"], [34025, "ImageColorValue"], [34026, "BackgroundColorValue"], [34027, "PixelIntensityRange"], [34028, "TransparencyIndicator"], [34029, "ColorCharacterization"], [34030, "HCUsage"], [34031, "TrapIndicator"], [34032, "CMYKEquivalent"], [34152, "AFCP_IPTC"], [34232, "PixelMagicJBIGOptions"], [34263, "JPLCartoIFD"], [34306, "WB_GRGBLevels"], [34310, "LeafData"], [34687, "TIFF_FXExtensions"], [34688, "MultiProfiles"], [34689, "SharedData"], [34690, "T88Options"], [34732, "ImageLayer"], [34750, "JBIGOptions"], [34856, "Opto-ElectricConvFactor"], [34857, "Interlace"], [34908, "FaxRecvParams"], [34909, "FaxSubAddress"], [34910, "FaxRecvTime"], [34929, "FedexEDR"], [34954, "LeafSubIFD"], [37387, "FlashEnergy"], [37388, "SpatialFrequencyResponse"], [37389, "Noise"], [37390, "FocalPlaneXResolution"], [37391, "FocalPlaneYResolution"], [37392, "FocalPlaneResolutionUnit"], [37397, "ExposureIndex"], [37398, "TIFF-EPStandardID"], [37399, "SensingMethod"], [37434, "CIP3DataFile"], [37435, "CIP3Sheet"], [37436, "CIP3Side"], [37439, "StoNits"], [37679, "MSDocumentText"], [37680, "MSPropertySetStorage"], [37681, "MSDocumentTextPosition"], [37724, "ImageSourceData"], [40965, "InteropIFD"], [40976, "SamsungRawPointersOffset"], [40977, "SamsungRawPointersLength"], [41217, "SamsungRawByteOrder"], [41218, "SamsungRawUnknown"], [41484, "SpatialFrequencyResponse"], [41485, "Noise"], [41489, "ImageNumber"], [41490, "SecurityClassification"], [41491, "ImageHistory"], [41494, "TIFF-EPStandardID"], [41995, "DeviceSettingDescription"], [42112, "GDALMetadata"], [42113, "GDALNoData"], [44992, "ExpandSoftware"], [44993, "ExpandLens"], [44994, "ExpandFilm"], [44995, "ExpandFilterLens"], [44996, "ExpandScanner"], [44997, "ExpandFlashLamp"], [46275, "HasselbladRawImage"], [48129, "PixelFormat"], [48130, "Transformation"], [48131, "Uncompressed"], [48132, "ImageType"], [48256, "ImageWidth"], [48257, "ImageHeight"], [48258, "WidthResolution"], [48259, "HeightResolution"], [48320, "ImageOffset"], [48321, "ImageByteCount"], [48322, "AlphaOffset"], [48323, "AlphaByteCount"], [48324, "ImageDataDiscard"], [48325, "AlphaDataDiscard"], [50215, "OceScanjobDesc"], [50216, "OceApplicationSelector"], [50217, "OceIDNumber"], [50218, "OceImageLogic"], [50255, "Annotations"], [50459, "HasselbladExif"], [50547, "OriginalFileName"], [50560, "USPTOOriginalContentType"], [50656, "CR2CFAPattern"], [50710, "CFAPlaneColor"], [50711, "CFALayout"], [50712, "LinearizationTable"], [50713, "BlackLevelRepeatDim"], [50714, "BlackLevel"], [50715, "BlackLevelDeltaH"], [50716, "BlackLevelDeltaV"], [50717, "WhiteLevel"], [50718, "DefaultScale"], [50719, "DefaultCropOrigin"], [50720, "DefaultCropSize"], [50733, "BayerGreenSplit"], [50737, "ChromaBlurRadius"], [50738, "AntiAliasStrength"], [50752, "RawImageSegmentation"], [50780, "BestQualityScale"], [50784, "AliasLayerMetadata"], [50829, "ActiveArea"], [50830, "MaskedAreas"], [50935, "NoiseReductionApplied"], [50974, "SubTileBlockSize"], [50975, "RowInterleaveFactor"], [51008, "OpcodeList1"], [51009, "OpcodeList2"], [51022, "OpcodeList3"], [51041, "NoiseProfile"], [51114, "CacheVersion"], [51125, "DefaultUserCrop"], [51157, "NikonNEFInfo"], [65024, "KdcIFD"]];
F(E, "ifd0", ct), F(E, "exif", ct), U(B, "gps", [[23, { M: "Magnetic North", T: "True North" }], [25, { K: "Kilometers", M: "Miles", N: "Nautical Miles" }]]);
var ft = class extends re {
  static {
    __name(this, "ft");
  }
  static canHandle(e2, t2) {
    return 224 === e2.getUint8(t2 + 1) && 1246120262 === e2.getUint32(t2 + 4) && 0 === e2.getUint8(t2 + 8);
  }
  parse() {
    return this.parseTags(), this.translate(), this.output;
  }
  parseTags() {
    this.raw = /* @__PURE__ */ new Map([[0, this.chunk.getUint16(0)], [2, this.chunk.getUint8(2)], [3, this.chunk.getUint16(3)], [5, this.chunk.getUint16(5)], [7, this.chunk.getUint8(7)], [8, this.chunk.getUint8(8)]]);
  }
};
c(ft, "type", "jfif"), c(ft, "headerLength", 9), T.set("jfif", ft), U(E, "jfif", [[0, "JFIFVersion"], [2, "ResolutionUnit"], [3, "XResolution"], [5, "YResolution"], [7, "ThumbnailWidth"], [8, "ThumbnailHeight"]]);
var dt = class extends re {
  static {
    __name(this, "dt");
  }
  parse() {
    return this.parseTags(), this.translate(), this.output;
  }
  parseTags() {
    this.raw = new Map([[0, this.chunk.getUint32(0)], [4, this.chunk.getUint32(4)], [8, this.chunk.getUint8(8)], [9, this.chunk.getUint8(9)], [10, this.chunk.getUint8(10)], [11, this.chunk.getUint8(11)], [12, this.chunk.getUint8(12)], ...Array.from(this.raw)]);
  }
};
c(dt, "type", "ihdr"), T.set("ihdr", dt), U(E, "ihdr", [[0, "ImageWidth"], [4, "ImageHeight"], [8, "BitDepth"], [9, "ColorType"], [10, "Compression"], [11, "Filter"], [12, "Interlace"]]), U(B, "ihdr", [[9, { 0: "Grayscale", 2: "RGB", 3: "Palette", 4: "Grayscale with Alpha", 6: "RGB with Alpha", DEFAULT: "Unknown" }], [10, { 0: "Deflate/Inflate", DEFAULT: "Unknown" }], [11, { 0: "Adaptive", DEFAULT: "Unknown" }], [12, { 0: "Noninterlaced", 1: "Adam7 Interlace", DEFAULT: "Unknown" }]]);
var pt = class extends re {
  static {
    __name(this, "pt");
  }
  static canHandle(e2, t2) {
    return 226 === e2.getUint8(t2 + 1) && 1229144927 === e2.getUint32(t2 + 4);
  }
  static findPosition(e2, t2) {
    let i2 = super.findPosition(e2, t2);
    return i2.chunkNumber = e2.getUint8(t2 + 16), i2.chunkCount = e2.getUint8(t2 + 17), i2.multiSegment = i2.chunkCount > 1, i2;
  }
  static handleMultiSegments(e2) {
    return function(e3) {
      let t2 = function(e4) {
        let t3 = e4[0].constructor, i2 = 0;
        for (let t4 of e4) i2 += t4.length;
        let n2 = new t3(i2), s2 = 0;
        for (let t4 of e4) n2.set(t4, s2), s2 += t4.length;
        return n2;
      }(e3.map((e4) => e4.chunk.toUint8()));
      return new I(t2);
    }(e2);
  }
  parse() {
    return this.raw = /* @__PURE__ */ new Map(), this.parseHeader(), this.parseTags(), this.translate(), this.output;
  }
  parseHeader() {
    let { raw: e2 } = this;
    this.chunk.byteLength < 84 && g("ICC header is too short");
    for (let [t2, i2] of Object.entries(gt)) {
      t2 = parseInt(t2, 10);
      let n2 = i2(this.chunk, t2);
      "\0\0\0\0" !== n2 && e2.set(t2, n2);
    }
  }
  parseTags() {
    let e2, t2, i2, n2, s2, { raw: r2 } = this, a2 = this.chunk.getUint32(128), o2 = 132, l2 = this.chunk.byteLength;
    for (; a2--; ) {
      if (e2 = this.chunk.getString(o2, 4), t2 = this.chunk.getUint32(o2 + 4), i2 = this.chunk.getUint32(o2 + 8), n2 = this.chunk.getString(t2, 4), t2 + i2 > l2) return void console.warn("reached the end of the first ICC chunk. Enable options.tiff.multiSegment to read all ICC segments.");
      s2 = this.parseTag(n2, t2, i2), void 0 !== s2 && "\0\0\0\0" !== s2 && r2.set(e2, s2), o2 += 12;
    }
  }
  parseTag(e2, t2, i2) {
    switch (e2) {
      case "desc":
        return this.parseDesc(t2);
      case "mluc":
        return this.parseMluc(t2);
      case "text":
        return this.parseText(t2, i2);
      case "sig ":
        return this.parseSig(t2);
    }
    if (!(t2 + i2 > this.chunk.byteLength)) return this.chunk.getUint8Array(t2, i2);
  }
  parseDesc(e2) {
    let t2 = this.chunk.getUint32(e2 + 8) - 1;
    return m(this.chunk.getString(e2 + 12, t2));
  }
  parseText(e2, t2) {
    return m(this.chunk.getString(e2 + 8, t2 - 8));
  }
  parseSig(e2) {
    return m(this.chunk.getString(e2 + 8, 4));
  }
  parseMluc(e2) {
    let { chunk: t2 } = this, i2 = t2.getUint32(e2 + 8), n2 = t2.getUint32(e2 + 12), s2 = e2 + 16, r2 = [];
    for (let a2 = 0; a2 < i2; a2++) {
      let i3 = t2.getString(s2 + 0, 2), a3 = t2.getString(s2 + 2, 2), o2 = t2.getUint32(s2 + 4), l2 = t2.getUint32(s2 + 8) + e2, h2 = m(t2.getUnicodeString(l2, o2));
      r2.push({ lang: i3, country: a3, text: h2 }), s2 += n2;
    }
    return 1 === i2 ? r2[0].text : r2;
  }
  translateValue(e2, t2) {
    return "string" == typeof e2 ? t2[e2] || t2[e2.toLowerCase()] || e2 : t2[e2] || e2;
  }
};
c(pt, "type", "icc"), c(pt, "multiSegment", true), c(pt, "headerLength", 18);
var gt = { 4: mt, 8: function(e2, t2) {
  return [e2.getUint8(t2), e2.getUint8(t2 + 1) >> 4, e2.getUint8(t2 + 1) % 16].map((e3) => e3.toString(10)).join(".");
}, 12: mt, 16: mt, 20: mt, 24: function(e2, t2) {
  const i2 = e2.getUint16(t2), n2 = e2.getUint16(t2 + 2) - 1, s2 = e2.getUint16(t2 + 4), r2 = e2.getUint16(t2 + 6), a2 = e2.getUint16(t2 + 8), o2 = e2.getUint16(t2 + 10);
  return new Date(Date.UTC(i2, n2, s2, r2, a2, o2));
}, 36: mt, 40: mt, 48: mt, 52: mt, 64: (e2, t2) => e2.getUint32(t2), 80: mt };
function mt(e2, t2) {
  return m(e2.getString(t2, 4));
}
__name(mt, "mt");
T.set("icc", pt), U(E, "icc", [[4, "ProfileCMMType"], [8, "ProfileVersion"], [12, "ProfileClass"], [16, "ColorSpaceData"], [20, "ProfileConnectionSpace"], [24, "ProfileDateTime"], [36, "ProfileFileSignature"], [40, "PrimaryPlatform"], [44, "CMMFlags"], [48, "DeviceManufacturer"], [52, "DeviceModel"], [56, "DeviceAttributes"], [64, "RenderingIntent"], [68, "ConnectionSpaceIlluminant"], [80, "ProfileCreator"], [84, "ProfileID"], ["Header", "ProfileHeader"], ["MS00", "WCSProfiles"], ["bTRC", "BlueTRC"], ["bXYZ", "BlueMatrixColumn"], ["bfd", "UCRBG"], ["bkpt", "MediaBlackPoint"], ["calt", "CalibrationDateTime"], ["chad", "ChromaticAdaptation"], ["chrm", "Chromaticity"], ["ciis", "ColorimetricIntentImageState"], ["clot", "ColorantTableOut"], ["clro", "ColorantOrder"], ["clrt", "ColorantTable"], ["cprt", "ProfileCopyright"], ["crdi", "CRDInfo"], ["desc", "ProfileDescription"], ["devs", "DeviceSettings"], ["dmdd", "DeviceModelDesc"], ["dmnd", "DeviceMfgDesc"], ["dscm", "ProfileDescriptionML"], ["fpce", "FocalPlaneColorimetryEstimates"], ["gTRC", "GreenTRC"], ["gXYZ", "GreenMatrixColumn"], ["gamt", "Gamut"], ["kTRC", "GrayTRC"], ["lumi", "Luminance"], ["meas", "Measurement"], ["meta", "Metadata"], ["mmod", "MakeAndModel"], ["ncl2", "NamedColor2"], ["ncol", "NamedColor"], ["ndin", "NativeDisplayInfo"], ["pre0", "Preview0"], ["pre1", "Preview1"], ["pre2", "Preview2"], ["ps2i", "PS2RenderingIntent"], ["ps2s", "PostScript2CSA"], ["psd0", "PostScript2CRD0"], ["psd1", "PostScript2CRD1"], ["psd2", "PostScript2CRD2"], ["psd3", "PostScript2CRD3"], ["pseq", "ProfileSequenceDesc"], ["psid", "ProfileSequenceIdentifier"], ["psvm", "PS2CRDVMSize"], ["rTRC", "RedTRC"], ["rXYZ", "RedMatrixColumn"], ["resp", "OutputResponse"], ["rhoc", "ReflectionHardcopyOrigColorimetry"], ["rig0", "PerceptualRenderingIntentGamut"], ["rig2", "SaturationRenderingIntentGamut"], ["rpoc", "ReflectionPrintOutputColorimetry"], ["sape", "SceneAppearanceEstimates"], ["scoe", "SceneColorimetryEstimates"], ["scrd", "ScreeningDesc"], ["scrn", "Screening"], ["targ", "CharTarget"], ["tech", "Technology"], ["vcgt", "VideoCardGamma"], ["view", "ViewingConditions"], ["vued", "ViewingCondDesc"], ["wtpt", "MediaWhitePoint"]]);
var St = { "4d2p": "Erdt Systems", AAMA: "Aamazing Technologies", ACER: "Acer", ACLT: "Acolyte Color Research", ACTI: "Actix Sytems", ADAR: "Adara Technology", ADBE: "Adobe", ADI: "ADI Systems", AGFA: "Agfa Graphics", ALMD: "Alps Electric", ALPS: "Alps Electric", ALWN: "Alwan Color Expertise", AMTI: "Amiable Technologies", AOC: "AOC International", APAG: "Apago", APPL: "Apple Computer", AST: "AST", "AT&T": "AT&T", BAEL: "BARBIERI electronic", BRCO: "Barco NV", BRKP: "Breakpoint", BROT: "Brother", BULL: "Bull", BUS: "Bus Computer Systems", "C-IT": "C-Itoh", CAMR: "Intel", CANO: "Canon", CARR: "Carroll Touch", CASI: "Casio", CBUS: "Colorbus PL", CEL: "Crossfield", CELx: "Crossfield", CGS: "CGS Publishing Technologies International", CHM: "Rochester Robotics", CIGL: "Colour Imaging Group, London", CITI: "Citizen", CL00: "Candela", CLIQ: "Color IQ", CMCO: "Chromaco", CMiX: "CHROMiX", COLO: "Colorgraphic Communications", COMP: "Compaq", COMp: "Compeq/Focus Technology", CONR: "Conrac Display Products", CORD: "Cordata Technologies", CPQ: "Compaq", CPRO: "ColorPro", CRN: "Cornerstone", CTX: "CTX International", CVIS: "ColorVision", CWC: "Fujitsu Laboratories", DARI: "Darius Technology", DATA: "Dataproducts", DCP: "Dry Creek Photo", DCRC: "Digital Contents Resource Center, Chung-Ang University", DELL: "Dell Computer", DIC: "Dainippon Ink and Chemicals", DICO: "Diconix", DIGI: "Digital", "DL&C": "Digital Light & Color", DPLG: "Doppelganger", DS: "Dainippon Screen", DSOL: "DOOSOL", DUPN: "DuPont", EPSO: "Epson", ESKO: "Esko-Graphics", ETRI: "Electronics and Telecommunications Research Institute", EVER: "Everex Systems", EXAC: "ExactCODE", Eizo: "Eizo", FALC: "Falco Data Products", FF: "Fuji Photo Film", FFEI: "FujiFilm Electronic Imaging", FNRD: "Fnord Software", FORA: "Fora", FORE: "Forefront Technology", FP: "Fujitsu", FPA: "WayTech Development", FUJI: "Fujitsu", FX: "Fuji Xerox", GCC: "GCC Technologies", GGSL: "Global Graphics Software", GMB: "Gretagmacbeth", GMG: "GMG", GOLD: "GoldStar Technology", GOOG: "Google", GPRT: "Giantprint", GTMB: "Gretagmacbeth", GVC: "WayTech Development", GW2K: "Sony", HCI: "HCI", HDM: "Heidelberger Druckmaschinen", HERM: "Hermes", HITA: "Hitachi America", HP: "Hewlett-Packard", HTC: "Hitachi", HiTi: "HiTi Digital", IBM: "IBM", IDNT: "Scitex", IEC: "Hewlett-Packard", IIYA: "Iiyama North America", IKEG: "Ikegami Electronics", IMAG: "Image Systems", IMI: "Ingram Micro", INTC: "Intel", INTL: "N/A (INTL)", INTR: "Intra Electronics", IOCO: "Iocomm International Technology", IPS: "InfoPrint Solutions Company", IRIS: "Scitex", ISL: "Ichikawa Soft Laboratory", ITNL: "N/A (ITNL)", IVM: "IVM", IWAT: "Iwatsu Electric", Idnt: "Scitex", Inca: "Inca Digital Printers", Iris: "Scitex", JPEG: "Joint Photographic Experts Group", JSFT: "Jetsoft Development", JVC: "JVC Information Products", KART: "Scitex", KFC: "KFC Computek Components", KLH: "KLH Computers", KMHD: "Konica Minolta", KNCA: "Konica", KODA: "Kodak", KYOC: "Kyocera", Kart: "Scitex", LCAG: "Leica", LCCD: "Leeds Colour", LDAK: "Left Dakota", LEAD: "Leading Technology", LEXM: "Lexmark International", LINK: "Link Computer", LINO: "Linotronic", LITE: "Lite-On", Leaf: "Leaf", Lino: "Linotronic", MAGC: "Mag Computronic", MAGI: "MAG Innovision", MANN: "Mannesmann", MICN: "Micron Technology", MICR: "Microtek", MICV: "Microvitec", MINO: "Minolta", MITS: "Mitsubishi Electronics America", MITs: "Mitsuba", MNLT: "Minolta", MODG: "Modgraph", MONI: "Monitronix", MONS: "Monaco Systems", MORS: "Morse Technology", MOTI: "Motive Systems", MSFT: "Microsoft", MUTO: "MUTOH INDUSTRIES", Mits: "Mitsubishi Electric", NANA: "NANAO", NEC: "NEC", NEXP: "NexPress Solutions", NISS: "Nissei Sangyo America", NKON: "Nikon", NONE: "none", OCE: "Oce Technologies", OCEC: "OceColor", OKI: "Oki", OKID: "Okidata", OKIP: "Okidata", OLIV: "Olivetti", OLYM: "Olympus", ONYX: "Onyx Graphics", OPTI: "Optiquest", PACK: "Packard Bell", PANA: "Matsushita Electric Industrial", PANT: "Pantone", PBN: "Packard Bell", PFU: "PFU", PHIL: "Philips Consumer Electronics", PNTX: "HOYA", POne: "Phase One A/S", PREM: "Premier Computer Innovations", PRIN: "Princeton Graphic Systems", PRIP: "Princeton Publishing Labs", QLUX: "Hong Kong", QMS: "QMS", QPCD: "QPcard AB", QUAD: "QuadLaser", QUME: "Qume", RADI: "Radius", RDDx: "Integrated Color Solutions", RDG: "Roland DG", REDM: "REDMS Group", RELI: "Relisys", RGMS: "Rolf Gierling Multitools", RICO: "Ricoh", RNLD: "Edmund Ronald", ROYA: "Royal", RPC: "Ricoh Printing Systems", RTL: "Royal Information Electronics", SAMP: "Sampo", SAMS: "Samsung", SANT: "Jaime Santana Pomares", SCIT: "Scitex", SCRN: "Dainippon Screen", SDP: "Scitex", SEC: "Samsung", SEIK: "Seiko Instruments", SEIk: "Seikosha", SGUY: "ScanGuy.com", SHAR: "Sharp Laboratories", SICC: "International Color Consortium", SONY: "Sony", SPCL: "SpectraCal", STAR: "Star", STC: "Sampo Technology", Scit: "Scitex", Sdp: "Scitex", Sony: "Sony", TALO: "Talon Technology", TAND: "Tandy", TATU: "Tatung", TAXA: "TAXAN America", TDS: "Tokyo Denshi Sekei", TECO: "TECO Information Systems", TEGR: "Tegra", TEKT: "Tektronix", TI: "Texas Instruments", TMKR: "TypeMaker", TOSB: "Toshiba", TOSH: "Toshiba", TOTK: "TOTOKU ELECTRIC", TRIU: "Triumph", TSBT: "Toshiba", TTX: "TTX Computer Products", TVM: "TVM Professional Monitor", TW: "TW Casper", ULSX: "Ulead Systems", UNIS: "Unisys", UTZF: "Utz Fehlau & Sohn", VARI: "Varityper", VIEW: "Viewsonic", VISL: "Visual communication", VIVO: "Vivo Mobile Communication", WANG: "Wang", WLBR: "Wilbur Imaging", WTG2: "Ware To Go", WYSE: "WYSE Technology", XERX: "Xerox", XRIT: "X-Rite", ZRAN: "Zoran", Zebr: "Zebra Technologies", appl: "Apple Computer", bICC: "basICColor", berg: "bergdesign", ceyd: "Integrated Color Solutions", clsp: "MacDermid ColorSpan", ds: "Dainippon Screen", dupn: "DuPont", ffei: "FujiFilm Electronic Imaging", flux: "FluxData", iris: "Scitex", kart: "Scitex", lcms: "Little CMS", lino: "Linotronic", none: "none", ob4d: "Erdt Systems", obic: "Medigraph", quby: "Qubyx Sarl", scit: "Scitex", scrn: "Dainippon Screen", sdp: "Scitex", siwi: "SIWI GRAFIKA", yxym: "YxyMaster" };
var Ct = { scnr: "Scanner", mntr: "Monitor", prtr: "Printer", link: "Device Link", abst: "Abstract", spac: "Color Space Conversion Profile", nmcl: "Named Color", cenc: "ColorEncodingSpace profile", mid: "MultiplexIdentification profile", mlnk: "MultiplexLink profile", mvis: "MultiplexVisualization profile", nkpf: "Nikon Input Device Profile (NON-STANDARD!)" };
U(B, "icc", [[4, St], [12, Ct], [40, Object.assign({}, St, Ct)], [48, St], [80, St], [64, { 0: "Perceptual", 1: "Relative Colorimetric", 2: "Saturation", 3: "Absolute Colorimetric" }], ["tech", { amd: "Active Matrix Display", crt: "Cathode Ray Tube Display", kpcd: "Photo CD", pmd: "Passive Matrix Display", dcam: "Digital Camera", dcpj: "Digital Cinema Projector", dmpc: "Digital Motion Picture Camera", dsub: "Dye Sublimation Printer", epho: "Electrophotographic Printer", esta: "Electrostatic Printer", flex: "Flexography", fprn: "Film Writer", fscn: "Film Scanner", grav: "Gravure", ijet: "Ink Jet Printer", imgs: "Photo Image Setter", mpfr: "Motion Picture Film Recorder", mpfs: "Motion Picture Film Scanner", offs: "Offset Lithography", pjtv: "Projection Television", rpho: "Photographic Paper Printer", rscn: "Reflective Scanner", silk: "Silkscreen", twax: "Thermal Wax Printer", vidc: "Video Camera", vidm: "Video Monitor" }]]);
var yt = class extends re {
  static {
    __name(this, "yt");
  }
  static canHandle(e2, t2, i2) {
    return 237 === e2.getUint8(t2 + 1) && "Photoshop" === e2.getString(t2 + 4, 9) && void 0 !== this.containsIptc8bim(e2, t2, i2);
  }
  static headerLength(e2, t2, i2) {
    let n2, s2 = this.containsIptc8bim(e2, t2, i2);
    if (void 0 !== s2) return n2 = e2.getUint8(t2 + s2 + 7), n2 % 2 != 0 && (n2 += 1), 0 === n2 && (n2 = 4), s2 + 8 + n2;
  }
  static containsIptc8bim(e2, t2, i2) {
    for (let n2 = 0; n2 < i2; n2++) if (this.isIptcSegmentHead(e2, t2 + n2)) return n2;
  }
  static isIptcSegmentHead(e2, t2) {
    return 56 === e2.getUint8(t2) && 943868237 === e2.getUint32(t2) && 1028 === e2.getUint16(t2 + 4);
  }
  parse() {
    let { raw: e2 } = this, t2 = this.chunk.byteLength - 1, i2 = false;
    for (let n2 = 0; n2 < t2; n2++) if (28 === this.chunk.getUint8(n2) && 2 === this.chunk.getUint8(n2 + 1)) {
      i2 = true;
      let t3 = this.chunk.getUint16(n2 + 3), s2 = this.chunk.getUint8(n2 + 2), r2 = this.chunk.getLatin1String(n2 + 5, t3);
      e2.set(s2, this.pluralizeValue(e2.get(s2), r2)), n2 += 4 + t3;
    } else if (i2) break;
    return this.translate(), this.output;
  }
  pluralizeValue(e2, t2) {
    return void 0 !== e2 ? e2 instanceof Array ? (e2.push(t2), e2) : [e2, t2] : t2;
  }
};
c(yt, "type", "iptc"), c(yt, "translateValues", false), c(yt, "reviveValues", false), T.set("iptc", yt), U(E, "iptc", [[0, "ApplicationRecordVersion"], [3, "ObjectTypeReference"], [4, "ObjectAttributeReference"], [5, "ObjectName"], [7, "EditStatus"], [8, "EditorialUpdate"], [10, "Urgency"], [12, "SubjectReference"], [15, "Category"], [20, "SupplementalCategories"], [22, "FixtureIdentifier"], [25, "Keywords"], [26, "ContentLocationCode"], [27, "ContentLocationName"], [30, "ReleaseDate"], [35, "ReleaseTime"], [37, "ExpirationDate"], [38, "ExpirationTime"], [40, "SpecialInstructions"], [42, "ActionAdvised"], [45, "ReferenceService"], [47, "ReferenceDate"], [50, "ReferenceNumber"], [55, "DateCreated"], [60, "TimeCreated"], [62, "DigitalCreationDate"], [63, "DigitalCreationTime"], [65, "OriginatingProgram"], [70, "ProgramVersion"], [75, "ObjectCycle"], [80, "Byline"], [85, "BylineTitle"], [90, "City"], [92, "Sublocation"], [95, "State"], [100, "CountryCode"], [101, "Country"], [103, "OriginalTransmissionReference"], [105, "Headline"], [110, "Credit"], [115, "Source"], [116, "CopyrightNotice"], [118, "Contact"], [120, "Caption"], [121, "LocalCaption"], [122, "Writer"], [125, "RasterizedCaption"], [130, "ImageType"], [131, "ImageOrientation"], [135, "LanguageIdentifier"], [150, "AudioType"], [151, "AudioSamplingRate"], [152, "AudioSamplingResolution"], [153, "AudioDuration"], [154, "AudioOutcue"], [184, "JobID"], [185, "MasterDocumentID"], [186, "ShortDocumentID"], [187, "UniqueDocumentID"], [188, "OwnerID"], [200, "ObjectPreviewFileFormat"], [201, "ObjectPreviewFileVersion"], [202, "ObjectPreviewData"], [221, "Prefs"], [225, "ClassifyState"], [228, "SimilarityIndex"], [230, "DocumentNotes"], [231, "DocumentHistory"], [232, "ExifCameraInfo"], [255, "CatalogSets"]]), U(B, "iptc", [[10, { 0: "0 (reserved)", 1: "1 (most urgent)", 2: "2", 3: "3", 4: "4", 5: "5 (normal urgency)", 6: "6", 7: "7", 8: "8 (least urgent)", 9: "9 (user-defined priority)" }], [75, { a: "Morning", b: "Both Morning and Evening", p: "Evening" }], [131, { L: "Landscape", P: "Portrait", S: "Square" }]]);
var full_esm_default = tt;

// worker.js
async function renderTemplate(templateName, data = {}) {
  try {
    const response = await fetch(`/templates/${templateName}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateName}`);
    }
    let template = await response.text();
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      template = template.replaceAll(placeholder, value || "");
    }
    return template;
  } catch (error3) {
    console.error(`Error rendering template ${templateName}:`, error3);
    return getFallbackTemplate(templateName, data);
  }
}
__name(renderTemplate, "renderTemplate");
function getFallbackTemplate(templateName, data) {
  const templates = {
    "login-email": `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>\u{1F510} Login to AI Caption Studio</h2>
                <p>Click the link below to securely login to your account:</p>
                <div style="margin: 30px 0;">
                    <a href="${data.LOGIN_URL}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                        \u{1F680} Login to AI Caption Studio
                    </a>
                </div>
                <p><strong>This link expires in 15 minutes</strong> for security.</p>
                <p>If you didn't request this login, you can safely ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    Time: ${data.TIMESTAMP}
                </p>
            </div>
        `,
    "login-error": `<h1>\u274C ${data.ERROR_TITLE}</h1><p>${data.ERROR_MESSAGE}</p><a href="/">\u2190 Back</a>`,
    "login-success": `
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>\u2705 Login Successful!</h2>
                <p>Welcome, ${data.USER_EMAIL}!</p>
                <p>Redirecting to Caption Generator...</p>
                <script>
                    localStorage.setItem('auth_token', '${data.JWT_TOKEN}');
                    localStorage.setItem('user_email', '${data.USER_EMAIL}');
                    setTimeout(() => window.location.href = '/', 2000);
                <\/script>
            </div>
        `,
    "invitation-error": `
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>\u274C ${data.ERROR_TITLE}</h2>
                <p>${data.ERROR_MESSAGE}</p>
                <a href="/" style="color: #405de6;">\u2190 Back to Caption Studio</a>
            </div>
        `
  };
  return templates[templateName] || `<p>Template ${templateName} not found</p>`;
}
__name(getFallbackTemplate, "getFallbackTemplate");
var D1Database = class {
  static {
    __name(this, "D1Database");
  }
  constructor(db) {
    this.db = db;
    this.CURRENT_SCHEMA_VERSION = 12;
    this._initialized = false;
  }
  async ensureInitialized() {
    if (!this._initialized) {
      try {
        await this.ensureSchemaVersion();
        this._initialized = true;
      } catch (error3) {
        console.error("Database initialization failed:", error3);
      }
    }
  }
  async ensureSchemaVersion() {
    try {
      await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();
      const versionResult = await this.db.prepare(`
                SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
            `).first();
      const currentVersion = versionResult ? versionResult.version : 0;
      if (currentVersion < this.CURRENT_SCHEMA_VERSION) {
        await this.runMigrations(currentVersion);
      }
    } catch (error3) {
      console.error("Schema version check failed:", error3);
    }
  }
  async runMigrations(fromVersion) {
    try {
      if (fromVersion < 9) {
        console.log("Running migration: Add API keys table (v9)");
        await this.migration_v9();
        await this.setSchemaVersion(9);
      }
      if (fromVersion < 10) {
        console.log("Running migration: Add uploaded images table (v10)");
        await this.migration_v10();
        await this.setSchemaVersion(10);
      }
      if (fromVersion < 11) {
        console.log("Running migration: Update uploaded images table for R2 (v11)");
        await this.migration_v11();
        await this.setSchemaVersion(11);
      }
      if (fromVersion < 12) {
        console.log("Running migration: Add custom prompts table (v12)");
        await this.migration_v12();
        await this.setSchemaVersion(12);
      }
    } catch (error3) {
      console.error("Migration failed:", error3);
    }
  }
  async setSchemaVersion(version2) {
    try {
      await this.db.prepare(`
                INSERT INTO schema_version (version) VALUES (?)
            `).bind(version2).run();
      console.log(`Schema updated to version ${version2}`);
    } catch (error3) {
      console.error("Failed to set schema version:", error3);
    }
  }
  async createUser(email, env2 = null) {
    try {
      await this.ensureInitialized();
      const isAdmin = env2 && env2.ADMIN_EMAIL && email.toLowerCase() === env2.ADMIN_EMAIL.toLowerCase() ? 1 : 0;
      const stmt = this.db.prepare(`
                INSERT INTO users (email, is_active, is_admin) VALUES (?, 1, ?)
                RETURNING id, email, is_admin
            `);
      const result = await stmt.bind(email, isAdmin).first();
      if (isAdmin) {
      }
      return result;
    } catch (error3) {
      if (error3.message.includes("UNIQUE constraint failed")) {
        throw new Error("USER_EXISTS");
      }
      throw error3;
    }
  }
  async getUserByEmail(email) {
    const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE email = ? AND is_active = 1
        `);
    return await stmt.bind(email).first();
  }
  async getUserById(userId) {
    const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE id = ? AND is_active = 1
        `);
    return await stmt.bind(userId).first();
  }
  async createLoginToken(email, token, expiresAt, ipAddress, userAgent) {
    const stmt = this.db.prepare(`
            INSERT INTO login_tokens (email, token, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `);
    await stmt.bind(email, token, expiresAt, ipAddress, userAgent).run();
  }
  async getLoginToken(token) {
    const stmt = this.db.prepare(`
            SELECT * FROM login_tokens 
            WHERE token = ? AND expires_at > datetime('now') AND used_at IS NULL
        `);
    return await stmt.bind(token).first();
  }
  async useLoginToken(token) {
    const stmt = this.db.prepare(`
            UPDATE login_tokens 
            SET used_at = datetime('now') 
            WHERE token = ?
        `);
    await stmt.bind(token).run();
  }
  async createSession(sessionId, userId, expiresAt, ipAddress, userAgent) {
    const stmt = this.db.prepare(`
            INSERT INTO user_sessions (session_id, user_id, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `);
    await stmt.bind(sessionId, userId, expiresAt, ipAddress, userAgent).run();
  }
  async getSession(sessionId) {
    const stmt = this.db.prepare(`
            SELECT s.*, u.email, u.is_admin 
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_id = ? AND s.expires_at > datetime('now')
        `);
    return await stmt.bind(sessionId).first();
  }
  async logQuery(logData) {
    try {
      await this.ensureQueryLogsTable();
      const {
        id,
        source,
        userId,
        email,
        processingTimeMs,
        responseLength
      } = logData;
      const tableInfo = await this.db.prepare(`PRAGMA table_info(query_logs)`).all();
      const columns = (tableInfo.results || []).map((col) => col.name);
      let insertColumns = ["id"];
      let insertValues = [id];
      let placeholders = ["?"];
      if (columns.includes("source")) {
        insertColumns.push("source");
        insertValues.push(source || "web");
        placeholders.push("?");
      }
      if (columns.includes("user_id")) {
        insertColumns.push("user_id");
        insertValues.push(userId);
        placeholders.push("?");
      }
      if (columns.includes("email")) {
        insertColumns.push("email");
        insertValues.push(email);
        placeholders.push("?");
      }
      if (columns.includes("processing_time_ms")) {
        insertColumns.push("processing_time_ms");
        insertValues.push(processingTimeMs || 0);
        placeholders.push("?");
      }
      if (columns.includes("response_length")) {
        insertColumns.push("response_length");
        insertValues.push(responseLength || 0);
        placeholders.push("?");
      }
      if (columns.includes("timestamp")) {
        insertColumns.push("timestamp");
        placeholders.push("datetime('now')");
      }
      if (columns.includes("created_at")) {
        insertColumns.push("created_at");
        placeholders.push("datetime('now')");
      }
      const insertSQL = `
                INSERT INTO query_logs (${insertColumns.join(", ")}) 
                VALUES (${placeholders.join(", ")})
            `;
      const stmt = this.db.prepare(insertSQL);
      const result = await stmt.bind(...insertValues).run();
      const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM query_logs");
      const countResult = await countStmt.first();
      return id;
    } catch (error3) {
    }
  }
  async ensureQueryLogsTable() {
    try {
      const tableInfo = await this.db.prepare(`
                PRAGMA table_info(query_logs)
            `).all();
      if (!tableInfo.results || tableInfo.results.length === 0) {
        const stmt = this.db.prepare(`
                    CREATE TABLE query_logs (
                        id TEXT PRIMARY KEY,
                        source TEXT DEFAULT 'web',
                        user_id INTEGER,
                        email TEXT,
                        processing_time_ms INTEGER DEFAULT 0,
                        response_length INTEGER DEFAULT 0,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
        await stmt.run();
      } else {
        const columns = tableInfo.results.map((col) => col.name);
        const requiredColumns = [
          { name: "user_id", definition: "INTEGER" },
          { name: "email", definition: "TEXT" },
          { name: "processing_time_ms", definition: "INTEGER DEFAULT 0" },
          { name: "response_length", definition: "INTEGER DEFAULT 0" },
          { name: "timestamp", definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
          { name: "created_at", definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
        ];
        for (const col of requiredColumns) {
          if (!columns.includes(col.name)) {
            try {
              await this.db.prepare(`ALTER TABLE query_logs ADD COLUMN ${col.name} ${col.definition}`).run();
            } catch (alterError) {
            }
          }
        }
      }
      const finalTableInfo = await this.db.prepare(`PRAGMA table_info(query_logs)`).all();
    } catch (error3) {
    }
  }
  async checkUsageLimit(userId) {
    return { allowed: true, used: 0, limit: -1, remaining: -1 };
  }
  async incrementDailyUsage(userId) {
    try {
      await this.ensureDailyUsageTable();
      const stmt = this.db.prepare(`
                INSERT INTO daily_usage (user_id, date, usage_count) 
                VALUES (?, date('now'), 1)
                ON CONFLICT(user_id, date) 
                DO UPDATE SET usage_count = usage_count + 1
            `);
      const result = await stmt.bind(userId).run();
      return true;
    } catch (error3) {
      return false;
    }
  }
  async ensureDailyUsageTable() {
    try {
      const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS daily_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    usage_count INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
      await stmt.run();
    } catch (error3) {
    }
  }
  // System settings methods
  async getSystemSetting(key, defaultValue = null) {
    try {
      const stmt = this.db.prepare(`
                SELECT setting_value FROM system_settings WHERE setting_key = ?
            `);
      const result = await stmt.bind(key).first();
      return result ? result.setting_value : defaultValue;
    } catch (error3) {
      return defaultValue;
    }
  }
  async setSystemSetting(key, value) {
    try {
      await this.ensureSystemSettingsTable();
      const stmt = this.db.prepare(`
                INSERT INTO system_settings (setting_key, setting_value, updated_at) 
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(setting_key) 
                DO UPDATE SET 
                    setting_value = excluded.setting_value,
                    updated_at = datetime('now')
            `);
      const result = await stmt.bind(key, value).run();
      return true;
    } catch (error3) {
      return false;
    }
  }
  async ensureSystemSettingsTable() {
    try {
      const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key TEXT UNIQUE NOT NULL,
                    setting_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
      await stmt.run();
    } catch (error3) {
    }
  }
  // Caption history table
  async ensureCaptionHistoryTable() {
    try {
      const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS caption_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    image_id INTEGER,
                    caption TEXT NOT NULL,
                    hashtags TEXT,
                    alt_text TEXT,
                    style TEXT NOT NULL,
                    context_data TEXT,
                    weather_data TEXT,
                    used_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (image_id) REFERENCES uploaded_images(id)
                )
            `);
      await stmt.run();
    } catch (error3) {
      console.error("Error creating caption_history table:", error3);
    }
  }
  // Scheduled posts table
  async ensureScheduledPostsTable() {
    try {
      const tableExists = await this.db.prepare(`
                SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_posts'
            `).first();
      if (!tableExists) {
        const stmt = this.db.prepare(`
                    CREATE TABLE scheduled_posts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        image_id INTEGER,
                        caption_id INTEGER,
                        custom_caption TEXT,
                        custom_hashtags TEXT,
                        platforms TEXT NOT NULL,
                        scheduled_time DATETIME NOT NULL,
                        timezone TEXT,
                        status TEXT DEFAULT 'pending',
                        attempts INTEGER DEFAULT 0,
                        error_message TEXT,
                        posted_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        FOREIGN KEY (image_id) REFERENCES uploaded_images(id),
                        FOREIGN KEY (caption_id) REFERENCES caption_history(id)
                    )
                `);
        await stmt.run();
      } else {
        const columnExists = await this.db.prepare(`
                    PRAGMA table_info(scheduled_posts)
                `).all();
        const hasTimezone = columnExists.results?.some((col) => col.name === "timezone");
        if (!hasTimezone) {
          const alterStmt = this.db.prepare(`
                        ALTER TABLE scheduled_posts ADD COLUMN timezone TEXT
                    `);
          await alterStmt.run();
        }
      }
    } catch (error3) {
      console.error("Error ensuring scheduled_posts table:", error3);
    }
  }
  async getAllSystemSettings() {
    try {
      await this.ensureSystemSettingsTable();
      const stmt = this.db.prepare(`
                SELECT * FROM system_settings ORDER BY setting_key
            `);
      const result = await stmt.all();
      return result.results || [];
    } catch (error3) {
      return [];
    }
  }
  // Caption history methods
  async saveCaptionHistory(userId, imageId, caption, hashtags, altText, style, contextData = null, weatherData = null) {
    try {
      await this.ensureCaptionHistoryTable();
      const stmt = this.db.prepare(`
                INSERT INTO caption_history (
                    user_id, image_id, caption, hashtags, alt_text, style, 
                    context_data, weather_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
      const result = await stmt.bind(
        userId,
        imageId,
        caption,
        hashtags,
        altText,
        style,
        contextData ? JSON.stringify(contextData) : null,
        weatherData ? JSON.stringify(weatherData) : null
      ).run();
      return result.meta.last_row_id;
    } catch (error3) {
      console.error("Error saving caption history:", error3);
      return null;
    }
  }
  async getCaptionHistoryForImage(userId, imageId) {
    try {
      await this.ensureCaptionHistoryTable();
      const stmt = this.db.prepare(`
                SELECT * FROM caption_history 
                WHERE user_id = ? AND image_id = ?
                ORDER BY created_at DESC
            `);
      const result = await stmt.bind(userId, imageId).all();
      return result.results || [];
    } catch (error3) {
      console.error("Error getting caption history:", error3);
      return [];
    }
  }
  async incrementCaptionUsage(captionId) {
    try {
      const stmt = this.db.prepare(`
                UPDATE caption_history 
                SET used_count = used_count + 1 
                WHERE id = ?
            `);
      await stmt.bind(captionId).run();
      return true;
    } catch (error3) {
      console.error("Error incrementing caption usage:", error3);
      return false;
    }
  }
  // Scheduled posts methods
  async createScheduledPost(userId, imageId, captionId, customCaption, customHashtags, platforms, scheduledTime, timezone = null) {
    try {
      await this.ensureScheduledPostsTable();
      const stmt = this.db.prepare(`
                INSERT INTO scheduled_posts (
                    user_id, image_id, caption_id, custom_caption, custom_hashtags,
                    platforms, scheduled_time, timezone
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
      const result = await stmt.bind(
        userId,
        imageId,
        captionId,
        customCaption,
        customHashtags,
        JSON.stringify(platforms),
        scheduledTime,
        timezone
      ).run();
      return result.meta.last_row_id;
    } catch (error3) {
      console.error("Error creating scheduled post:", error3);
      return null;
    }
  }
  async getScheduledPosts(userId, status = null) {
    try {
      await this.ensureScheduledPostsTable();
      let query = `
                SELECT sp.*, ui.filename, ui.mime_type, ch.caption, ch.hashtags, ch.style
                FROM scheduled_posts sp
                LEFT JOIN uploaded_images ui ON sp.image_id = ui.id
                LEFT JOIN caption_history ch ON sp.caption_id = ch.id
                WHERE sp.user_id = ?
            `;
      const params = [userId];
      if (status) {
        query += ` AND sp.status = ?`;
        params.push(status);
      }
      query += ` ORDER BY sp.scheduled_time ASC`;
      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).all();
      return result.results || [];
    } catch (error3) {
      console.error("Error getting scheduled posts:", error3);
      return [];
    }
  }
  async getPendingScheduledPosts() {
    try {
      await this.ensureScheduledPostsTable();
      const stmt = this.db.prepare(`
                SELECT sp.*, ui.filename, ui.mime_type, ui.r2_key, ch.caption, ch.hashtags
                FROM scheduled_posts sp
                LEFT JOIN uploaded_images ui ON sp.image_id = ui.id
                LEFT JOIN caption_history ch ON sp.caption_id = ch.id
                WHERE sp.status = 'pending' 
                AND sp.scheduled_time <= datetime('now')
                ORDER BY sp.scheduled_time ASC
            `);
      const result = await stmt.all();
      return result.results || [];
    } catch (error3) {
      console.error("Error getting pending scheduled posts:", error3);
      return [];
    }
  }
  async updateScheduledPostStatus(postId, status, errorMessage = null) {
    try {
      let stmt;
      if (status === "completed") {
        stmt = this.db.prepare(`
                    UPDATE scheduled_posts 
                    SET status = ?, posted_at = datetime('now'), updated_at = datetime('now')
                    WHERE id = ?
                `);
        await stmt.bind(status, postId).run();
      } else {
        stmt = this.db.prepare(`
                    UPDATE scheduled_posts 
                    SET status = ?, error_message = ?, attempts = attempts + 1, updated_at = datetime('now')
                    WHERE id = ?
                `);
        await stmt.bind(status, errorMessage, postId).run();
      }
      return true;
    } catch (error3) {
      console.error("Error updating scheduled post status:", error3);
      return false;
    }
  }
  async deleteScheduledPost(userId, postId) {
    try {
      const stmt = this.db.prepare(`
                DELETE FROM scheduled_posts 
                WHERE id = ? AND user_id = ?
            `);
      await stmt.bind(postId, userId).run();
      return true;
    } catch (error3) {
      console.error("Error deleting scheduled post:", error3);
      return false;
    }
  }
  async getUserSocialSettings(userId) {
    try {
      const stmt = this.db.prepare(`
                SELECT setting_name, setting_value, is_encrypted 
                FROM user_settings 
                WHERE user_id = ? AND setting_category = 'social'
            `);
      const results = await stmt.bind(userId).all();
      const settings = {};
      if (results.results) {
        for (const row of results.results) {
          const value = row.is_encrypted ? this.decryptValue(row.setting_value) : row.setting_value;
          if (row.setting_name.startsWith("mastodon_")) {
            if (!settings.mastodon) settings.mastodon = {};
            const key = row.setting_name.replace("mastodon_", "");
            settings.mastodon[key] = value;
          } else if (row.setting_name.startsWith("pixelfed_")) {
            if (!settings.pixelfed) settings.pixelfed = {};
            const key = row.setting_name.replace("pixelfed_", "");
            settings.pixelfed[key] = value;
          } else if (row.setting_name.startsWith("instagram_")) {
            if (!settings.instagram) settings.instagram = {};
            const key = row.setting_name.replace("instagram_", "");
            settings.instagram[key] = value;
          } else if (row.setting_name.startsWith("linkedin_")) {
            if (!settings.linkedin) settings.linkedin = {};
            const key = row.setting_name.replace("linkedin_", "");
            settings.linkedin[key] = value;
          }
        }
      }
      return settings;
    } catch (error3) {
      console.error("Error getting user social settings:", error3);
      return {};
    }
  }
  async getScheduledPostById(userId, postId) {
    try {
      await this.ensureScheduledPostsTable();
      const stmt = this.db.prepare(`
                SELECT sp.*, ui.filename, ui.mime_type, ch.caption as original_caption, ch.hashtags as original_hashtags, ch.style
                FROM scheduled_posts sp
                LEFT JOIN uploaded_images ui ON sp.image_id = ui.id
                LEFT JOIN caption_history ch ON sp.caption_id = ch.id
                WHERE sp.id = ? AND sp.user_id = ?
            `);
      const result = await stmt.bind(postId, userId).first();
      return result || null;
    } catch (error3) {
      console.error("Error getting scheduled post by ID:", error3);
      return null;
    }
  }
  async updateScheduledPost(userId, postId, scheduledTime, caption, hashtags) {
    try {
      await this.ensureScheduledPostsTable();
      const stmt = this.db.prepare(`
                UPDATE scheduled_posts 
                SET scheduled_time = ?, caption = ?, hashtags = ?, updated_at = datetime('now')
                WHERE id = ? AND user_id = ? AND status = 'pending'
            `);
      const result = await stmt.bind(scheduledTime, caption, hashtags, postId, userId).run();
      return result.changes > 0;
    } catch (error3) {
      console.error("Error updating scheduled post:", error3);
      return false;
    }
  }
  // User settings methods
  async ensureUserSettingsTable() {
    try {
      const tableInfo = await this.db.prepare(`
                PRAGMA table_info(user_settings)
            `).all();
      if (!tableInfo.results || tableInfo.results.length === 0) {
        const stmt = this.db.prepare(`
                    CREATE TABLE user_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        category TEXT NOT NULL,
                        setting_key TEXT NOT NULL,
                        setting_value TEXT NOT NULL,
                        encrypted BOOLEAN DEFAULT 0,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, category, setting_key),
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                `);
        const createResult = await stmt.run();
      } else {
        const columns = tableInfo.results.map((col) => col.name);
        const requiredColumns = [
          { name: "category", definition: "TEXT DEFAULT 'general'" },
          { name: "encrypted", definition: "BOOLEAN DEFAULT 0" },
          { name: "updated_at", definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
          { name: "created_at", definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
        ];
        for (const col of requiredColumns) {
          if (!columns.includes(col.name)) {
            try {
              const alterResult = await this.db.prepare(`ALTER TABLE user_settings ADD COLUMN ${col.name} ${col.definition}`).run();
            } catch (alterError) {
            }
          } else {
          }
        }
      }
      const finalTableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
    } catch (error3) {
    }
  }
  async getUserSettings(userId, integrationType) {
    try {
      await this.ensureUserSettingsTable();
      const stmt = this.db.prepare(`
                SELECT * FROM user_settings 
                WHERE user_id = ? AND integration_type = ?
                ORDER BY setting_key
            `);
      const result = await stmt.bind(userId, integrationType).all();
      return result.results || [];
    } catch (error3) {
      return [];
    }
  }
  async setUserSetting(userId, integrationType, settingKey, settingValue, encrypted = false) {
    try {
      await this.ensureUserSettingsTable();
      const existingStmt = this.db.prepare(`
                SELECT id FROM user_settings 
                WHERE user_id = ? AND integration_type = ? AND setting_key = ?
            `);
      const existing = await existingStmt.bind(userId, integrationType, settingKey).first();
      if (existing) {
        const tableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
        const columns = (tableInfo.results || []).map((col) => col.name);
        let updateParts = ["setting_value = ?"];
        let updateValues = [settingValue];
        if (columns.includes("encrypted")) {
          updateParts.push("encrypted = ?");
          updateValues.push(encrypted ? 1 : 0);
        }
        if (columns.includes("updated_at")) {
          updateParts.push("updated_at = datetime('now')");
        }
        updateValues.push(existing.id);
        const updateSQL = `
                    UPDATE user_settings 
                    SET ${updateParts.join(", ")}
                    WHERE id = ?
                `;
        const updateStmt = this.db.prepare(updateSQL);
        const result = await updateStmt.bind(...updateValues).run();
        const changes = result.meta && result.meta.changes || result.changes || 0;
        return changes > 0;
      } else {
        const tableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
        const columns = (tableInfo.results || []).map((col) => col.name);
        let insertColumns = ["user_id", "setting_key", "setting_value"];
        let insertValues = [userId, settingKey, settingValue];
        let placeholders = ["?", "?", "?"];
        if (columns.includes("integration_type")) {
          insertColumns.push("integration_type");
          insertValues.push(integrationType);
          placeholders.push("?");
        }
        if (columns.includes("encrypted")) {
          insertColumns.push("encrypted");
          insertValues.push(encrypted ? 1 : 0);
          placeholders.push("?");
        }
        if (columns.includes("updated_at")) {
          insertColumns.push("updated_at");
          placeholders.push("datetime('now')");
        }
        if (columns.includes("created_at")) {
          insertColumns.push("created_at");
          placeholders.push("datetime('now')");
        }
        if (columns.includes("integration_type")) {
          insertColumns.push("integration_type");
          insertValues.push(settingKey.split("_")[0]);
          placeholders.push("?");
        }
        const insertSQL = `
                    INSERT INTO user_settings (${insertColumns.join(", ")}) 
                    VALUES (${placeholders.join(", ")})
                `;
        const insertStmt = this.db.prepare(insertSQL);
        const result = await insertStmt.bind(...insertValues).run();
        const changes = result.meta && result.meta.changes || result.changes || 0;
        return changes > 0;
      }
    } catch (error3) {
      return false;
    }
  }
  async deleteUserSetting(userId, category, settingKey) {
    try {
      await this.ensureUserSettingsTable();
      const stmt = this.db.prepare(`
                DELETE FROM user_settings 
                WHERE user_id = ? AND category = ? AND setting_key = ?
            `);
      const result = await stmt.bind(userId, category, settingKey).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      return false;
    }
  }
  async deleteUser(userId) {
    try {
      const settingsStmt = this.db.prepare("DELETE FROM user_settings WHERE user_id = ?");
      await settingsStmt.bind(userId).run();
      const sessionsStmt = this.db.prepare("DELETE FROM user_sessions WHERE user_id = ?");
      await sessionsStmt.bind(userId).run();
      const usageStmt = this.db.prepare("DELETE FROM daily_usage WHERE user_id = ?");
      await usageStmt.bind(userId).run();
      const apiKeysStmt = this.db.prepare("DELETE FROM user_api_keys WHERE user_id = ?");
      await apiKeysStmt.bind(userId).run();
      const invitesSentStmt = this.db.prepare("DELETE FROM invite_tokens WHERE invited_by_user_id = ?");
      await invitesSentStmt.bind(userId).run();
      const invitesUsedStmt = this.db.prepare("DELETE FROM invite_tokens WHERE used_by_user_id = ?");
      await invitesUsedStmt.bind(userId).run();
      const userStmt = this.db.prepare("DELETE FROM users WHERE id = ?");
      const result = await userStmt.bind(userId).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      return false;
    }
  }
  // Database migration for API keys (v9)
  async migration_v9() {
    try {
      const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    integration_type TEXT NOT NULL,
                    api_key TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used DATETIME NULL,
                    UNIQUE(user_id, integration_type),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
      await stmt.run();
    } catch (error3) {
      console.error("Migration v9 failed:", error3);
    }
  }
  // Database migration for uploaded images (v10) - initial table with image_data
  async migration_v10() {
    try {
      const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS uploaded_images (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    title TEXT,
                    caption TEXT,
                    keywords TEXT,
                    rating INTEGER DEFAULT 0,
                    color_label TEXT,
                    camera_model TEXT,
                    lens TEXT,
                    iso TEXT,
                    aperture TEXT,
                    shutter_speed TEXT,
                    focal_length TEXT,
                    date_time TEXT,
                    image_data TEXT NOT NULL,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    generated_caption TEXT,
                    generated_hashtags TEXT,
                    generated_alt_text TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
      await stmt.run();
    } catch (error3) {
      console.error("Migration v10 failed:", error3);
    }
  }
  // Database migration for R2 storage (v11) - replace image_data with R2 references
  async migration_v11() {
    try {
      await this.db.prepare("DROP TABLE IF EXISTS uploaded_images").run();
      const stmt = this.db.prepare(`
                CREATE TABLE uploaded_images (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    file_size INTEGER,
                    mime_type TEXT DEFAULT 'image/jpeg',
                    r2_key TEXT NOT NULL,
                    title TEXT,
                    caption TEXT,
                    keywords TEXT,
                    rating INTEGER DEFAULT 0,
                    color_label TEXT,
                    camera_model TEXT,
                    lens TEXT,
                    iso TEXT,
                    aperture TEXT,
                    shutter_speed TEXT,
                    focal_length TEXT,
                    date_time TEXT,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    generated_caption TEXT,
                    generated_hashtags TEXT,
                    generated_alt_text TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
      await stmt.run();
    } catch (error3) {
      console.error("Migration v11 failed:", error3);
    }
  }
  // Database migration for custom prompts (v12)
  async migration_v12() {
    try {
      const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS user_prompts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    prompt_text TEXT NOT NULL,
                    icon TEXT DEFAULT '\u2728',
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
      await stmt.run();
    } catch (error3) {
      console.error("Migration v12 failed:", error3);
    }
  }
  // API Key Management Methods
  async getUserApiKeys(userId) {
    try {
      const stmt = this.db.prepare(`
                SELECT id, integration_type, api_key, created_at, last_used 
                FROM user_api_keys 
                WHERE user_id = ?
                ORDER BY created_at DESC
            `);
      const result = await stmt.bind(userId).all();
      return result.results || [];
    } catch (error3) {
      return [];
    }
  }
  async createOrUpdateApiKey(userId, integrationType, apiKey) {
    try {
      const existingStmt = this.db.prepare(`
                SELECT id FROM user_api_keys 
                WHERE user_id = ? AND integration_type = ?
            `);
      const existing = await existingStmt.bind(userId, integrationType).first();
      if (existing) {
        const updateStmt = this.db.prepare(`
                    UPDATE user_api_keys 
                    SET api_key = ?, created_at = datetime('now'), last_used = NULL
                    WHERE user_id = ? AND integration_type = ?
                `);
        await updateStmt.bind(apiKey, userId, integrationType).run();
      } else {
        const insertStmt = this.db.prepare(`
                    INSERT INTO user_api_keys (user_id, integration_type, api_key, created_at, last_used) 
                    VALUES (?, ?, ?, datetime('now'), NULL)
                `);
        await insertStmt.bind(userId, integrationType, apiKey).run();
      }
      return true;
    } catch (error3) {
      return false;
    }
  }
  async validateApiKey(apiKey) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT uak.id, uak.user_id, uak.integration_type, u.email, u.is_admin
                FROM user_api_keys uak
                JOIN users u ON uak.user_id = u.id
                WHERE uak.api_key = ? AND u.is_active = 1
            `);
      const result = await stmt.bind(apiKey).first();
      return result || null;
    } catch (error3) {
      return null;
    }
  }
  async updateApiKeyLastUsed(apiKeyId) {
    try {
      const stmt = this.db.prepare(`
                UPDATE user_api_keys 
                SET last_used = datetime('now') 
                WHERE id = ?
            `);
      await stmt.bind(apiKeyId).run();
      return true;
    } catch (error3) {
      return false;
    }
  }
  async deleteApiKey(userId, integrationType) {
    try {
      const stmt = this.db.prepare(`
                DELETE FROM user_api_keys 
                WHERE user_id = ? AND integration_type = ?
            `);
      const result = await stmt.bind(userId, integrationType).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      return false;
    }
  }
  // Uploaded Images Management Methods
  async storeUploadedImage(imageData, r2Key, fileSize = null) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                INSERT INTO uploaded_images (
                    id, user_id, filename, original_filename, file_size, mime_type, r2_key,
                    title, caption, keywords, rating, color_label,
                    camera_model, lens, iso, aperture, shutter_speed, focal_length, date_time,
                    uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `);
      const result = await stmt.bind(
        imageData.id,
        imageData.userId,
        imageData.filename,
        imageData.originalFilename || imageData.filename,
        fileSize,
        imageData.mimeType || "image/jpeg",
        r2Key,
        imageData.title || null,
        imageData.caption || null,
        imageData.keywords ? JSON.stringify(imageData.keywords) : null,
        imageData.rating || 0,
        imageData.colorLabel || null,
        imageData.metadata?.camera || null,
        imageData.metadata?.lens || null,
        imageData.metadata?.iso || null,
        imageData.metadata?.aperture || null,
        imageData.metadata?.shutterSpeed || null,
        imageData.metadata?.focalLength || null,
        imageData.metadata?.dateTime || null
      ).run();
      return result.success;
    } catch (error3) {
      console.error("Failed to store uploaded image metadata:", error3);
      return false;
    }
  }
  async getUserUploadedImages(userId, limit = 50, offset = 0) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT id, filename, original_filename, file_size, mime_type, r2_key,
                       title, caption, keywords, rating, color_label,
                       camera_model, lens, iso, aperture, shutter_speed, focal_length, date_time,
                       uploaded_at, generated_caption, generated_hashtags, generated_alt_text
                FROM uploaded_images 
                WHERE user_id = ? AND (source = 'lightroom' OR source IS NULL)
                ORDER BY uploaded_at DESC
                LIMIT ? OFFSET ?
            `);
      const result = await stmt.bind(userId, limit, offset).all();
      const images = (result.results || []).map((img) => ({
        ...img,
        keywords: img.keywords ? JSON.parse(img.keywords) : []
      }));
      return images;
    } catch (error3) {
      console.error("Failed to get uploaded images:", error3);
      return [];
    }
  }
  async getUploadedImageById(imageId, userId) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT * FROM uploaded_images 
                WHERE id = ? AND user_id = ?
            `);
      const result = await stmt.bind(imageId, userId).first();
      if (result && result.keywords) {
        result.keywords = JSON.parse(result.keywords);
      }
      return result;
    } catch (error3) {
      console.error("Failed to get uploaded image:", error3);
      return null;
    }
  }
  async updateImageCaptions(imageId, userId, generatedCaption, generatedHashtags, generatedAltText) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                UPDATE uploaded_images 
                SET generated_caption = ?, generated_hashtags = ?, generated_alt_text = ?
                WHERE id = ? AND user_id = ?
            `);
      const result = await stmt.bind(generatedCaption, generatedHashtags, generatedAltText, imageId, userId).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      console.error("Failed to update image captions:", error3);
      return false;
    }
  }
  async deleteUploadedImage(imageId, userId) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                DELETE FROM uploaded_images 
                WHERE id = ? AND user_id = ?
            `);
      const result = await stmt.bind(imageId, userId).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      console.error("Failed to delete uploaded image:", error3);
      return false;
    }
  }
  // Custom Prompts Management Methods
  async getUserCustomPrompts(userId) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT id, name, description, prompt_text, icon, is_active, created_at, updated_at
                FROM user_prompts 
                WHERE user_id = ? AND is_active = 1
                ORDER BY created_at DESC
            `);
      const result = await stmt.bind(userId).all();
      return result.results || [];
    } catch (error3) {
      console.error("Failed to get user custom prompts:", error3);
      return [];
    }
  }
  async createCustomPrompt(userId, name2, description, promptText, icon = "\u2728") {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                INSERT INTO user_prompts (user_id, name, description, prompt_text, icon, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
      const result = await stmt.bind(userId, name2, description, promptText, icon).run();
      return result.meta && result.meta.last_row_id || result.last_row_id;
    } catch (error3) {
      console.error("Failed to create custom prompt:", error3);
      return null;
    }
  }
  async updateCustomPrompt(promptId, userId, name2, description, promptText, icon) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                UPDATE user_prompts 
                SET name = ?, description = ?, prompt_text = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `);
      const result = await stmt.bind(name2, description, promptText, icon, promptId, userId).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      console.error("Failed to update custom prompt:", error3);
      return false;
    }
  }
  async deleteCustomPrompt(promptId, userId) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                UPDATE user_prompts 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `);
      const result = await stmt.bind(promptId, userId).run();
      const changes = result.meta && result.meta.changes || result.changes || 0;
      return changes > 0;
    } catch (error3) {
      console.error("Failed to delete custom prompt:", error3);
      return false;
    }
  }
  async getCustomPromptById(promptId, userId) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT id, name, description, prompt_text, icon, is_active, created_at, updated_at
                FROM user_prompts 
                WHERE id = ? AND user_id = ? AND is_active = 1
            `);
      const result = await stmt.bind(promptId, userId).first();
      return result;
    } catch (error3) {
      console.error("Failed to get custom prompt by id:", error3);
      return null;
    }
  }
  // Image Library Methods
  async storeWebImage(userId, filename, fileSize, mimeType, imageHash, r2Key, originalImageData = null) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                INSERT INTO uploaded_images (
                    id, user_id, filename, original_filename, file_size, mime_type, 
                    file_hash, r2_key, uploaded_at, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'web')
                RETURNING id
            `);
      const imageId = generateRandomId();
      const result = await stmt.bind(
        imageId,
        userId,
        filename,
        filename,
        fileSize,
        mimeType,
        imageHash,
        r2Key
      ).first();
      return result ? result.id : null;
    } catch (error3) {
      console.error("Error storing web image:", error3);
      return null;
    }
  }
  async getImageLibrary(userId, limit = 50, offset = 0) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT 
                    ui.id,
                    ui.original_filename,
                    ui.file_size,
                    ui.mime_type,
                    ui.uploaded_at as created_at,
                    ui.r2_key,
                    COUNT(ch.id) as caption_count
                FROM uploaded_images ui
                LEFT JOIN caption_history ch ON ui.id = ch.image_id
                WHERE ui.user_id = ? AND ui.source = 'web'
                GROUP BY ui.id
                ORDER BY ui.uploaded_at DESC
                LIMIT ? OFFSET ?
            `);
      const result = await stmt.bind(userId, limit, offset).all();
      return result.results || [];
    } catch (error3) {
      console.error("Error getting image library:", error3);
      return [];
    }
  }
  async getImageWithCaptions(userId, imageId) {
    try {
      await this.ensureInitialized();
      const imageStmt = this.db.prepare(`
                SELECT * FROM uploaded_images 
                WHERE id = ? AND user_id = ?
            `);
      const image = await imageStmt.bind(imageId, userId).first();
      if (!image) {
        return null;
      }
      const captionsStmt = this.db.prepare(`
                SELECT * FROM caption_history 
                WHERE image_id = ? AND user_id = ?
                ORDER BY created_at DESC
            `);
      const captionsResult = await captionsStmt.bind(imageId, userId).all();
      const captions = captionsResult.results || [];
      return {
        image,
        captions
      };
    } catch (error3) {
      console.error("Error getting image with captions:", error3);
      return null;
    }
  }
  async deleteImageLibraryEntry(userId, imageId) {
    try {
      await this.ensureInitialized();
      const captionHistoryStmt = this.db.prepare(`DELETE FROM caption_history WHERE image_id = ? AND user_id = ?`);
      await captionHistoryStmt.bind(imageId, userId).run();
      try {
        const scheduledPostsStmt = this.db.prepare(`DELETE FROM scheduled_posts WHERE image_id = ? AND user_id = ?`);
        await scheduledPostsStmt.bind(imageId, userId).run();
      } catch (scheduledError) {
        if (!scheduledError.message.includes("no such table: scheduled_posts")) {
          throw scheduledError;
        }
      }
      const imageStmt = this.db.prepare(`DELETE FROM uploaded_images WHERE id = ? AND user_id = ?`);
      await imageStmt.bind(imageId, userId).run();
      return true;
    } catch (error3) {
      console.error("Error deleting image library entry:", error3);
      return false;
    }
  }
  async getImageByHash(userId, imageHash) {
    try {
      await this.ensureInitialized();
      const stmt = this.db.prepare(`
                SELECT * FROM uploaded_images 
                WHERE user_id = ? AND file_hash = ?
                ORDER BY uploaded_at DESC
                LIMIT 1
            `);
      return await stmt.bind(userId, imageHash).first();
    } catch (error3) {
      console.error("Error getting image by hash:", error3);
      return null;
    }
  }
};
function generateRandomId() {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return hex.substring(0, 8) + "-" + hex.substring(8, 12) + "-" + hex.substring(12, 16) + "-" + hex.substring(16, 20) + "-" + hex.substring(20, 32);
    } else {
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 15);
      const randomPart2 = Math.random().toString(36).substring(2, 15);
      return timestamp + "-" + randomPart + "-" + randomPart2;
    }
  } catch (error3) {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return timestamp + "-" + randomPart + "-" + randomPart2;
  }
}
__name(generateRandomId, "generateRandomId");
var app = new Hono2();
app.use("/*", cors());
var JWT_SECRET = "default-secret-change-this";
var JWT_EXPIRES_IN = "7d";
var authenticateToken = /* @__PURE__ */ __name(async (c2, next) => {
  try {
    const authHeader = c2.req.header("authorization");
    let token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      token = getCookie(c2, "auth_token");
    }
    if (!token) {
      return c2.json({ error: "Access token required" }, 401);
    }
    const decoded = import_jsonwebtoken.default.verify(token, c2.env.JWT_SECRET || JWT_SECRET);
    const database = new D1Database(c2.env.DB);
    const session = await database.getSession(decoded.sessionId);
    if (!session) {
      return c2.json({ error: "Invalid or expired session" }, 401);
    }
    c2.set("user", {
      id: session.user_id,
      email: session.email,
      sessionId: session.session_id,
      isAdmin: session.is_admin === 1
    });
    await next();
  } catch (error3) {
    return c2.json({ error: "Invalid token" }, 403);
  }
}, "authenticateToken");
var authenticateApiKey = /* @__PURE__ */ __name(async (c2, next) => {
  try {
    const authHeader = c2.req.header("authorization");
    const apiKey = authHeader && authHeader.split(" ")[1];
    if (!apiKey) {
      return c2.json({ error: "API key required" }, 401);
    }
    const database = new D1Database(c2.env.DB);
    const keyValidation = await database.validateApiKey(apiKey);
    if (!keyValidation) {
      return c2.json({ error: "Invalid API key" }, 401);
    }
    await database.updateApiKeyLastUsed(keyValidation.id);
    c2.set("user", {
      id: keyValidation.user_id,
      email: keyValidation.email,
      isAdmin: keyValidation.is_admin === 1,
      apiKeyId: keyValidation.id,
      integrationType: keyValidation.integration_type
    });
    await next();
  } catch (error3) {
    return c2.json({ error: "API authentication failed" }, 403);
  }
}, "authenticateApiKey");
app.get("/api/health", (c2) => {
  return c2.json({
    status: "OK",
    apiKeyConfigured: !!c2.env.OPENAI_API_KEY,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    runtime: "cloudflare-workers"
  });
});
app.get("/api/debug/schema", async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    const tablesStmt = database.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    const tables = await tablesStmt.all();
    return c2.json({
      tables: tables.results || [],
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error3) {
    return c2.json({
      error: "Failed to get schema info",
      message: error3.message
    }, 500);
  }
});
var requireAdmin = /* @__PURE__ */ __name(async (c2, next) => {
  const user = c2.get("user");
  if (!user || !user.isAdmin) {
    return c2.json({ error: "Admin access required" }, 403);
  }
  await next();
}, "requireAdmin");
D1Database.prototype.getAllUsers = async function() {
  const stmt = this.db.prepare(`
        SELECT u.*, t.name as tier_name, t.daily_limit 
        FROM users u 
        LEFT JOIN user_tiers t ON u.tier_id = t.id
        ORDER BY u.created_at DESC
    `);
  return (await stmt.all()).results || [];
};
D1Database.prototype.makeUserAdmin = async function(email) {
  const stmt = this.db.prepare(`
        UPDATE users SET is_admin = 1 WHERE email = ?
    `);
  await stmt.bind(email).run();
};
D1Database.prototype.toggleUserStatus = async function(userId) {
  const stmt = this.db.prepare(`
        UPDATE users SET is_active = NOT is_active WHERE id = ?
    `);
  const result = await stmt.bind(userId).run();
  const changes = result.meta && result.meta.changes || result.changes || 0;
  return changes > 0;
};
D1Database.prototype.getAllTiers = async function() {
  await this.ensureUserTiersTable();
  const stmt = this.db.prepare(`
        SELECT *, 
        (SELECT COUNT(*) FROM users WHERE tier_id = user_tiers.id) as user_count
        FROM user_tiers ORDER BY daily_limit ASC
    `);
  const result = await stmt.all();
  return result.results || [];
};
D1Database.prototype.getTierById = async function(tierId) {
  await this.ensureUserTiersTable();
  const stmt = this.db.prepare(`
        SELECT * FROM user_tiers WHERE id = ?
    `);
  const result = await stmt.bind(tierId).first();
  return result || null;
};
D1Database.prototype.createTier = async function(name2, dailyLimit, description = null) {
  await this.ensureUserTiersTable();
  const stmt = this.db.prepare(`
        INSERT INTO user_tiers (name, daily_limit, description) 
        VALUES (?, ?, ?)
        RETURNING id
    `);
  const result = await stmt.bind(name2, dailyLimit, description).first();
  return result.id;
};
D1Database.prototype.updateTier = async function(tierId, name2, dailyLimit, description = null) {
  const stmt = this.db.prepare(`
        UPDATE user_tiers 
        SET name = ?, daily_limit = ?, description = ?, updated_at = datetime('now')
        WHERE id = ?
    `);
  const result = await stmt.bind(name2, dailyLimit, description, tierId).run();
  const changes = result.meta && result.meta.changes || result.changes || 0;
  return changes > 0;
};
D1Database.prototype.deleteTier = async function(tierId) {
  const usersStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE tier_id = ?
    `);
  const usersResult = await usersStmt.bind(tierId).first();
  if (usersResult.count > 0) {
    throw new Error("Cannot delete tier with assigned users");
  }
  const stmt = this.db.prepare(`
        DELETE FROM user_tiers WHERE id = ?
    `);
  const result = await stmt.bind(tierId).run();
  const changes = result.meta && result.meta.changes || result.changes || 0;
  return changes > 0;
};
D1Database.prototype.setUserTier = async function(userId, tierId) {
  try {
    const stmt = this.db.prepare(`
            UPDATE users SET tier_id = ? WHERE id = ?
        `);
    const result = await stmt.bind(tierId, userId).run();
    const changes = result.meta && result.meta.changes || result.changes || 0;
    return changes > 0;
  } catch (error3) {
    throw error3;
  }
};
D1Database.prototype.createInviteToken = async function(email, invitedBy, token, expiresAt, tierId = null, personalMessage = null) {
  try {
    await this.ensureInviteTokensTable();
    try {
      const tablesResult = await this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const schemaResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'").all();
      const fkResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE sql LIKE '%tiers%'").all();
    } catch (listError) {
    }
    const stmt = this.db.prepare(`
            INSERT INTO invite_tokens (email, invited_by_user_id, token, expires_at, tier_id, personal_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
    const result = await stmt.bind(email, invitedBy, token, expiresAt, tierId, personalMessage).run();
    return { email, token, expiresAt, tierId, personalMessage };
  } catch (error3) {
    throw error3;
  }
};
D1Database.prototype.ensureUserTiersTable = async function() {
  try {
    const stmt = this.db.prepare(`
            CREATE TABLE IF NOT EXISTS user_tiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                daily_limit INTEGER NOT NULL DEFAULT 10,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    await stmt.run();
  } catch (error3) {
  }
};
D1Database.prototype.ensureInviteTokensTable = async function() {
  try {
    await this.ensureUserTiersTable();
    const schemaResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'").all();
    const currentSchema = schemaResult.results && [0] && sql || "";
    if (currentSchema.includes("REFERENCES tiers(id)")) {
      await this.db.prepare("DROP TABLE IF EXISTS invite_tokens").run();
    }
    const stmt = this.db.prepare(`
            CREATE TABLE IF NOT EXISTS invite_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                invited_by_user_id INTEGER,
                token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                tier_id INTEGER,
                personal_message TEXT,
                used_at DATETIME,
                used_by_user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invited_by_user_id) REFERENCES users(id),
                FOREIGN KEY (used_by_user_id) REFERENCES users(id)
            )
        `);
    await stmt.run();
    try {
      const alterStmt = this.db.prepare(`
                ALTER TABLE invite_tokens ADD COLUMN tier_id INTEGER
            `);
      await alterStmt.run();
    } catch (alterError) {
    }
    try {
      const alterStmt2 = this.db.prepare(`
                ALTER TABLE invite_tokens ADD COLUMN personal_message TEXT
            `);
      await alterStmt2.run();
    } catch (alterError) {
    }
  } catch (error3) {
  }
};
D1Database.prototype.getInviteToken = async function(token) {
  try {
    await this.ensureInviteTokensTable();
    const stmt = this.db.prepare(`
            SELECT * FROM invite_tokens 
            WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')
        `);
    const result = await stmt.bind(token).first();
    return result;
  } catch (error3) {
    return null;
  }
};
D1Database.prototype.useInviteToken = async function(token, userId) {
  try {
    const stmt = this.db.prepare(`
            UPDATE invite_tokens 
            SET used_at = datetime('now'), used_by_user_id = ? 
            WHERE token = ?
        `);
    const result = await stmt.bind(userId, token).run();
    const changes = result.meta && result.meta.changes || result.changes || 0;
    return changes > 0;
  } catch (error3) {
    throw error3;
  }
};
D1Database.prototype.getPendingInvites = async function() {
  try {
    const tableCheck = this.db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='invite_tokens'
        `);
    const tableExists = await tableCheck.first();
    if (!tableExists) {
      return [];
    }
    const columnsCheck = this.db.prepare(`
            PRAGMA table_info(invite_tokens)
        `);
    const columns = await columnsCheck.all();
    const columnNames = (columns.results || []).map((col) => col.name);
    let stmt;
    if (columnNames.includes("invited_by_user_id")) {
      stmt = this.db.prepare(`
                SELECT i.*, COALESCE(u.email, 'System') as invited_by_email 
                FROM invite_tokens i
                LEFT JOIN users u ON i.invited_by_user_id = u.id
                WHERE i.used_at IS NULL 
                AND i.expires_at > datetime('now')
                ORDER BY i.created_at DESC
            `);
    } else if (columnNames.includes("invited_by_user_id")) {
      stmt = this.db.prepare(`
                SELECT i.*, COALESCE(u.email, 'System') as invited_by_email 
                FROM invite_tokens i
                LEFT JOIN users u ON i.invited_by_user_id = u.id
                WHERE i.used_at IS NULL 
                AND i.expires_at > datetime('now')
                ORDER BY i.created_at DESC
            `);
    } else {
      stmt = this.db.prepare(`
                SELECT *, 'System' as invited_by_email
                FROM invite_tokens
                WHERE used_at IS NULL 
                AND expires_at > datetime('now')
                ORDER BY created_at DESC
            `);
    }
    const result = await stmt.all();
    return result.results || [];
  } catch (error3) {
    return [];
  }
};
D1Database.prototype.getUsersUsageStats = async function() {
  const stmt = this.db.prepare(`
        SELECT 
            u.id, u.email, u.created_at, u.last_login, u.is_active,
            t.name as tier_name, t.daily_limit,
            COALESCE(du.usage_count, 0) as usage_today,
            COALESCE(total_usage.total_count, 0) as total_usage
        FROM users u
        LEFT JOIN user_tiers t ON u.tier_id = t.id
        LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = date('now')
        LEFT JOIN (
            SELECT user_id, SUM(usage_count) as total_count
            FROM daily_usage
            GROUP BY user_id
        ) total_usage ON u.id = total_usage.user_id
        WHERE u.is_active = 1
        ORDER BY u.created_at DESC
    `);
  const result = await stmt.all();
  return result.results || [];
};
async function sendMagicLinkEmail(email, loginUrl, env2) {
  if (!env2.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD (Resend API key) not configured");
  }
  const html = await renderTemplate("login-email", {
    LOGIN_URL: loginUrl,
    TIMESTAMP: (/* @__PURE__ */ new Date()).toLocaleString()
  });
  const emailData = {
    from: env2.SMTP_FROM_EMAIL || "AI Caption Studio <noreply@resend.dev>",
    to: email,
    subject: "Your Login Link - AI Caption Studio",
    html
  };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env2.SMTP_PASSWORD,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(emailData)
  });
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error("Resend API error: " + response.status + " - " + errorData);
  }
  const result = await response.json();
  return result;
}
__name(sendMagicLinkEmail, "sendMagicLinkEmail");
app.post("/api/auth/request-login", async (c2) => {
  try {
    const { email } = await c2.req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c2.json({ error: "Valid email address required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const existingUser = await database.getUserByEmail(email);
    if (!existingUser) {
      const registrationOpen = await database.getSystemSetting("registration_open", "true");
      if (registrationOpen === "false") {
        return c2.json({
          error: "Registration is currently invite-only. Please contact an administrator for an invitation."
        }, 403);
      }
    }
    const token = generateRandomId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    const ipAddress = c2.req.header("cf-connecting-ip") || "unknown";
    const userAgent = c2.req.header("user-agent") || "";
    await database.createLoginToken(email, token, expiresAt, ipAddress, userAgent);
    const loginUrl = `${new URL(c2.req.url).origin}/auth/verify?token=${token}`;
    try {
      await sendMagicLinkEmail(email, loginUrl, c2.env);
      return c2.json({
        success: true,
        message: "Magic link sent to your email address",
        expiresIn: "15 minutes"
      });
    } catch (emailError) {
      return c2.json({
        success: true,
        message: "Magic link generated (email sending failed: " + emailError.message + ")",
        expiresIn: "15 minutes",
        loginUrl
        // Only shown when email fails
      });
    }
  } catch (error3) {
    return c2.json({ error: "Failed to generate magic link" }, 500);
  }
});
app.get("/auth/verify", async (c2) => {
  try {
    const token = c2.req.query("token");
    if (!token) {
      const html2 = await renderTemplate("login-error", {
        ERROR_TITLE: "Invalid Login Link",
        ERROR_MESSAGE: "This login link is invalid."
      });
      return c2.html(html2);
    }
    const database = new D1Database(c2.env.DB);
    const loginToken = await database.getLoginToken(token);
    if (!loginToken) {
      const html2 = await renderTemplate("login-error", {
        ERROR_TITLE: "Invalid or Expired Link",
        ERROR_MESSAGE: "This login link is invalid or has expired."
      });
      return c2.html(html2);
    }
    await database.useLoginToken(token);
    let user;
    try {
      user = await database.getUserByEmail(loginToken.email);
      if (!user) {
        user = await database.createUser(loginToken.email, c2.env);
      }
    } catch (error3) {
      if (error3.message === "USER_EXISTS") {
        user = await database.getUserByEmail(loginToken.email);
      } else {
        throw error3;
      }
    }
    const sessionId = generateRandomId();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const ipAddress = c2.req.header("cf-connecting-ip") || "unknown";
    const userAgent = c2.req.header("user-agent") || "";
    await database.createSession(sessionId, user.id, sessionExpiresAt, ipAddress, userAgent);
    const jwtToken = import_jsonwebtoken.default.sign({ sessionId }, c2.env.JWT_SECRET || JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    setCookie(c2, "auth_token", jwtToken, {
      httpOnly: false,
      secure: false,
      // Allow on HTTP for development/testing
      maxAge: 7 * 24 * 60 * 60,
      // 7 days
      sameSite: "Lax"
    });
    const html = await renderTemplate("login-success", {
      USER_EMAIL: user.email,
      JWT_TOKEN: jwtToken
    });
    return c2.html(html);
  } catch (error3) {
    const html = await renderTemplate("login-error", {
      ERROR_TITLE: "Login Failed",
      ERROR_MESSAGE: "Login verification failed."
    });
    return c2.html(html);
  }
});
app.get("/api/auth/me", authenticateToken, async (c2) => {
  const user = c2.get("user");
  return c2.json({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin
  });
});
app.post("/api/auth/logout", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const stmt = database.db.prepare("DELETE FROM user_sessions WHERE session_id = ?");
    await stmt.bind(user.sessionId).run();
    setCookie(c2, "auth_token", "", {
      httpOnly: false,
      secure: false,
      maxAge: 0,
      expires: /* @__PURE__ */ new Date(0),
      sameSite: "Lax"
    });
    return c2.json({ success: true, message: "Logged out successfully" });
  } catch (error3) {
    return c2.json({ error: "Logout failed" }, 500);
  }
});
app.post("/api/auth/accept-invite", async (c2) => {
  try {
    const { email, inviteToken } = await c2.req.json();
    if (!email || !inviteToken) {
      return c2.json({ error: "Email and invite token are required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const invite = await database.getInviteToken(inviteToken);
    if (!invite) {
      return c2.json({ error: "Invalid or expired invite token" }, 400);
    }
    if (invite.email !== email) {
      return c2.json({ error: "Email does not match the invitation" }, 400);
    }
    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return c2.json({ error: "User already exists" }, 400);
    }
    const user = await database.createUser(email, c2.env);
    if (invite.tier_id) {
      const tierInfo = await database.getTierById(invite.tier_id);
      if (tierInfo) {
        await database.setUserTier(user.id, invite.tier_id);
      }
    }
    await database.useInviteToken(inviteToken, user.id);
    const sessionId = generateRandomId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const ipAddress = c2.req.header("cf-connecting-ip") || "unknown";
    const userAgent = c2.req.header("user-agent") || "";
    await database.createSession(sessionId, user.id, expiresAt, ipAddress, userAgent);
    const token = import_jsonwebtoken.default.sign({ sessionId }, c2.env.JWT_SECRET || JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    setCookie(c2, "auth_token", token, {
      httpOnly: false,
      secure: false,
      maxAge: 7 * 24 * 60 * 60,
      // 7 days
      sameSite: "Lax"
    });
    return c2.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error3) {
    return c2.json({ error: "Failed to accept invitation" }, 500);
  }
});
app.post("/api/admin/users", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { email, isAdmin } = await c2.req.json();
    if (!email || !email.includes("@")) {
      return c2.json({ error: "Valid email address is required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const existingUser = await database.db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
      return c2.json({ error: "User with this email already exists" }, 400);
    }
    const result = await database.db.prepare(
      'INSERT INTO users (email, is_admin, is_active, created_at) VALUES (?, ?, ?, datetime("now"))'
    ).bind(email, isAdmin ? 1 : 0, 1).run();
    if (result.success) {
      return c2.json({
        success: true,
        message: `User ${email} created successfully${isAdmin ? " as admin" : ""}`,
        userId: result.meta.last_row_id
      });
    } else {
      return c2.json({ error: "Failed to create user" }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to create user" }, 500);
  }
});
app.get("/api/admin/users", authenticateToken, requireAdmin, async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    const users = await database.getAllUsers();
    return c2.json(users);
  } catch (error3) {
    return c2.json({ error: "Failed to fetch users" }, 500);
  }
});
app.post("/api/admin/users/:userId/make-admin", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { userId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const user = await database.db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return c2.json({ error: "User not found" }, 404);
    }
    await database.makeUserAdmin(user.email);
    return c2.json({ success: true, message: "User promoted to admin" });
  } catch (error3) {
    return c2.json({ error: "Failed to promote user" }, 500);
  }
});
app.post("/api/admin/users/:userId/toggle", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { userId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const success = await database.toggleUserStatus(userId);
    if (success) {
      return c2.json({ success: true, message: "User status updated successfully" });
    } else {
      return c2.json({ error: "User not found" }, 404);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to toggle user status" }, 500);
  }
});
app.get("/api/admin/stats", authenticateToken, requireAdmin, async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    await database.ensureQueryLogsTable();
    const userCount = await database.db.prepare("SELECT COUNT(*) as count FROM users").first();
    const queryCount = await database.db.prepare("SELECT COUNT(*) as count FROM query_logs").first();
    return c2.json({
      totalUsers: userCount && userCount.count || 0,
      totalQueries: queryCount && queryCount.count || 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error3) {
    return c2.json({ error: "Failed to fetch stats: " + error3.message }, 500);
  }
});
app.get("/api/admin/tiers", authenticateToken, requireAdmin, async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    const tiers = await database.getAllTiers();
    return c2.json(tiers);
  } catch (error3) {
    return c2.json({ error: "Failed to fetch tiers" }, 500);
  }
});
app.get("/api/admin/tiers/:tierId", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { tierId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const tier = await database.getTierById(tierId);
    if (!tier) {
      return c2.json({ error: "Tier not found" }, 404);
    }
    return c2.json(tier);
  } catch (error3) {
    return c2.json({ error: "Failed to fetch tier" }, 500);
  }
});
app.post("/api/admin/tiers", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { name: name2, dailyLimit, description } = await c2.req.json();
    if (!name2 || dailyLimit === void 0) {
      return c2.json({ error: "Name and daily limit are required" }, 400);
    }
    if (dailyLimit < -1) {
      return c2.json({ error: "Daily limit must be -1 or greater" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const tierId = await database.createTier(name2, dailyLimit, description);
    return c2.json({
      success: true,
      message: `Tier "${name2}" created successfully`,
      tierId
    });
  } catch (error3) {
    if (error3.message.includes("UNIQUE constraint")) {
      return c2.json({ error: "A tier with this name already exists" }, 400);
    }
    return c2.json({ error: "Failed to create tier" }, 500);
  }
});
app.put("/api/admin/tiers/:tierId", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { tierId } = c2.req.param();
    const { name: name2, dailyLimit, description } = await c2.req.json();
    if (!name2 || dailyLimit === void 0) {
      return c2.json({ error: "Name and daily limit are required" }, 400);
    }
    if (dailyLimit < -1) {
      return c2.json({ error: "Daily limit must be -1 or greater" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const success = await database.updateTier(tierId, name2, dailyLimit, description);
    if (success) {
      return c2.json({
        success: true,
        message: `Tier "${name2}" updated successfully`
      });
    } else {
      return c2.json({ error: "Tier not found" }, 404);
    }
  } catch (error3) {
    if (error3.message.includes("UNIQUE constraint")) {
      return c2.json({ error: "A tier with this name already exists" }, 400);
    }
    return c2.json({ error: "Failed to update tier" }, 500);
  }
});
app.delete("/api/admin/tiers/:tierId", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { tierId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const success = await database.deleteTier(tierId);
    if (success) {
      return c2.json({
        success: true,
        message: "Tier deleted successfully"
      });
    } else {
      return c2.json({ error: "Tier not found" }, 404);
    }
  } catch (error3) {
    if (error3.message.includes("Cannot delete tier with assigned users")) {
      return c2.json({ error: "Cannot delete tier that has users assigned to it" }, 400);
    }
    return c2.json({ error: "Failed to delete tier" }, 500);
  }
});
app.post("/api/admin/users/:userId/tier", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { userId } = c2.req.param();
    const { tierId } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    if (!tierId || tierId === "" || tierId === "null") {
      const success2 = await database.setUserTier(userId, null);
      if (success2) {
        return c2.json({
          success: true,
          message: "User tier cleared (no tier assigned)"
        });
      } else {
        return c2.json({ error: "User not found" }, 404);
      }
    }
    const tier = await database.getTierById(tierId);
    if (!tier) {
      return c2.json({ error: "Invalid tier ID" }, 400);
    }
    const success = await database.setUserTier(userId, tierId);
    if (success) {
      return c2.json({
        success: true,
        message: `User tier updated to "${tier.name}"`
      });
    } else {
      return c2.json({ error: "User not found" }, 404);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to update user tier: " + error3.message }, 500);
  }
});
app.delete("/api/admin/users/:userId", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { userId } = c2.req.param();
    if (!userId) {
      return c2.json({ error: "User ID is required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const user = await database.db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return c2.json({ error: "User not found" }, 404);
    }
    const requestingUser = c2.get("user");
    if (requestingUser.id === parseInt(userId)) {
      return c2.json({ error: "Cannot delete your own account" }, 400);
    }
    const success = await database.deleteUser(userId);
    if (success) {
      return c2.json({
        success: true,
        message: `User "${user.email}" has been permanently deleted`
      });
    } else {
      return c2.json({ error: "Failed to delete user" }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to delete user: " + error3.message }, 500);
  }
});
app.post("/api/admin/invite", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { email, tierId, personalMessage } = await c2.req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c2.json({ error: "Valid email address required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return c2.json({ error: "User already exists" }, 400);
    }
    let tierInfo = null;
    if (tierId) {
      try {
        const tablesResult = await database.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      } catch (dbError) {
      }
      tierInfo = await database.getTierById(tierId);
      if (!tierInfo) {
        return c2.json({ error: "Invalid tier selected" }, 400);
      }
    }
    const token = generateRandomId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const user = c2.get("user");
    await database.createInviteToken(email, user.id, token, expiresAt, tierId, personalMessage);
    const inviteUrl = `${new URL(c2.req.url).origin}/auth?invite=${token}&email=${encodeURIComponent(email)}`;
    const personalMessageHtml = personalMessage ? `<div style="background: #f8f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #405de6; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #405de6;">Personal Message:</h3>
                <p style="margin: 0; font-style: italic;">"${personalMessage}"</p>
            </div>` : "";
    const tierInfoHtml = tierInfo ? `<div style="background: #f0f9ff; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e0f2fe;">
                <h4 style="margin: 0 0 5px 0; color: #0369a1;">Your Account Tier: ${tierInfo.name}</h4>
                <p style="margin: 0; font-size: 14px; color: #475569;">
                    ${tierInfo.daily_limit === -1 ? "Unlimited" : tierInfo.daily_limit} caption generations per day
                </p>
            </div>` : "";
    try {
      const emailData = {
        from: c2.env.SMTP_FROM_EMAIL || "AI Caption Studio <noreply@resend.dev>",
        to: email,
        subject: "You are invited to AI Caption Studio",
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>\u{1F389} You're Invited!</h2>
                        <p>Hi there!</p>
                        <p><strong>${user.email}</strong> has invited you to join AI Caption Studio, an AI-powered tool for creating Instagram captions and hashtags.</p>
                        ${personalMessageHtml}
                        ${tierInfoHtml}
                        <div style="margin: 30px 0;">
                            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                                \u{1F680} Accept Invitation
                            </a>
                        </div>
                        <p><strong>This invitation expires in 7 days.</strong></p>
                        <p>If you're not interested, you can safely ignore this email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            Invited by: ${user.email}<br>
                            Time: ${(/* @__PURE__ */ new Date()).toLocaleString()}${tierInfo ? `<br>Assigned Tier: ${tierInfo.name}` : ""}
                        </p>
                    </div>
                `
      };
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + c2.env.SMTP_PASSWORD,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailData)
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error("Resend API error: " + response.status + " - " + errorData);
      }
      return c2.json({
        success: true,
        message: `Invitation sent to ${email}${tierInfo ? ` with ${tierInfo.name} tier` : ""}`,
        expiresIn: "7 days"
      });
    } catch (emailError) {
      return c2.json({
        success: true,
        message: `Invitation created but email sending failed: ${emailError.message}`,
        inviteUrl
        // Fallback: show link for manual sharing
      });
    }
  } catch (error3) {
    return c2.json({ error: "Failed to send invitation" }, 500);
  }
});
app.get("/api/admin/invites", authenticateToken, requireAdmin, async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    const invites = await database.getPendingInvites();
    return c2.json(invites);
  } catch (error3) {
    return c2.json({ error: "Failed to fetch invites: " + error3.message }, 500);
  }
});
app.post("/api/admin/invites/:token/resend", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { token } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const invite = await database.getInviteToken(token);
    if (!invite) {
      return c2.json({ error: "Invite not found or already used/expired" }, 404);
    }
    const newToken = generateRandomId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const updateStmt = database.db.prepare(`
            UPDATE invite_tokens 
            SET token = ?, expires_at = ?, created_at = datetime('now')
            WHERE token = ?
        `);
    await updateStmt.bind(newToken, expiresAt, token).run();
    const inviteLink = `${c2.req.header("origin") || "http://localhost:8787"}/auth?invite=${newToken}&email=${encodeURIComponent(invite.email)}`;
    const user = c2.get("user");
    const personalMessageHtml = invite.personal_message ? `<div style="background: #f8f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #405de6; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #405de6;">Personal Message:</h3>
                <p style="margin: 0; font-style: italic;">"${invite.personal_message}"</p>
            </div>` : "";
    const emailData = {
      from: `${c2.env.SMTP_FROM_NAME || "AI Caption Studio"} <${c2.env.SMTP_FROM_EMAIL || "no-reply@jonsson.io"}>`,
      to: [invite.email],
      subject: "Reminder: You're invited to AI Caption Studio",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>\u{1F504} Invitation Reminder</h2>
                    <p>Hi there!</p>
                    <p>This is a reminder that <strong>${user.email}</strong> has invited you to join AI Caption Studio.</p>
                    ${personalMessageHtml}
                    <div style="margin: 30px 0;">
                        <a href="${inviteLink}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                            \u{1F680} Accept Invitation
                        </a>
                    </div>
                    <p><strong>This invitation expires in 7 days.</strong></p>
                    <p>If you're not interested, you can safely ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">
                        Resent by: ${user.email}<br>
                        Time: ${(/* @__PURE__ */ new Date()).toLocaleString()}
                    </p>
                </div>
            `
    };
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + c2.env.SMTP_PASSWORD,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailData)
    });
    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      return c2.json({
        success: true,
        message: "Invitation token updated but email sending failed: " + errorData,
        newToken
      });
    }
    return c2.json({
      success: true,
      message: "Invitation resent successfully",
      newToken
    });
  } catch (error3) {
    return c2.json({ error: "Failed to resend invitation: " + error3.message }, 500);
  }
});
app.delete("/api/admin/invites/:token", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { token } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const checkStmt = database.db.prepare(`
            SELECT * FROM invite_tokens WHERE token = ?
        `);
    const invite = await checkStmt.bind(token).first();
    if (!invite) {
      return c2.json({ error: "Invite not found" }, 404);
    }
    const deleteStmt = database.db.prepare(`
            DELETE FROM invite_tokens WHERE token = ?
        `);
    const result = await deleteStmt.bind(token).run();
    const changes = result.meta && result.meta.changes || result.changes || 0;
    if (changes > 0) {
      return c2.json({
        success: true,
        message: "Invitation deleted successfully"
      });
    } else {
      return c2.json({ error: "Failed to delete invitation" }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to delete invitation: " + error3.message }, 500);
  }
});
app.get("/api/admin/usage-stats", authenticateToken, requireAdmin, async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    const stats = await database.getUsersUsageStats();
    return c2.json(stats);
  } catch (error3) {
    return c2.json({ error: "Failed to fetch usage statistics" }, 500);
  }
});
app.get("/api/settings/api-keys", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const apiKeys = await database.getUserApiKeys(user.id);
    const maskedKeys = apiKeys.map((key) => ({
      id: key.id,
      integration_type: key.integration_type,
      created_at: key.created_at,
      last_used: key.last_used,
      masked_key: key.api_key.substring(0, 8) + "..." + key.api_key.substring(key.api_key.length - 4)
    }));
    return c2.json(maskedKeys);
  } catch (error3) {
    return c2.json({ error: "Failed to fetch API keys" }, 500);
  }
});
app.post("/api/settings/api-keys/:integrationType", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { integrationType } = c2.req.param();
    const validTypes = ["lightroom", "photoshop", "external"];
    if (!validTypes.includes(integrationType)) {
      return c2.json({ error: "Invalid integration type" }, 400);
    }
    const apiKey = "acs_" + generateRandomId().replace(/-/g, "") + "_" + Date.now().toString(36);
    const database = new D1Database(c2.env.DB);
    const success = await database.createOrUpdateApiKey(user.id, integrationType, apiKey);
    if (success) {
      return c2.json({
        success: true,
        apiKey,
        // Use camelCase to match frontend expectations
        api_key: apiKey,
        // Also include snake_case for compatibility
        integration_type: integrationType,
        message: "API key generated successfully"
      });
    } else {
      return c2.json({ error: "Failed to create API key" }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to generate API key" }, 500);
  }
});
app.delete("/api/settings/api-keys/:integrationType", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { integrationType } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const success = await database.deleteApiKey(user.id, integrationType);
    if (success) {
      return c2.json({
        success: true,
        message: "API key revoked successfully"
      });
    } else {
      return c2.json({ error: "API key not found" }, 404);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to revoke API key" }, 500);
  }
});
app.get("/api/admin/settings", authenticateToken, requireAdmin, async (c2) => {
  try {
    const database = new D1Database(c2.env.DB);
    const settings = await database.getAllSystemSettings();
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });
    if (!settingsMap.hasOwnProperty("registration_open")) {
      await database.setSystemSetting("registration_open", "true");
      settingsMap.registration_open = "true";
    }
    return c2.json({
      settings: settingsMap,
      adminEmail: c2.env.ADMIN_EMAIL || "Not configured"
    });
  } catch (error3) {
    return c2.json({ error: "Failed to fetch system settings" }, 500);
  }
});
app.post("/api/admin/settings", authenticateToken, requireAdmin, async (c2) => {
  try {
    const { settings } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    for (const [key, value] of Object.entries(settings)) {
      await database.setSystemSetting(key, value);
    }
    return c2.json({
      success: true,
      message: "System settings updated successfully"
    });
  } catch (error3) {
    return c2.json({ error: "Failed to update system settings" }, 500);
  }
});
app.post("/api/lightroom/generate-caption", authenticateApiKey, async (c2) => {
  try {
    const user = c2.get("user");
    const {
      base64Image,
      includeWeather = false,
      style = "creative",
      filename,
      title: title2,
      caption,
      keywords,
      rating,
      colorLabel,
      metadata = {}
    } = await c2.req.json();
    if (!c2.env.OPENAI_API_KEY) {
      return c2.json({ error: "OpenAI API key not configured" }, 500);
    }
    if (!base64Image) {
      return c2.json({ error: "Missing image data" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const usageCheck = await database.checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
      return c2.json({
        error: "Daily usage limit exceeded",
        usageInfo: usageCheck
      }, 429);
    }
    const context2 = [];
    if (filename) context2.push("Filename: " + filename);
    if (title2) context2.push("Title: " + title2);
    if (caption) context2.push("Existing caption: " + caption);
    if (keywords && keywords.length > 0) context2.push("Keywords: " + keywords.join(", "));
    if (rating) context2.push("Rating: " + rating + " stars");
    if (colorLabel) context2.push("Color label: " + colorLabel);
    if (metadata.camera) context2.push("Camera: " + metadata.camera);
    if (metadata.lens) context2.push("Lens: " + metadata.lens);
    if (metadata.iso) context2.push("ISO: " + metadata.iso);
    if (metadata.aperture) context2.push("Aperture: " + metadata.aperture);
    if (metadata.shutterSpeed) context2.push("Shutter Speed: " + metadata.shutterSpeed);
    if (metadata.focalLength) context2.push("Focal Length: " + metadata.focalLength);
    if (metadata.dateTime) context2.push("Date/Time: " + metadata.dateTime);
    const contextString = context2.length > 0 ? "\\n\\nAdditional Context from Lightroom:\\n" + context2.join("\\n") : "";
    const styleInstructions = {
      creative: {
        tone: "Uses artistic and expressive language with creative metaphors",
        description: "creative and artistic"
      },
      professional: {
        tone: "Uses clean, professional language suitable for business contexts",
        description: "professional and business-friendly"
      },
      casual: {
        tone: "Uses relaxed, conversational language like talking to a friend",
        description: "casual and friendly"
      },
      trendy: {
        tone: "Uses current trends, viral language, and popular internet expressions",
        description: "trendy and viral"
      },
      inspirational: {
        tone: "Uses motivational, uplifting, and encouraging language",
        description: "inspirational and motivational"
      },
      humorous: {
        tone: "Uses funny, witty language with clever wordplay, puns, or amusing observations. Keep it light-hearted and entertaining while being appropriate for social media. Think like a comedian describing the scene",
        description: "funny and witty"
      },
      edgy: {
        tone: "Uses short, dry, clever language that is a little dark. Keep it deadpan, sarcastic, or emotionally detached\u2014but still tied to the image. No fluff, minimal emojis",
        description: "edgy and unconventional"
      }
    };
    const selectedStyle = styleInstructions[style] || styleInstructions.creative;
    const prompt = "Analyze this image for Instagram posting. Generate:\\n\\n1. A " + selectedStyle.description + " caption that:\\n   - Captures the main subject/scene\\n   - " + selectedStyle.tone + "\\n   - Is 1-3 sentences\\n   - Includes relevant emojis\\n   - Feels authentic and natural (NO forced questions or call-to-actions)\\n   - Sounds like something a real person would write\\n   - IMPORTANT: Do NOT include any hashtags in the caption text\\n   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n" + (context2.length > 0 ? "   - Incorporates the provided Lightroom metadata naturally\\n" : "") + "\\n2. 10-15 hashtags that:\\n   - Mix popular (#photography, #instagood) and niche tags\\n   - Are relevant to image content\\n   - Include location-based tags if applicable\\n   - Avoid banned or shadowbanned hashtags\\n   - Range from broad to specific\\n   - These should be completely separate from the caption above\\n" + (context2.length > 0 ? "   - Include relevant hashtags based on the Lightroom metadata provided\\n" : "") + "\\n3. Alt text for accessibility (1-2 sentences):\\n   - Describe what is actually visible in the image\\n   - Include important visual details for screen readers\\n   - Focus on objective description, not interpretation\\n   - Keep it concise but descriptive\\n" + contextString + "\\n\\nFormat your response as:\\nCAPTION: [your caption here - NO hashtags allowed]\\nHASHTAGS: [hashtags separated by spaces]\\nALT_TEXT: [descriptive alt text for accessibility]";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + c2.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/jpeg;base64," + base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });
    if (!response.ok) {
      const errorData = await response.text();
      return c2.json({ error: "OpenAI API request failed: " + response.status }, response.status);
    }
    const data = await response.json();
    const responseContent = data.choices[0].message.content;
    const queryId = generateRandomId();
    await database.logQuery({
      id: queryId,
      source: "lightroom",
      userId: user.id,
      email: user.email,
      processingTimeMs: Date.now() - Date.now(),
      // Simplified
      responseLength: responseContent.length
    });
    await database.incrementDailyUsage(user.id);
    return c2.json({
      success: true,
      content: responseContent,
      metadata: {
        filename,
        title: title2,
        caption,
        keywords,
        rating,
        colorLabel,
        technical: metadata
      }
    });
  } catch (error3) {
    return c2.json({ error: "Internal server error" }, 500);
  }
});
app.post("/api/lightroom/upload-photo", authenticateApiKey, async (c2) => {
  try {
    const user = c2.get("user");
    const {
      base64Image,
      filename,
      title: title2,
      caption,
      keywords,
      rating,
      colorLabel,
      metadata = {}
    } = await c2.req.json();
    if (!base64Image) {
      return c2.json({ error: "Missing image data" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const usageCheck = await database.checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
      return c2.json({
        error: "Daily usage limit exceeded",
        usageInfo: usageCheck
      }, 429);
    }
    const photoId = generateRandomId();
    let r2Key = null;
    let fileSize = null;
    try {
      if (c2.env.R2_BUCKET) {
        const imageBuffer = Buffer.from(base64Image, "base64");
        fileSize = imageBuffer.length;
        const now = /* @__PURE__ */ new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        r2Key = `${user.id}/${year}/${month}/${photoId}.jpg`;
        await c2.env.R2_BUCKET.put(r2Key, imageBuffer, {
          httpMetadata: {
            contentType: "image/jpeg"
          },
          customMetadata: {
            originalFilename: filename,
            userId: user.id.toString(),
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      } else {
        console.warn("No R2 bucket configured, storing metadata only");
        r2Key = "no-r2-bucket/" + photoId;
      }
    } catch (r2Error) {
      console.error("R2 storage failed, continuing with metadata only:", r2Error);
      r2Key = "r2-failed/" + photoId;
    }
    const imageData = {
      id: photoId,
      userId: user.id,
      filename,
      originalFilename: filename,
      title: title2,
      caption,
      keywords,
      rating,
      colorLabel,
      metadata,
      mimeType: "image/jpeg"
    };
    const stored = await database.storeUploadedImage(imageData, r2Key, fileSize);
    if (!stored) {
      return c2.json({ error: "Failed to store image metadata" }, 500);
    }
    await database.logQuery({
      id: photoId,
      source: "lightroom_upload",
      userId: user.id,
      email: user.email,
      processingTimeMs: 0,
      responseLength: JSON.stringify({ filename, title: title2, caption }).length
    });
    await database.incrementDailyUsage(user.id);
    return c2.json({
      success: true,
      id: photoId,
      message: "Photo uploaded and stored successfully",
      filename,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      r2Stored: !!c2.env.R2_BUCKET
    });
  } catch (error3) {
    console.error("Upload error:", error3);
    return c2.json({ error: "Internal server error" }, 500);
  }
});
app.get("/api/uploaded-images", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const page = parseInt(c2.req.query("page")) || 1;
    const limit = parseInt(c2.req.query("limit")) || 20;
    const offset = (page - 1) * limit;
    const images = await database.getUserUploadedImages(user.id, limit, offset);
    return c2.json({
      success: true,
      images,
      page,
      limit
    });
  } catch (error3) {
    console.error("Failed to get uploaded images:", error3);
    return c2.json({ error: "Failed to retrieve images" }, 500);
  }
});
app.get("/api/uploaded-images/:imageId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { imageId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const image = await database.getUploadedImageById(imageId, user.id);
    if (!image) {
      return c2.json({ error: "Image not found" }, 404);
    }
    return c2.json({
      success: true,
      image
    });
  } catch (error3) {
    console.error("Failed to get uploaded image:", error3);
    return c2.json({ error: "Failed to retrieve image" }, 500);
  }
});
app.get("/api/uploaded-images/:imageId/data", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { imageId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const image = await database.getUploadedImageById(imageId, user.id);
    if (!image) {
      return c2.json({ error: "Image not found" }, 404);
    }
    if (image.r2_key && c2.env.R2_BUCKET) {
      console.log("Attempting to fetch from R2:", image.r2_key);
      try {
        const r2Object = await c2.env.R2_BUCKET.get(image.r2_key);
        if (r2Object) {
          console.log("Successfully fetched from R2");
          const headers = new Headers();
          headers.set("Content-Type", image.mime_type || "image/jpeg");
          headers.set("Cache-Control", "public, max-age=31536000");
          return new Response(r2Object.body, {
            headers
          });
        } else {
          console.log("R2 object not found for key:", image.r2_key);
        }
      } catch (r2Error) {
        console.warn("R2 fetch failed, trying fallback:", r2Error);
      }
    } else {
      console.log("Missing R2 data - r2_key:", !!image.r2_key, "R2_BUCKET:", !!c2.env.R2_BUCKET);
    }
    if (image.image_data) {
      try {
        const imageBuffer = Uint8Array.from(atob(image.image_data), (c3) => c3.charCodeAt(0));
        const headers = new Headers();
        headers.set("Content-Type", image.mime_type || "image/jpeg");
        headers.set("Cache-Control", "public, max-age=3600");
        return new Response(imageBuffer, {
          headers
        });
      } catch (decodeError) {
        console.error("Failed to decode base64 image:", decodeError);
      }
    }
    return c2.json({ error: "Image data not available" }, 404);
  } catch (error3) {
    console.error("Failed to get image data:", error3);
    return c2.json({ error: "Failed to retrieve image data" }, 500);
  }
});
app.delete("/api/uploaded-images/:imageId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { imageId } = c2.req.param();
    const database = new D1Database(c2.env.DB);
    const image = await database.getUploadedImageById(imageId, user.id);
    if (!image) {
      return c2.json({ error: "Image not found" }, 404);
    }
    if (image.r2_key && c2.env.R2_BUCKET) {
      try {
        await c2.env.R2_BUCKET.delete(image.r2_key);
        console.log("Deleted from R2:", image.r2_key);
      } catch (r2Error) {
        console.warn("Failed to delete from R2, continuing with database deletion:", r2Error);
      }
    }
    const deleted = await database.deleteUploadedImage(imageId, user.id);
    if (!deleted) {
      return c2.json({ error: "Image could not be deleted from database" }, 500);
    }
    return c2.json({
      success: true,
      message: "Image deleted successfully"
    });
  } catch (error3) {
    console.error("Failed to delete image:", error3);
    return c2.json({ error: "Failed to delete image" }, 500);
  }
});
app.get("/api/download/lightroom-plugin", async (c2) => {
  try {
    if (!c2.env.R2_BUCKET) {
      return c2.json({ error: "Download service not available" }, 503);
    }
    const r2Object = await c2.env.R2_BUCKET.get("downloads/lightroom-plugin.zip");
    if (!r2Object) {
      return c2.json({ error: "Plugin file not found" }, 404);
    }
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", 'attachment; filename="AI Caption Studio Export Plugin.zip"');
    headers.set("Cache-Control", "public, max-age=86400");
    return new Response(r2Object.body, {
      headers
    });
  } catch (error3) {
    console.error("Failed to serve plugin download:", error3);
    return c2.json({ error: "Failed to download plugin" }, 500);
  }
});
app.get("/api/user/settings/social", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const settings = await database.getUserSettings(user.id, "social");
    const socialSettings = {
      mastodon: {},
      pixelfed: {},
      linkedin: {},
      instagram: {}
    };
    settings.forEach((setting) => {
      const [platform2, ...keyParts] = setting.setting_key.split("_");
      const key = keyParts.join("_");
      if (platform2 === "mastodon") {
        socialSettings.mastodon[key] = setting.encrypted ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : setting.setting_value;
      } else if (platform2 === "pixelfed") {
        socialSettings.pixelfed[key] = setting.encrypted ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : setting.setting_value;
      } else if (platform2 === "linkedin") {
        socialSettings.linkedin[key] = setting.encrypted ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : setting.setting_value;
      } else if (platform2 === "instagram") {
        socialSettings.instagram[key] = setting.encrypted ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : setting.setting_value;
      }
    });
    return c2.json(socialSettings);
  } catch (error3) {
    console.error("Social settings error:", error3);
    return c2.json({ error: "Failed to load social settings" }, 500);
  }
});
app.post("/api/user/settings/test-mastodon", authenticateToken, async (c2) => {
  try {
    const { instance, token } = await c2.req.json();
    if (!instance || !token) {
      return c2.json({ error: "Instance URL and token are required" }, 400);
    }
    const testUrl = `${instance}/api/v1/accounts/verify_credentials`;
    const response = await fetch(testUrl, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (response.ok) {
      const userData = await response.json();
      return c2.json({
        success: true,
        message: `Connected as @${userData.username}`
      });
    } else {
      return c2.json({
        success: false,
        error: "Invalid credentials or instance URL"
      });
    }
  } catch (error3) {
    return c2.json({
      success: false,
      error: "Connection test failed: " + error3.message
    });
  }
});
app.post("/api/user/settings/mastodon", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { instance, token } = await c2.req.json();
    if (!instance || !token) {
      return c2.json({ error: "Instance URL and token are required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const instanceResult = await database.setUserSetting(user.id, "social", "mastodon_instance", instance, false);
    const tokenResult = await database.setUserSetting(user.id, "social", "mastodon_token", token, true);
    if (instanceResult && tokenResult) {
      return c2.json({ success: true, message: "Mastodon settings saved" });
    } else {
      return c2.json({ error: "Failed to save one or more settings" }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to save Mastodon settings: " + error3.message }, 500);
  }
});
app.delete("/api/user/settings/mastodon", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    await database.deleteUserSetting(user.id, "social", "mastodon_instance");
    await database.deleteUserSetting(user.id, "social", "mastodon_token");
    return c2.json({ success: true, message: "Mastodon disconnected" });
  } catch (error3) {
    return c2.json({ error: "Failed to disconnect Mastodon" }, 500);
  }
});
app.post("/api/settings/location", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { locationZoom } = await c2.req.json();
    if (!locationZoom || locationZoom < 1 || locationZoom > 18) {
      return c2.json({ error: "Location zoom must be between 1 and 18" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const result = await database.setUserSetting(user.id, "location", "zoom_level", locationZoom.toString(), false);
    if (result) {
      return c2.json({ success: true, message: "Location settings saved" });
    } else {
      return c2.json({ error: "Failed to save location settings" }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to save location settings: " + error3.message }, 500);
  }
});
app.get("/api/settings/mastodon", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const settings = await database.getUserSettings(user.id, "social");
    const mastodonSettings = {};
    settings.forEach((setting) => {
      if (setting.setting_key === "mastodon_instance") {
        mastodonSettings.instance = setting.setting_value;
      } else if (setting.setting_key === "mastodon_token") {
        mastodonSettings.token = setting.encrypted ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : setting.setting_value;
      }
    });
    return c2.json(mastodonSettings);
  } catch (error3) {
    return c2.json({ error: "Failed to load Mastodon settings: " + error3.message }, 500);
  }
});
app.get("/api/settings", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const locationSettings = await database.getUserSettings(user.id, "location");
    const settings = {};
    locationSettings.forEach((setting) => {
      if (setting.setting_key === "zoom_level") {
        settings.locationZoom = parseInt(setting.setting_value) || 18;
      }
    });
    if (!settings.locationZoom) {
      settings.locationZoom = 18;
    }
    return c2.json(settings);
  } catch (error3) {
    return c2.json({ error: "Failed to load settings: " + error3.message }, 500);
  }
});
app.get("/api/custom-prompts", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const prompts = await database.getUserCustomPrompts(user.id);
    return c2.json(prompts);
  } catch (error3) {
    console.error("Failed to get custom prompts:", error3);
    return c2.json({ error: "Failed to load custom prompts" }, 500);
  }
});
app.post("/api/custom-prompts", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { name: name2, description, promptText, icon } = await c2.req.json();
    if (!name2 || !promptText) {
      return c2.json({ error: "Name and prompt text are required" }, 400);
    }
    if (name2.length > 50) {
      return c2.json({ error: "Name must be 50 characters or less" }, 400);
    }
    if (promptText.length > 2e3) {
      return c2.json({ error: "Prompt text must be 2000 characters or less" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const promptId = await database.createCustomPrompt(
      user.id,
      name2,
      description || "",
      promptText,
      icon || "\u2728"
    );
    if (promptId) {
      const newPrompt = await database.getCustomPromptById(promptId, user.id);
      return c2.json(newPrompt);
    } else {
      return c2.json({ error: "Failed to create custom prompt" }, 500);
    }
  } catch (error3) {
    console.error("Failed to create custom prompt:", error3);
    return c2.json({ error: "Failed to create custom prompt" }, 500);
  }
});
app.put("/api/custom-prompts/:promptId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const promptId = parseInt(c2.req.param("promptId"));
    const { name: name2, description, promptText, icon } = await c2.req.json();
    if (!name2 || !promptText) {
      return c2.json({ error: "Name and prompt text are required" }, 400);
    }
    if (name2.length > 50) {
      return c2.json({ error: "Name must be 50 characters or less" }, 400);
    }
    if (promptText.length > 2e3) {
      return c2.json({ error: "Prompt text must be 2000 characters or less" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const success = await database.updateCustomPrompt(
      promptId,
      user.id,
      name2,
      description || "",
      promptText,
      icon || "\u2728"
    );
    if (success) {
      const updatedPrompt = await database.getCustomPromptById(promptId, user.id);
      return c2.json(updatedPrompt);
    } else {
      return c2.json({ error: "Custom prompt not found or permission denied" }, 404);
    }
  } catch (error3) {
    console.error("Failed to update custom prompt:", error3);
    return c2.json({ error: "Failed to update custom prompt" }, 500);
  }
});
app.delete("/api/custom-prompts/:promptId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const promptId = parseInt(c2.req.param("promptId"));
    const database = new D1Database(c2.env.DB);
    const success = await database.deleteCustomPrompt(promptId, user.id);
    if (success) {
      return c2.json({ message: "Custom prompt deleted successfully" });
    } else {
      return c2.json({ error: "Custom prompt not found or permission denied" }, 404);
    }
  } catch (error3) {
    console.error("Failed to delete custom prompt:", error3);
    return c2.json({ error: "Failed to delete custom prompt" }, 500);
  }
});
app.post("/api/user/post/mastodon", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { status, alt_text, image_data } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    if (!status) {
      return c2.json({ error: "Status text is required" }, 400);
    }
    const settings = await database.getUserSettings(user.id, "social");
    let mastodonInstance = null;
    let mastodonToken = null;
    settings.forEach((setting) => {
      if (setting.setting_key === "mastodon_instance") {
        mastodonInstance = setting.setting_value;
      } else if (setting.setting_key === "mastodon_token") {
        mastodonToken = setting.setting_value;
      }
    });
    if (!mastodonInstance || !mastodonToken) {
      return c2.json({ error: "Mastodon account not properly configured" }, 400);
    }
    let mediaId = null;
    if (image_data) {
      try {
        const imageBuffer = Buffer.from(image_data, "base64");
        const mediaFormData = new FormData();
        mediaFormData.append("file", new Blob([imageBuffer], { type: "image/jpeg" }));
        if (alt_text) {
          mediaFormData.append("description", alt_text);
        }
        const mediaResponse = await fetch(`${mastodonInstance}/api/v1/media`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${mastodonToken}`
          },
          body: mediaFormData
        });
        if (mediaResponse.ok) {
          const mediaResult = await mediaResponse.json();
          mediaId = mediaResult.id;
        } else {
        }
      } catch (mediaError) {
      }
    }
    const postData = {
      status,
      visibility: "public"
    };
    if (mediaId) {
      postData.media_ids = [mediaId];
    }
    const postResponse = await fetch(`${mastodonInstance}/api/v1/statuses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mastodonToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });
    if (postResponse.ok) {
      const postResult = await postResponse.json();
      return c2.json({
        success: true,
        message: "Posted to Mastodon successfully!",
        url: postResult.url,
        id: postResult.id
      });
    } else {
      const errorText = await postResponse.text();
      return c2.json({
        error: "Failed to create post on Mastodon: " + postResponse.status
      }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to post to Mastodon: " + error3.message }, 500);
  }
});
app.post("/api/user/settings/test-pixelfed", authenticateToken, async (c2) => {
  try {
    const { instance, token } = await c2.req.json();
    if (!instance || !token) {
      return c2.json({ error: "Instance URL and token are required" }, 400);
    }
    const testUrl = `${instance}/api/v1/accounts/verify_credentials`;
    const response = await fetch(testUrl, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (response.ok) {
      const accountData = await response.json();
      return c2.json({
        success: true,
        username: accountData.username || accountData.display_name,
        account_id: accountData.id
      });
    } else {
      const errorText = await response.text();
      return c2.json({
        error: "Failed to verify credentials: " + response.status
      }, 400);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to test connection: " + error3.message }, 500);
  }
});
app.post("/api/user/settings/pixelfed", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { instance, token } = await c2.req.json();
    if (!instance || !token) {
      return c2.json({ error: "Instance URL and token are required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const testUrl = `${instance}/api/v1/accounts/verify_credentials`;
    const testResponse = await fetch(testUrl, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!testResponse.ok) {
      return c2.json({ error: "Failed to verify Pixelfed credentials" }, 400);
    }
    await database.setUserSetting(user.id, "social", "pixelfed_instance", instance, false);
    await database.setUserSetting(user.id, "social", "pixelfed_token", token, true);
    return c2.json({ success: true });
  } catch (error3) {
    return c2.json({ error: "Failed to save settings: " + error3.message }, 500);
  }
});
app.delete("/api/user/settings/pixelfed", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    await database.deleteUserSetting(user.id, "social", "pixelfed_instance");
    await database.deleteUserSetting(user.id, "social", "pixelfed_token");
    return c2.json({ success: true });
  } catch (error3) {
    return c2.json({ error: "Failed to delete settings: " + error3.message }, 500);
  }
});
app.post("/api/user/post/pixelfed", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { status, alt_text, image_data } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    if (!status) {
      return c2.json({ error: "Status text is required" }, 400);
    }
    const settings = await database.getUserSettings(user.id, "social");
    let pixelfedInstance = null;
    let pixelfedToken = null;
    settings.forEach((setting) => {
      if (setting.setting_key === "pixelfed_instance") {
        pixelfedInstance = setting.setting_value;
      } else if (setting.setting_key === "pixelfed_token") {
        pixelfedToken = setting.setting_value;
      }
    });
    if (!pixelfedInstance || !pixelfedToken) {
      return c2.json({ error: "Pixelfed account not properly configured" }, 400);
    }
    let mediaId = null;
    if (image_data) {
      try {
        const imageBuffer = Buffer.from(image_data, "base64");
        const mediaFormData = new FormData();
        mediaFormData.append("file", new Blob([imageBuffer], { type: "image/jpeg" }));
        if (alt_text) {
          mediaFormData.append("description", alt_text);
        }
        const mediaResponse = await fetch(`${pixelfedInstance}/api/v1/media`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${pixelfedToken}`
          },
          body: mediaFormData
        });
        if (mediaResponse.ok) {
          const mediaResult = await mediaResponse.json();
          mediaId = mediaResult.id;
        } else {
          const errorText = await mediaResponse.text();
          return c2.json({
            error: "Failed to upload image to Pixelfed: " + mediaResponse.status
          }, 500);
        }
      } catch (uploadError) {
        return c2.json({
          error: "Failed to process image upload: " + uploadError.message
        }, 500);
      }
    }
    const postData = {
      status,
      visibility: "public"
    };
    if (mediaId) {
      postData.media_ids = [mediaId];
    }
    const postResponse = await fetch(`${pixelfedInstance}/api/v1/statuses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pixelfedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });
    if (postResponse.ok) {
      const postResult = await postResponse.json();
      return c2.json({
        success: true,
        message: "Posted to Pixelfed successfully!",
        url: postResult.url,
        id: postResult.id
      });
    } else {
      const errorText = await postResponse.text();
      return c2.json({
        error: "Failed to create post on Pixelfed: " + postResponse.status
      }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to post to Pixelfed: " + error3.message }, 500);
  }
});
app.post("/api/user/settings/test-instagram", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    const settings = await database.getUserSettings(user.id, "social");
    let instagramAccessToken = null;
    settings.forEach((setting) => {
      if (setting.setting_key === "instagram_access_token") {
        instagramAccessToken = setting.setting_value;
      }
    });
    if (!instagramAccessToken) {
      return c2.json({ error: "Instagram not connected" }, 400);
    }
    const testUrl = `https://graph.facebook.com/me?access_token=${instagramAccessToken}`;
    const response = await fetch(testUrl);
    if (response.ok) {
      const data = await response.json();
      return c2.json({
        success: true,
        message: "Instagram connection test successful",
        accounts: data.data?.length || 0
      });
    } else {
      return c2.json({
        error: "Failed to verify Instagram credentials: " + response.status
      }, 400);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to test Instagram connection: " + error3.message }, 500);
  }
});
app.post("/api/user/settings/instagram", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { access_token, user_id, username, account_type, autoPost } = await c2.req.json();
    if (!access_token) {
      return c2.json({ error: "Access token is required" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    await database.setUserSetting(user.id, "social", "instagram_access_token", access_token, true);
    await database.setUserSetting(user.id, "social", "instagram_user_id", user_id || "", false);
    await database.setUserSetting(user.id, "social", "instagram_username", username || "", false);
    await database.setUserSetting(user.id, "social", "instagram_account_type", account_type || "business", false);
    await database.setUserSetting(user.id, "social", "instagram_autopost", autoPost ? "true" : "false", false);
    return c2.json({ success: true, message: "Instagram settings saved successfully" });
  } catch (error3) {
    return c2.json({ error: "Failed to save Instagram settings: " + error3.message }, 500);
  }
});
app.delete("/api/user/settings/instagram", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    await database.deleteUserSetting(user.id, "social", "instagram_access_token");
    await database.deleteUserSetting(user.id, "social", "instagram_username");
    await database.deleteUserSetting(user.id, "social", "instagram_account_type");
    await database.deleteUserSetting(user.id, "social", "instagram_autopost");
    return c2.json({ success: true });
  } catch (error3) {
    return c2.json({ error: "Failed to delete Instagram settings: " + error3.message }, 500);
  }
});
app.get("/auth/instagram/callback", async (c2) => {
  try {
    const code = c2.req.query("code");
    const error3 = c2.req.query("error");
    const state = c2.req.query("state");
    if (error3) {
      return c2.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>\u274C Instagram Authorization Failed</h2>
                    <p>Error: ${error3}</p>
                    <p>Description: ${c2.req.query("error_description") || "Unknown error"}</p>
                    <a href="/settings.html" style="color: #405de6;">\u2190 Back to Settings</a>
                </div>
            `);
    }
    if (!code) {
      return c2.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>\u274C Missing Authorization Code</h2>
                    <p>No authorization code received from Instagram.</p>
                    <a href="/settings.html" style="color: #405de6;">\u2190 Back to Settings</a>
                </div>
            `);
    }
    if (c2.env.INSTAGRAM_APP_SECRET) {
      try {
        console.log("Attempting Instagram token exchange with code:", code.substring(0, 10) + "...");
        const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            client_id: "1430176351425887",
            client_secret: c2.env.INSTAGRAM_APP_SECRET,
            redirect_uri: "https://ai-caption-studio.jonsson.workers.dev/auth/instagram/callback",
            code,
            grant_type: "authorization_code"
          })
        });
        console.log("Token exchange response status:", tokenResponse.status);
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          console.log("Token exchange successful");
          const accessToken = tokenData.access_token;
          const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
          let instagramBusinessAccountId = null;
          let instagramUsername = "Unknown";
          let instagramAccountType = "Business";
          if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            console.log("Connected accounts retrieved successfully");
            for (const page of pagesData.data || []) {
              try {
                const igAccountResponse = await fetch(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
                if (igAccountResponse.ok) {
                  const igAccountData = await igAccountResponse.json();
                  if (igAccountData.instagram_business_account) {
                    instagramBusinessAccountId = igAccountData.instagram_business_account.id;
                    const igDetailsResponse = await fetch(`https://graph.facebook.com/${instagramBusinessAccountId}?fields=username,account_type&access_token=${accessToken}`);
                    if (igDetailsResponse.ok) {
                      const igDetailsData = await igDetailsResponse.json();
                      instagramUsername = igDetailsData.username || "Unknown";
                      instagramAccountType = igDetailsData.account_type || "Business";
                    }
                    break;
                  }
                }
              } catch (e2) {
                console.log("Failed to check Instagram account for page:", page.id);
              }
            }
          }
          if (!instagramBusinessAccountId) {
            const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              instagramBusinessAccountId = userData.id;
              instagramUsername = userData.username || "Unknown";
              instagramAccountType = userData.account_type || "Business";
              console.log("Using personal Instagram account ID as fallback");
            }
          }
          if (instagramBusinessAccountId) {
            console.log("Instagram Business Account ID found:", instagramBusinessAccountId);
            const database = new D1Database(c2.env.DB);
            const state2 = c2.req.query("state");
            let userId = null;
            if (state2 && state2.includes("_")) {
              userId = parseInt(state2.split("_")[0]);
            }
            if (!userId) {
              const userQuery = await database.db.prepare("SELECT id FROM users ORDER BY created_at DESC LIMIT 1").first();
              if (userQuery) {
                userId = userQuery.id;
              }
            }
            if (userId) {
              try {
                await database.setUserSetting(userId, "social", "instagram_access_token", accessToken, true);
                await database.setUserSetting(userId, "social", "instagram_account_id", instagramBusinessAccountId, false);
                await database.setUserSetting(userId, "social", "instagram_username", instagramUsername, false);
                await database.setUserSetting(userId, "social", "instagram_account_type", instagramAccountType, false);
              } catch (saveError) {
                console.error("\u274C Error saving Instagram settings:", saveError);
                throw saveError;
              }
            }
            return c2.html(`
                            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                                <h2>\u2705 Instagram Connected Successfully!</h2>
                                <p>Your Instagram business account @${instagramUsername} is now connected.</p>
                                <p>Account Type: ${instagramAccountType}</p>
                                <p>Business Account ID: ${instagramBusinessAccountId}</p>
                                <p>Redirecting you back to settings...</p>
                                
                                <script>
                                    setTimeout(() => {
                                        window.location.href = '/settings.html';
                                    }, 2000);
                                <\/script>
                            </div>
                        `);
          } else {
            return c2.html(`
                            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                                <h2>\u26A0\uFE0F Instagram Business Account Not Found</h2>
                                <p>Could not find an Instagram Business Account connected to your account.</p>
                                <p>Please ensure your Instagram account is:</p>
                                <ul style="text-align: left; max-width: 400px; margin: 20px auto;">
                                    <li>Set to Business or Creator account type</li>
                                    <li>Connected to a Facebook page</li>
                                    <li>Properly configured for business use</li>
                                </ul>
                                <a href="/settings.html" style="color: #405de6;">\u2190 Back to Settings</a>
                            </div>
                        `);
          }
        } else {
          const errorData = await tokenResponse.text();
          console.error("Token exchange failed:", tokenResponse.status, errorData);
          return c2.html(`
                        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                            <h2>\u274C Instagram Token Exchange Failed</h2>
                            <p>Failed to exchange authorization code for access token.</p>
                            <p>Status: ${tokenResponse.status}</p>
                            <p>Error: ${errorData}</p>
                            <a href="/settings.html">\u2190 Back to Settings</a>
                        </div>
                    `);
        }
      } catch (error4) {
        console.error("Token exchange error:", error4);
        return c2.html(`
                    <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                        <h2>\u274C Instagram Token Exchange Error</h2>
                        <p>An error occurred during token exchange.</p>
                        <p>Error: ${error4.message}</p>
                        <a href="/settings.html">\u2190 Back to Settings</a>
                    </div>
                `);
      }
    } else {
      return c2.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>\u26A0\uFE0F Configuration Missing</h2>
                    <p>INSTAGRAM_APP_SECRET not configured in environment.</p>
                    <a href="/settings.html">\u2190 Back to Settings</a>
                </div>
            `);
    }
    return c2.html(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>\u2705 Instagram Authorization Successful</h2>
                <p>Your Instagram business account has been authorized!</p>
                <p>Redirecting you back to settings...</p>
                
                <div style="margin: 20px 0;">
                    <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #405de6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
                
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                
                <script>
                    // Store the authorization code for backend processing
                    localStorage.setItem('instagram_auth_code', '${code}');
                    
                    // Redirect to settings page
                    setTimeout(() => {
                        window.location.href = '/settings.html';
                    }, 2000);
                <\/script>
            </div>
        `);
  } catch (error3) {
    return c2.html(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>\u274C OAuth Callback Error</h2>
                <p>An error occurred while processing the Instagram authorization.</p>
                <a href="/settings.html" style="color: #405de6;">\u2190 Back to Settings</a>
            </div>
        `);
  }
});
app.post("/api/user/post/instagram", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { caption, image_data, imageId } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    if (!caption) {
      return c2.json({ error: "Caption is required" }, 400);
    }
    if (!image_data && !imageId) {
      return c2.json({ error: "Either image data or image ID is required for Instagram posts" }, 400);
    }
    const settings = await database.getUserSettings(user.id, "social");
    let instagramAccessToken = null;
    let instagramAccountId = null;
    settings.forEach((setting) => {
      if (setting.setting_key === "instagram_access_token") {
        instagramAccessToken = setting.setting_value;
      } else if (setting.setting_key === "instagram_account_id") {
        instagramAccountId = setting.setting_value;
      }
    });
    if (!instagramAccessToken) {
      return c2.json({ error: "Instagram account not properly configured" }, 400);
    }
    let imageBuffer;
    let contentType = "image/jpeg";
    if (imageId) {
      const image = await database.getUploadedImageById(imageId, user.id);
      if (!image) {
        return c2.json({ error: "Image not found" }, 404);
      }
      if (!image.r2_key) {
        return c2.json({ error: "Image not available in storage" }, 400);
      }
      const r2Object = await c2.env.R2_BUCKET.get(image.r2_key);
      if (!r2Object) {
        return c2.json({ error: "Image file not found in storage" }, 404);
      }
      imageBuffer = await r2Object.arrayBuffer();
      contentType = image.mime_type || "image/jpeg";
    } else {
      imageBuffer = Buffer.from(image_data, "base64");
    }
    const imageKey = `instagram-posts/${Date.now()}-${user.id}.jpg`;
    try {
      await c2.env.R2_BUCKET.put(imageKey, imageBuffer, {
        httpMetadata: {
          contentType
        }
      });
      const publicImageUrl = `https://ai-caption-studio.jonsson.workers.dev/public-image/${imageKey}`;
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      const containerResponse = await fetch(`https://graph.instagram.com/${instagramAccountId}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_url: publicImageUrl,
          caption,
          access_token: instagramAccessToken
        })
      });
      if (!containerResponse.ok) {
        const errorData = await containerResponse.json();
        return c2.json({
          success: false,
          error: "Failed to create Instagram media container: " + (errorData.error?.message || JSON.stringify(errorData))
        }, 500);
      }
      const containerData = await containerResponse.json();
      const containerId = containerData.id;
      const publishResponse = await fetch(`https://graph.instagram.com/${instagramAccountId}/media_publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: instagramAccessToken
        })
      });
      if (publishResponse.ok) {
        const publishData = await publishResponse.json();
        await c2.env.R2_BUCKET.delete(imageKey);
        return c2.json({
          success: true,
          message: "Posted to Instagram successfully!",
          id: publishData.id
        });
      } else {
        const errorData = await publishResponse.json();
        return c2.json({
          success: false,
          error: "Failed to publish Instagram post: " + (errorData.error?.message || publishResponse.status)
        }, 500);
      }
    } catch (uploadError) {
      return c2.json({
        success: false,
        error: "Failed to upload image: " + uploadError.message
      }, 500);
    }
  } catch (error3) {
    return c2.json({ error: "Failed to post to Instagram: " + error3.message }, 500);
  }
});
app.get("/public-image/*", async (c2) => {
  try {
    const fullPath = c2.req.path;
    const imageKey = fullPath.replace("/public-image/", "");
    const userAgent = c2.req.header("User-Agent");
    if (!c2.env.R2_BUCKET) {
      console.error("R2 bucket not configured");
      return c2.text("R2 bucket not configured", 500);
    }
    const r2Object = await c2.env.R2_BUCKET.get(imageKey);
    if (!r2Object) {
      console.error("Image not found in R2:", imageKey);
      return c2.text("Image not found", 404);
    }
    const headers = new Headers();
    headers.set("Content-Type", r2Object.httpMetadata?.contentType || "image/jpeg");
    headers.set("Content-Length", r2Object.size.toString());
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(r2Object.body, { headers });
  } catch (error3) {
    console.error("Error serving public image:", error3);
    return c2.text("Error serving image", 500);
  }
});
app.get("/webhook/instagram", async (c2) => {
  const mode = c2.req.query("hub.mode");
  const token = c2.req.query("hub.verify_token");
  const challenge = c2.req.query("hub.challenge");
  const VERIFY_TOKEN = "your_instagram_webhook_verify_token_123";
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Instagram webhook verified");
    return c2.text(challenge);
  } else {
    console.log("Instagram webhook verification failed");
    return c2.text("Verification failed", 403);
  }
});
app.post("/webhook/instagram", async (c2) => {
  try {
    const body = await c2.req.json();
    console.log("Instagram webhook received:", JSON.stringify(body, null, 2));
    return c2.json({ status: "received" });
  } catch (error3) {
    console.error("Instagram webhook error:", error3);
    return c2.json({ error: "Webhook processing failed" }, 500);
  }
});
app.post("/api/user/settings/test-linkedin", authenticateToken, async (c2) => {
  try {
    const { token } = await c2.req.json();
    if (!token) {
      return c2.json({ error: "Token is required" }, 400);
    }
    const testUrl = "https://api.linkedin.com/v2/me";
    const response = await fetch(testUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0"
      }
    });
    if (response.ok) {
      const userData = await response.json();
      return c2.json({
        success: true,
        message: `Connected as ${userData.firstName && userData.firstName.localized && userData.firstName.localized.en_US || ""} ${userData.lastName && userData.lastName.localized && userData.lastName.localized.en_US || ""}`
      });
    } else {
      return c2.json({
        success: false,
        error: "Invalid LinkedIn access token"
      });
    }
  } catch (error3) {
    return c2.json({
      success: false,
      error: "Connection test failed: " + error3.message
    });
  }
});
app.post("/api/user/settings/linkedin", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { token, autoPost } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    await database.setUserSetting(user.id, "social", "linkedin_token", token, true);
    await database.setUserSetting(user.id, "social", "linkedin_autopost", autoPost ? "true" : "false", false);
    return c2.json({ success: true, message: "LinkedIn settings saved" });
  } catch (error3) {
    return c2.json({ error: "Failed to save LinkedIn settings" }, 500);
  }
});
app.delete("/api/user/settings/linkedin", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const database = new D1Database(c2.env.DB);
    await database.deleteUserSetting(user.id, "social", "linkedin_token");
    await database.deleteUserSetting(user.id, "social", "linkedin_autopost");
    return c2.json({ success: true, message: "LinkedIn disconnected" });
  } catch (error3) {
    return c2.json({ error: "Failed to disconnect LinkedIn" }, 500);
  }
});
async function buildPromptFromImageWithExtraction(base64Image, includeWeather = false, style = "creative", env2 = null, zoomLevel = 18, hashtagCount = 15) {
  if (!base64Image) {
    throw new Error("No image data provided");
  }
  const context2 = [];
  const extractedData = {
    exifData: null,
    cameraMake: null,
    cameraModel: null,
    gpsLatitude: null,
    gpsLongitude: null,
    locationName: null,
    weatherData: null,
    photoDateTime: null,
    dateTimeSource: null
  };
  try {
    const imageBuffer = Buffer.from(base64Image, "base64");
    const imageHeader = imageBuffer.slice(0, 10);
    const isJPEG = imageHeader[0] === 255 && imageHeader[1] === 216;
    const hasEXIFMarker = imageBuffer.includes(Buffer.from([255, 225]));
    let exifData = await full_esm_default.parse(imageBuffer, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: true,
      pick: [
        "Make",
        "Model",
        "GPSLatitude",
        "GPSLongitude",
        "GPSLatitudeRef",
        "GPSLongitudeRef",
        "DateTimeOriginal",
        "DateTime",
        "DateTimeDigitized"
      ]
    });
    if (exifData && !exifData.DateTimeOriginal && !exifData.DateTime && !exifData.DateTimeDigitized) {
      const fullExifData = await full_esm_default.parse(imageBuffer, true);
      if (fullExifData) {
        const dateKeys = Object.keys(fullExifData).filter(
          (key) => key.toLowerCase().includes("date") || key.toLowerCase().includes("time")
        );
        exifData = { ...exifData, ...fullExifData };
      }
    }
    if (exifData) {
      extractedData.exifData = exifData;
      const dateFields = ["DateTimeOriginal", "DateTimeDigitized", "DateTime"];
      for (const field of dateFields) {
        if (exifData[field]) {
          try {
            let dateStr = exifData[field];
            let parsedDate;
            if (typeof dateStr === "string") {
              dateStr = dateStr.replace(/:/g, "-").replace(/ /, "T");
              parsedDate = new Date(dateStr);
            } else if (dateStr instanceof Date) {
              parsedDate = dateStr;
            }
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              extractedData.photoDateTime = parsedDate.toISOString();
              extractedData.dateTimeSource = field;
              context2.push("Photo taken: " + parsedDate.toLocaleDateString() + " " + parsedDate.toLocaleTimeString());
              break;
            }
          } catch (error3) {
          }
        }
      }
      if (exifData.Make || exifData.Model) {
        const camera = (exifData.Make || "") + " " + (exifData.Model || "");
        if (camera.trim()) {
          context2.push("Camera/Gear: " + camera.trim());
          extractedData.cameraMake = exifData.Make;
          extractedData.cameraModel = exifData.Model;
        }
      }
      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        try {
          const lat = convertDMSToDD(exifData.GPSLatitude, exifData.GPSLatitudeRef);
          const lon = convertDMSToDD(exifData.GPSLongitude, exifData.GPSLongitudeRef);
          extractedData.gpsLatitude = lat;
          extractedData.gpsLongitude = lon;
          if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
            const location = await reverseGeocode(lat, lon, zoomLevel);
            if (location) {
              context2.push("Location: " + location);
              extractedData.locationName = location;
            }
            if (includeWeather && env2) {
              const weatherData = await getHistoricalWeather(lat, lon, exifData, env2);
              if (weatherData) {
                context2.push("Weather: " + weatherData);
                extractedData.weatherData = weatherData;
              }
            }
          }
        } catch (e2) {
        }
      }
    }
  } catch (error3) {
  }
  const contextString = context2.length > 0 ? "\\n\\nAdditional Context:\\n" + context2.join("\\n") : "";
  const styleInstructions = {
    creative: {
      tone: "Uses artistic and expressive language with creative metaphors",
      description: "creative and artistic"
    },
    professional: {
      tone: "Uses clean, professional language suitable for business contexts",
      description: "professional and business-friendly"
    },
    casual: {
      tone: "Uses relaxed, conversational language like talking to a friend",
      description: "casual and friendly"
    },
    trendy: {
      tone: "Uses current trends, viral language, and popular internet expressions",
      description: "trendy and viral"
    },
    inspirational: {
      tone: "Uses motivational, uplifting, and encouraging language",
      description: "inspirational and motivational"
    },
    humorous: {
      tone: "Uses funny, witty language with clever wordplay, puns, or amusing observations. Keep it light-hearted and entertaining while being appropriate for social media. Think like a comedian describing the scene",
      description: "funny and witty"
    },
    edgy: {
      tone: "Uses short, dry, clever language that is a little dark. Keep it deadpan, sarcastic, or emotionally detached\u2014but still tied to the image. No fluff, minimal emojis",
      description: "edgy and unconventional"
    }
  };
  const selectedStyle = styleInstructions[style] || styleInstructions.creative;
  const prompt = "Analyze this image for Instagram posting. Generate:\\n\\n1. A " + selectedStyle.description + " caption that:\\n   - Captures the main subject/scene\\n   - " + selectedStyle.tone + "\\n   - Is 1-3 sentences\\n   - Includes relevant emojis\\n   - Feels authentic and natural (NO forced questions or call-to-actions)\\n   - Sounds like something a real person would write\\n   - IMPORTANT: Do NOT include any hashtags in the caption text\\n   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n" + (context2.length > 0 ? "   - Incorporates the provided context naturally\\n" : "") + "\\n2. MANDATORY: Generate EXACTLY " + hashtagCount + " hashtags - COUNT TO " + hashtagCount + ":\\n   - YOU MUST PROVIDE EXACTLY " + hashtagCount + " HASHTAGS - NO EXCEPTIONS\\n   - COUNT: 1, 2, 3... up to " + hashtagCount + " - DO NOT STOP BEFORE " + hashtagCount + "\\n   - VERIFY: Your hashtag count must equal " + hashtagCount + " exactly\\n   - Mix popular (#photography, #instagood) and niche tags\\n   - Are relevant to image content\\n   - Include location-based tags if applicable\\n   - Avoid banned or shadowbanned hashtags\\n   - Range from broad to specific\\n   - Format as #hashtag (with # symbol)\\n   - These should be completely separate from the caption above\\n" + (context2.length > 0 ? "   - Include relevant hashtags based on the context provided\\n" : "") + "\\n3. Alt text for accessibility (1-2 sentences):\\n   - Describe what is actually visible in the image\\n   - Include important visual details for screen readers\\n   - Focus on objective description, not interpretation\\n   - Keep it concise but descriptive\\n" + contextString + "\\n\\nFormat your response as:\\nCAPTION: [your caption here - NO hashtags allowed]\\nHASHTAGS: [hashtags separated by spaces - each starting with #]\\nALT_TEXT: [descriptive alt text for accessibility]";
  return { prompt, extractedData };
}
__name(buildPromptFromImageWithExtraction, "buildPromptFromImageWithExtraction");
async function buildEnhancedPromptWithUserContext(base64Image, includeWeather, style, extractedData, userContext, env2, userId = null, hashtagCount = 15) {
  const context2 = [];
  if (extractedData.photoDateTime) {
    const photoDate = new Date(extractedData.photoDateTime);
    context2.push("Photo taken: " + photoDate.toLocaleDateString() + " " + photoDate.toLocaleTimeString());
  }
  if (extractedData.cameraMake || extractedData.cameraModel) {
    const camera = (extractedData.cameraMake || "") + " " + (extractedData.cameraModel || "");
    if (camera.trim()) {
      context2.push("Camera/Gear: " + camera.trim());
    }
  }
  if (extractedData.locationName) {
    context2.push("Location: " + extractedData.locationName);
  }
  if (extractedData.weatherData) {
    context2.push("Weather: " + extractedData.weatherData);
  }
  context2.push(...userContext);
  const contextString = context2.length > 0 ? "\\n\\nAdditional Context:\\n" + context2.join("\\n") : "";
  if (style && style.startsWith("custom_")) {
    const promptId = parseInt(style.replace("custom_", ""));
    if (userId && env2 && env2.DB) {
      try {
        const db = new D1Database(env2.DB);
        const customPrompt = await db.getCustomPromptById(promptId, userId);
        if (customPrompt && customPrompt.is_active) {
          let promptText = customPrompt.prompt_text;
          const variables = {
            image_description: "the uploaded image",
            context: context2.join("\\n") || "No additional context provided",
            camera: (extractedData.cameraMake || "") + " " + (extractedData.cameraModel || "") || "No camera information available",
            location: extractedData.locationName || "No location information available",
            weather: extractedData.weatherData || "No weather data available",
            style: customPrompt.name.toLowerCase()
          };
          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\\\{${key}\\\\}`, "g");
            promptText = promptText.replace(regex, value);
          });
          promptText += contextString;
          if (!promptText.includes("CAPTION:") || !promptText.includes("HASHTAGS:") || !promptText.includes("ALT_TEXT:")) {
            promptText += "\\n\\nIMPORTANT: Format your response EXACTLY as shown below (use these English labels even if writing in another language):\\nCAPTION: [your caption here - NO hashtags allowed]\\nHASHTAGS: [hashtags separated by spaces]\\nALT_TEXT: [descriptive alt text for accessibility]";
          }
          promptText += "\\n\\nMANDATORY SYSTEM REQUIREMENT - Hashtag Count:\\n- YOU MUST GENERATE EXACTLY " + hashtagCount + " HASHTAGS - NO EXCEPTIONS\\n- COUNT TO " + hashtagCount + " - DO NOT STOP UNTIL YOU REACH " + hashtagCount + " HASHTAGS\\n- THIS IS CRITICAL: EXACTLY " + hashtagCount + " hashtags, not " + (hashtagCount - 1) + ", not " + (hashtagCount + 1) + ", but EXACTLY " + hashtagCount + "\\n- Format as #hashtag (with # symbol)\\n- Separate hashtags with spaces\\n- Place ALL hashtags in the HASHTAGS section only\\n- CRITICAL: Each hashtag MUST start with # symbol\\n- VERIFY: Count your hashtags before responding - you need EXACTLY " + hashtagCount + "\\n- This requirement overrides any other hashtag instructions in the user prompt above";
          return { prompt: promptText };
        }
      } catch (error3) {
        console.error("Error loading custom prompt:", error3);
      }
    }
  }
  const styleInstructions = {
    creative: {
      tone: "Uses artistic and expressive language with creative metaphors",
      description: "creative and artistic"
    },
    professional: {
      tone: "Uses clean, professional language suitable for business contexts",
      description: "professional and business-friendly"
    },
    casual: {
      tone: "Uses relaxed, conversational language like talking to a friend",
      description: "casual and friendly"
    },
    trendy: {
      tone: "Uses current trends, viral language, and popular internet expressions",
      description: "trendy and viral"
    },
    inspirational: {
      tone: "Uses motivational, uplifting, and encouraging language",
      description: "inspirational and motivational"
    },
    humorous: {
      tone: "Uses funny, witty language with clever wordplay, puns, or amusing observations. Keep it light-hearted and entertaining while being appropriate for social media. Think like a comedian describing the scene",
      description: "funny and witty"
    },
    edgy: {
      tone: "Uses short, dry, clever language that is a little dark. Keep it deadpan, sarcastic, or emotionally detached\u2014but still tied to the image. No fluff, minimal emojis",
      description: "edgy and unconventional"
    }
  };
  const selectedStyle = styleInstructions[style] || styleInstructions.creative;
  const prompt = "Analyze this image for Instagram posting. Generate:\\n\\n1. A " + selectedStyle.description + " caption that:\\n   - Captures the main subject/scene\\n   - " + selectedStyle.tone + "\\n   - Is 1-3 sentences\\n   - Includes relevant emojis\\n   - Feels authentic and natural (NO forced questions or call-to-actions)\\n   - Sounds like something a real person would write\\n   - IMPORTANT: Do NOT include any hashtags in the caption text\\n   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n" + (context2.length > 0 ? "   - Incorporates the provided context naturally\\n" : "") + "\\n2. MANDATORY: Generate EXACTLY " + hashtagCount + " hashtags - COUNT TO " + hashtagCount + ":\\n   - YOU MUST PROVIDE EXACTLY " + hashtagCount + " HASHTAGS - NO EXCEPTIONS\\n   - COUNT: 1, 2, 3... up to " + hashtagCount + " - DO NOT STOP BEFORE " + hashtagCount + "\\n   - VERIFY: Your hashtag count must equal " + hashtagCount + " exactly\\n   - Mix popular (#photography, #instagood) and niche tags\\n   - Are relevant to image content\\n   - Include location-based tags if applicable\\n   - Avoid banned or shadowbanned hashtags\\n   - Range from broad to specific\\n   - Format as #hashtag (with # symbol)\\n   - These should be completely separate from the caption above\\n" + (context2.length > 0 ? "   - Include relevant hashtags based on the context provided\\n" : "") + "\\n3. Alt text for accessibility (1-2 sentences):\\n   - Describe what is actually visible in the image\\n   - Include important visual details for screen readers\\n   - Focus on objective description, not interpretation\\n   - Keep it concise but descriptive\\n" + contextString + "\\n\\nFormat your response as:\\nCAPTION: [your caption here - NO hashtags allowed]\\nHASHTAGS: [hashtags separated by spaces - each starting with #]\\nALT_TEXT: [descriptive alt text for accessibility]";
  return { prompt };
}
__name(buildEnhancedPromptWithUserContext, "buildEnhancedPromptWithUserContext");
function convertDMSToDD(dmsArray, ref) {
  if (Array.isArray(dmsArray) && dmsArray.length === 3) {
    let dd = dmsArray[0] + dmsArray[1] / 60 + dmsArray[2] / 3600;
    if (ref === "S" || ref === "W") {
      dd = dd * -1;
    }
    return dd;
  }
  return dmsArray;
}
__name(convertDMSToDD, "convertDMSToDD");
async function reverseGeocode(latitude, longitude, zoomLevel = 18) {
  try {
    const response = await fetch(
      "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + latitude + "&lon=" + longitude + "&zoom=" + zoomLevel + "&addressdetails=1",
      {
        headers: {
          "User-Agent": "AI Caption Studio"
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const parts = [];
        if (data.address.house_number && data.address.road) {
          parts.push(data.address.house_number + " " + data.address.road);
        } else if (data.address.road) {
          parts.push(data.address.road);
        }
        if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
        else if (data.address.suburb) parts.push(data.address.suburb);
        else if (data.address.quarter) parts.push(data.address.quarter);
        else if (data.address.district) parts.push(data.address.district);
        if (data.address.city) parts.push(data.address.city);
        else if (data.address.town) parts.push(data.address.town);
        else if (data.address.village) parts.push(data.address.village);
        else if (data.address.municipality) parts.push(data.address.municipality);
        if (data.address.state) parts.push(data.address.state);
        else if (data.address.province) parts.push(data.address.province);
        if (data.address.country) parts.push(data.address.country);
        return parts.join(", ") || data.display_name;
      }
    }
  } catch (error3) {
  }
  return null;
}
__name(reverseGeocode, "reverseGeocode");
async function getHistoricalWeather(latitude, longitude, exifData, env2) {
  try {
    if (!env2.OPENWEATHER_API_KEY) {
      return null;
    }
    let photoTimestamp = Date.now();
    let dateSource = "current_time";
    const dateFields = ["DateTimeOriginal", "DateTimeDigitized", "DateTime"];
    for (const field of dateFields) {
      if (exifData && exifData[field]) {
        try {
          let dateStr = exifData[field];
          let parsedDate;
          if (typeof dateStr === "string") {
            dateStr = dateStr.replace(/:/g, "-").replace(/ /, "T");
            parsedDate = new Date(dateStr);
          } else if (dateStr instanceof Date) {
            parsedDate = dateStr;
          }
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            photoTimestamp = parsedDate.getTime();
            dateSource = field;
            break;
          }
        } catch (dateError) {
        }
      }
    }
    const now = Date.now();
    const year2000 = (/* @__PURE__ */ new Date("2000-01-01")).getTime();
    let useCurrentWeather = false;
    if (photoTimestamp > now || photoTimestamp < year2000) {
      useCurrentWeather = true;
      dateSource = "current_time_fallback";
    }
    const unixTimestamp = Math.floor(photoTimestamp / 1e3);
    let weatherUrl;
    let apiDescription;
    if (useCurrentWeather) {
      weatherUrl = "https://api.openweathermap.org/data/2.5/weather?lat=" + latitude + "&lon=" + longitude + "&appid=" + env2.OPENWEATHER_API_KEY + "&units=metric";
      apiDescription = "current (invalid date detected)";
    } else {
      const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1e3;
      if (photoTimestamp > fiveDaysAgo) {
        weatherUrl = "https://api.openweathermap.org/data/2.5/weather?lat=" + latitude + "&lon=" + longitude + "&appid=" + env2.OPENWEATHER_API_KEY + "&units=metric";
        apiDescription = "current";
      } else {
        weatherUrl = "https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=" + latitude + "&lon=" + longitude + "&dt=" + unixTimestamp + "&appid=" + env2.OPENWEATHER_API_KEY + "&units=metric";
        apiDescription = "historical";
      }
    }
    const response = await fetch(weatherUrl, {
      headers: {
        "User-Agent": "AI Caption Studio"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      if (apiDescription === "historical") {
        const fallbackUrl = "https://api.openweathermap.org/data/2.5/weather?lat=" + latitude + "&lon=" + longitude + "&appid=" + env2.OPENWEATHER_API_KEY + "&units=metric";
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.main) {
            const weatherText = Math.round(fallbackData.main.temp) + "\xB0C, " + fallbackData.weather[0].description + (fallbackData.main.humidity ? ", " + fallbackData.main.humidity + "% humidity" : "") + (fallbackData.wind ? ", " + Math.round(fallbackData.wind.speed * 3.6) + " km/h wind" : "") + " (current weather - historical not available)";
            return weatherText;
          }
        }
      }
      return null;
    }
    const data = await response.json();
    let weatherInfo;
    if (apiDescription === "current") {
      if (data.main) {
        weatherInfo = {
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: data.wind ? Math.round(data.wind.speed * 3.6) : null
          // Convert m/s to km/h
        };
      }
    } else {
      if (data.data && data.data.length > 0) {
        const weather = data.data[0];
        weatherInfo = {
          temperature: Math.round(weather.temp),
          description: weather.weather[0].description,
          humidity: weather.humidity,
          windSpeed: Math.round(weather.wind_speed * 3.6)
          // Convert m/s to km/h
        };
      }
    }
    if (weatherInfo) {
      let weatherText = weatherInfo.temperature + "\xB0C, " + weatherInfo.description + (weatherInfo.humidity ? ", " + weatherInfo.humidity + "% humidity" : "") + (weatherInfo.windSpeed ? ", " + weatherInfo.windSpeed + " km/h wind" : "");
      if (useCurrentWeather) {
        weatherText += " (current weather - photo date appears invalid)";
      }
      return weatherText;
    }
  } catch (error3) {
  }
  return null;
}
__name(getHistoricalWeather, "getHistoricalWeather");
async function getConnectedSocialAccounts(database, userId) {
  try {
    const settings = await database.getUserSettings(userId, "social");
    const connected2 = {
      mastodon: null,
      pixelfed: null,
      linkedin: null,
      instagram: null
    };
    settings.forEach((setting) => {
      const [platform2, key] = setting.setting_key.split("_");
      if (platform2 === "mastodon" && key === "instance") {
        connected2.mastodon = { instance: setting.setting_value };
      } else if (platform2 === "pixelfed" && key === "instance") {
        connected2.pixelfed = { instance: setting.setting_value };
      } else if (platform2 === "linkedin" && key === "token" && setting.setting_value) {
        connected2.linkedin = { connected: true };
      } else if (platform2 === "instagram" && key === "access" && setting.setting_value) {
        connected2.instagram = { connected: true };
      }
    });
    return connected2;
  } catch (error3) {
    return { mastodon: null, pixelfed: null, linkedin: null, instagram: null };
  }
}
__name(getConnectedSocialAccounts, "getConnectedSocialAccounts");
app.post("/api/generate-caption", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { prompt, base64Image, style = "creative", includeWeather = false, context: context2 = {}, filename = "web-upload.jpg" } = await c2.req.json();
    if (!c2.env.OPENAI_API_KEY) {
      return c2.json({ error: "OpenAI API key not configured" }, 500);
    }
    if (!base64Image) {
      return c2.json({ error: "Missing image data" }, 400);
    }
    const database = new D1Database(c2.env.DB);
    const usageCheck = await database.checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
      return c2.json({
        error: "Daily usage limit exceeded",
        usageInfo: usageCheck
      }, 429);
    }
    let finalPrompt;
    let extractedData = null;
    try {
      const shouldIncludeWeather = context2.includeWeather !== void 0 ? context2.includeWeather : true;
      const locationSettings = await database.getUserSettings(user.id, "location");
      const generalSettings = await database.getUserSettings(user.id, "general");
      let userZoomLevel = 18;
      locationSettings.forEach((setting) => {
        if (setting.setting_key === "zoom_level") {
          userZoomLevel = parseInt(setting.setting_value) || 18;
        }
      });
      let hashtagCount = 15;
      generalSettings.forEach((setting) => {
        if (setting.setting_key === "hashtag_count") {
          hashtagCount = parseInt(setting.setting_value) || 15;
        }
      });
      const result = await buildPromptFromImageWithExtraction(base64Image, shouldIncludeWeather, style, c2.env, userZoomLevel, hashtagCount);
      finalPrompt = result.prompt;
      extractedData = result.extractedData;
      if (context2.camera) extractedData.cameraMake = context2.camera.split(" ")[0] || null;
      if (context2.camera) extractedData.cameraModel = context2.camera.split(" ").slice(1).join(" ") || null;
      if (context2.location) extractedData.locationName = context2.location;
      const userContext = [];
      if (context2.event) userContext.push("Event/Occasion: " + context2.event);
      if (context2.mood) userContext.push("Mood/Vibe: " + context2.mood);
      if (context2.subject) userContext.push("Subject/Focus: " + context2.subject);
      if (context2.custom) userContext.push("Additional notes: " + context2.custom);
      if (context2.customPrompt) userContext.push("Custom instructions: " + context2.customPrompt);
      if (userContext.length > 0 || context2.camera || context2.location || style && style.startsWith("custom_")) {
        const enhancedResult = await buildEnhancedPromptWithUserContext(
          base64Image,
          shouldIncludeWeather,
          style,
          extractedData,
          userContext,
          c2.env,
          user.id,
          hashtagCount
        );
        finalPrompt = enhancedResult.prompt;
      }
      if (prompt && prompt.trim() !== "") {
      }
    } catch (extractionError) {
      const styleInstructions = {
        creative: "creative and artistic",
        professional: "professional and business-friendly",
        casual: "casual and friendly",
        trendy: "trendy and viral",
        inspirational: "inspirational and motivational",
        edgy: "edgy and unconventional"
      };
      const selectedStyle = styleInstructions[style] || styleInstructions.creative;
      finalPrompt = prompt || "Analyze this image for Instagram posting. Generate:\\n\\n1. A " + selectedStyle + " caption that:\\n   - Captures the main subject/scene\\n   - Is 1-3 sentences\\n   - Includes relevant emojis\\n   - Feels authentic and natural\\n   - IMPORTANT: Do NOT include any hashtags in the caption text\\n   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n\\n2. 10-15 hashtags that:\\n   - Mix popular and niche tags\\n   - Are relevant to image content\\n   - Range from broad to specific\\n   - These should be completely separate from the caption above\\n\\n3. Alt text for accessibility (1-2 sentences):\\n   - Describe what is actually visible in the image\\n   - Include important visual details for screen readers\\n\\nFormat your response as:\\nCAPTION: [your caption here - NO hashtags allowed]\\nHASHTAGS: [hashtags separated by spaces]\\nALT_TEXT: [descriptive alt text for accessibility]";
    }
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + c2.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: finalPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: "data:image/jpeg;base64," + base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });
    if (!response.ok) {
      const errorData = await response.text();
      return c2.json({ error: "OpenAI API request failed: " + response.status }, response.status);
    }
    const data = await response.json();
    const responseContent = data.choices[0].message.content;
    let caption = "", hashtags = "", altText = "";
    try {
      const lines = responseContent.split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("CAPTION:")) {
          caption = trimmedLine.replace("CAPTION:", "").trim();
        } else if (trimmedLine.startsWith("HASHTAGS:")) {
          hashtags = trimmedLine.replace("HASHTAGS:", "").trim();
        } else if (trimmedLine.startsWith("ALT_TEXT:")) {
          altText = trimmedLine.replace("ALT_TEXT:", "").trim();
        }
      }
    } catch (parseError) {
      console.error("Error parsing caption response:", parseError);
      caption = responseContent;
    }
    let imageId = context2.imageId;
    let captionHistoryId = null;
    if (!imageId && caption) {
      try {
        const binaryString = atob(base64Image);
        const imageBuffer = new Uint8Array(binaryString.length);
        for (let i2 = 0; i2 < binaryString.length; i2++) {
          imageBuffer[i2] = binaryString.charCodeAt(i2);
        }
        const imageHash = await crypto.subtle.digest("SHA-256", imageBuffer).then((hashBuffer) => Array.from(new Uint8Array(hashBuffer)).map((b2) => b2.toString(16).padStart(2, "0")).join(""));
        const existingImage = await database.getImageByHash(user.id, imageHash);
        if (existingImage) {
          imageId = existingImage.id;
        } else {
          let r2Key = null;
          if (c2.env.R2_BUCKET) {
            try {
              r2Key = `images/${user.id}/${Date.now()}-${imageHash.substring(0, 8)}.jpg`;
              await c2.env.R2_BUCKET.put(r2Key, imageBuffer, {
                httpMetadata: {
                  contentType: "image/jpeg"
                }
              });
            } catch (r2Error) {
              console.error("Error storing image in R2:", r2Error);
            }
          }
          imageId = await database.storeWebImage(
            user.id,
            filename,
            // Use the original filename from the request
            imageBuffer.length,
            "image/jpeg",
            imageHash,
            r2Key
          );
        }
      } catch (imageError) {
        console.error("Error storing web image:", imageError);
      }
    }
    if (caption) {
      try {
        captionHistoryId = await database.saveCaptionHistory(
          user.id,
          imageId,
          caption,
          hashtags,
          altText,
          style,
          context2,
          extractedData?.weatherData
        );
      } catch (historyError) {
        console.error("Error saving caption history:", historyError);
      }
    }
    const queryId = generateRandomId();
    const logResult = await database.logQuery({
      id: queryId,
      source: "web",
      userId: user.id,
      email: user.email,
      processingTimeMs: Date.now() - Date.now(),
      // Simplified
      responseLength: responseContent.length
    });
    const usageResult = await database.incrementDailyUsage(user.id);
    const responseData = { content: responseContent };
    if (extractedData) {
      if (extractedData.weatherData) responseData.weatherData = extractedData.weatherData;
      if (extractedData.locationName) responseData.locationName = extractedData.locationName;
      if (extractedData.photoDateTime) responseData.photoDateTime = extractedData.photoDateTime;
      if (extractedData.cameraMake || extractedData.cameraModel) {
        responseData.cameraInfo = {
          make: extractedData.cameraMake,
          model: extractedData.cameraModel
        };
      }
    }
    const connectedAccounts = await getConnectedSocialAccounts(database, user.id);
    responseData.connectedAccounts = connectedAccounts;
    return c2.json(responseData);
  } catch (error3) {
    return c2.json({ error: "Internal server error" }, 500);
  }
});
app.get("/api/caption-history/:imageId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const imageId = c2.req.param("imageId");
    const database = new D1Database(c2.env.DB);
    const history = await database.getCaptionHistoryForImage(user.id, parseInt(imageId));
    return c2.json({ history });
  } catch (error3) {
    console.error("Error getting caption history:", error3);
    return c2.json({ error: "Failed to load caption history" }, 500);
  }
});
app.post("/api/caption-history/:captionId/use", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const captionId = c2.req.param("captionId");
    const database = new D1Database(c2.env.DB);
    await database.incrementCaptionUsage(parseInt(captionId));
    return c2.json({ success: true });
  } catch (error3) {
    console.error("Error incrementing caption usage:", error3);
    return c2.json({ error: "Failed to update caption usage" }, 500);
  }
});
app.get("/api/scheduled-posts", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const status = c2.req.query("status");
    const database = new D1Database(c2.env.DB);
    const posts = await database.getScheduledPosts(user.id, status);
    const parsedPosts = posts.map((post) => {
      try {
        post.platforms = JSON.parse(post.platforms);
      } catch (e2) {
        post.platforms = [];
      }
      return post;
    });
    return c2.json({ posts: parsedPosts });
  } catch (error3) {
    console.error("Error getting scheduled posts:", error3);
    return c2.json({ error: "Failed to load scheduled posts" }, 500);
  }
});
app.post("/api/scheduled-posts", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const { imageId, captionId, customCaption, customHashtags, platforms, scheduledTime, timezone } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    if (!platforms || platforms.length === 0) {
      return c2.json({ error: "At least one platform must be selected" }, 400);
    }
    if (!scheduledTime) {
      return c2.json({ error: "Scheduled time is required" }, 400);
    }
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= /* @__PURE__ */ new Date()) {
      return c2.json({ error: "Scheduled time must be in the future" }, 400);
    }
    const postId = await database.createScheduledPost(
      user.id,
      imageId || null,
      captionId || null,
      customCaption || null,
      customHashtags || null,
      platforms,
      scheduledTime,
      timezone || null
    );
    if (postId) {
      return c2.json({ success: true, postId });
    } else {
      return c2.json({ error: "Failed to create scheduled post" }, 500);
    }
  } catch (error3) {
    console.error("Error creating scheduled post:", error3);
    return c2.json({ error: "Failed to create scheduled post" }, 500);
  }
});
app.delete("/api/scheduled-posts/:postId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const postId = c2.req.param("postId");
    const database = new D1Database(c2.env.DB);
    const success = await database.deleteScheduledPost(user.id, parseInt(postId));
    if (success) {
      return c2.json({ success: true });
    } else {
      return c2.json({ error: "Failed to delete scheduled post" }, 500);
    }
  } catch (error3) {
    console.error("Error deleting scheduled post:", error3);
    return c2.json({ error: "Failed to delete scheduled post" }, 500);
  }
});
app.get("/api/scheduled-posts/:postId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const postId = c2.req.param("postId");
    const database = new D1Database(c2.env.DB);
    const post = await database.getScheduledPostById(user.id, postId);
    if (!post) {
      return c2.json({ error: "Scheduled post not found" }, 404);
    }
    try {
      post.platforms = JSON.parse(post.platforms);
    } catch (e2) {
      post.platforms = [];
    }
    return c2.json({ post });
  } catch (error3) {
    console.error("Error getting scheduled post:", error3);
    return c2.json({ error: "Failed to load scheduled post" }, 500);
  }
});
app.put("/api/scheduled-posts/:postId", authenticateToken, async (c2) => {
  try {
    const user = c2.get("user");
    const postId = c2.req.param("postId");
    const { scheduledTime, caption, hashtags, timezone } = await c2.req.json();
    const database = new D1Database(c2.env.DB);
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= /* @__PURE__ */ new Date()) {
      return c2.json({ error: "Scheduled time must be in the future" }, 400);
    }
    const success = await database.updateScheduledPost(
      user.id,
      postId,
      scheduledTime,
      caption,
      hashtags
    );
    if (success) {
      return c2.json({ success: true });
    } else {
      return c2.json({ error: "Failed to update scheduled post" }, 500);
    }
  } catch (error3) {
    console.error("Error updating scheduled post:", error3);
    return c2.json({ error: "Failed to update scheduled post" }, 500);
  }
});
app.get("/test", (c2) => {
  return c2.html(`
<!DOCTYPE html>
<html>
<head>
    <title>Test JavaScript</title>
</head>
<body>
    <h1>JavaScript Test</h1>
    <button onclick="testFunction()">Test Button</button>
    <div id="result"></div>
    <script>
        function testFunction() {
            document.getElementById('result').innerHTML = 'Button works!';
        }
    <\/script>
</body>
</html>
  `);
});
app.get("/", (c2) => {
  return c2.redirect("/index.html");
});
app.get("/auth", async (c2) => {
  const inviteToken = c2.req.query("invite");
  const email = c2.req.query("email");
  if (inviteToken && email) {
    try {
      const database = new D1Database(c2.env.DB);
      const invite = await database.getInviteToken(inviteToken);
      if (!invite) {
        return c2.html(`
                    <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                        <h2>\u274C Invalid or Expired Invitation</h2>
                        <p>This invitation link is invalid or has expired.</p>
                        <a href="/" style="color: #405de6;">\u2190 Back to Caption Studio</a>
                    </div>
                `);
      }
      if (invite.email !== email) {
        return c2.html(`
                    <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                        <h2>\u274C Invalid Invitation</h2>
                        <p>This invitation is not for the specified email address.</p>
                        <a href="/" style="color: #405de6;">\u2190 Back to Caption Studio</a>
                    </div>
                `);
      }
      const invitedBy = await database.getUserById(invite.invited_by_user_id);
      const tierName = invite.assigned_tier_id ? await database.getTierById(invite.assigned_tier_id) && name || "Default" : "Default";
      return c2.html(`
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 30px; text-align: center; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <h2 style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px;">\u{1F389} Welcome to AI Caption Studio!</h2>
                    
                    <div style="background: #f0f9ff; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e0f2fe;">
                        <p><strong>Invited by:</strong> ${invitedBy ? invitedBy.email : "Administrator"}</p>
                        <p><strong>Your Account Tier:</strong> ${tierName}</p>
                    </div>
                    
                    <p>To complete your account setup, enter your email below and click "Get Started":</p>
                    
                    <div style="margin: 20px 0;">
                        <input type="email" id="inviteEmail" value="${email}" readonly 
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; background: #f9f9f9;" />
                        <button onclick="acceptInvite()" 
                                style="width: 100%; padding: 15px; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold;">
                            \u{1F680} Get Started
                        </button>
                    </div>
                    
                    <div id="message" style="margin-top: 20px;"></div>
                    
                    <script>
                        async function acceptInvite() {
                            const button = document.querySelector('button');
                            const messageDiv = document.getElementById('message');
                            
                            button.disabled = true;
                            button.textContent = '\u23F3 Setting up your account...';
                            
                            try {
                                const response = await fetch('/api/auth/accept-invite', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        inviteToken: '${inviteToken}',
                                        email: '${email}'
                                    })
                                });
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                    messageDiv.innerHTML = '<p style="color: green;">\u2705 Account created successfully! Logging you in...</p>';
                                    
                                    // Store the JWT token for authentication
                                    if (result.token) {
                                        localStorage.setItem('auth_token', result.token);
                                        localStorage.setItem('user', JSON.stringify(result.user));
                                        
                                        
                                        messageDiv.innerHTML = '<p style="color: green;">\u2705 Welcome! Redirecting to Caption Studio...</p>';
                                        setTimeout(() => {
                                            window.location.href = '/';
                                        }, 1500);
                                    } else {
                                        // Fallback to magic link if no token received
                                        messageDiv.innerHTML = '<p style="color: orange;">\u26A0\uFE0F Account created but login failed. Sending magic link...</p>';
                                        
                                        const loginResponse = await fetch('/api/auth/request-login', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email: '${email}' })
                                        });
                                        
                                        const loginResult = await loginResponse.json();
                                        
                                        if (loginResult.success) {
                                            messageDiv.innerHTML = '<p style="color: green;">\u2705 Magic link sent to your email! Check your inbox to complete login.</p>';
                                        } else {
                                            messageDiv.innerHTML = '<p style="color: red;">\u274C Account created but failed to send login link. Please go to the main page and request a login link.</p>';
                                        }
                                    }
                                } else {
                                    messageDiv.innerHTML = '<p style="color: red;">\u274C ' + result.error + '</p>';
                                    button.disabled = false;
                                    button.textContent = '\u{1F680} Get Started';
                                }
                            } catch (error) {
                                messageDiv.innerHTML = '<p style="color: red;">\u274C Failed to accept invitation. Please try again.</p>';
                                button.disabled = false;
                                button.textContent = '\u{1F680} Get Started';
                            }
                        }
                    <\/script>
                </div>
            `);
    } catch (error3) {
      return c2.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>\u274C Error Processing Invitation</h2>
                    <p>There was an error processing your invitation. Please try again or contact support.</p>
                    <a href="/" style="color: #405de6;">\u2190 Back to Caption Studio</a>
                </div>
            `);
    }
  }
  return c2.redirect("/auth.html");
});
app.get("/admin", (c2) => {
  return c2.redirect("/admin.html");
});
app.get("/settings", (c2) => {
  return c2.redirect("/settings.html");
});
app.get("/admin/users", (c2) => {
  return c2.redirect("/admin-users.html");
});
app.get("/admin/tiers", (c2) => {
  return c2.redirect("/admin-tiers.html");
});
app.get("/test-worker", (c2) => {
  return c2.json({ message: "Worker is running", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/admin/users", async (c2) => {
  return c2.redirect("/admin-users.html");
});
app.get("/admin/tiers", async (c2) => {
  return c2.redirect("/admin-tiers.html");
});
async function handleScheduledPosts(env2) {
  try {
    console.log("Processing scheduled posts...");
    const database = new D1Database(env2.DB);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const duePosts = await database.getDueScheduledPosts(now);
    console.log(`Found ${duePosts.length} due posts to process`);
    for (const post of duePosts) {
      try {
        console.log(`Processing post ${post.id} scheduled for ${post.scheduled_time}`);
        await database.updateScheduledPostStatus(post.id, "processing", null);
        let imageData = null;
        if (post.image_id) {
          const imageResponse = await env2.R2_BUCKET.get(post.r2_key);
          if (imageResponse) {
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          }
        }
        const userSettings = await database.getUserSocialSettings(post.user_id);
        let platforms;
        try {
          platforms = JSON.parse(post.platforms);
        } catch (e2) {
          platforms = post.platforms.split(",");
        }
        let allSuccess = true;
        let errorMessages = [];
        for (const platform2 of platforms) {
          try {
            const success = await postToSocialMedia(
              platform2,
              post,
              imageData,
              userSettings[platform2],
              env2
            );
            if (!success) {
              allSuccess = false;
              errorMessages.push(`Failed to post to ${platform2}`);
            }
          } catch (error3) {
            console.error(`Error posting to ${platform2}:`, error3);
            allSuccess = false;
            errorMessages.push(`${platform2}: ${error3.message}`);
          }
        }
        if (allSuccess) {
          await database.updateScheduledPostStatus(post.id, "posted", null);
          console.log(`Successfully posted to all platforms for post ${post.id}`);
        } else {
          await database.updateScheduledPostStatus(
            post.id,
            "failed",
            errorMessages.join("; ")
          );
          console.error(`Failed to post ${post.id}:`, errorMessages.join("; "));
        }
      } catch (error3) {
        console.error(`Error processing post ${post.id}:`, error3);
        await database.updateScheduledPostStatus(
          post.id,
          "failed",
          `Processing error: ${error3.message}`
        );
      }
    }
    console.log("Finished processing scheduled posts");
  } catch (error3) {
    console.error("Error in handleScheduledPosts:", error3);
  }
}
__name(handleScheduledPosts, "handleScheduledPosts");
async function postToSocialMedia(platform2, post, imageData, platformSettings, env2) {
  if (!platformSettings || !platformSettings.token) {
    throw new Error(`No valid token for ${platform2}`);
  }
  const caption = post.custom_caption || post.caption || "";
  const hashtags = post.custom_hashtags || post.hashtags || "";
  const content = caption + (hashtags ? " " + hashtags : "");
  switch (platform2) {
    case "mastodon":
      return await postToMastodonCron(content, imageData, platformSettings, env2);
    case "pixelfed":
      return await postToPixelfedCron(content, imageData, platformSettings, env2);
    case "instagram":
      return await postToInstagramCron(content, imageData, platformSettings, env2);
    default:
      throw new Error(`Unsupported platform: ${platform2}`);
  }
}
__name(postToSocialMedia, "postToSocialMedia");
async function postToMastodonCron(content, imageData, settings, env2) {
  try {
    const instance = settings.instance;
    const token = settings.token;
    let mediaId = null;
    if (imageData) {
      const imageBuffer = Uint8Array.from(atob(imageData), (c2) => c2.charCodeAt(0));
      const formData = new FormData();
      formData.append("file", new Blob([imageBuffer], { type: "image/jpeg" }));
      const mediaResponse = await fetch(`${instance}/api/v1/media`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
      if (mediaResponse.ok) {
        const mediaResult = await mediaResponse.json();
        mediaId = mediaResult.id;
      }
    }
    const postData = {
      status: content,
      visibility: "public"
    };
    if (mediaId) {
      postData.media_ids = [mediaId];
    }
    const response = await fetch(`${instance}/api/v1/statuses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });
    return response.ok;
  } catch (error3) {
    console.error("Error posting to Mastodon:", error3);
    return false;
  }
}
__name(postToMastodonCron, "postToMastodonCron");
async function postToPixelfedCron(content, imageData, settings, env2) {
  try {
    const instance = settings.instance;
    const token = settings.token;
    return true;
  } catch (error3) {
    console.error("Error posting to Pixelfed:", error3);
    return false;
  }
}
__name(postToPixelfedCron, "postToPixelfedCron");
async function postToInstagramCron(content, imageData, settings, env2) {
  try {
    const accessToken = settings.access_token;
    const businessAccountId = settings.business_account_id;
    return true;
  } catch (error3) {
    console.error("Error posting to Instagram:", error3);
    return false;
  }
}
__name(postToInstagramCron, "postToInstagramCron");
var worker_default = {
  fetch: app.fetch,
  scheduled: /* @__PURE__ */ __name(async (event, env2, ctx) => {
    ctx.waitUntil(handleScheduledPosts(env2));
  }, "scheduled")
};
export {
  worker_default as default
};
/*! Bundled license information:

safe-buffer/index.js:
  (*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)
*/
//# sourceMappingURL=worker.js.map
