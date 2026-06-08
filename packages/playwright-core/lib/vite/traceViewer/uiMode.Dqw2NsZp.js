const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f || (m.f = ['./assets/xtermModule-CsJ4vdCR.js', './xtermModule.DYP7pi_n.css'])
) => i.map((i) => d[i])
var tt = Object.defineProperty
var st = (r, e, t) =>
  e in r ? tt(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : (r[e] = t)
var d = (r, e, t) => st(r, typeof e != 'symbol' ? e + '' : e, t)
import './assets/urlMatch-BYQrIQwR.js'
import {
  u as it,
  r as G,
  g as rt,
  _ as ot,
  h as nt,
  i as at,
  j as i,
  R as c,
  E as lt,
  s as Be,
  k as V,
  l as ct,
  t as dt,
  m as ut,
  n as z,
  o as L,
  T as De,
  c as ht,
  p as Q,
  a as pt,
  W as ft,
  S as Ie,
  q as gt,
  b as mt,
  e as xt,
  f as vt
} from './assets/defaultSettingsView-Cmqr6nSx.js'
var _t = {}
class we {
  constructor(e, t = {}) {
    d(this, 'isListing', !1)
    d(this, '_rootSuite')
    d(this, '_options')
    d(this, '_reporter')
    d(this, '_tests', new Map())
    d(this, '_rootDir')
    d(this, '_config')
    ;((this._rootSuite = new se('', 'root')), (this._options = t), (this._reporter = e))
  }
  reset() {
    ;((this._rootSuite._entries = []), this._tests.clear())
  }
  dispatch(e) {
    const { method: t, params: s } = e
    if (t === 'onConfigure') {
      this._onConfigure(s.config)
      return
    }
    if (t === 'onProject') {
      this._onProject(s.project)
      return
    }
    if (t === 'onBegin') {
      this._onBegin()
      return
    }
    if (t === 'onTestBegin') {
      this._onTestBegin(s.testId, s.result)
      return
    }
    if (t === 'onTestPaused') {
      this._onTestPaused(s.testId, s.resultId, s.errors)
      return
    }
    if (t === 'onTestEnd') {
      this._onTestEnd(s.test, s.result)
      return
    }
    if (t === 'onStepBegin') {
      this._onStepBegin(s.testId, s.resultId, s.step)
      return
    }
    if (t === 'onAttach') {
      this._onAttach(s.testId, s.resultId, s.attachments)
      return
    }
    if (t === 'onStepEnd') {
      this._onStepEnd(s.testId, s.resultId, s.step)
      return
    }
    if (t === 'onError') {
      this._onError(s.error, s.workerInfo)
      return
    }
    if (t === 'onStdIO') {
      this._onStdIO(s.type, s.testId, s.resultId, s.data, s.isBase64)
      return
    }
    if (t === 'onEnd') return this._onEnd(s.result)
    if (t === 'onExit') return this._onExit()
  }
  _onConfigure(e) {
    var t, s
    ;((this._rootDir = e.rootDir),
      (this._config = this._parseConfig(e)),
      (s = (t = this._reporter).onConfigure) == null || s.call(t, this._config))
  }
  _onProject(e) {
    let t = this._options.mergeProjects
      ? this._rootSuite.suites.find((n) => n.project().name === e.name)
      : void 0
    t || ((t = new se(e.name, 'project')), this._rootSuite._addSuite(t))
    const s = this._parseProject(e)
    t._project = s
    let o = -1
    ;(this._options.mergeProjects &&
      (o = this._config.projects.findIndex((n) => n.name === e.name)),
      o === -1 ? this._config.projects.push(s) : (this._config.projects[o] = s))
    for (const n of e.suites) this._mergeSuiteInto(n, t)
  }
  _onBegin() {
    var e, t
    ;(t = (e = this._reporter).onBegin) == null || t.call(e, this._rootSuite)
  }
  _onTestBegin(e, t) {
    var n, a
    const s = this._tests.get(e)
    this._options.clearPreviousResultsWhenTestBegins && (s.results = [])
    const o = s._createTestResult(t.id)
    ;((o.retry = t.retry),
      (o.workerIndex = t.workerIndex),
      (o.parallelIndex = t.parallelIndex),
      o.setStartTimeNumber(t.startTime),
      (a = (n = this._reporter).onTestBegin) == null || a.call(n, s, o))
  }
  _onTestPaused(e, t, s) {
    var a, g
    const o = this._tests.get(e),
      n = o.results.find((u) => u._id === t)
    ;(n.errors.push(...s),
      (n.error = n.errors[0]),
      (g = (a = this._reporter).onTestPaused) == null || g.call(a, o, n))
  }
  _onTestEnd(e, t) {
    var n, a
    const s = this._tests.get(e.testId)
    ;((s.timeout = e.timeout), (s.expectedStatus = e.expectedStatus))
    const o = s.results.find((g) => g._id === t.id)
    ;((o.duration = t.duration),
      (o.status = t.status),
      o.errors.push(...(t.errors ?? [])),
      (o.error = o.errors[0]),
      t.attachments && (o.attachments = this._parseAttachments(t.attachments)),
      t.annotations &&
        (this._absoluteAnnotationLocationsInplace(t.annotations),
        (o.annotations = t.annotations),
        (s.annotations = t.annotations)),
      (a = (n = this._reporter).onTestEnd) == null || a.call(n, s, o),
      (o._stepMap = new Map()))
  }
  _onStepBegin(e, t, s) {
    var m, l
    const o = this._tests.get(e),
      n = o.results.find((_) => _._id === t),
      a = s.parentStepId ? n._stepMap.get(s.parentStepId) : void 0,
      g = this._absoluteLocation(s.location),
      u = new St(s, a, g, n)
    ;(a ? a.steps.push(u) : n.steps.push(u),
      n._stepMap.set(s.id, u),
      (l = (m = this._reporter).onStepBegin) == null || l.call(m, o, n, u))
  }
  _onStepEnd(e, t, s) {
    var g, u
    const o = this._tests.get(e),
      n = o.results.find((m) => m._id === t),
      a = n._stepMap.get(s.id)
    ;((a._endPayload = s),
      (a.duration = s.duration),
      (a.error = s.error),
      (u = (g = this._reporter).onStepEnd) == null || u.call(g, o, n, a))
  }
  _onAttach(e, t, s) {
    this._tests
      .get(e)
      .results.find((a) => a._id === t)
      .attachments.push(
        ...s.map((a) => ({
          name: a.name,
          contentType: a.contentType,
          path: a.path,
          body: a.base64 && globalThis.Buffer ? Buffer.from(a.base64, 'base64') : void 0
        }))
      )
  }
  _onError(e, t) {
    var o, n
    let s
    if (t) {
      const a = this._config.projects.find((g) => g.name === t.projectName)
      a &&
        (s = {
          workerIndex: t.workerIndex,
          parallelIndex: t.parallelIndex,
          config: this._config,
          project: a
        })
    }
    ;(n = (o = this._reporter).onError) == null || n.call(o, e, s)
  }
  _onStdIO(e, t, s, o, n) {
    var m, l, _, w
    const a = n ? (globalThis.Buffer ? Buffer.from(o, 'base64') : atob(o)) : o,
      g = t ? this._tests.get(t) : void 0,
      u = g && s ? g.results.find((h) => h._id === s) : void 0
    e === 'stdout'
      ? (u == null || u.stdout.push(a),
        (l = (m = this._reporter).onStdOut) == null || l.call(m, a, g, u))
      : (u == null || u.stderr.push(a),
        (w = (_ = this._reporter).onStdErr) == null || w.call(_, a, g, u))
  }
  async _onEnd(e) {
    var t, s
    await ((s = (t = this._reporter).onEnd) == null ? void 0 : s.call(t, kt(e)))
  }
  _onExit() {
    var e, t
    return (t = (e = this._reporter).onExit) == null ? void 0 : t.call(e)
  }
  _parseConfig(e) {
    const t = yt(e)
    return (
      this._options.configOverrides &&
        ((t.configFile = this._options.configOverrides.configFile),
        (t.reportSlowTests = this._options.configOverrides.reportSlowTests),
        (t.quiet = this._options.configOverrides.quiet),
        (t.reporter = [...this._options.configOverrides.reporter])),
      t
    )
  }
  _parseProject(e) {
    return {
      metadata: e.metadata,
      name: e.name,
      outputDir: this._absolutePath(e.outputDir),
      repeatEach: e.repeatEach,
      retries: e.retries,
      testDir: this._absolutePath(e.testDir),
      testIgnore: he(e.testIgnore),
      testMatch: he(e.testMatch),
      timeout: e.timeout,
      grep: he(e.grep),
      grepInvert: he(e.grepInvert),
      dependencies: e.dependencies,
      teardown: e.teardown,
      snapshotDir: this._absolutePath(e.snapshotDir),
      ignoreSnapshots: e.ignoreSnapshots ?? !1,
      use: e.use
    }
  }
  _parseAttachments(e) {
    return e.map((t) => ({
      ...t,
      body: t.base64 && globalThis.Buffer ? Buffer.from(t.base64, 'base64') : void 0
    }))
  }
  _mergeSuiteInto(e, t) {
    let s = t.suites.find((o) => o.title === e.title)
    ;(s || ((s = new se(e.title, t.type === 'project' ? 'file' : 'describe')), t._addSuite(s)),
      (s.location = this._absoluteLocation(e.location)),
      e.entries.forEach((o) => {
        'testId' in o ? this._mergeTestInto(o, s) : this._mergeSuiteInto(o, s)
      }))
  }
  _mergeTestInto(e, t) {
    let s = this._options.mergeTestCases
      ? t.tests.find((o) => o.title === e.title && o.repeatEachIndex === e.repeatEachIndex)
      : void 0
    ;(s ||
      ((s = new wt(e.testId, e.title, this._absoluteLocation(e.location), e.repeatEachIndex)),
      t._addTest(s),
      this._tests.set(s.id, s)),
      this._updateTest(e, s))
  }
  _updateTest(e, t) {
    return (
      (t.id = e.testId),
      (t.location = this._absoluteLocation(e.location)),
      (t.retries = e.retries),
      (t.tags = e.tags ?? []),
      (t.annotations = e.annotations ?? []),
      this._absoluteAnnotationLocationsInplace(t.annotations),
      t
    )
  }
  _absoluteAnnotationLocationsInplace(e) {
    for (const t of e) t.location && (t.location = this._absoluteLocation(t.location))
  }
  _absoluteLocation(e) {
    return e && { ...e, file: this._absolutePath(e.file) }
  }
  _absolutePath(e) {
    if (e !== void 0)
      return this._options.resolvePath
        ? this._options.resolvePath(this._rootDir, e)
        : this._rootDir + '/' + e
  }
}
class se {
  constructor(e, t) {
    d(this, 'title')
    d(this, 'location')
    d(this, 'parent')
    d(this, '_entries', [])
    d(this, '_requireFile', '')
    d(this, '_timeout')
    d(this, '_retries')
    d(this, '_project')
    d(this, '_parallelMode', 'none')
    d(this, '_type')
    ;((this.title = e), (this._type = t))
  }
  get type() {
    return this._type
  }
  get suites() {
    return this._entries.filter((e) => e.type !== 'test')
  }
  get tests() {
    return this._entries.filter((e) => e.type === 'test')
  }
  entries() {
    return this._entries
  }
  allTests() {
    const e = [],
      t = (s) => {
        for (const o of s.entries()) o.type === 'test' ? e.push(o) : t(o)
      }
    return (t(this), e)
  }
  titlePath() {
    const e = this.parent ? this.parent.titlePath() : []
    return ((this.title || this._type !== 'describe') && e.push(this.title), e)
  }
  project() {
    var e
    return this._project ?? ((e = this.parent) == null ? void 0 : e.project())
  }
  _addTest(e) {
    ;((e.parent = this), this._entries.push(e))
  }
  _addSuite(e) {
    ;((e.parent = this), this._entries.push(e))
  }
}
class wt {
  constructor(e, t, s, o) {
    d(this, 'title')
    d(this, 'fn', () => {})
    d(this, 'results', [])
    d(this, 'location')
    d(this, 'parent')
    d(this, 'type', 'test')
    d(this, 'expectedStatus', 'passed')
    d(this, 'timeout', 0)
    d(this, 'annotations', [])
    d(this, 'retries', 0)
    d(this, 'tags', [])
    d(this, 'repeatEachIndex', 0)
    d(this, 'id')
    ;((this.id = e), (this.title = t), (this.location = s), (this.repeatEachIndex = o))
  }
  titlePath() {
    const e = this.parent ? this.parent.titlePath() : []
    return (e.push(this.title), e)
  }
  outcome() {
    return Tt(this)
  }
  ok() {
    const e = this.outcome()
    return e === 'expected' || e === 'flaky' || e === 'skipped'
  }
  _createTestResult(e) {
    const t = new bt(this.results.length, e)
    return (this.results.push(t), t)
  }
}
class St {
  constructor(e, t, s, o) {
    d(this, 'title')
    d(this, 'category')
    d(this, 'location')
    d(this, 'parent')
    d(this, 'duration', -1)
    d(this, 'steps', [])
    d(this, 'error')
    d(this, '_result')
    d(this, '_endPayload')
    d(this, '_startTime', 0)
    ;((this.title = e.title),
      (this.category = e.category),
      (this.location = s),
      (this.parent = t),
      (this._startTime = e.startTime),
      (this._result = o))
  }
  titlePath() {
    var t
    return [...(((t = this.parent) == null ? void 0 : t.titlePath()) || []), this.title]
  }
  get startTime() {
    return new Date(this._startTime)
  }
  set startTime(e) {
    this._startTime = +e
  }
  get attachments() {
    var e, t
    return (
      ((t = (e = this._endPayload) == null ? void 0 : e.attachments) == null
        ? void 0
        : t.map((s) => this._result.attachments[s])) ?? []
    )
  }
  get annotations() {
    var e
    return ((e = this._endPayload) == null ? void 0 : e.annotations) ?? []
  }
}
class bt {
  constructor(e, t) {
    d(this, 'retry')
    d(this, 'parallelIndex', -1)
    d(this, 'workerIndex', -1)
    d(this, 'duration', -1)
    d(this, 'stdout', [])
    d(this, 'stderr', [])
    d(this, 'attachments', [])
    d(this, 'annotations', [])
    d(this, 'status', 'skipped')
    d(this, 'steps', [])
    d(this, 'errors', [])
    d(this, 'error')
    d(this, '_stepMap', new Map())
    d(this, '_id')
    d(this, '_startTime', 0)
    ;((this.retry = e), (this._id = t))
  }
  setStartTimeNumber(e) {
    this._startTime = e
  }
  get startTime() {
    return new Date(this._startTime)
  }
  set startTime(e) {
    this._startTime = +e
  }
}
const jt = {
  argv: [],
  failOnFlakyTests: !1,
  forbidOnly: !1,
  fullyParallel: !1,
  globalSetup: null,
  globalTeardown: null,
  globalTimeout: 0,
  grep: /.*/,
  grepInvert: null,
  maxFailures: 0,
  metadata: {},
  preserveOutput: 'always',
  projects: [],
  reporter: [[_t.CI ? 'dot' : 'list']],
  reportSlowTests: { max: 5, threshold: 3e5 },
  configFile: '',
  rootDir: '',
  quiet: !1,
  shard: null,
  tags: [],
  updateSnapshots: 'missing',
  updateSourceMethod: 'patch',
  version: '',
  workers: 0,
  webServer: null
}
function he(r) {
  return r.map((e) => (e.s !== void 0 ? e.s : new RegExp(e.r.source, e.r.flags)))
}
function Tt(r) {
  let e = 0,
    t = 0,
    s = 0
  for (const o of r.results)
    o.status === 'interrupted' ||
      (o.status === 'skipped' && r.expectedStatus === 'skipped'
        ? ++e
        : o.status === 'skipped' || (o.status === r.expectedStatus ? ++t : ++s))
  return t === 0 && s === 0
    ? 'skipped'
    : s === 0
      ? 'expected'
      : t === 0 && e === 0
        ? 'unexpected'
        : 'flaky'
}
function kt(r) {
  return { status: r.status, startTime: new Date(r.startTime), duration: r.duration }
}
function yt(r) {
  return { ...jt, ...r }
}
class Se {
  constructor(e, t, s, o, n, a) {
    d(this, 'rootItem')
    d(this, '_treeItemById', new Map())
    d(this, '_treeItemByTestId', new Map())
    d(this, 'pathSeparator')
    const g = o && [...o.values()].some(Boolean)
    ;((this.pathSeparator = n),
      (this.rootItem = {
        kind: 'group',
        subKind: 'folder',
        id: e,
        title: '',
        location: { file: '', line: 0, column: 0 },
        duration: 0,
        parent: void 0,
        children: [],
        status: 'none',
        hasLoadErrors: !1
      }),
      this._treeItemById.set(e, this.rootItem))
    const u = (m, l, _, w) => {
      for (const h of w === 'tests' ? [] : l.suites) {
        if (!h.title) {
          u(m, h, _, 'all')
          continue
        }
        let y = _.children.find((f) => f.kind === 'group' && f.title === h.title)
        ;(y ||
          ((y = {
            kind: 'group',
            subKind: 'describe',
            id: 'suite:' + l.titlePath().join('') + '' + h.title,
            title: h.title,
            location: h.location,
            duration: 0,
            parent: _,
            children: [],
            status: 'none',
            hasLoadErrors: !1
          }),
          this._addChild(_, y)),
          u(m, h, y, 'all'))
      }
      for (const h of w === 'suites' ? [] : l.tests) {
        const y = h.title
        let f = _.children.find((N) => N.kind !== 'group' && N.title === y)
        f ||
          ((f = {
            kind: 'case',
            id: 'test:' + h.titlePath().join(''),
            title: y,
            parent: _,
            children: [],
            tests: [],
            location: h.location,
            duration: 0,
            status: 'none',
            project: void 0,
            test: void 0,
            tags: h.tags
          }),
          this._addChild(_, f))
        const S = h.results[0]
        let k = 'none'
        ;((S == null ? void 0 : S[ie]) === 'scheduled'
          ? (k = 'scheduled')
          : (S == null ? void 0 : S[ie]) === 'running'
            ? (k = 'running')
            : (S == null ? void 0 : S.status) === 'skipped'
              ? (k = 'skipped')
              : (S == null ? void 0 : S.status) === 'interrupted'
                ? (k = 'none')
                : S && h.outcome() !== 'expected'
                  ? (k = 'failed')
                  : S && h.outcome() === 'expected' && (k = 'passed'),
          f.tests.push(h))
        const b = {
          kind: 'test',
          id: h.id,
          title: m.name,
          location: h.location,
          test: h,
          parent: f,
          children: [],
          status: k,
          duration: h.results.length ? Math.max(0, h.results[0].duration) : 0,
          project: m
        }
        ;(this._addChild(f, b),
          this._treeItemByTestId.set(h.id, b),
          (f.duration = f.children.reduce((N, E) => N + E.duration, 0)))
      }
    }
    for (const m of (t == null ? void 0 : t.suites) || [])
      if (!(g && !o.get(m.title)))
        for (const l of m.suites)
          if (a) {
            if ((u(m.project(), l, this.rootItem, 'suites'), l.tests.length)) {
              const _ = this._defaultDescribeItem()
              u(m.project(), l, _, 'tests')
            }
          } else {
            const _ = this._fileItem(l.location.file.split(n), !0)
            u(m.project(), l, _, 'all')
          }
    for (const m of s) {
      if (!m.location) continue
      const l = this._fileItem(m.location.file.split(n), !0)
      l.hasLoadErrors = !0
    }
  }
  _addChild(e, t) {
    ;(e.children.push(t), (t.parent = e), this._treeItemById.set(t.id, t))
  }
  filterTree(e, t, s) {
    const o = e.trim().toLowerCase().split(' '),
      n = [...t.values()].some(Boolean),
      a = (u) => {
        const m = [...u.tests[0].titlePath(), ...u.tests[0].tags].join(' ').toLowerCase()
        return !o.every((l) => m.includes(l)) &&
          !u.tests.some((l) => (s == null ? void 0 : s.has(l.id)))
          ? !1
          : ((u.children = u.children.filter(
              (l) => !n || (s == null ? void 0 : s.has(l.test.id)) || t.get(l.status)
            )),
            (u.tests = u.children.map((l) => l.test)),
            !!u.children.length)
      },
      g = (u) => {
        const m = []
        for (const l of u.children)
          l.kind === 'case'
            ? a(l) && m.push(l)
            : (g(l), (l.children.length || l.hasLoadErrors) && m.push(l))
        u.children = m
      }
    g(this.rootItem)
  }
  _fileItem(e, t) {
    if (e.length === 0) return this.rootItem
    const s = e.join(this.pathSeparator),
      o = this._treeItemById.get(s)
    if (o) return o
    const n = this._fileItem(e.slice(0, e.length - 1), !1),
      a = {
        kind: 'group',
        subKind: t ? 'file' : 'folder',
        id: s,
        title: e[e.length - 1],
        location: { file: s, line: 0, column: 0 },
        duration: 0,
        parent: n,
        children: [],
        status: 'none',
        hasLoadErrors: !1
      }
    return (this._addChild(n, a), a)
  }
  _defaultDescribeItem() {
    let e = this._treeItemById.get('<anonymous>')
    return (
      e ||
        ((e = {
          kind: 'group',
          subKind: 'describe',
          id: '<anonymous>',
          title: '<anonymous>',
          location: { file: '', line: 0, column: 0 },
          duration: 0,
          parent: this.rootItem,
          children: [],
          status: 'none',
          hasLoadErrors: !1
        }),
        this._addChild(this.rootItem, e)),
      e
    )
  }
  sortAndPropagateStatus() {
    Fe(this.rootItem)
  }
  flattenForSingleProject() {
    const e = (t) => {
      t.kind === 'case' && t.children.length === 1
        ? ((t.project = t.children[0].project),
          (t.test = t.children[0].test),
          (t.children = []),
          this._treeItemByTestId.set(t.test.id, t))
        : t.children.forEach(e)
    }
    e(this.rootItem)
  }
  shortenRoot() {
    let e = this.rootItem
    for (
      ;
      e.children.length === 1 &&
      e.children[0].kind === 'group' &&
      e.children[0].subKind === 'folder';
    )
      e = e.children[0]
    ;((e.location = this.rootItem.location), (this.rootItem = e))
  }
  fileNames() {
    const e = new Set(),
      t = (s) => {
        s.kind === 'group' && s.subKind === 'file' ? e.add(s.id) : s.children.forEach(t)
      }
    return (t(this.rootItem), [...e])
  }
  flatTreeItems() {
    const e = [],
      t = (s) => {
        ;(e.push(s), s.children.forEach(t))
      }
    return (t(this.rootItem), e)
  }
  treeItemById(e) {
    return this._treeItemById.get(e)
  }
  collectTestIds(e) {
    return It(e)
  }
}
function Fe(r) {
  for (const a of r.children) Fe(a)
  r.kind === 'group' &&
    r.children.sort(
      (a, g) => a.location.file.localeCompare(g.location.file) || a.location.line - g.location.line
    )
  let e = r.children.length > 0,
    t = r.children.length > 0,
    s = !1,
    o = !1,
    n = !1
  for (const a of r.children)
    ((t = t && a.status === 'skipped'),
      (e = e && (a.status === 'passed' || a.status === 'skipped')),
      (s = s || a.status === 'failed'),
      (o = o || a.status === 'running'),
      (n = n || a.status === 'scheduled'))
  o
    ? (r.status = 'running')
    : n
      ? (r.status = 'scheduled')
      : s
        ? (r.status = 'failed')
        : t
          ? (r.status = 'skipped')
          : e && (r.status = 'passed')
}
function It(r) {
  const e = new Set(),
    t = new Set(),
    s = (o) => {
      if (o.kind !== 'test' && o.kind !== 'case') {
        o.children.forEach(s)
        return
      }
      let n = o
      for (; n && n.parent && !(n.kind === 'group' && n.subKind === 'file'); ) n = n.parent
      ;(t.add(n.location.file),
        o.kind === 'case' ? o.tests.forEach((a) => e.add(a.id)) : e.add(o.id))
    }
  return (s(r), { testIds: e, locations: t })
}
const ie = Symbol('statusEx')
class Et {
  constructor(e) {
    d(this, 'rootSuite')
    d(this, 'config')
    d(this, 'loadErrors', [])
    d(this, 'progress', { total: 0, passed: 0, failed: 0, skipped: 0 })
    d(this, '_receiver')
    d(this, '_lastRunReceiver')
    d(this, '_lastRunTestCount', 0)
    d(this, '_options')
    d(this, '_testResultsSnapshot')
    ;((this._receiver = new we(this._createReporter(), {
      mergeProjects: !0,
      mergeTestCases: !0,
      resolvePath: Ee(e.pathSeparator),
      clearPreviousResultsWhenTestBegins: !0
    })),
      (this._options = e))
  }
  _createReporter() {
    return {
      version: () => 'v2',
      onConfigure: (e) => {
        ;((this.config = e),
          (this._lastRunReceiver = new we(
            {
              version: () => 'v2',
              onBegin: (t) => {
                ;((this._lastRunTestCount = t.allTests().length), (this._lastRunReceiver = void 0))
              }
            },
            { mergeProjects: !0, mergeTestCases: !1, resolvePath: Ee(this._options.pathSeparator) }
          )),
          this._lastRunReceiver.dispatch({ method: 'onConfigure', params: { config: e } }))
      },
      onBegin: (e) => {
        var t
        if ((this.rootSuite || (this.rootSuite = e), this._testResultsSnapshot)) {
          for (const s of this.rootSuite.allTests())
            s.results =
              ((t = this._testResultsSnapshot) == null ? void 0 : t.get(s.id)) || s.results
          this._testResultsSnapshot = void 0
        }
        ;((this.progress.total = this._lastRunTestCount),
          (this.progress.passed = 0),
          (this.progress.failed = 0),
          (this.progress.skipped = 0),
          this._options.onUpdate(!0))
      },
      onEnd: () => {
        this._options.onUpdate(!0)
      },
      onTestBegin: (e, t) => {
        ;((t[ie] = 'running'), this._options.onUpdate())
      },
      onTestEnd: (e, t) => {
        ;(e.outcome() === 'skipped'
          ? ++this.progress.skipped
          : e.outcome() === 'unexpected'
            ? ++this.progress.failed
            : ++this.progress.passed,
          (t[ie] = t.status),
          this._options.onUpdate())
      },
      onError: (e) => this._handleOnError(e),
      printsToStdio: () => !1
    }
  }
  processGlobalReport(e) {
    const t = new we({
      version: () => 'v2',
      onConfigure: (s) => {
        this.config = s
      },
      onError: (s) => this._handleOnError(s)
    })
    for (const s of e) t.dispatch(s)
  }
  processListReport(e) {
    var s
    const t = ((s = this.rootSuite) == null ? void 0 : s.allTests()) || []
    ;((this._testResultsSnapshot = new Map(t.map((o) => [o.id, o.results]))),
      this._receiver.reset())
    for (const o of e) this._receiver.dispatch(o)
  }
  processTestReportEvent(e) {
    var t, s, o
    ;((s = (t = this._lastRunReceiver) == null ? void 0 : t.dispatch(e)) == null ||
      s.catch(() => {}),
      (o = this._receiver.dispatch(e)) == null || o.catch(() => {}))
  }
  _handleOnError(e) {
    var t, s
    ;(this.loadErrors.push(e),
      (s = (t = this._options).onError) == null || s.call(t, e),
      this._options.onUpdate())
  }
  asModel() {
    return {
      rootSuite: this.rootSuite || new se('', 'root'),
      config: this.config,
      loadErrors: this.loadErrors,
      progress: this.progress
    }
  }
}
function Ee(r) {
  return (e, t) => {
    const s = []
    for (const o of [...e.split(r), ...t.split(r)]) {
      const n = r === '\\' && s.length === 1 && s[0].endsWith(':'),
        a = !s.length
      if (!(!o && !a && !n) && o !== '.') {
        if (o === '..') {
          s.pop()
          continue
        }
        s.push(o)
      }
    }
    return s.join(r)
  }
}
const Nt = ({ source: r }) => {
    const [e, t] = it(),
      [s, o] = G.useState(rt()),
      [n] = G.useState(
        ot(
          () => import('./assets/xtermModule-CsJ4vdCR.js'),
          __vite__mapDeps([0, 1]),
          import.meta.url
        ).then((g) => g.default)
      ),
      a = G.useRef(null)
    return (
      G.useEffect(() => (nt(o), () => at(o)), []),
      G.useEffect(() => {
        const g = r.write,
          u = r.clear
        return (
          (async () => {
            const { Terminal: m, FitAddon: l } = await n,
              _ = t.current
            if (!_) return
            const w = s === 'dark-mode' ? Rt : Ct
            if (a.current && a.current.terminal.options.theme === w) return
            a.current && (_.textContent = '')
            const h = new m({
                convertEol: !0,
                fontSize: 13,
                scrollback: 1e4,
                fontFamily: 'monospace',
                theme: w
              }),
              y = new l()
            h.loadAddon(y)
            for (const f of r.pending) h.write(f)
            ;((r.write = (f) => {
              ;(r.pending.push(f), h.write(f))
            }),
              (r.clear = () => {
                ;((r.pending = []), h.clear())
              }),
              h.open(_),
              y.fit(),
              (a.current = { terminal: h, fitAddon: y }))
          })(),
          () => {
            ;((r.clear = u), (r.write = g))
          }
        )
      }, [n, a, t, r, s]),
      G.useEffect(() => {
        setTimeout(() => {
          a.current &&
            (a.current.fitAddon.fit(), r.resize(a.current.terminal.cols, a.current.terminal.rows))
        }, 250)
      }, [e, r]),
      i.jsx('div', {
        'data-testid': 'output',
        className: 'xterm-wrapper',
        style: { flex: 'auto' },
        ref: t
      })
    )
  },
  Ct = {
    foreground: '#383a42',
    background: '#fafafa',
    cursor: '#383a42',
    black: '#000000',
    red: '#e45649',
    green: '#50a14f',
    yellow: '#c18401',
    blue: '#4078f2',
    magenta: '#a626a4',
    cyan: '#0184bc',
    white: '#a0a0a0',
    brightBlack: '#000000',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#d19a66',
    brightBlue: '#4078f2',
    brightMagenta: '#a626a4',
    brightCyan: '#0184bc',
    brightWhite: '#383a42',
    selectionBackground: '#d7d7d7',
    selectionForeground: '#383a42'
  },
  Rt = {
    foreground: '#f8f8f2',
    background: '#1e1e1e',
    cursor: '#f8f8f0',
    black: '#000000',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#bfbfbf',
    brightBlack: '#4d4d4d',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#e6e6e6',
    selectionBackground: '#44475a',
    selectionForeground: '#f8f8f2'
  },
  Pt = ({
    filterText: r,
    setFilterText: e,
    statusFilters: t,
    setStatusFilters: s,
    projectFilters: o,
    setProjectFilters: n,
    onlyChanged: a,
    setOnlyChanged: g,
    testModel: u,
    runTests: m
  }) => {
    const [l, _] = c.useState(!1),
      w = c.useRef(null)
    c.useEffect(() => {
      var f
      ;(f = w.current) == null || f.focus()
    }, [])
    const h =
        [...t.entries()]
          .filter(([f, S]) => S)
          .map(([f]) => f)
          .join(' ') || 'all',
      y =
        [...o.entries()]
          .filter(([f, S]) => S)
          .map(([f]) => f)
          .join(' ') || 'all'
    return i.jsxs('div', {
      className: 'filters',
      children: [
        i.jsx(lt, {
          expanded: l,
          setExpanded: _,
          title: i.jsx('input', {
            ref: w,
            type: 'search',
            placeholder: 'Filter (e.g. text, @tag)',
            spellCheck: !1,
            value: r,
            onChange: (f) => {
              e(f.target.value)
            },
            onKeyDown: (f) => {
              f.key === 'Enter' && m()
            }
          })
        }),
        i.jsxs('div', {
          className: 'filter-summary',
          title:
            'Status: ' +
            h +
            `
Projects: ` +
            y +
            (a
              ? `
Only changed`
              : ''),
          onClick: () => _(!l),
          children: [
            i.jsx('span', { className: 'filter-label', children: 'Status:' }),
            ' ',
            h,
            i.jsx('span', { className: 'filter-label', children: 'Projects:' }),
            ' ',
            y,
            a &&
              i.jsx(i.Fragment, {
                children: i.jsx('span', { className: 'filter-label', children: 'Only changed' })
              })
          ]
        }),
        l &&
          i.jsxs(i.Fragment, {
            children: [
              i.jsxs('div', {
                className: 'hbox',
                style: { marginLeft: 14, maxHeight: 200, overflowY: 'auto' },
                children: [
                  i.jsx('div', {
                    className: 'filter-list',
                    role: 'list',
                    'data-testid': 'status-filters',
                    children: [...t.entries()].map(([f, S]) =>
                      i.jsx(
                        'div',
                        {
                          className: 'filter-entry',
                          role: 'listitem',
                          children: i.jsxs('label', {
                            children: [
                              i.jsx('input', {
                                type: 'checkbox',
                                checked: S,
                                onChange: () => {
                                  const k = new Map(t)
                                  ;(k.set(f, !k.get(f)), s(k))
                                }
                              }),
                              i.jsx('div', { children: f })
                            ]
                          })
                        },
                        f
                      )
                    )
                  }),
                  i.jsx('div', {
                    className: 'filter-list',
                    role: 'list',
                    'data-testid': 'project-filters',
                    children: [...o.entries()].map(([f, S]) =>
                      i.jsx(
                        'div',
                        {
                          className: 'filter-entry',
                          role: 'listitem',
                          children: i.jsxs('label', {
                            children: [
                              i.jsx('input', {
                                type: 'checkbox',
                                checked: S,
                                onChange: () => {
                                  var N
                                  const k = new Map(o)
                                  ;(k.set(f, !k.get(f)), n(k))
                                  const b =
                                    (N = u == null ? void 0 : u.config) == null
                                      ? void 0
                                      : N.configFile
                                  b &&
                                    Be.setObject(
                                      b + ':projects',
                                      [...k.entries()].filter(([E, $]) => $).map(([E]) => E)
                                    )
                                }
                              }),
                              i.jsx('div', { children: f || 'untitled' })
                            ]
                          })
                        },
                        f
                      )
                    )
                  })
                ]
              }),
              i.jsx('div', {
                className: 'filter-entry',
                style: { marginLeft: 24 },
                children: i.jsxs('label', {
                  children: [
                    i.jsx('input', { type: 'checkbox', checked: a, onChange: () => g(!a) }),
                    i.jsx('div', { children: 'Show only changed files' })
                  ]
                })
              })
            ]
          })
      ]
    })
  },
  Bt = ({ tag: r, style: e, onClick: t }) =>
    i.jsx('span', {
      className: V('tag', `tag-color-${Dt(r)}`),
      onClick: t,
      style: { margin: '6px 0 0 6px', ...e },
      title: `Click to filter by tag: ${r}`,
      children: r
    })
function Dt(r) {
  let e = 0
  for (let t = 0; t < r.length; t++) e = r.charCodeAt(t) + ((e << 8) - e)
  return Math.abs(e % 6)
}
const Ft = ct,
  Mt = ({
    filterText: r,
    testModel: e,
    testServerConnection: t,
    testTree: s,
    runTests: o,
    runningState: n,
    watchAll: a,
    watchedTreeIds: g,
    setWatchedTreeIds: u,
    isLoading: m,
    onItemSelected: l,
    requestedCollapseAllCount: _,
    requestedExpandAllCount: w,
    setFilterText: h,
    onRevealSource: y
  }) => {
    const [f, S] = c.useState({ expandedItems: new Map() }),
      [k, b] = c.useState(),
      [N, E] = c.useState(_),
      [$, re] = c.useState(w)
    c.useEffect(() => {
      if (N !== _) {
        f.expandedItems.clear()
        for (const I of s.flatTreeItems()) f.expandedItems.set(I.id, !1)
        ;(E(_), b(void 0), S({ ...f }))
        return
      }
      if ($ !== w) {
        f.expandedItems.clear()
        for (const I of s.flatTreeItems()) f.expandedItems.set(I.id, !0)
        ;(re(w), b(void 0), S({ ...f }))
        return
      }
      if (!n || n.itemSelectedByUser) return
      let x
      const P = (I) => {
        var O
        ;(I.children.forEach(P),
          !x &&
            I.status === 'failed' &&
            ((I.kind === 'test' && n.testIds.has(I.test.id)) ||
              (I.kind === 'case' && n.testIds.has((O = I.tests[0]) == null ? void 0 : O.id))) &&
            (x = I))
      }
      ;(P(s.rootItem), x && b(x.id))
    }, [n, b, s, N, E, _, $, re, w, f, S])
    const D = c.useMemo(() => {
      if (k) return s.treeItemById(k)
    }, [k, s])
    ;(c.useEffect(() => {
      if (!e) return
      const x = Lt(D, e)
      let P
      ;((D == null ? void 0 : D.kind) === 'test'
        ? (P = D.test)
        : (D == null ? void 0 : D.kind) === 'case' && D.tests.length === 1 && (P = D.tests[0]),
        l({ treeItem: D, testCase: P, testFile: x }))
    }, [e, D, l]),
      c.useEffect(() => {
        if (!m)
          if (a) t == null || t.watchNoReply({ fileNames: s.fileNames() })
          else {
            const x = new Set()
            for (const P of g.value) {
              const I = s.treeItemById(P),
                O = I == null ? void 0 : I.location.file
              O && x.add(O)
            }
            t == null || t.watchNoReply({ fileNames: [...x] })
          }
      }, [m, s, a, g, t]))
    const Y = (x) => {
        ;(b(x.id), o('bounce-if-busy', s.collectTestIds(x)))
      },
      H = (x, P) => {
        if ((x.preventDefault(), x.stopPropagation(), x.metaKey || x.ctrlKey)) {
          const I = r.split(' ')
          I.includes(P)
            ? h(
                I.filter((O) => O !== P)
                  .join(' ')
                  .trim()
              )
            : h((r + ' ' + P).trim())
        } else
          h(
            (
              r
                .split(' ')
                .filter((I) => !I.startsWith('@'))
                .join(' ') +
              ' ' +
              P
            ).trim()
          )
      }
    return i.jsx(Ft, {
      name: 'tests',
      treeState: f,
      setTreeState: S,
      rootItem: s.rootItem,
      dataTestId: 'test-tree',
      render: (x) => {
        const P = x.id.replace(/[^\w\d-_]/g, '-'),
          I = P + '-label',
          O = P + '-time'
        return i.jsxs('div', {
          className: 'hbox ui-mode-tree-item',
          'aria-labelledby': `${I} ${O}`,
          children: [
            i.jsxs('div', {
              id: I,
              className: 'ui-mode-tree-item-title',
              children: [
                i.jsx('span', { children: x.title }),
                x.kind === 'case'
                  ? x.tags.map((X) => i.jsx(Bt, { tag: X.slice(1), onClick: (fe) => H(fe, X) }, X))
                  : null
              ]
            }),
            !!x.duration &&
              x.status !== 'skipped' &&
              i.jsx('div', {
                id: O,
                className: 'ui-mode-tree-item-time',
                children: ut(x.duration)
              }),
            i.jsxs(z, {
              noMinHeight: !0,
              noShadow: !0,
              children: [
                i.jsx(L, {
                  icon: 'play',
                  title: 'Run',
                  onClick: () => Y(x),
                  disabled: !!n && !n.completed
                }),
                i.jsx(L, {
                  icon: 'go-to-file',
                  title: 'Show source',
                  onClick: y,
                  style:
                    x.kind === 'group' && x.subKind === 'folder' ? { visibility: 'hidden' } : {}
                }),
                !a &&
                  i.jsx(L, {
                    icon: 'eye',
                    title: 'Watch',
                    onClick: () => {
                      ;(g.value.has(x.id) ? g.value.delete(x.id) : g.value.add(x.id), u({ ...g }))
                    },
                    toggled: g.value.has(x.id)
                  })
              ]
            })
          ]
        })
      },
      icon: (x) => dt(x.status),
      title: (x) => x.title,
      selectedItem: D,
      onAccepted: Y,
      onSelected: (x) => {
        ;(n && (n.itemSelectedByUser = !0), b(x.id))
      },
      isError: (x) => (x.kind === 'group' ? x.hasLoadErrors : !1),
      autoExpandDepth: r ? 5 : 1,
      noItemsMessage: m ? 'Loading…' : 'No tests'
    })
  }
function Lt(r, e) {
  if (!(!r || !e))
    return {
      file: r.location.file,
      line: r.location.line,
      column: r.location.column,
      source: {
        errors: e.loadErrors
          .filter((t) => {
            var s
            return ((s = t.location) == null ? void 0 : s.file) === r.location.file
          })
          .map((t) => ({ line: t.location.line, message: t.message })),
        content: void 0
      }
    }
}
function Ot(r) {
  return `.playwright-artifacts-${r}`
}
const Wt = ({ item: r, rootDir: e, onOpenExternally: t, revealSource: s, pathSeparator: o }) => {
    var _, w
    const [n, a] = c.useState(void 0),
      [g, u] = c.useState(0),
      m = c.useRef(null),
      { outputDir: l } = c.useMemo(() => ({ outputDir: r.testCase ? At(r.testCase) : void 0 }), [r])
    return (
      c.useEffect(() => {
        var S, k, b
        m.current && clearTimeout(m.current)
        const h = (S = r.testCase) == null ? void 0 : S.results[0]
        if (!h || ((k = r.treeItem) == null ? void 0 : k.status) === 'scheduled') {
          a(void 0)
          return
        }
        const y = h && h.duration >= 0 && h.attachments.find((N) => N.name === 'trace')
        if (y && y.path) {
          Ne(y.path, h.startTime.getTime()).then((N) => a({ model: N, isLive: !1 }))
          return
        }
        if (!l) {
          a(void 0)
          return
        }
        const f = [
          l,
          Ot(h.workerIndex),
          'traces',
          `${(b = r.testCase) == null ? void 0 : b.id}.json`
        ].join(o)
        return (
          (m.current = setTimeout(async () => {
            try {
              const N = await Ne(f, Date.now())
              a({ model: N, isLive: !0 })
            } catch {
              const N = new De('', [])
              ;(N.errorDescriptors.push(
                ...h.errors.flatMap((E) => (E.message ? [{ message: E.message }] : []))
              ),
                a({ model: N, isLive: !1 }))
            } finally {
              u(g + 1)
            }
          }, 500)),
          () => {
            m.current && clearTimeout(m.current)
          }
        )
      }, [l, r, a, g, u, o]),
      i.jsx(
        ht,
        {
          model: n == null ? void 0 : n.model,
          showSourcesFirst: !0,
          rootDir: e,
          fallbackLocation: r.testFile,
          isLive: n == null ? void 0 : n.isLive,
          status: (_ = r.treeItem) == null ? void 0 : _.status,
          annotations: ((w = r.testCase) == null ? void 0 : w.annotations) ?? [],
          onOpenExternally: t,
          revealSource: s
        },
        'workbench'
      )
    )
  },
  At = (r) => {
    var e
    for (let t = r.parent; t; t = t.parent)
      if (t.project()) return (e = t.project()) == null ? void 0 : e.outputDir
  }
async function Ne(r, e) {
  const t = `file?path=${encodeURIComponent(r)}&timestamp=${e}`,
    s = new URLSearchParams()
  s.set('trace', t)
  const n = await (await fetch(`contexts?${s.toString()}`)).json()
  return new De(t, n)
}
const Ut = ({ files: r, selectedFile: e, onFileSelect: t, runningFile: s }) =>
    i.jsxs('div', {
      className: 'director-file-explorer',
      children: [
        i.jsx('div', { className: 'director-section-title', children: '📁 test-suites' }),
        i.jsx('div', {
          className: 'director-file-list',
          children: r.map((o) =>
            i.jsxs(
              'div',
              {
                className: V(
                  'director-file-item',
                  (e == null ? void 0 : e.path) === o.path && 'selected',
                  o.status === 'running' && 'running',
                  o.status === 'passed' && 'passed',
                  o.status === 'failed' && 'failed',
                  o.status === 'staged' && 'staged'
                ),
                onClick: () => t(o),
                children: [
                  i.jsxs('span', {
                    className: 'director-file-icon',
                    children: [
                      o.status === 'passed' && '✓',
                      o.status === 'failed' && '✗',
                      o.status === 'running' && '⏳',
                      o.status === 'staged' && '🔄',
                      o.status === 'idle' && '📝'
                    ]
                  }),
                  i.jsx('span', { className: 'director-file-name', children: o.name }),
                  o.isModified &&
                    i.jsx('span', { className: 'director-file-modified', children: '●' })
                ]
              },
              o.path
            )
          )
        })
      ]
    }),
  $t = ({ file: r, onContentChange: e, onStage: t, isStaging: s }) => {
    const [o, n] = c.useState('editor'),
      [a, g] = c.useState((r == null ? void 0 : r.content) || '')
    c.useEffect(() => {
      g((r == null ? void 0 : r.content) || '')
    }, [r == null ? void 0 : r.path])
    const u = (_) => {
        const w = _.target.value
        ;(g(w), e(w))
      },
      m = () => {
        if (!r)
          return i.jsx('div', { className: 'director-empty', children: 'Select a file to preview' })
        const _ = a.split(`
`)
        return i.jsx('div', {
          className: 'director-preview-content',
          children: _.map((w, h) => {
            if (w.startsWith('### '))
              return i.jsx('h3', { className: 'director-preview-h3', children: w.slice(4) }, h)
            if (w.startsWith('## '))
              return i.jsx('h2', { className: 'director-preview-h2', children: w.slice(3) }, h)
            if (w.startsWith('# '))
              return i.jsx('h1', { className: 'director-preview-h1', children: w.slice(2) }, h)
            if (w.trim().startsWith('- '))
              return i.jsxs(
                'div',
                {
                  className: 'director-preview-step',
                  children: [
                    i.jsx('span', { className: 'director-preview-bullet', children: '•' }),
                    w.trim().slice(2)
                  ]
                },
                h
              )
            const y = w.match(/^(Given|When|Then|And|But)\s+(.+)$/i)
            if (y) {
              const [, f, S] = y
              return i.jsxs(
                'div',
                {
                  className: 'director-preview-step',
                  children: [
                    i.jsx('span', {
                      className: V('director-gherkin-keyword', f.toLowerCase()),
                      children: f
                    }),
                    S
                  ]
                },
                h
              )
            }
            return w.trim()
              ? i.jsx('div', { className: 'director-preview-text', children: w }, h)
              : i.jsx('div', { className: 'director-preview-empty' }, h)
          })
        })
      },
      l = () =>
        r
          ? i.jsx('textarea', {
              className: 'director-textarea',
              value: a,
              onChange: u,
              spellCheck: !1,
              placeholder: 'Write your test scenario here...'
            })
          : i.jsx('div', { className: 'director-empty', children: 'Select a file to edit' })
    return i.jsxs('div', {
      className: 'director-editor',
      children: [
        i.jsxs(z, {
          noShadow: !0,
          noMinHeight: !0,
          children: [
            i.jsx('span', {
              className: 'director-editor-filename',
              children: (r == null ? void 0 : r.name) || 'No file selected'
            }),
            (r == null ? void 0 : r.isModified) &&
              i.jsx('span', { className: 'director-modified-indicator', children: '●' }),
            i.jsx('div', { className: 'director-spacer' }),
            i.jsxs('div', {
              className: 'director-mode-toggle',
              children: [
                i.jsx('button', {
                  className: V('director-mode-btn', o === 'editor' && 'active'),
                  onClick: () => n('editor'),
                  title: 'Editor',
                  children: 'Editor'
                }),
                i.jsx('button', {
                  className: V('director-mode-btn', o === 'preview' && 'active'),
                  onClick: () => n('preview'),
                  title: 'Preview',
                  children: 'Preview'
                })
              ]
            }),
            i.jsx('div', { className: 'director-spacer' }),
            i.jsx(L, {
              icon: s ? 'sync~spin' : 'sync',
              title: s ? 'Staging...' : 'Stage (generate tests)',
              onClick: t,
              disabled: !r || s
            })
          ]
        }),
        i.jsx('div', { className: 'director-editor-content', children: o === 'editor' ? l() : m() })
      ]
    })
  },
  zt = ({ entries: r, progress: e, onClear: t }) => {
    const s = c.useRef(null)
    c.useEffect(() => {
      s.current && (s.current.scrollTop = s.current.scrollHeight)
    }, [r])
    const o = (n) =>
      new Date(n).toLocaleTimeString('en-US', {
        hour12: !1,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    return i.jsxs('div', {
      className: 'director-output',
      children: [
        i.jsxs(z, {
          noShadow: !0,
          noMinHeight: !0,
          children: [
            i.jsx('span', { className: 'director-output-title', children: 'Output' }),
            i.jsx('div', { className: 'director-spacer' }),
            e &&
              i.jsxs('div', {
                className: 'director-progress',
                children: [
                  i.jsx('span', { className: 'director-progress-file', children: e.file }),
                  i.jsx('span', {
                    className: V('director-progress-status', e.status),
                    children: e.status
                  }),
                  i.jsx('div', {
                    className: 'director-progress-bar',
                    children: i.jsx('div', {
                      className: 'director-progress-fill',
                      style: { width: `${e.progress}%` }
                    })
                  })
                ]
              }),
            i.jsx(L, { icon: 'clear-all', title: 'Clear output', onClick: t })
          ]
        }),
        i.jsx('div', {
          ref: s,
          className: 'director-output-content',
          children:
            r.length === 0
              ? i.jsx('div', { className: 'director-output-empty', children: 'No output yet...' })
              : r.map((n, a) =>
                  i.jsxs(
                    'div',
                    {
                      className: V('director-output-line', `type-${n.type}`),
                      children: [
                        i.jsx('span', {
                          className: 'director-output-time',
                          children: o(n.timestamp)
                        }),
                        i.jsx('span', { className: 'director-output-message', children: n.message })
                      ]
                    },
                    a
                  )
                )
        })
      ]
    })
  },
  Vt = ({ files: r, onFileSelect: e, onFileContentChange: t, onStage: s, onSyncWithTest: o }) => {
    console.log('DirectorPanel rendered with files:', r)
    const [n, a] = c.useState(null),
      [g, u] = c.useState([]),
      [m, l] = c.useState(),
      [_, w] = c.useState(!1),
      h = (b) => {
        ;(a(b), e(b), S('info', `Selected: ${b.name}`))
      },
      y = (b) => {
        n && t(n.path, b)
      },
      f = async () => {
        n &&
          (w(!0),
          S('progress', `Staging ${n.name}...`),
          l({ file: n.name, status: 'parsing', progress: 0, message: 'Parsing Markdown...' }),
          await new Promise((b) => setTimeout(b, 500)),
          l({
            file: n.name,
            status: 'generating',
            progress: 33,
            message: 'Generating test code...'
          }),
          await new Promise((b) => setTimeout(b, 800)),
          l({
            file: n.name,
            status: 'compiling',
            progress: 66,
            message: 'Compiling TypeScript...'
          }),
          await new Promise((b) => setTimeout(b, 600)),
          l({ file: n.name, status: 'done', progress: 100, message: 'Done!' }),
          S('success', `Successfully staged ${n.name}`),
          s(n),
          setTimeout(() => {
            ;(l(void 0), w(!1))
          }, 1e3))
      },
      S = (b, N) => {
        u((E) => [...E, { type: b, message: N, timestamp: Date.now() }])
      },
      k = () => {
        u([])
      }
    return i.jsxs('div', {
      className: 'director-panel',
      children: [
        i.jsxs(z, {
          noShadow: !0,
          noMinHeight: !0,
          children: [
            i.jsx('span', { className: 'director-panel-logo', children: '🎭' }),
            i.jsx('span', { className: 'director-panel-title', children: 'BDD Director' })
          ]
        }),
        i.jsxs('div', {
          className: 'director-panel-content',
          children: [
            i.jsx('div', {
              className: 'director-sidebar',
              children: i.jsx(Ut, { files: r, selectedFile: n, onFileSelect: h })
            }),
            i.jsxs('div', {
              className: 'director-main',
              children: [
                i.jsx('div', {
                  className: 'director-editor-panel',
                  children: i.jsx($t, { file: n, onContentChange: y, onStage: f, isStaging: _ })
                }),
                i.jsx('div', {
                  className: 'director-output-panel',
                  children: i.jsx(zt, { entries: g, progress: m, onClear: k })
                })
              ]
            })
          ]
        })
      ]
    })
  }
let Ce = { cols: 80 }
const K = { pending: [], clear: () => {}, write: (r) => K.pending.push(r), resize: () => {} },
  A = new URLSearchParams(window.location.search),
  Kt = new URL(A.get('server') ?? '../', window.location.href),
  Re = A.get('ws'),
  pe = Re ? new URL(Re, Kt) : new URL('ws://localhost:5600')
pe.protocol = pe.protocol === 'https:' ? 'wss:' : 'ws:'
const B = {
  args: A.getAll('arg'),
  grep: A.get('grep') || void 0,
  grepInvert: A.get('grepInvert') || void 0,
  projects: A.getAll('project'),
  workers: A.get('workers') || void 0,
  headed: A.has('headed'),
  updateSnapshots: A.get('updateSnapshots') || void 0,
  reporters: A.has('reporter') ? A.getAll('reporter') : void 0,
  pathSeparator: A.get('pathSeparator') || '/'
}
B.updateSnapshots &&
  !['all', 'changed', 'none', 'missing'].includes(B.updateSnapshots) &&
  (B.updateSnapshots = void 0)
const Pe = navigator.platform === 'MacIntel'
function Ht(r) {
  return (r.startsWith('/') && (r = r.substring(1)), r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}
function qt(r, e, t) {
  const s = r.passed + r.failed + r.skipped,
    o = e ? ((s / e) * 100) | 0 : 0,
    n = []
  return (
    r.passed > 0 && n.push(`${r.passed} passed`),
    r.failed > 0 &&
      n.push(
        i.jsxs(
          'span',
          { className: 'status-line-failed', children: [r.failed, ' failed'] },
          'failed'
        )
      ),
    r.skipped > 0 && n.push(`${r.skipped} skipped`),
    i.jsx('div', {
      'data-testid': 'status-line',
      className: 'status-line',
      children: i.jsxs('div', {
        children: [
          t && 'Running ',
          s,
          '/',
          e,
          ' (',
          o,
          '%)',
          n.length > 0 && ' — ',
          n.map((a, g) => i.jsxs(c.Fragment, { children: [g > 0 ? ', ' : '', a] }, g))
        ]
      })
    })
  )
}
const Yt = ({}) => {
  var ke
  console.log('UIModeView rendering...')
  const [r, e] = c.useState(''),
    [t, s] = c.useState(!1),
    [o, n] = c.useState(!1),
    [a, g] = c.useState(
      new Map([
        ['passed', !1],
        ['failed', !1],
        ['skipped', !1]
      ])
    ),
    [u, m] = c.useState(new Map()),
    [l, _] = c.useState(),
    [w, h] = c.useState(),
    [y, f] = c.useState({}),
    [S, k] = c.useState(!1),
    [b, N] = c.useState(),
    E = b && !b.completed,
    [$, re] = Q('watch-all', !1),
    [D, Y] = c.useState({ value: new Set() }),
    H = c.useRef(Promise.resolve()),
    x = c.useRef({ testIds: new Set(), locations: new Set() }),
    [P, I] = c.useState(0),
    [O, X] = c.useState(0),
    [fe, Me] = c.useState(!1),
    [be, je] = c.useState(!0),
    [j, Le] = c.useState(),
    [oe, Oe] = c.useState(),
    [ne, We] = c.useState(!1),
    [ae, Ae] = c.useState(!1),
    [Ue, Te] = c.useState(!1),
    $e = c.useCallback(() => Te(!0), [Te]),
    [ze, le] = c.useState([])
  c.useEffect(() => {
    ;(console.log('Fetching test-suites...'),
      fetch('/api/test-suites')
        .then((p) => (console.log('Response:', p.status), p.json()))
        .then((p) => {
          ;(console.log('Files loaded:', p), le(p))
        })
        .catch((p) => {
          ;(console.error('Fetch error:', p), le([]))
        }))
  }, [])
  const [ge, Ve] = Q('single-worker', !1),
    [me, Ke] = Q('updateSnapshots', 'missing'),
    [J, He] = Q('only-changed', !1),
    [xe, qe] = Q('stop-on-failure', !1),
    [Z] = Q('mergeFiles', !1),
    Ye = c.useRef(null),
    ce = c.useCallback(() => {
      ;(console.log('Connecting to test server:', pe),
        Le((p) => (p == null || p.close(), new pt(new ft(pe)))))
    }, [])
  ;(c.useEffect(() => {
    var p
    ;((p = Ye.current) == null || p.focus(), k(!0), ce())
  }, [ce]),
    c.useEffect(() => {
      if (!j) return
      const p = [
        j.onStdio((v) => {
          if (v.buffer) {
            const T = atob(v.buffer)
            K.write(T)
          } else K.write(v.text)
          v.type === 'stderr' && n(!0)
        }),
        j.onClose(() => Me(!0))
      ]
      return (
        (K.resize = (v, T) => {
          ;((Ce = { cols: v, rows: T }), j.resizeTerminalNoReply({ cols: v, rows: T }))
        }),
        () => {
          for (const v of p) v.dispose()
        }
      )
    }, [j]),
    c.useEffect(() => {
      if (!j) return
      let p
      const v = new Et({
        onUpdate: (T) => {
          ;(clearTimeout(p),
            (p = void 0),
            T
              ? _(v.asModel())
              : p ||
                (p = setTimeout(() => {
                  _(v.asModel())
                }, 250)))
        },
        onError: (T) => {
          ;(K.write(
            (T.stack || T.value || '') +
              `
`
          ),
            n(!0))
        },
        pathSeparator: B.pathSeparator
      })
      return (
        Oe(v),
        _(void 0),
        k(!0),
        Y({ value: new Set() }),
        (async () => {
          try {
            await j.initialize({ interceptStdio: !0, watchTestDirs: !0 })
            const { status: T, report: C } = await j.runGlobalSetup({})
            if ((v.processGlobalReport(C), T !== 'passed')) return
            const F = await j.listTests({
              projects: B.projects,
              locations: B.args,
              grep: B.grep,
              grepInvert: B.grepInvert,
              onlyChanged: J
            })
            ;(v.processListReport(F.report),
              j.onReport((q) => {
                v.processTestReportEvent(q)
              }))
            const { hasBrowsers: W } = await j.checkBrowsers({})
            je(W)
          } finally {
            k(!1)
          }
        })(),
        () => {
          clearTimeout(p)
        }
      )
    }, [J, j]),
    c.useEffect(() => {
      if (!l) return
      const { config: p, rootSuite: v } = l,
        T = p.configFile ? Be.getObject(p.configFile + ':projects', void 0) : void 0,
        C = new Map(u)
      for (const F of C.keys()) v.suites.find((W) => W.title === F) || C.delete(F)
      for (const F of v.suites)
        C.has(F.title) || C.set(F.title, !!(T != null && T.includes(F.title)))
      ;(!T && C.size && ![...C.values()].includes(!0) && C.set(C.entries().next().value[0], !0),
        (u.size !== C.size || [...u].some(([F, W]) => C.get(F) !== W)) && m(C))
    }, [u, l]),
    c.useEffect(() => {
      E && l != null && l.progress ? h(l.progress) : l || h(void 0)
    }, [l, E]))
  const { testTree: de } = c.useMemo(() => {
      if (!l) return { testTree: new Se('', new se('', 'root'), [], u, B.pathSeparator, Z) }
      const p = new Se('', l.rootSuite, l.loadErrors, u, B.pathSeparator, Z)
      return (
        p.filterTree(r, a, E ? (b == null ? void 0 : b.testIds) : void 0),
        p.sortAndPropagateStatus(),
        p.shortenRoot(),
        p.flattenForSingleProject(),
        { testTree: p }
      )
    }, [r, l, a, u, b, E, Z]),
    ee = c.useCallback(
      (p, v) => {
        if (!(!j || !l) && !(p === 'bounce-if-busy' && E)) {
          for (const T of v.testIds) x.current.testIds.add(T)
          for (const T of v.locations) x.current.locations.add(T)
          H.current = H.current.then(async () => {
            var W, q, U
            const { testIds: T, locations: C } = x.current
            if (((x.current = { testIds: new Set(), locations: new Set() }), !T.size)) return
            {
              for (const R of ((W = l.rootSuite) == null ? void 0 : W.allTests()) || [])
                if (T.has(R.id)) {
                  R.results = []
                  const M = R._createTestResult('pending')
                  M[ie] = 'scheduled'
                }
              _({ ...l })
            }
            const F = '  [' + new Date().toLocaleTimeString() + ']'
            ;(K.write('\x1B[2m—'.repeat(Math.max(0, Ce.cols - F.length)) + F + '\x1B[22m'),
              h({ total: 0, passed: 0, failed: 0, skipped: 0 }),
              N({ testIds: T }),
              await j.runTests({
                locations: [...C].map(Ht),
                grep: B.grep,
                grepInvert: B.grepInvert,
                testIds: [...T],
                projects: [...u].filter(([R, M]) => M).map(([R]) => R),
                updateSnapshots: me,
                reporters: B.reporters,
                workers: ge ? 1 : void 0,
                maxFailures: xe ? 1 : void 0,
                trace: 'on'
              }))
            for (const R of ((q = l.rootSuite) == null ? void 0 : q.allTests()) || [])
              ((U = R.results[0]) == null ? void 0 : U.duration) === -1 && (R.results = [])
            ;(_({ ...l }), N((R) => (R ? { ...R, completed: !0 } : void 0)))
          })
        }
      },
      [u, E, l, j, me, ge, xe]
    ),
    ue = c.useCallback(() => ee('bounce-if-busy', de.collectTestIds(de.rootItem)), [ee, de])
  ;(c.useEffect(() => {
    if (!j || !oe) return
    const p = j.onTestFilesChanged(async (v) => {
      if (
        ((H.current = H.current.then(async () => {
          k(!0)
          try {
            const U = await j.listTests({
              projects: B.projects,
              locations: B.args,
              grep: B.grep,
              grepInvert: B.grepInvert,
              onlyChanged: J
            })
            oe.processListReport(U.report)
          } catch (U) {
            console.log(U)
          } finally {
            k(!1)
          }
        })),
        await H.current,
        v.testFiles.length === 0)
      )
        return
      const T = oe.asModel(),
        C = new Se('', T.rootSuite, T.loadErrors, u, B.pathSeparator, Z),
        F = [],
        W = [],
        q = new Set(v.testFiles)
      if ($) {
        const U = (R) => {
          const M = R.location.file
          if (M && q.has(M)) {
            const te = C.collectTestIds(R)
            ;(F.push(...te.locations), W.push(...te.testIds))
          }
          R.kind === 'group' && R.subKind === 'folder' && R.children.forEach(U)
        }
        U(C.rootItem)
      } else
        for (const U of D.value) {
          const R = C.treeItemById(U)
          if (!R) continue
          let M = R
          for (
            ;
            !(M.kind === 'group' && (M.subKind === 'file' || M.subKind === 'folder')) && M.parent;
          )
            M = M.parent
          const te = M == null ? void 0 : M.location.file
          if (te && q.has(te)) {
            const ye = C.collectTestIds(R)
            ;(F.push(...ye.locations), W.push(...ye.testIds))
          }
        }
      ee('queue-if-busy', { locations: F, testIds: W })
    })
    return () => p.dispose()
  }, [ee, j, $, D, oe, u, Z, J]),
    c.useEffect(() => {
      if (!j) return
      const p = (v) => {
        v.code === 'Backquote' && v.ctrlKey
          ? (v.preventDefault(), s(!t))
          : v.code === 'F5' && v.shiftKey
            ? (v.preventDefault(), j == null || j.stopTestsNoReply({}))
            : v.code === 'F5' && (v.preventDefault(), ue())
      }
      return (
        addEventListener('keydown', p),
        () => {
          removeEventListener('keydown', p)
        }
      )
    }, [ue, ce, j, t]))
  const ve = c.useRef(null),
    Ge = c.useCallback((p) => {
      var v
      ;(p.preventDefault(), p.stopPropagation(), (v = ve.current) == null || v.showModal())
    }, []),
    _e = c.useCallback((p) => {
      var v
      ;(p.preventDefault(), p.stopPropagation(), (v = ve.current) == null || v.close())
    }, []),
    Qe = c.useCallback(
      (p) => {
        ;(_e(p),
          s(!0),
          j == null ||
            j.installBrowsers({}).then(async () => {
              s(!1)
              const { hasBrowsers: v } = await (j == null ? void 0 : j.checkBrowsers({}))
              je(v)
            }))
      },
      [_e, j]
    ),
    Xe = c.useCallback((p) => {
      console.log('Selected file:', p.name)
    }, []),
    Je = c.useCallback((p, v) => {
      le((T) => T.map((C) => (C.path === p ? { ...C, content: v, isModified: !0 } : C)))
    }, []),
    Ze = c.useCallback((p) => {
      ;(console.log('Staging file:', p.name),
        le((v) =>
          v.map((T) => (T.path === p.path ? { ...T, status: 'staged', isModified: !1 } : T))
        ))
    }, []),
    et = c.useCallback((p) => {
      console.log('Sync with test:', p)
    }, [])
  return i.jsxs('div', {
    className: 'vbox ui-mode',
    children: [
      !be &&
        i.jsxs('dialog', {
          ref: ve,
          children: [
            i.jsxs('div', {
              className: 'title',
              children: [
                i.jsx('span', { className: 'codicon codicon-lightbulb' }),
                'Install browsers'
              ]
            }),
            i.jsxs('div', {
              className: 'body',
              children: [
                'Playwright did not find installed browsers.',
                i.jsx('br', {}),
                'Would you like to run `playwright install`?',
                i.jsx('br', {}),
                i.jsx('button', { className: 'button', onClick: Qe, children: 'Install' }),
                i.jsx('button', { className: 'button secondary', onClick: _e, children: 'Dismiss' })
              ]
            })
          ]
        }),
      fe &&
        i.jsxs('div', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: '#d32f2f',
            color: 'white',
            padding: '4px 8px',
            fontSize: '12px',
            zIndex: 1e3,
            textAlign: 'center'
          },
          children: [
            'UI Mode disconnected — ',
            i.jsx('a', {
              href: '/',
              style: { color: 'white', textDecoration: 'underline' },
              children: 'Reload'
            })
          ]
        }),
      i.jsx(Ie, {
        sidebarSize: 350,
        minSidebarSize: 250,
        orientation: 'horizontal',
        sidebarIsFirst: !0,
        settingName: 'directorSidebar',
        sidebar: i.jsx(Vt, {
          files: ze,
          onFileSelect: Xe,
          onFileContentChange: Je,
          onStage: Ze,
          onSyncWithTest: et
        }),
        main: i.jsx(Ie, {
          sidebarSize: 250,
          minSidebarSize: 150,
          orientation: 'horizontal',
          sidebarIsFirst: !0,
          settingName: 'testListSidebar',
          main: i.jsxs('div', {
            className: 'vbox',
            children: [
              i.jsxs('div', {
                className: V('vbox', !t && 'hidden'),
                children: [
                  i.jsxs(z, {
                    children: [
                      i.jsx('div', {
                        className: 'section-title',
                        style: { flex: 'none' },
                        children: 'Output'
                      }),
                      i.jsx(L, {
                        icon: 'circle-slash',
                        title: 'Clear output',
                        onClick: () => {
                          ;(K.clear(), n(!1))
                        }
                      }),
                      i.jsx('div', { className: 'spacer' }),
                      i.jsx(L, { icon: 'close', title: 'Close', onClick: () => s(!1) })
                    ]
                  }),
                  i.jsx(Nt, { source: K })
                ]
              }),
              i.jsx('div', {
                className: V('vbox', t && 'hidden'),
                children: i.jsx(Wt, {
                  pathSeparator: B.pathSeparator,
                  item: y,
                  rootDir: (ke = l == null ? void 0 : l.config) == null ? void 0 : ke.rootDir,
                  revealSource: Ue,
                  onOpenExternally: (p) =>
                    j == null
                      ? void 0
                      : j.openNoReply({
                          location: { file: p.file, line: p.line, column: p.column }
                        })
                })
              })
            ]
          }),
          sidebar: i.jsxs('div', {
            className: 'vbox ui-mode-sidebar',
            children: [
              i.jsxs(z, {
                noShadow: !0,
                noMinHeight: !0,
                children: [
                  i.jsx('img', { src: 'playwright-logo.svg', alt: 'Playwright logo' }),
                  i.jsx('div', { className: 'section-title', children: 'Playwright' }),
                  i.jsx(L, {
                    icon: 'refresh',
                    title: 'Reload',
                    onClick: () => ce(),
                    disabled: E || S
                  }),
                  i.jsx('div', {
                    style: { position: 'relative' },
                    children: i.jsx(L, {
                      icon: 'terminal',
                      title: 'Toggle output — ' + (Pe ? '⌃`' : 'Ctrl + `'),
                      toggled: t,
                      errorBadge: o ? 'Output contains error' : void 0,
                      onClick: () => {
                        s(!t)
                      }
                    })
                  }),
                  !be &&
                    i.jsx(L, {
                      icon: 'lightbulb-autofix',
                      style: { color: 'var(--vscode-list-warningForeground)' },
                      title: 'Playwright browsers are missing',
                      onClick: Ge
                    })
                ]
              }),
              i.jsx(Pt, {
                filterText: r,
                setFilterText: e,
                statusFilters: a,
                setStatusFilters: g,
                projectFilters: u,
                setProjectFilters: m,
                onlyChanged: J,
                setOnlyChanged: He,
                testModel: l,
                runTests: ue
              }),
              i.jsxs(z, {
                className: 'section-toolbar',
                noMinHeight: !0,
                children: [
                  !E && !w && i.jsx('div', { className: 'section-title', children: 'Tests' }),
                  w && qt(w, E ? b.testIds.size : w.total, !!E),
                  i.jsx(L, { icon: 'play', title: 'Run all — F5', onClick: ue, disabled: E || S }),
                  i.jsx(L, {
                    icon: 'debug-stop',
                    title: 'Stop — ' + (Pe ? '⇧F5' : 'Shift + F5'),
                    onClick: () => (j == null ? void 0 : j.stopTests({})),
                    disabled: !E || S,
                    testId: 'stop-button'
                  }),
                  i.jsx(L, {
                    icon: 'eye',
                    title: 'Watch all',
                    toggled: $,
                    onClick: () => {
                      ;(Y({ value: new Set() }), re(!$))
                    }
                  }),
                  i.jsx(L, {
                    icon: 'collapse-all',
                    title: 'Collapse all',
                    onClick: () => {
                      I(P + 1)
                    }
                  }),
                  i.jsx(L, {
                    icon: 'expand-all',
                    title: 'Expand all',
                    onClick: () => {
                      X(O + 1)
                    }
                  })
                ]
              }),
              i.jsx(Mt, {
                filterText: r,
                testModel: l,
                testTree: de,
                testServerConnection: j,
                runningState: b,
                runTests: ee,
                onItemSelected: f,
                watchAll: $,
                watchedTreeIds: D,
                setWatchedTreeIds: Y,
                isLoading: S,
                requestedCollapseAllCount: P,
                requestedExpandAllCount: O,
                setFilterText: e,
                onRevealSource: $e
              }),
              i.jsxs(z, {
                noShadow: !0,
                noMinHeight: !0,
                className: 'settings-toolbar',
                onClick: () => Ae(!ae),
                children: [
                  i.jsx('span', {
                    className: `codicon codicon-${ae ? 'chevron-down' : 'chevron-right'}`,
                    style: { marginLeft: 5 },
                    title: ae ? 'Hide Testing Options' : 'Show Testing Options'
                  }),
                  i.jsx('div', { className: 'section-title', children: 'Testing Options' })
                ]
              }),
              ae &&
                i.jsx(gt, {
                  settings: [
                    { type: 'check', value: ge, set: Ve, name: 'Single worker' },
                    { type: 'check', value: xe, set: qe, name: 'Stop on first failure' },
                    {
                      type: 'select',
                      options: [
                        { label: 'All', value: 'all' },
                        { label: 'Changed', value: 'changed' },
                        { label: 'Missing', value: 'missing' },
                        { label: 'None', value: 'none' }
                      ],
                      value: me,
                      set: Ke,
                      name: 'Update snapshots'
                    }
                  ]
                }),
              i.jsxs(z, {
                noShadow: !0,
                noMinHeight: !0,
                className: 'settings-toolbar',
                onClick: () => We(!ne),
                children: [
                  i.jsx('span', {
                    className: `codicon codicon-${ne ? 'chevron-down' : 'chevron-right'}`,
                    style: { marginLeft: 5 },
                    title: ne ? 'Hide Settings' : 'Show Settings'
                  }),
                  i.jsx('div', { className: 'section-title', children: 'Settings' })
                ]
              }),
              ne && i.jsx(mt, { location: 'ui-mode' })
            ]
          })
        })
      })
    ]
  })
}
;(async () => {
  if (
    (console.log('uiMode.tsx starting...'),
    xt(),
    console.log('Theme applied, protocol:', window.location.protocol),
    window.location.protocol !== 'file:')
  ) {
    if (
      (window.location.href.includes('isUnderTest=true') &&
        (await new Promise((r) => setTimeout(r, 1e3))),
      !navigator.serviceWorker)
    )
      throw new Error(`Service workers are not supported.
Make sure to serve the website (${window.location}) via HTTPS or localhost.`)
    ;(navigator.serviceWorker.register('sw.bundle.js').catch(() => {}),
      setInterval(function () {
        fetch('ping')
      }, 1e4))
  }
  ;(console.log('About to render UIModeView...'),
    vt.createRoot(document.querySelector('#root')).render(i.jsx(Yt, {})),
    console.log('UIModeView rendered!'))
})()
