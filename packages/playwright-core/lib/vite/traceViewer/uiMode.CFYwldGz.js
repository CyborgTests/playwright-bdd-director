const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f || (m.f = ['./assets/xtermModule-CsJ4vdCR.js', './xtermModule.DYP7pi_n.css'])
) => i.map((i) => d[i])
var et = Object.defineProperty
var tt = (r, e, t) =>
  e in r ? et(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : (r[e] = t)
var d = (r, e, t) => tt(r, typeof e != 'symbol' ? e + '' : e, t)
import './assets/urlMatch-BYQrIQwR.js'
import {
  u as st,
  r as Y,
  g as it,
  _ as rt,
  h as nt,
  i as ot,
  j as i,
  R as c,
  E as at,
  s as Pe,
  k as K,
  l as lt,
  t as ct,
  m as dt,
  n as z,
  o as F,
  T as Be,
  c as ut,
  p as Q,
  a as ht,
  W as pt,
  S as Ie,
  q as ft,
  b as gt,
  e as mt,
  f as xt
} from './assets/defaultSettingsView-BL7NE1cb.js'
var vt = {}
class ve {
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
      ? this._rootSuite.suites.find((o) => o.project().name === e.name)
      : void 0
    t || ((t = new se(e.name, 'project')), this._rootSuite._addSuite(t))
    const s = this._parseProject(e)
    t._project = s
    let n = -1
    ;(this._options.mergeProjects &&
      (n = this._config.projects.findIndex((o) => o.name === e.name)),
      n === -1 ? this._config.projects.push(s) : (this._config.projects[n] = s))
    for (const o of e.suites) this._mergeSuiteInto(o, t)
  }
  _onBegin() {
    var e, t
    ;(t = (e = this._reporter).onBegin) == null || t.call(e, this._rootSuite)
  }
  _onTestBegin(e, t) {
    var o, a
    const s = this._tests.get(e)
    this._options.clearPreviousResultsWhenTestBegins && (s.results = [])
    const n = s._createTestResult(t.id)
    ;((n.retry = t.retry),
      (n.workerIndex = t.workerIndex),
      (n.parallelIndex = t.parallelIndex),
      n.setStartTimeNumber(t.startTime),
      (a = (o = this._reporter).onTestBegin) == null || a.call(o, s, n))
  }
  _onTestPaused(e, t, s) {
    var a, f
    const n = this._tests.get(e),
      o = n.results.find((u) => u._id === t)
    ;(o.errors.push(...s),
      (o.error = o.errors[0]),
      (f = (a = this._reporter).onTestPaused) == null || f.call(a, n, o))
  }
  _onTestEnd(e, t) {
    var o, a
    const s = this._tests.get(e.testId)
    ;((s.timeout = e.timeout), (s.expectedStatus = e.expectedStatus))
    const n = s.results.find((f) => f._id === t.id)
    ;((n.duration = t.duration),
      (n.status = t.status),
      n.errors.push(...(t.errors ?? [])),
      (n.error = n.errors[0]),
      t.attachments && (n.attachments = this._parseAttachments(t.attachments)),
      t.annotations &&
        (this._absoluteAnnotationLocationsInplace(t.annotations),
        (n.annotations = t.annotations),
        (s.annotations = t.annotations)),
      (a = (o = this._reporter).onTestEnd) == null || a.call(o, s, n),
      (n._stepMap = new Map()))
  }
  _onStepBegin(e, t, s) {
    var m, l
    const n = this._tests.get(e),
      o = n.results.find((_) => _._id === t),
      a = s.parentStepId ? o._stepMap.get(s.parentStepId) : void 0,
      f = this._absoluteLocation(s.location),
      u = new wt(s, a, f, o)
    ;(a ? a.steps.push(u) : o.steps.push(u),
      o._stepMap.set(s.id, u),
      (l = (m = this._reporter).onStepBegin) == null || l.call(m, n, o, u))
  }
  _onStepEnd(e, t, s) {
    var f, u
    const n = this._tests.get(e),
      o = n.results.find((m) => m._id === t),
      a = o._stepMap.get(s.id)
    ;((a._endPayload = s),
      (a.duration = s.duration),
      (a.error = s.error),
      (u = (f = this._reporter).onStepEnd) == null || u.call(f, n, o, a))
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
    var n, o
    let s
    if (t) {
      const a = this._config.projects.find((f) => f.name === t.projectName)
      a &&
        (s = {
          workerIndex: t.workerIndex,
          parallelIndex: t.parallelIndex,
          config: this._config,
          project: a
        })
    }
    ;(o = (n = this._reporter).onError) == null || o.call(n, e, s)
  }
  _onStdIO(e, t, s, n, o) {
    var m, l, _, w
    const a = o ? (globalThis.Buffer ? Buffer.from(n, 'base64') : atob(n)) : n,
      f = t ? this._tests.get(t) : void 0,
      u = f && s ? f.results.find((h) => h._id === s) : void 0
    e === 'stdout'
      ? (u == null || u.stdout.push(a),
        (l = (m = this._reporter).onStdOut) == null || l.call(m, a, f, u))
      : (u == null || u.stderr.push(a),
        (w = (_ = this._reporter).onStdErr) == null || w.call(_, a, f, u))
  }
  async _onEnd(e) {
    var t, s
    await ((s = (t = this._reporter).onEnd) == null ? void 0 : s.call(t, Tt(e)))
  }
  _onExit() {
    var e, t
    return (t = (e = this._reporter).onExit) == null ? void 0 : t.call(e)
  }
  _parseConfig(e) {
    const t = kt(e)
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
      testIgnore: ue(e.testIgnore),
      testMatch: ue(e.testMatch),
      timeout: e.timeout,
      grep: ue(e.grep),
      grepInvert: ue(e.grepInvert),
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
    let s = t.suites.find((n) => n.title === e.title)
    ;(s || ((s = new se(e.title, t.type === 'project' ? 'file' : 'describe')), t._addSuite(s)),
      (s.location = this._absoluteLocation(e.location)),
      e.entries.forEach((n) => {
        'testId' in n ? this._mergeTestInto(n, s) : this._mergeSuiteInto(n, s)
      }))
  }
  _mergeTestInto(e, t) {
    let s = this._options.mergeTestCases
      ? t.tests.find((n) => n.title === e.title && n.repeatEachIndex === e.repeatEachIndex)
      : void 0
    ;(s ||
      ((s = new _t(e.testId, e.title, this._absoluteLocation(e.location), e.repeatEachIndex)),
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
        for (const n of s.entries()) n.type === 'test' ? e.push(n) : t(n)
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
class _t {
  constructor(e, t, s, n) {
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
    ;((this.id = e), (this.title = t), (this.location = s), (this.repeatEachIndex = n))
  }
  titlePath() {
    const e = this.parent ? this.parent.titlePath() : []
    return (e.push(this.title), e)
  }
  outcome() {
    return jt(this)
  }
  ok() {
    const e = this.outcome()
    return e === 'expected' || e === 'flaky' || e === 'skipped'
  }
  _createTestResult(e) {
    const t = new St(this.results.length, e)
    return (this.results.push(t), t)
  }
}
class wt {
  constructor(e, t, s, n) {
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
      (this._result = n))
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
class St {
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
const bt = {
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
  reporter: [[vt.CI ? 'dot' : 'list']],
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
function ue(r) {
  return r.map((e) => (e.s !== void 0 ? e.s : new RegExp(e.r.source, e.r.flags)))
}
function jt(r) {
  let e = 0,
    t = 0,
    s = 0
  for (const n of r.results)
    n.status === 'interrupted' ||
      (n.status === 'skipped' && r.expectedStatus === 'skipped'
        ? ++e
        : n.status === 'skipped' || (n.status === r.expectedStatus ? ++t : ++s))
  return t === 0 && s === 0
    ? 'skipped'
    : s === 0
      ? 'expected'
      : t === 0 && e === 0
        ? 'unexpected'
        : 'flaky'
}
function Tt(r) {
  return { status: r.status, startTime: new Date(r.startTime), duration: r.duration }
}
function kt(r) {
  return { ...bt, ...r }
}
class _e {
  constructor(e, t, s, n, o, a) {
    d(this, 'rootItem')
    d(this, '_treeItemById', new Map())
    d(this, '_treeItemByTestId', new Map())
    d(this, 'pathSeparator')
    const f = n && [...n.values()].some(Boolean)
    ;((this.pathSeparator = o),
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
        let y = _.children.find((p) => p.kind === 'group' && p.title === h.title)
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
        let p = _.children.find((E) => E.kind !== 'group' && E.title === y)
        p ||
          ((p = {
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
          this._addChild(_, p))
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
          p.tests.push(h))
        const b = {
          kind: 'test',
          id: h.id,
          title: m.name,
          location: h.location,
          test: h,
          parent: p,
          children: [],
          status: k,
          duration: h.results.length ? Math.max(0, h.results[0].duration) : 0,
          project: m
        }
        ;(this._addChild(p, b),
          this._treeItemByTestId.set(h.id, b),
          (p.duration = p.children.reduce((E, N) => E + N.duration, 0)))
      }
    }
    for (const m of (t == null ? void 0 : t.suites) || [])
      if (!(f && !n.get(m.title)))
        for (const l of m.suites)
          if (a) {
            if ((u(m.project(), l, this.rootItem, 'suites'), l.tests.length)) {
              const _ = this._defaultDescribeItem()
              u(m.project(), l, _, 'tests')
            }
          } else {
            const _ = this._fileItem(l.location.file.split(o), !0)
            u(m.project(), l, _, 'all')
          }
    for (const m of s) {
      if (!m.location) continue
      const l = this._fileItem(m.location.file.split(o), !0)
      l.hasLoadErrors = !0
    }
  }
  _addChild(e, t) {
    ;(e.children.push(t), (t.parent = e), this._treeItemById.set(t.id, t))
  }
  filterTree(e, t, s) {
    const n = e.trim().toLowerCase().split(' '),
      o = [...t.values()].some(Boolean),
      a = (u) => {
        const m = [...u.tests[0].titlePath(), ...u.tests[0].tags].join(' ').toLowerCase()
        return !n.every((l) => m.includes(l)) &&
          !u.tests.some((l) => (s == null ? void 0 : s.has(l.id)))
          ? !1
          : ((u.children = u.children.filter(
              (l) => !o || (s == null ? void 0 : s.has(l.test.id)) || t.get(l.status)
            )),
            (u.tests = u.children.map((l) => l.test)),
            !!u.children.length)
      },
      f = (u) => {
        const m = []
        for (const l of u.children)
          l.kind === 'case'
            ? a(l) && m.push(l)
            : (f(l), (l.children.length || l.hasLoadErrors) && m.push(l))
        u.children = m
      }
    f(this.rootItem)
  }
  _fileItem(e, t) {
    if (e.length === 0) return this.rootItem
    const s = e.join(this.pathSeparator),
      n = this._treeItemById.get(s)
    if (n) return n
    const o = this._fileItem(e.slice(0, e.length - 1), !1),
      a = {
        kind: 'group',
        subKind: t ? 'file' : 'folder',
        id: s,
        title: e[e.length - 1],
        location: { file: s, line: 0, column: 0 },
        duration: 0,
        parent: o,
        children: [],
        status: 'none',
        hasLoadErrors: !1
      }
    return (this._addChild(o, a), a)
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
    De(this.rootItem)
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
    return yt(e)
  }
}
function De(r) {
  for (const a of r.children) De(a)
  r.kind === 'group' &&
    r.children.sort(
      (a, f) => a.location.file.localeCompare(f.location.file) || a.location.line - f.location.line
    )
  let e = r.children.length > 0,
    t = r.children.length > 0,
    s = !1,
    n = !1,
    o = !1
  for (const a of r.children)
    ((t = t && a.status === 'skipped'),
      (e = e && (a.status === 'passed' || a.status === 'skipped')),
      (s = s || a.status === 'failed'),
      (n = n || a.status === 'running'),
      (o = o || a.status === 'scheduled'))
  n
    ? (r.status = 'running')
    : o
      ? (r.status = 'scheduled')
      : s
        ? (r.status = 'failed')
        : t
          ? (r.status = 'skipped')
          : e && (r.status = 'passed')
}
function yt(r) {
  const e = new Set(),
    t = new Set(),
    s = (n) => {
      if (n.kind !== 'test' && n.kind !== 'case') {
        n.children.forEach(s)
        return
      }
      let o = n
      for (; o && o.parent && !(o.kind === 'group' && o.subKind === 'file'); ) o = o.parent
      ;(t.add(o.location.file),
        n.kind === 'case' ? n.tests.forEach((a) => e.add(a.id)) : e.add(n.id))
    }
  return (s(r), { testIds: e, locations: t })
}
const ie = Symbol('statusEx')
class It {
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
    ;((this._receiver = new ve(this._createReporter(), {
      mergeProjects: !0,
      mergeTestCases: !0,
      resolvePath: Ne(e.pathSeparator),
      clearPreviousResultsWhenTestBegins: !0
    })),
      (this._options = e))
  }
  _createReporter() {
    return {
      version: () => 'v2',
      onConfigure: (e) => {
        ;((this.config = e),
          (this._lastRunReceiver = new ve(
            {
              version: () => 'v2',
              onBegin: (t) => {
                ;((this._lastRunTestCount = t.allTests().length), (this._lastRunReceiver = void 0))
              }
            },
            { mergeProjects: !0, mergeTestCases: !1, resolvePath: Ne(this._options.pathSeparator) }
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
    const t = new ve({
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
    ;((this._testResultsSnapshot = new Map(t.map((n) => [n.id, n.results]))),
      this._receiver.reset())
    for (const n of e) this._receiver.dispatch(n)
  }
  processTestReportEvent(e) {
    var t, s, n
    ;((s = (t = this._lastRunReceiver) == null ? void 0 : t.dispatch(e)) == null ||
      s.catch(() => {}),
      (n = this._receiver.dispatch(e)) == null || n.catch(() => {}))
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
function Ne(r) {
  return (e, t) => {
    const s = []
    for (const n of [...e.split(r), ...t.split(r)]) {
      const o = r === '\\' && s.length === 1 && s[0].endsWith(':'),
        a = !s.length
      if (!(!n && !a && !o) && n !== '.') {
        if (n === '..') {
          s.pop()
          continue
        }
        s.push(n)
      }
    }
    return s.join(r)
  }
}
const Nt = ({ source: r }) => {
    const [e, t] = st(),
      [s, n] = Y.useState(it()),
      [o] = Y.useState(
        rt(
          () => import('./assets/xtermModule-CsJ4vdCR.js'),
          __vite__mapDeps([0, 1]),
          import.meta.url
        ).then((f) => f.default)
      ),
      a = Y.useRef(null)
    return (
      Y.useEffect(() => (nt(n), () => ot(n)), []),
      Y.useEffect(() => {
        const f = r.write,
          u = r.clear
        return (
          (async () => {
            const { Terminal: m, FitAddon: l } = await o,
              _ = t.current
            if (!_) return
            const w = s === 'dark-mode' ? Ct : Et
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
            for (const p of r.pending) h.write(p)
            ;((r.write = (p) => {
              ;(r.pending.push(p), h.write(p))
            }),
              (r.clear = () => {
                ;((r.pending = []), h.clear())
              }),
              h.open(_),
              y.fit(),
              (a.current = { terminal: h, fitAddon: y }))
          })(),
          () => {
            ;((r.clear = u), (r.write = f))
          }
        )
      }, [o, a, t, r, s]),
      Y.useEffect(() => {
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
  Et = {
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
  Ct = {
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
  Rt = ({
    filterText: r,
    setFilterText: e,
    statusFilters: t,
    setStatusFilters: s,
    projectFilters: n,
    setProjectFilters: o,
    onlyChanged: a,
    setOnlyChanged: f,
    testModel: u,
    runTests: m
  }) => {
    const [l, _] = c.useState(!1),
      w = c.useRef(null)
    c.useEffect(() => {
      var p
      ;(p = w.current) == null || p.focus()
    }, [])
    const h =
        [...t.entries()]
          .filter(([p, S]) => S)
          .map(([p]) => p)
          .join(' ') || 'all',
      y =
        [...n.entries()]
          .filter(([p, S]) => S)
          .map(([p]) => p)
          .join(' ') || 'all'
    return i.jsxs('div', {
      className: 'filters',
      children: [
        i.jsx(at, {
          expanded: l,
          setExpanded: _,
          title: i.jsx('input', {
            ref: w,
            type: 'search',
            placeholder: 'Filter (e.g. text, @tag)',
            spellCheck: !1,
            value: r,
            onChange: (p) => {
              e(p.target.value)
            },
            onKeyDown: (p) => {
              p.key === 'Enter' && m()
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
                    children: [...t.entries()].map(([p, S]) =>
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
                                  ;(k.set(p, !k.get(p)), s(k))
                                }
                              }),
                              i.jsx('div', { children: p })
                            ]
                          })
                        },
                        p
                      )
                    )
                  }),
                  i.jsx('div', {
                    className: 'filter-list',
                    role: 'list',
                    'data-testid': 'project-filters',
                    children: [...n.entries()].map(([p, S]) =>
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
                                  var E
                                  const k = new Map(n)
                                  ;(k.set(p, !k.get(p)), o(k))
                                  const b =
                                    (E = u == null ? void 0 : u.config) == null
                                      ? void 0
                                      : E.configFile
                                  b &&
                                    Pe.setObject(
                                      b + ':projects',
                                      [...k.entries()].filter(([N, $]) => $).map(([N]) => N)
                                    )
                                }
                              }),
                              i.jsx('div', { children: p || 'untitled' })
                            ]
                          })
                        },
                        p
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
                    i.jsx('input', { type: 'checkbox', checked: a, onChange: () => f(!a) }),
                    i.jsx('div', { children: 'Show only changed files' })
                  ]
                })
              })
            ]
          })
      ]
    })
  },
  Pt = ({ tag: r, style: e, onClick: t }) =>
    i.jsx('span', {
      className: K('tag', `tag-color-${Bt(r)}`),
      onClick: t,
      style: { margin: '6px 0 0 6px', ...e },
      title: `Click to filter by tag: ${r}`,
      children: r
    })
function Bt(r) {
  let e = 0
  for (let t = 0; t < r.length; t++) e = r.charCodeAt(t) + ((e << 8) - e)
  return Math.abs(e % 6)
}
const Dt = lt,
  Lt = ({
    filterText: r,
    testModel: e,
    testServerConnection: t,
    testTree: s,
    runTests: n,
    runningState: o,
    watchAll: a,
    watchedTreeIds: f,
    setWatchedTreeIds: u,
    isLoading: m,
    onItemSelected: l,
    requestedCollapseAllCount: _,
    requestedExpandAllCount: w,
    setFilterText: h,
    onRevealSource: y
  }) => {
    const [p, S] = c.useState({ expandedItems: new Map() }),
      [k, b] = c.useState(),
      [E, N] = c.useState(_),
      [$, re] = c.useState(w)
    c.useEffect(() => {
      if (E !== _) {
        p.expandedItems.clear()
        for (const I of s.flatTreeItems()) p.expandedItems.set(I.id, !1)
        ;(N(_), b(void 0), S({ ...p }))
        return
      }
      if ($ !== w) {
        p.expandedItems.clear()
        for (const I of s.flatTreeItems()) p.expandedItems.set(I.id, !0)
        ;(re(w), b(void 0), S({ ...p }))
        return
      }
      if (!o || o.itemSelectedByUser) return
      let x
      const P = (I) => {
        var O
        ;(I.children.forEach(P),
          !x &&
            I.status === 'failed' &&
            ((I.kind === 'test' && o.testIds.has(I.test.id)) ||
              (I.kind === 'case' && o.testIds.has((O = I.tests[0]) == null ? void 0 : O.id))) &&
            (x = I))
      }
      ;(P(s.rootItem), x && b(x.id))
    }, [o, b, s, E, N, _, $, re, w, p, S])
    const D = c.useMemo(() => {
      if (k) return s.treeItemById(k)
    }, [k, s])
    ;(c.useEffect(() => {
      if (!e) return
      const x = Mt(D, e)
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
            for (const P of f.value) {
              const I = s.treeItemById(P),
                O = I == null ? void 0 : I.location.file
              O && x.add(O)
            }
            t == null || t.watchNoReply({ fileNames: [...x] })
          }
      }, [m, s, a, f, t]))
    const G = (x) => {
        ;(b(x.id), n('bounce-if-busy', s.collectTestIds(x)))
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
    return i.jsx(Dt, {
      name: 'tests',
      treeState: p,
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
                  ? x.tags.map((X) => i.jsx(Pt, { tag: X.slice(1), onClick: (he) => H(he, X) }, X))
                  : null
              ]
            }),
            !!x.duration &&
              x.status !== 'skipped' &&
              i.jsx('div', {
                id: O,
                className: 'ui-mode-tree-item-time',
                children: dt(x.duration)
              }),
            i.jsxs(z, {
              noMinHeight: !0,
              noShadow: !0,
              children: [
                i.jsx(F, {
                  icon: 'play',
                  title: 'Run',
                  onClick: () => G(x),
                  disabled: !!o && !o.completed
                }),
                i.jsx(F, {
                  icon: 'go-to-file',
                  title: 'Show source',
                  onClick: y,
                  style:
                    x.kind === 'group' && x.subKind === 'folder' ? { visibility: 'hidden' } : {}
                }),
                !a &&
                  i.jsx(F, {
                    icon: 'eye',
                    title: 'Watch',
                    onClick: () => {
                      ;(f.value.has(x.id) ? f.value.delete(x.id) : f.value.add(x.id), u({ ...f }))
                    },
                    toggled: f.value.has(x.id)
                  })
              ]
            })
          ]
        })
      },
      icon: (x) => ct(x.status),
      title: (x) => x.title,
      selectedItem: D,
      onAccepted: G,
      onSelected: (x) => {
        ;(o && (o.itemSelectedByUser = !0), b(x.id))
      },
      isError: (x) => (x.kind === 'group' ? x.hasLoadErrors : !1),
      autoExpandDepth: r ? 5 : 1,
      noItemsMessage: m ? 'Loading…' : 'No tests'
    })
  }
function Mt(r, e) {
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
function Ft(r) {
  return `.playwright-artifacts-${r}`
}
const Ot = ({ item: r, rootDir: e, onOpenExternally: t, revealSource: s, pathSeparator: n }) => {
    var _, w
    const [o, a] = c.useState(void 0),
      [f, u] = c.useState(0),
      m = c.useRef(null),
      { outputDir: l } = c.useMemo(() => ({ outputDir: r.testCase ? Wt(r.testCase) : void 0 }), [r])
    return (
      c.useEffect(() => {
        var S, k, b
        m.current && clearTimeout(m.current)
        const h = (S = r.testCase) == null ? void 0 : S.results[0]
        if (!h || ((k = r.treeItem) == null ? void 0 : k.status) === 'scheduled') {
          a(void 0)
          return
        }
        const y = h && h.duration >= 0 && h.attachments.find((E) => E.name === 'trace')
        if (y && y.path) {
          Ee(y.path, h.startTime.getTime()).then((E) => a({ model: E, isLive: !1 }))
          return
        }
        if (!l) {
          a(void 0)
          return
        }
        const p = [
          l,
          Ft(h.workerIndex),
          'traces',
          `${(b = r.testCase) == null ? void 0 : b.id}.json`
        ].join(n)
        return (
          (m.current = setTimeout(async () => {
            try {
              const E = await Ee(p, Date.now())
              a({ model: E, isLive: !0 })
            } catch {
              const E = new Be('', [])
              ;(E.errorDescriptors.push(
                ...h.errors.flatMap((N) => (N.message ? [{ message: N.message }] : []))
              ),
                a({ model: E, isLive: !1 }))
            } finally {
              u(f + 1)
            }
          }, 500)),
          () => {
            m.current && clearTimeout(m.current)
          }
        )
      }, [l, r, a, f, u, n]),
      i.jsx(
        ut,
        {
          model: o == null ? void 0 : o.model,
          showSourcesFirst: !0,
          rootDir: e,
          fallbackLocation: r.testFile,
          isLive: o == null ? void 0 : o.isLive,
          status: (_ = r.treeItem) == null ? void 0 : _.status,
          annotations: ((w = r.testCase) == null ? void 0 : w.annotations) ?? [],
          onOpenExternally: t,
          revealSource: s
        },
        'workbench'
      )
    )
  },
  Wt = (r) => {
    var e
    for (let t = r.parent; t; t = t.parent)
      if (t.project()) return (e = t.project()) == null ? void 0 : e.outputDir
  }
async function Ee(r, e) {
  const t = `file?path=${encodeURIComponent(r)}&timestamp=${e}`,
    s = new URLSearchParams()
  s.set('trace', t)
  const o = await (await fetch(`contexts?${s.toString()}`)).json()
  return new Be(t, o)
}
const At = ({ files: r, selectedFile: e, onFileSelect: t, runningFile: s }) =>
    i.jsxs('div', {
      className: 'director-file-explorer',
      children: [
        i.jsx('div', { className: 'director-section-title', children: '📁 test-suites' }),
        i.jsx('div', {
          className: 'director-file-list',
          children: r.map((n) =>
            i.jsxs(
              'div',
              {
                className: K(
                  'director-file-item',
                  (e == null ? void 0 : e.path) === n.path && 'selected',
                  n.status === 'running' && 'running',
                  n.status === 'passed' && 'passed',
                  n.status === 'failed' && 'failed',
                  n.status === 'staged' && 'staged'
                ),
                onClick: () => t(n),
                children: [
                  i.jsxs('span', {
                    className: 'director-file-icon',
                    children: [
                      n.status === 'passed' && '✓',
                      n.status === 'failed' && '✗',
                      n.status === 'running' && '⏳',
                      n.status === 'staged' && '🔄',
                      n.status === 'idle' && '📝'
                    ]
                  }),
                  i.jsx('span', { className: 'director-file-name', children: n.name }),
                  n.isModified &&
                    i.jsx('span', { className: 'director-file-modified', children: '●' })
                ]
              },
              n.path
            )
          )
        })
      ]
    }),
  Ut = ({ file: r, onContentChange: e, onStage: t, isStaging: s }) => {
    const [n, o] = c.useState('editor'),
      [a, f] = c.useState((r == null ? void 0 : r.content) || '')
    c.useEffect(() => {
      f((r == null ? void 0 : r.content) || '')
    }, [r == null ? void 0 : r.path])
    const u = (_) => {
        const w = _.target.value
        ;(f(w), e(w))
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
              const [, p, S] = y
              return i.jsxs(
                'div',
                {
                  className: 'director-preview-step',
                  children: [
                    i.jsx('span', {
                      className: K('director-gherkin-keyword', p.toLowerCase()),
                      children: p
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
                  className: K('director-mode-btn', n === 'editor' && 'active'),
                  onClick: () => o('editor'),
                  title: 'Editor',
                  children: 'Editor'
                }),
                i.jsx('button', {
                  className: K('director-mode-btn', n === 'preview' && 'active'),
                  onClick: () => o('preview'),
                  title: 'Preview',
                  children: 'Preview'
                })
              ]
            }),
            i.jsx('div', { className: 'director-spacer' }),
            i.jsx(F, {
              icon: s ? 'sync~spin' : 'sync',
              title: s ? 'Staging...' : 'Stage (generate tests)',
              onClick: t,
              disabled: !r || s
            })
          ]
        }),
        i.jsx('div', { className: 'director-editor-content', children: n === 'editor' ? l() : m() })
      ]
    })
  },
  $t = ({ entries: r, progress: e, onClear: t }) => {
    const s = c.useRef(null)
    c.useEffect(() => {
      s.current && (s.current.scrollTop = s.current.scrollHeight)
    }, [r])
    const n = (o) =>
      new Date(o).toLocaleTimeString('en-US', {
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
                    className: K('director-progress-status', e.status),
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
            i.jsx(F, { icon: 'clear-all', title: 'Clear output', onClick: t })
          ]
        }),
        i.jsx('div', {
          ref: s,
          className: 'director-output-content',
          children:
            r.length === 0
              ? i.jsx('div', { className: 'director-output-empty', children: 'No output yet...' })
              : r.map((o, a) =>
                  i.jsxs(
                    'div',
                    {
                      className: K('director-output-line', `type-${o.type}`),
                      children: [
                        i.jsx('span', {
                          className: 'director-output-time',
                          children: n(o.timestamp)
                        }),
                        i.jsx('span', { className: 'director-output-message', children: o.message })
                      ]
                    },
                    a
                  )
                )
        })
      ]
    })
  },
  zt = ({ files: r, onFileSelect: e, onFileContentChange: t, onStage: s, onSyncWithTest: n }) => {
    const [o, a] = c.useState(null),
      [f, u] = c.useState([]),
      [m, l] = c.useState(),
      [_, w] = c.useState(!1),
      h = (b) => {
        ;(a(b), e(b), S('info', `Selected: ${b.name}`))
      },
      y = (b) => {
        o && t(o.path, b)
      },
      p = async () => {
        o &&
          (w(!0),
          S('progress', `Staging ${o.name}...`),
          l({ file: o.name, status: 'parsing', progress: 0, message: 'Parsing Markdown...' }),
          await new Promise((b) => setTimeout(b, 500)),
          l({
            file: o.name,
            status: 'generating',
            progress: 33,
            message: 'Generating test code...'
          }),
          await new Promise((b) => setTimeout(b, 800)),
          l({
            file: o.name,
            status: 'compiling',
            progress: 66,
            message: 'Compiling TypeScript...'
          }),
          await new Promise((b) => setTimeout(b, 600)),
          l({ file: o.name, status: 'done', progress: 100, message: 'Done!' }),
          S('success', `Successfully staged ${o.name}`),
          s(o),
          setTimeout(() => {
            ;(l(void 0), w(!1))
          }, 1e3))
      },
      S = (b, E) => {
        u((N) => [...N, { type: b, message: E, timestamp: Date.now() }])
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
              children: i.jsx(At, { files: r, selectedFile: o, onFileSelect: h })
            }),
            i.jsxs('div', {
              className: 'director-main',
              children: [
                i.jsx('div', {
                  className: 'director-editor-panel',
                  children: i.jsx(Ut, { file: o, onContentChange: y, onStage: p, isStaging: _ })
                }),
                i.jsx('div', {
                  className: 'director-output-panel',
                  children: i.jsx($t, { entries: f, progress: m, onClear: k })
                })
              ]
            })
          ]
        })
      ]
    })
  }
let Ce = { cols: 80 }
const V = { pending: [], clear: () => {}, write: (r) => V.pending.push(r), resize: () => {} },
  A = new URLSearchParams(window.location.search),
  Kt = new URL(A.get('server') ?? '../', window.location.href),
  we = new URL(A.get('ws'), Kt)
we.protocol = we.protocol === 'https:' ? 'wss:' : 'ws:'
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
const Re = navigator.platform === 'MacIntel'
function Vt(r) {
  return (r.startsWith('/') && (r = r.substring(1)), r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}
function Ht(r, e, t) {
  const s = r.passed + r.failed + r.skipped,
    n = e ? ((s / e) * 100) | 0 : 0,
    o = []
  return (
    r.passed > 0 && o.push(`${r.passed} passed`),
    r.failed > 0 &&
      o.push(
        i.jsxs(
          'span',
          { className: 'status-line-failed', children: [r.failed, ' failed'] },
          'failed'
        )
      ),
    r.skipped > 0 && o.push(`${r.skipped} skipped`),
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
          n,
          '%)',
          o.length > 0 && ' — ',
          o.map((a, f) => i.jsxs(c.Fragment, { children: [f > 0 ? ', ' : '', a] }, f))
        ]
      })
    })
  )
}
const qt = ({}) => {
  var ke
  const [r, e] = c.useState(''),
    [t, s] = c.useState(!1),
    [n, o] = c.useState(!1),
    [a, f] = c.useState(
      new Map([
        ['passed', !1],
        ['failed', !1],
        ['skipped', !1]
      ])
    ),
    [u, m] = c.useState(new Map()),
    [l, _] = c.useState(),
    [w, h] = c.useState(),
    [y, p] = c.useState({}),
    [S, k] = c.useState(!1),
    [b, E] = c.useState(),
    N = b && !b.completed,
    [$, re] = Q('watch-all', !1),
    [D, G] = c.useState({ value: new Set() }),
    H = c.useRef(Promise.resolve()),
    x = c.useRef({ testIds: new Set(), locations: new Set() }),
    [P, I] = c.useState(0),
    [O, X] = c.useState(0),
    [he, Le] = c.useState(!1),
    [Se, be] = c.useState(!0),
    [j, Me] = c.useState(),
    [ne, Fe] = c.useState(),
    [oe, Oe] = c.useState(!1),
    [ae, We] = c.useState(!1),
    [Ae, je] = c.useState(!1),
    Ue = c.useCallback(() => je(!0), [je]),
    [$e, Te] = c.useState([
      {
        name: 'auth.md',
        path: 'test-suites/auth.md',
        content: `### Login Test
Given user is on login page
When user enters valid credentials
Then user is redirected to dashboard`,
        status: 'idle',
        isModified: !1,
        scenarios: []
      },
      {
        name: 'todo.md',
        path: 'test-suites/todo.md',
        content: `### Todo List
Given user has empty todo list
When user adds item
Then item appears in list`,
        status: 'idle',
        isModified: !1,
        scenarios: []
      }
    ]),
    [pe, ze] = Q('single-worker', !1),
    [fe, Ke] = Q('updateSnapshots', 'missing'),
    [J, Ve] = Q('only-changed', !1),
    [ge, He] = Q('stop-on-failure', !1),
    [Z] = Q('mergeFiles', !1),
    qe = c.useRef(null),
    le = c.useCallback(() => {
      Me((g) => (g == null || g.close(), new ht(new pt(we))))
    }, [])
  ;(c.useEffect(() => {
    var g
    ;((g = qe.current) == null || g.focus(), k(!0), le())
  }, [le]),
    c.useEffect(() => {
      if (!j) return
      const g = [
        j.onStdio((v) => {
          if (v.buffer) {
            const T = atob(v.buffer)
            V.write(T)
          } else V.write(v.text)
          v.type === 'stderr' && o(!0)
        }),
        j.onClose(() => Le(!0))
      ]
      return (
        (V.resize = (v, T) => {
          ;((Ce = { cols: v, rows: T }), j.resizeTerminalNoReply({ cols: v, rows: T }))
        }),
        () => {
          for (const v of g) v.dispose()
        }
      )
    }, [j]),
    c.useEffect(() => {
      if (!j) return
      let g
      const v = new It({
        onUpdate: (T) => {
          ;(clearTimeout(g),
            (g = void 0),
            T
              ? _(v.asModel())
              : g ||
                (g = setTimeout(() => {
                  _(v.asModel())
                }, 250)))
        },
        onError: (T) => {
          ;(V.write(
            (T.stack || T.value || '') +
              `
`
          ),
            o(!0))
        },
        pathSeparator: B.pathSeparator
      })
      return (
        Fe(v),
        _(void 0),
        k(!0),
        G({ value: new Set() }),
        (async () => {
          try {
            await j.initialize({ interceptStdio: !0, watchTestDirs: !0 })
            const { status: T, report: C } = await j.runGlobalSetup({})
            if ((v.processGlobalReport(C), T !== 'passed')) return
            const L = await j.listTests({
              projects: B.projects,
              locations: B.args,
              grep: B.grep,
              grepInvert: B.grepInvert,
              onlyChanged: J
            })
            ;(v.processListReport(L.report),
              j.onReport((q) => {
                v.processTestReportEvent(q)
              }))
            const { hasBrowsers: W } = await j.checkBrowsers({})
            be(W)
          } finally {
            k(!1)
          }
        })(),
        () => {
          clearTimeout(g)
        }
      )
    }, [J, j]),
    c.useEffect(() => {
      if (!l) return
      const { config: g, rootSuite: v } = l,
        T = g.configFile ? Pe.getObject(g.configFile + ':projects', void 0) : void 0,
        C = new Map(u)
      for (const L of C.keys()) v.suites.find((W) => W.title === L) || C.delete(L)
      for (const L of v.suites)
        C.has(L.title) || C.set(L.title, !!(T != null && T.includes(L.title)))
      ;(!T && C.size && ![...C.values()].includes(!0) && C.set(C.entries().next().value[0], !0),
        (u.size !== C.size || [...u].some(([L, W]) => C.get(L) !== W)) && m(C))
    }, [u, l]),
    c.useEffect(() => {
      N && l != null && l.progress ? h(l.progress) : l || h(void 0)
    }, [l, N]))
  const { testTree: ce } = c.useMemo(() => {
      if (!l) return { testTree: new _e('', new se('', 'root'), [], u, B.pathSeparator, Z) }
      const g = new _e('', l.rootSuite, l.loadErrors, u, B.pathSeparator, Z)
      return (
        g.filterTree(r, a, N ? (b == null ? void 0 : b.testIds) : void 0),
        g.sortAndPropagateStatus(),
        g.shortenRoot(),
        g.flattenForSingleProject(),
        { testTree: g }
      )
    }, [r, l, a, u, b, N, Z]),
    ee = c.useCallback(
      (g, v) => {
        if (!(!j || !l) && !(g === 'bounce-if-busy' && N)) {
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
            const L = '  [' + new Date().toLocaleTimeString() + ']'
            ;(V.write('\x1B[2m—'.repeat(Math.max(0, Ce.cols - L.length)) + L + '\x1B[22m'),
              h({ total: 0, passed: 0, failed: 0, skipped: 0 }),
              E({ testIds: T }),
              await j.runTests({
                locations: [...C].map(Vt),
                grep: B.grep,
                grepInvert: B.grepInvert,
                testIds: [...T],
                projects: [...u].filter(([R, M]) => M).map(([R]) => R),
                updateSnapshots: fe,
                reporters: B.reporters,
                workers: pe ? 1 : void 0,
                maxFailures: ge ? 1 : void 0,
                trace: 'on'
              }))
            for (const R of ((q = l.rootSuite) == null ? void 0 : q.allTests()) || [])
              ((U = R.results[0]) == null ? void 0 : U.duration) === -1 && (R.results = [])
            ;(_({ ...l }), E((R) => (R ? { ...R, completed: !0 } : void 0)))
          })
        }
      },
      [u, N, l, j, fe, pe, ge]
    ),
    de = c.useCallback(() => ee('bounce-if-busy', ce.collectTestIds(ce.rootItem)), [ee, ce])
  ;(c.useEffect(() => {
    if (!j || !ne) return
    const g = j.onTestFilesChanged(async (v) => {
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
            ne.processListReport(U.report)
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
      const T = ne.asModel(),
        C = new _e('', T.rootSuite, T.loadErrors, u, B.pathSeparator, Z),
        L = [],
        W = [],
        q = new Set(v.testFiles)
      if ($) {
        const U = (R) => {
          const M = R.location.file
          if (M && q.has(M)) {
            const te = C.collectTestIds(R)
            ;(L.push(...te.locations), W.push(...te.testIds))
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
            ;(L.push(...ye.locations), W.push(...ye.testIds))
          }
        }
      ee('queue-if-busy', { locations: L, testIds: W })
    })
    return () => g.dispose()
  }, [ee, j, $, D, ne, u, Z, J]),
    c.useEffect(() => {
      if (!j) return
      const g = (v) => {
        v.code === 'Backquote' && v.ctrlKey
          ? (v.preventDefault(), s(!t))
          : v.code === 'F5' && v.shiftKey
            ? (v.preventDefault(), j == null || j.stopTestsNoReply({}))
            : v.code === 'F5' && (v.preventDefault(), de())
      }
      return (
        addEventListener('keydown', g),
        () => {
          removeEventListener('keydown', g)
        }
      )
    }, [de, le, j, t]))
  const me = c.useRef(null),
    Ge = c.useCallback((g) => {
      var v
      ;(g.preventDefault(), g.stopPropagation(), (v = me.current) == null || v.showModal())
    }, []),
    xe = c.useCallback((g) => {
      var v
      ;(g.preventDefault(), g.stopPropagation(), (v = me.current) == null || v.close())
    }, []),
    Ye = c.useCallback(
      (g) => {
        ;(xe(g),
          s(!0),
          j == null ||
            j.installBrowsers({}).then(async () => {
              s(!1)
              const { hasBrowsers: v } = await (j == null ? void 0 : j.checkBrowsers({}))
              be(v)
            }))
      },
      [xe, j]
    ),
    Qe = c.useCallback((g) => {
      console.log('Selected file:', g.name)
    }, []),
    Xe = c.useCallback((g, v) => {
      Te((T) => T.map((C) => (C.path === g ? { ...C, content: v, isModified: !0 } : C)))
    }, []),
    Je = c.useCallback((g) => {
      ;(console.log('Staging file:', g.name),
        Te((v) =>
          v.map((T) => (T.path === g.path ? { ...T, status: 'staged', isModified: !1 } : T))
        ))
    }, []),
    Ze = c.useCallback((g) => {
      console.log('Sync with test:', g)
    }, [])
  return i.jsxs('div', {
    className: 'vbox ui-mode',
    children: [
      !Se &&
        i.jsxs('dialog', {
          ref: me,
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
                i.jsx('button', { className: 'button', onClick: Ye, children: 'Install' }),
                i.jsx('button', { className: 'button secondary', onClick: xe, children: 'Dismiss' })
              ]
            })
          ]
        }),
      he &&
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
        sidebar: i.jsx(zt, {
          files: $e,
          onFileSelect: Qe,
          onFileContentChange: Xe,
          onStage: Je,
          onSyncWithTest: Ze
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
                className: K('vbox', !t && 'hidden'),
                children: [
                  i.jsxs(z, {
                    children: [
                      i.jsx('div', {
                        className: 'section-title',
                        style: { flex: 'none' },
                        children: 'Output'
                      }),
                      i.jsx(F, {
                        icon: 'circle-slash',
                        title: 'Clear output',
                        onClick: () => {
                          ;(V.clear(), o(!1))
                        }
                      }),
                      i.jsx('div', { className: 'spacer' }),
                      i.jsx(F, { icon: 'close', title: 'Close', onClick: () => s(!1) })
                    ]
                  }),
                  i.jsx(Nt, { source: V })
                ]
              }),
              i.jsx('div', {
                className: K('vbox', t && 'hidden'),
                children: i.jsx(Ot, {
                  pathSeparator: B.pathSeparator,
                  item: y,
                  rootDir: (ke = l == null ? void 0 : l.config) == null ? void 0 : ke.rootDir,
                  revealSource: Ae,
                  onOpenExternally: (g) =>
                    j == null
                      ? void 0
                      : j.openNoReply({
                          location: { file: g.file, line: g.line, column: g.column }
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
                  i.jsx(F, {
                    icon: 'refresh',
                    title: 'Reload',
                    onClick: () => le(),
                    disabled: N || S
                  }),
                  i.jsx('div', {
                    style: { position: 'relative' },
                    children: i.jsx(F, {
                      icon: 'terminal',
                      title: 'Toggle output — ' + (Re ? '⌃`' : 'Ctrl + `'),
                      toggled: t,
                      errorBadge: n ? 'Output contains error' : void 0,
                      onClick: () => {
                        s(!t)
                      }
                    })
                  }),
                  !Se &&
                    i.jsx(F, {
                      icon: 'lightbulb-autofix',
                      style: { color: 'var(--vscode-list-warningForeground)' },
                      title: 'Playwright browsers are missing',
                      onClick: Ge
                    })
                ]
              }),
              i.jsx(Rt, {
                filterText: r,
                setFilterText: e,
                statusFilters: a,
                setStatusFilters: f,
                projectFilters: u,
                setProjectFilters: m,
                onlyChanged: J,
                setOnlyChanged: Ve,
                testModel: l,
                runTests: de
              }),
              i.jsxs(z, {
                className: 'section-toolbar',
                noMinHeight: !0,
                children: [
                  !N && !w && i.jsx('div', { className: 'section-title', children: 'Tests' }),
                  w && Ht(w, N ? b.testIds.size : w.total, !!N),
                  i.jsx(F, { icon: 'play', title: 'Run all — F5', onClick: de, disabled: N || S }),
                  i.jsx(F, {
                    icon: 'debug-stop',
                    title: 'Stop — ' + (Re ? '⇧F5' : 'Shift + F5'),
                    onClick: () => (j == null ? void 0 : j.stopTests({})),
                    disabled: !N || S,
                    testId: 'stop-button'
                  }),
                  i.jsx(F, {
                    icon: 'eye',
                    title: 'Watch all',
                    toggled: $,
                    onClick: () => {
                      ;(G({ value: new Set() }), re(!$))
                    }
                  }),
                  i.jsx(F, {
                    icon: 'collapse-all',
                    title: 'Collapse all',
                    onClick: () => {
                      I(P + 1)
                    }
                  }),
                  i.jsx(F, {
                    icon: 'expand-all',
                    title: 'Expand all',
                    onClick: () => {
                      X(O + 1)
                    }
                  })
                ]
              }),
              i.jsx(Lt, {
                filterText: r,
                testModel: l,
                testTree: ce,
                testServerConnection: j,
                runningState: b,
                runTests: ee,
                onItemSelected: p,
                watchAll: $,
                watchedTreeIds: D,
                setWatchedTreeIds: G,
                isLoading: S,
                requestedCollapseAllCount: P,
                requestedExpandAllCount: O,
                setFilterText: e,
                onRevealSource: Ue
              }),
              i.jsxs(z, {
                noShadow: !0,
                noMinHeight: !0,
                className: 'settings-toolbar',
                onClick: () => We(!ae),
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
                i.jsx(ft, {
                  settings: [
                    { type: 'check', value: pe, set: ze, name: 'Single worker' },
                    { type: 'check', value: ge, set: He, name: 'Stop on first failure' },
                    {
                      type: 'select',
                      options: [
                        { label: 'All', value: 'all' },
                        { label: 'Changed', value: 'changed' },
                        { label: 'Missing', value: 'missing' },
                        { label: 'None', value: 'none' }
                      ],
                      value: fe,
                      set: Ke,
                      name: 'Update snapshots'
                    }
                  ]
                }),
              i.jsxs(z, {
                noShadow: !0,
                noMinHeight: !0,
                className: 'settings-toolbar',
                onClick: () => Oe(!oe),
                children: [
                  i.jsx('span', {
                    className: `codicon codicon-${oe ? 'chevron-down' : 'chevron-right'}`,
                    style: { marginLeft: 5 },
                    title: oe ? 'Hide Settings' : 'Show Settings'
                  }),
                  i.jsx('div', { className: 'section-title', children: 'Settings' })
                ]
              }),
              oe && i.jsx(gt, { location: 'ui-mode' })
            ]
          })
        })
      })
    ]
  })
}
;(async () => {
  if ((mt(), window.location.protocol !== 'file:')) {
    if (
      (window.location.href.includes('isUnderTest=true') &&
        (await new Promise((r) => setTimeout(r, 1e3))),
      !navigator.serviceWorker)
    )
      throw new Error(`Service workers are not supported.
Make sure to serve the website (${window.location}) via HTTPS or localhost.`)
    ;(navigator.serviceWorker.register('sw.bundle.js'),
      navigator.serviceWorker.controller ||
        (await new Promise((r) => {
          navigator.serviceWorker.oncontrollerchange = () => r()
        })),
      setInterval(function () {
        fetch('ping')
      }, 1e4))
  }
  xt.createRoot(document.querySelector('#root')).render(i.jsx(qt, {}))
})()
