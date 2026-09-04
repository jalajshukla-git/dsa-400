import { useEffect, useRef, useState } from 'react';
import { EditorState, EditorSelection } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, dropCursor, rectangularSelection, crosshairCursor,
  highlightSpecialChars, placeholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle,
  foldGutter, foldKeymap,
} from '@codemirror/language';
import {
  autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap,
} from '@codemirror/autocomplete';
import { highlightSelectionMatches, selectNextOccurrence } from '@codemirror/search';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

/* ────────────────────────── completion data ────────────────────────── */
const C = (label, type = 'keyword', detail = '') => ({ label, type, detail });

const HEADERS = [
  'iostream','vector','array','deque','list','forward_list','stack','queue','priority_queue',
  'set','unordered_set','map','unordered_map','string','algorithm','numeric','bitset','tuple',
  'utility','functional','iterator','cmath','cstdlib','cstring','cstdio','sstream','fstream',
  'memory','limits','climits','cstdint','type_traits','random','regex','chrono','thread','mutex','cctype',
].map(h => C(h, 'constant', 'header'));

const CPP_STL = [
  C('vector', 'class', 'std::vector'), C('array', 'class', 'std::array'),
  C('deque', 'class', 'std::deque'), C('list', 'class', 'std::list'),
  C('forward_list', 'class', 'std::forward_list'), C('stack', 'class', 'std::stack'),
  C('queue', 'class', 'std::queue'), C('priority_queue', 'class', 'std::priority_queue'),
  C('set', 'class', 'std::set'), C('multiset', 'class', 'std::multiset'),
  C('map', 'class', 'std::map'), C('multimap', 'class', 'std::multimap'),
  C('unordered_set', 'class', 'std::unordered_set'), C('unordered_map', 'class', 'std::unordered_map'),
  C('pair', 'class', 'std::pair'), C('tuple', 'class', 'std::tuple'),
  C('string', 'class', 'std::string'), C('stringstream', 'class', 'std::stringstream'),
  C('bitset', 'class', 'std::bitset'), C('begin', 'function', 'std::begin'), C('end', 'function', 'std::end'),
  C('sort', 'function', 'std::sort'), C('stable_sort', 'function', 'std::stable_sort'),
  C('lower_bound', 'function', 'std::lower_bound'), C('upper_bound', 'function', 'std::upper_bound'),
  C('binary_search', 'function', 'std::binary_search'), C('max', 'function', 'std::max'),
  C('min', 'function', 'std::min'), C('minmax', 'function', 'std::minmax'), C('swap', 'function', 'std::swap'),
  C('accumulate', 'function', 'std::accumulate'), C('next_permutation', 'function', 'std::next_permutation'),
  C('reverse', 'function', 'std::reverse'), C('unique', 'function', 'std::unique'),
  C('find', 'function', 'std::find'), C('count', 'function', 'std::count'), C('fill', 'function', 'std::fill'),
  C('gcd', 'function', 'std::gcd (C++17)'), C('abs', 'function', 'std::abs'),
  C('max_element', 'function', 'std::max_element'), C('min_element', 'function', 'std::min_element'),
  C('size', 'function', 'std::size'), C('to_string', 'function', 'std::to_string'),
  C('stoi', 'function', 'std::stoi'), C('stoll', 'function', 'std::stoll'),
  C('push_back', 'method'), C('pop_back', 'method'), C('emplace_back', 'method'),
  C('front', 'method'), C('back', 'method'), C('empty', 'method'), C('clear', 'method'),
  C('insert', 'method'), C('erase', 'method'), C('resize', 'method'), C('reserve', 'method'),
  C('substr', 'method'), C('compare', 'method'), C('c_str', 'method'),
];

const CPP_KW = [
  'auto','const','constexpr','static','inline','virtual','override','final','struct','class',
  'enum','union','namespace','template','typename','using','typedef','public','private','protected',
  'friend','operator','new','delete','nullptr','true','false','bool','int','long','short','char',
  'float','double','void','unsigned','signed','sizeof','if','else','for','while','do','switch',
  'case','break','continue','return','try','catch','throw','goto','this','decltype','noexcept',
  'mutable','explicit','register','volatile','size_t',
].map(k => C(k, 'keyword'));

const JAVA_LIST = [
  C('ArrayList', 'class', 'java.util'), C('LinkedList', 'class', 'java.util'),
  C('HashMap', 'class', 'java.util'), C('HashSet', 'class', 'java.util'),
  C('TreeMap', 'class', 'java.util'), C('TreeSet', 'class', 'java.util'),
  C('PriorityQueue', 'class', 'java.util'), C('ArrayDeque', 'class', 'java.util'),
  C('Stack', 'class', 'java.util'), C('Queue', 'interface'), C('Deque', 'interface'),
  C('List', 'interface'), C('Map', 'interface'), C('Set', 'interface'),
  C('Collections', 'class'), C('Arrays', 'class'), C('String', 'class'), C('StringBuilder', 'class'),
  C('Integer', 'class'), C('Double', 'class'), C('Boolean', 'class'), C('Character', 'class'),
  C('Math', 'class'), C('sort', 'function', 'Collections.sort'),
  C('add', 'method'), C('remove', 'method'), C('get', 'method'), C('put', 'method'),
  C('contains', 'method'), C('size', 'method'), C('isEmpty', 'method'), C('poll', 'method'),
  C('peek', 'method'), C('offer', 'method'), C('push', 'method'), C('pop', 'method'),
  C('charAt', 'method'), C('length', 'method'), C('equals', 'method'), C('compareTo', 'method'),
  C('indexOf', 'method'), C('valueOf', 'method'), C('parseInt', 'method'),
  C('toArray', 'method'), C('entrySet', 'method'), C('keySet', 'method'),
];

const JAVA_KW = [
  'public','private','protected','static','final','abstract','class','interface','extends','implements',
  'new','this','super','return','void','int','long','double','float','boolean','char','byte','short',
  'if','else','for','while','do','switch','case','break','continue','try','catch','finally','throw',
  'throws','import','package','null','true','false','enum','instanceof',
].map(k => C(k, 'keyword'));

const PY_LIST = [
  C('list', 'class'), C('dict', 'class'), C('set', 'class'), C('tuple', 'class'),
  C('deque', 'class', 'collections'), C('defaultdict', 'class', 'collections'),
  C('Counter', 'class', 'collections'), C('heappush', 'function', 'heapq'),
  C('heappop', 'function', 'heapq'), C('heapify', 'function', 'heapq'),
  C('gcd', 'function', 'math'), C('sqrt', 'function', 'math'), C('ceil', 'function', 'math'),
  C('floor', 'function', 'math'), C('factorial', 'function', 'math'),
  C('bisect_left', 'function', 'bisect'), C('bisect_right', 'function', 'bisect'),
  C('permutations', 'function', 'itertools'), C('combinations', 'function', 'itertools'),
  C('print', 'function'), C('len', 'function'), C('range', 'function'), C('enumerate', 'function'),
  C('zip', 'function'), C('map', 'function'), C('filter', 'function'), C('sorted', 'function'),
  C('reversed', 'function'), C('sum', 'function'), C('min', 'function'), C('max', 'function'),
  C('abs', 'function'), C('round', 'function'), C('int', 'function'), C('float', 'function'),
  C('str', 'function'), C('bool', 'function'), C('isinstance', 'function'), C('open', 'function'),
  C('append', 'method'), C('extend', 'method'), C('insert', 'method'), C('remove', 'method'),
  C('pop', 'method'), C('sort', 'method'), C('reverse', 'method'), C('index', 'method'),
  C('count', 'method'), C('keys', 'method'), C('values', 'method'), C('items', 'method'),
  C('get', 'method'), C('update', 'method'), C('split', 'method'), C('join', 'method'),
  C('strip', 'method'), C('replace', 'method'), C('find', 'method'), C('startswith', 'method'),
  C('endswith', 'method'), C('upper', 'method'), C('lower', 'method'),
];

const PY_KW = [
  'def','return','if','elif','else','for','while','break','continue','pass','import','from','as',
  'with','try','except','finally','raise','class','lambda','yield','global','nonlocal','assert',
  'del','in','is','not','and','or','None','True','False','self','__init__',
].map(k => C(k, 'keyword'));

const JS_LIST = [
  C('Array', 'class'), C('Object', 'class'), C('String', 'class'), C('Number', 'class'),
  C('Boolean', 'class'), C('JSON', 'class'), C('Promise', 'class'), C('Set', 'class'),
  C('Map', 'class'), C('WeakMap', 'class'), C('Symbol', 'class'), C('Math', 'class'),
  C('console', 'variable'), C('parseInt', 'function'), C('parseFloat', 'function'),
  C('setTimeout', 'function'), C('setInterval', 'function'), C('requestAnimationFrame', 'function'),
  C('map', 'method'), C('filter', 'method'), C('reduce', 'method'), C('forEach', 'method'),
  C('find', 'method'), C('some', 'method'), C('every', 'method'), C('includes', 'method'),
  C('push', 'method'), C('pop', 'method'), C('shift', 'method'), C('unshift', 'method'),
  C('slice', 'method'), C('splice', 'method'), C('sort', 'method'), C('join', 'method'),
  C('split', 'method'), C('replace', 'method'), C('match', 'method'), C('charAt', 'method'),
  C('toLowerCase', 'method'), C('toUpperCase', 'method'), C('trim', 'method'),
  C('keys', 'method'), C('values', 'method'), C('entries', 'method'), C('has', 'method'),
  C('get', 'method'), C('set', 'method'), C('add', 'method'), C('delete', 'method'),
];

const JS_KW = [
  'const','let','var','function','return','if','else','for','while','do','switch','case','break',
  'continue','class','extends','super','new','this','typeof','instanceof','in','of','async','await',
  'try','catch','finally','throw','import','export','default','null','undefined','true','false',
].map(k => C(k, 'keyword'));

/* ── context-aware completion sources ── */
function cppSource(ctx) {
  const lineStart = ctx.state.doc.lineAt(ctx.pos).from;
  const lineBefore = ctx.state.doc.sliceString(lineStart, ctx.pos);
  if (/#\s*include\s*<\s*[A-Za-z_]*$/.test(lineBefore)) {
    const w = ctx.matchBefore(/[A-Za-z_]*/);
    return { from: w ? w.from : ctx.pos, options: HEADERS, validFor: /^[A-Za-z_]*$/ };
  }
  if (/std::\s*[A-Za-z_]*$/.test(lineBefore)) {
    const w = ctx.matchBefore(/[A-Za-z_]*/);
    return { from: w ? w.from : ctx.pos, options: CPP_STL, validFor: /^[A-Za-z_]*$/ };
  }
  const w = ctx.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
  if (!w) return null;
  return { from: w.from, options: [...CPP_STL, ...CPP_KW], validFor: /^[A-Za-z_][A-Za-z0-9_]*$/ };
}
const simpleSource = list => ctx => {
  const w = ctx.matchBefore(/[A-Za-z_$][A-Za-z0-9_$]*/);
  if (!w) return null;
  return { from: w.from, options: list, validFor: /^[A-Za-z_$][A-Za-z0-9_$]*$/ };
};
const sources = {
  cpp: cppSource, 'c++': cppSource, c: cppSource,
  java: simpleSource([...JAVA_LIST, ...JAVA_KW]),
  python: simpleSource([...PY_LIST, ...PY_KW]), py: simpleSource([...PY_LIST, ...PY_KW]),
  javascript: simpleSource([...JS_LIST, ...JS_KW]), js: simpleSource([...JS_LIST, ...JS_KW]),
};

/* ── Ctrl/Cmd+Click → drop an extra cursor (multi-cursor editing) ── */
const ctrlClickCursor = EditorView.domEventHandlers({
  mousedown(event, view) {
    if ((event.ctrlKey || event.metaKey) && event.button === 0) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos != null) {
        const sel = view.state.selection;
        const added = EditorSelection.cursor(pos).range;
        view.dispatch({
          selection: EditorSelection.create([...sel.ranges, added], sel.ranges.length),
          scrollIntoView: true,
        });
        event.preventDefault();
        return true;
      }
    }
    return false;
  },
});

/* ── language packs + piston mapping ── */
const PACKS = {
  cpp: () => cpp(), 'c++': () => cpp(), cc: () => cpp(), c: () => cpp(),
  java: () => java(),
  python: () => python(), py: () => python(), python3: () => python(),
  javascript: () => javascript(), js: () => javascript(),
  ts: () => javascript({ typescript: true }), typescript: () => javascript({ typescript: true }),
};
const langPack = l => (PACKS[String(l || '').toLowerCase()] || PACKS.cpp)();

const PISTON = {
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp', c: 'c', java: 'java',
  python: 'python', py: 'python', python3: 'python',
  javascript: 'javascript', js: 'javascript', ts: 'typescript', typescript: 'typescript',
};
const pistonLang = l => PISTON[String(l || '').toLowerCase()] || 'cpp';

export default function CodeBlock({ lang = 'cpp', code = '', onChange, readOnly = false }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [out, setOut] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),                     // {} [] () match + color highlight
        closeBrackets(),                       // auto-close brackets/parens
        autocompletion({ activateOnTyping: true, override: [sources[String(lang).toLowerCase()] || cppSource] }),
        langPack(lang),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        oneDark,
        highlightActiveLine(),
        highlightSelectionMatches(),
        rectangularSelection(),
        crosshairCursor(),
        placeholder('// write code here…'),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
          { key: 'Mod-d', run: selectNextOccurrence },  // multi-cursor: select next occurrence
          { key: 'Escape', run: v => { if (v.state.selection.ranges.length > 1) { v.dispatch({ selection: EditorSelection.cursor(v.state.selection.main.head) }); return true; } return false; } },
        ]),
        ctrlClickCursor,
        EditorView.updateListener.of(u => {
          if (u.docChanged && onChangeRef.current) onChangeRef.current(u.state.doc.toString());
        }),
        readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [],
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, [lang, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  /* sync external changes (restore / source edits) into the editor */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== code) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    }
  }, [code]);

  const run = async () => {
    setRunning(true); setOut(null);
    const language = pistonLang(lang);
    const files = [{ content: code }];
    if (language === 'java') files[0].name = 'Main.java';
    try {
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, version: '*', files }),
      });
      const j = await res.json();
      setOut(j.run || { stderr: 'Unexpected runner response', code: -1 });
    } catch (e) {
      setOut({ stderr: 'Runner unreachable (network blocked in this preview). ' + (e.message || ''), code: -1 });
    }
    setRunning(false);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  };

  return (
    <div className="n-code">
      <div className="n-code-bar">
        <span className="n-code-lang">{lang || 'text'}</span>
        <span className="n-code-hint">Ctrl/Cmd+Click · Alt+Click · Ctrl/Cmd+D = multi-cursor</span>
        <span className="spacer" />
        <button className="n-mini" type="button" onClick={copy}>{copied ? '✓ copied' : 'copy'}</button>
        <button className="n-mini n-mini-run" type="button" onClick={run} disabled={running}>
          {running ? 'running…' : '▶ run'}
        </button>
      </div>
      <div ref={hostRef} />
      {out && (
        <pre className={`n-out ${out.code === 0 ? '' : 'n-out-err'}`}>
          {out.stdout || ''}{out.stderr ? (out.stdout ? '\n' : '') + out.stderr : ''}
          {out.code !== 0 && !out.stderr && !out.stdout ? `(exit ${out.code})` : ''}
        </pre>
      )}
    </div>
  );
}
