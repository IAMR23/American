import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "esbuild";

// Unit harness: inspect the component tree without mounting a media provider,
// starting network requests, or running a browser.
const source = readFileSync(new URL("./VideoPlayer.jsx", import.meta.url), "utf8");
const mobileStyles = readFileSync(
  new URL("../styles/home-mobile.css", import.meta.url),
  "utf8",
);
const { code } = transformSync(source, { loader: "jsx", format: "cjs" });

function playerHarness() {
  const states = [];
  let cursor = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => {
        states[index] = typeof value === "function" ? value(states[index]) : value;
      }];
    },
    useRef: (current) => ({ current }),
    useMemo: (callback) => callback(),
    useCallback: (callback) => callback,
    useEffect() {},
    useLayoutEffect() {},
  };
  const context = {
    module: { exports: {} }, console, setTimeout, clearTimeout,
    document: { fullscreenElement: null },
    require(name) {
      if (name === "react") return React;
      if (name === "react-player") return "mock-video";
      if (name === "./BarraDeslizante") return "mock-banner";
      return {};
    },
  };
  vm.runInNewContext(code, context);
  const cola = [0, 1, 2].map((id) => ({ id, videoUrl: `https://example.com/${id}.mp4` }));
  const element = {};
  return {
    element,
    render(props = {}) {
      cursor = 0;
      const tree = context.module.exports.default({ cola, currentIndex: 1, ...props });
      if (tree.props.ref) tree.props.ref.current = element;
      return tree;
    },
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== "object") return undefined;
  if (predicate(tree)) return tree;
  for (const child of tree.children || []) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

test("media, navigation and controls share the positioned frame", () => {
  const tree = playerHarness().render();
  const frame = find(tree, (node) => node.props.className?.startsWith("player-wrapper"));
  assert.ok(frame.children.some((node) => node?.type === "mock-video"));
  for (const alt of ["Anterior", "Siguiente"]) {
    const arrow = frame.children.find((node) => node?.props?.alt === alt);
    assert.equal(arrow.props.style.position, "absolute");
    assert.equal(arrow.props.style.top, "50%");
    assert.equal(typeof arrow.props.onClick, "function");
  }
  assert.ok(find(frame, (node) => node.type === "button" && node.children.includes("⛶")));
});

test("navigation keeps its first/last/default-queue availability", () => {
  const harness = playerHarness();
  const arrow = (props, alt) => find(harness.render(props), (node) => node.props.alt === alt);
  assert.equal(arrow({ currentIndex: 0 }, "Anterior").props.onClick, undefined);
  assert.equal(arrow({ currentIndex: 2 }, "Siguiente").props.onClick, undefined);
  assert.equal(typeof arrow({ esColaDefault: true }, "Siguiente").props.onClick, "function");
});

test("player keeps its original fixed sizing contract", () => {
  const harness = playerHarness();
  const tree = harness.render();
  assert.equal(tree.props.style.width, "100%");
  assert.equal(tree.props.style.aspectRatio, "16 / 9");
  assert.equal(tree.props.style.height, undefined);
});

test("mobile fullscreen offsets arrows to the centered 16:9 image edges", () => {
  const fullscreenRule = mobileStyles.match(
    /\.home-mobile-shell \.player-wrapper-full\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(fullscreenRule);
  assert.match(fullscreenRule, /--player-nav-left:\s*max\(/);
  assert.match(fullscreenRule, /--player-nav-right:\s*max\(/);
  assert.match(fullscreenRule, /100dvw - \(100dvh \* 16 \/ 9\)/);
  assert.match(fullscreenRule, /safe-area-inset-left/);
  assert.match(fullscreenRule, /safe-area-inset-right/);
});
