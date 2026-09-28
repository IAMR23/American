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
const playerStyles = readFileSync(
  new URL("../styles/react-player.css", import.meta.url),
  "utf8",
);
const { code } = transformSync(source, { loader: "jsx", format: "cjs" });

function playerHarness() {
  const states = [];
  let cursor = 0;
  const refs = [];
  let refCursor = 0;
  class MockAudioNode {
    constructor() {
      this.connections = [];
    }
    connect(target) {
      this.connections.push(target);
      return target;
    }
    disconnect() {
      this.connections = [];
    }
  }
  class MockAudioParam {
    constructor(value = 0) {
      this.value = value;
    }
    setValueAtTime(value) {
      this.value = value;
    }
  }
  class MockHTMLMediaElement {}
  class MockAudioContext {
    static latest = null;
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.destination = new MockAudioNode();
      MockAudioContext.latest = this;
    }
    createMediaElementSource(mediaElement) {
      this.mediaElement = mediaElement;
      this.source = new MockAudioNode();
      return this.source;
    }
    async resume() {
      this.state = "running";
    }
    async close() {
      this.state = "closed";
    }
  }
  class MockSoundTouchNode extends MockAudioNode {
    static latest = null;
    static async register() {}
    constructor() {
      super();
      this.pitch = new MockAudioParam(1);
      this.pitchSemitones = new MockAudioParam(0);
      this.playbackRate = new MockAudioParam(1);
      MockSoundTouchNode.latest = this;
    }
  }
  const window = {
    location: {
      href: "https://american-karaoke.com/",
      origin: "https://american-karaoke.com",
    },
    AudioContext: MockAudioContext,
    AudioWorkletNode: class {},
    HTMLMediaElement: MockHTMLMediaElement,
  };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => {
        states[index] = typeof value === "function" ? value(states[index]) : value;
      }];
    },
    useRef(current) {
      const index = refCursor++;
      if (!(index in refs)) refs[index] = { current };
      return refs[index];
    },
    useMemo: (callback) => callback(),
    useCallback: (callback) => callback,
    useEffect() {},
    useLayoutEffect() {},
  };
  const context = {
    module: { exports: {} }, console, setTimeout, clearTimeout, URL, window,
    document: { fullscreenElement: null },
    require(name) {
      if (name === "react") return React;
      if (name === "react-player") return "mock-video";
      if (name === "@soundtouchjs/audio-worklet") {
        return { SoundTouchNode: MockSoundTouchNode };
      }
      if (name === "./BarraDeslizante") return "mock-banner";
      if (name === "../utils/getYoutubeThumbnail") {
        return {
          dropboxUrlToRaw(url) {
            const parsedUrl = new URL(url);
            if (!parsedUrl.hostname.includes("dropbox.com")) return url;
            parsedUrl.searchParams.delete("dl");
            parsedUrl.searchParams.set("raw", "1");
            return parsedUrl
              .toString()
              .replace("www.dropbox.com", "dl.dropboxusercontent.com");
          },
        };
      }
      return {};
    },
  };
  vm.runInNewContext(code, context);
  const cola = [0, 1, 2].map((id) => ({ id, videoUrl: `https://example.com/${id}.mp4` }));
  let fullscreenRequests = 0;
  const element = {
    requestFullscreen() {
      fullscreenRequests += 1;
    },
  };
  return {
    element,
    getFullscreenRequests: () => fullscreenRequests,
    audio: {
      MockAudioContext,
      MockHTMLMediaElement,
      MockSoundTouchNode,
    },
    render(props = {}) {
      cursor = 0;
      refCursor = 0;
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

test("video surface uses one click for playback and double click for fullscreen", async () => {
  const harness = playerHarness();
  let tree = harness.render();
  let surface = find(
    tree,
    (node) => node.props.className === "player-video-toggle",
  );

  assert.equal(find(tree, (node) => node.type === "mock-video").props.playing, false);
  surface.props.onClick();
  await new Promise((resolve) => setTimeout(resolve, 230));
  tree = harness.render();
  assert.equal(find(tree, (node) => node.type === "mock-video").props.playing, true);

  surface = find(tree, (node) => node.props.className === "player-video-toggle");
  surface.props.onClick();
  surface.props.onDoubleClick();
  await new Promise((resolve) => setTimeout(resolve, 230));
  tree = harness.render();
  assert.equal(find(tree, (node) => node.type === "mock-video").props.playing, true);
  assert.equal(harness.getFullscreenRequests(), 1);
});

test("Dropbox uses a CORS-capable direct URL and exposes the tone control", () => {
  const dropboxUrl =
    "https://www.dropbox.com/scl/fi/example/song.mp4?rlkey=test&dl=0";
  const tree = playerHarness().render({
    cola: [{ id: "dropbox", videoUrl: dropboxUrl }],
    currentIndex: 0,
  });
  const player = find(tree, (node) => node.type === "mock-video");
  const tone = find(
    tree,
    (node) => node.props.className?.includes("player-pitch-control"),
  );

  assert.match(player.props.url, /^https:\/\/dl\.dropboxusercontent\.com\//);
  assert.equal(player.props.config.file.attributes.crossOrigin, "anonymous");
  assert.ok(tone);
  assert.equal(
    find(tone, (node) => node.type === "img")?.props.src,
    "/tonos.png",
  );
});

test("embedded providers do not claim that pitch shifting is available", () => {
  const tree = playerHarness().render({
    cola: [{ id: "youtube", videoUrl: "https://www.youtube.com/watch?v=abc123" }],
    currentIndex: 0,
  });
  const tone = find(
    tree,
    (node) => node.props.className?.includes("player-pitch-control"),
  );
  const buttons = tone.children.filter((node) => node?.type === "button");
  const value = find(tone, (node) => node.type === "output");

  assert.equal(buttons.length, 3);
  assert.ok(buttons.every((button) => button.props.disabled));
  assert.equal(value.children[0], "—");
  assert.match(tone.props.title, /embebidos|CORS/);
});

test("-1, -4, +1, +4 and 0 keep playbackRate at one", async () => {
  const harness = playerHarness();
  const props = {
    cola: [
      {
        id: "dropbox",
        videoUrl:
          "https://www.dropbox.com/scl/fi/example/song.mp4?rlkey=test&dl=0",
      },
    ],
    currentIndex: 0,
  };
  let tree = harness.render(props);
  const player = find(tree, (node) => node.type === "mock-video");
  const mediaElement = new harness.audio.MockHTMLMediaElement();
  const seekCalls = [];
  player.props.ref.current = {
    getInternalPlayer: () => mediaElement,
    seekTo: (...args) => seekCalls.push(args),
  };
  player.props.onReady();

  const step = async (direction) => {
    tree = harness.render(props);
    const label = direction > 0 ? "Subir un semitono" : "Bajar un semitono";
    const button = find(
      tree,
      (node) => node.type === "button" && node.props["aria-label"] === label,
    );
    assert.equal(button.props.disabled, false);
    await button.props.onClick();
    tree = harness.render(props);
    return find(tree, (node) => node.type === "output").children[0];
  };

  assert.equal(await step(-1), -1);
  assert.equal(harness.audio.MockSoundTouchNode.latest.pitchSemitones.value, -1);
  for (let index = 0; index < 3; index += 1) await step(-1);
  assert.equal(find(tree, (node) => node.type === "output").children[0], -4);
  assert.equal(harness.audio.MockSoundTouchNode.latest.pitchSemitones.value, -4);
  for (let index = 0; index < 5; index += 1) await step(1);
  assert.equal(find(tree, (node) => node.type === "output").children[0], 1);
  assert.equal(harness.audio.MockSoundTouchNode.latest.pitchSemitones.value, 1);
  for (let index = 0; index < 3; index += 1) await step(1);
  assert.equal(find(tree, (node) => node.type === "output").children[0], 4);
  assert.equal(harness.audio.MockSoundTouchNode.latest.pitchSemitones.value, 4);
  const reset = find(
    tree,
    (node) =>
      node.type === "button" &&
      node.props["aria-label"] === "Restablecer el tono original",
  );
  assert.equal(reset.props.disabled, false);
  await reset.props.onClick();
  tree = harness.render(props);

  const soundTouch = harness.audio.MockSoundTouchNode.latest;
  const context = harness.audio.MockAudioContext.latest;

  assert.equal(find(tree, (node) => node.type === "output").children[0], 0);
  assert.equal(soundTouch.pitchSemitones.value, 0);
  assert.equal(soundTouch.playbackRate.value, 1);
  assert.equal(context.mediaElement, mediaElement);
  assert.deepEqual(context.source.connections, [context.destination]);
  assert.deepEqual(soundTouch.connections, []);

  const seek = find(tree, (node) => node.props.className === "player-seek-control");
  seek.props.onChange({ target: { value: "42" } });
  assert.deepEqual(seekCalls, [[42, "seconds"]]);

  let playPause = find(
    tree,
    (node) => node.props.className === "player-play-button",
  );
  playPause.props.onClick();
  tree = harness.render(props);
  assert.equal(find(tree, (node) => node.type === "mock-video").props.playing, true);
  playPause = find(tree, (node) => node.props.className === "player-play-button");
  playPause.props.onClick();
  tree = harness.render(props);
  assert.equal(find(tree, (node) => node.type === "mock-video").props.playing, false);
  assert.equal(harness.audio.MockAudioContext.latest, context);
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
  assert.match(
    playerStyles,
    /\.home-mobile-shell \.player-pitch-control\s*\{[\s\S]*?display:\s*none/,
  );
  assert.match(
    playerStyles,
    /@media \(max-width:\s*768px\)[\s\S]*?\.player-pitch-control\s*\{[\s\S]*?display:\s*none/,
  );
});
