import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import sharp from "sharp";

import hash from "#config/hash";
import * as media from "#config/media";

const directory = await mkdtemp(path.join(os.tmpdir(), "jjing-image-"));

after(async () => {
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith("jjing-image-"));
  await rm(directory, { recursive: true, force: true });
});

// 실제 이미지 처리 코드를 사용하고 저장 경로만 임시 폴더로 바꿉니다.
const paths = `
  import path from "node:path";
  export { mkdir, writeFile } from "node:fs/promises";
  export const upload = (...parts) => path.join(${JSON.stringify(directory)}, ...parts);
`;

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "#config/path") {
      return {
        url: `data:text/javascript,${encodeURIComponent(paths)}`,
        shortCircuit: true
      };
    }
    return next(specifier, context);
  }
});

const { default: store, transform } = await import("#service/image");

hooks.deregister();

const options = { width: 32, height: 32, fit: "cover", quality: 85 };
const picture = (width = 128, height = 64, background = "red") =>
  sharp({ create: { width, height, channels: 4, background } });

const file = (url) => {
  const route = media.routes.find(({ prefix }) => url.startsWith(`${prefix}/`));

  assert.ok(route, "기존 이미지 URL 접두사여야 합니다.");
  return path.join(
    directory,
    route.directory,
    url.slice(route.prefix.length + 1)
  );
};

const animation = async (pages = 2) => {
  const width = 16;
  const frame = width * width * 4;
  const data = Buffer.alloc(frame * pages);

  for (let index = 0; index < pages; index++) {
    data.fill(
      Buffer.from(index % 2 ? [0, 0, 255, 255] : [255, 0, 0, 255]),
      index * frame,
      (index + 1) * frame
    );
  }
  return sharp(data, {
    raw: { width, height: width * pages, pageHeight: width, channels: 4 }
  })
    .gif({
      delay: Array.from({ length: pages }, (_, index) =>
        index % 2 ? 200 : 100
      ),
      loop: 3
    })
    .toBuffer();
};

for (const [format, extension] of [
  ["jpeg", "jpg"],
  ["png", "png"],
  ["webp", "webp"]
]) {
  test(`${format} 원본 바이트·확장자·hash URL과 WebP 썸네일을 유지한다`, async () => {
    const data = await picture().toFormat(format).toBuffer();
    const result = await store(data, "users", options);
    const original = await readFile(file(result.original));
    const resized = await readFile(file(result.resizing));
    const metadata = await sharp(resized).metadata();

    assert.deepEqual(original, data);
    assert.equal(
      result.original,
      media.url("users", "original", `${hash(32, data)}.${extension}`)
    );

    assert.equal(
      result.resizing,
      media.url("users", "resizing", `${hash(32, resized)}.webp`)
    );
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 32);
    assert.equal(metadata.height, 32);
  });
}

test("알림 이미지의 inside 비율과 작은 이미지 확대 금지 규칙을 유지한다", async () => {
  const data = await picture(40, 20).png().toBuffer();
  const result = await store(data, "images", {
    width: 1024,
    height: 1024,
    fit: "inside",
    quality: 80
  });

  const metadata = await sharp(
    await readFile(file(result.resizing))
  ).metadata();

  assert.equal(metadata.width, 40);
  assert.equal(metadata.height, 20);
  assert.ok(result.original.startsWith(media.url("images", "original", "")));
});

test("EXIF 방향은 썸네일에 적용하고 업로드 원본은 변경하지 않는다", async () => {
  const data = await picture()
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const result = await store(data, "images", {
    ...options,
    width: 64,
    height: 64,
    fit: "inside"
  });

  const metadata = await sharp(
    await readFile(file(result.resizing))
  ).metadata();

  assert.deepEqual(await readFile(file(result.original)), data);
  assert.equal(metadata.width, 32);
  assert.equal(metadata.height, 64);
});

test("GIF 저장 시 원본과 썸네일의 프레임·재생 간격·반복 횟수를 유지한다", async () => {
  const data = await animation();
  const result = await store(data, "users", options);
  const metadata = await sharp(await readFile(file(result.resizing)), {
    animated: true
  }).metadata();

  assert.deepEqual(await readFile(file(result.original)), data);
  assert.ok(result.original.endsWith(".gif"));
  assert.equal(metadata.pages, 2);
  assert.deepEqual(metadata.delay, [100, 200]);
  assert.equal(metadata.loop, 3);
});

test("GIF 편집은 모든 프레임을 WebP로 변환하고 저장 결과와 일치한다", async () => {
  const data = await animation();
  const edit = {
    width: 64,
    height: 64,
    shape: "circle",
    angle: 90,
    scale: 2,
    x: 0.2,
    y: -0.2
  };
  const transformed = await transform(data, edit, options.quality);
  const result = await store(data, "users", { ...options, edit });
  const original = await readFile(file(result.original));
  const metadata = await sharp(original, { animated: true }).metadata();
  const decoded = await sharp(original, { animated: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const second =
    decoded.info.width * metadata.pageHeight * decoded.info.channels;

  assert.deepEqual(original, transformed);
  assert.ok(result.original.endsWith(".webp"));
  assert.equal(metadata.pages, 2);
  assert.equal(metadata.pageHeight, 64);
  assert.deepEqual(metadata.delay, [100, 200]);
  assert.equal(metadata.loop, 3);
  assert.ok(decoded.data[0] > decoded.data[2]);
  assert.ok(decoded.data[second + 2] > decoded.data[second]);
  const resized = await sharp(await readFile(file(result.resizing)), {
    animated: true
  }).metadata();

  assert.equal(resized.pages, 2);
  assert.equal(resized.pageHeight, 32);
  assert.deepEqual(resized.delay, [100, 200]);
  assert.equal(resized.loop, 3);
});

test("원형 편집의 고정 cover와 사각형 편집의 회전 cover를 구분한다", async () => {
  const data = await picture(128, 128).png().toBuffer();
  const edit = { width: 96, height: 96, angle: 45 };
  const circle = await transform(data, { ...edit, shape: "circle" }, 100);
  const square = await transform(data, { ...edit, shape: "square" }, 100);
  const circular = await sharp(circle).ensureAlpha().raw().toBuffer();
  const rectangular = await sharp(square).ensureAlpha().raw().toBuffer();

  // 원형 마스크 밖 모서리는 투명할 수 있지만 중심은 채워져야 합니다.
  assert.equal(circular[3], 0);
  assert.equal(circular[(48 * 96 + 48) * 4 + 3], 255);
  assert.equal(rectangular[3], 255);
});

test("회전 각도 정규화와 이동 범위 제한을 유지한다", async () => {
  const data = Buffer.alloc(128 * 64 * 4);

  for (let y = 0; y < 64; y++) {
    data.fill(Buffer.from([255, 0, 0, 255]), y * 128 * 4, (y * 128 + 64) * 4);
    data.fill(
      Buffer.from([0, 0, 255, 255]),
      (y * 128 + 64) * 4,
      (y + 1) * 128 * 4
    );
  }
  const png = await sharp(data, {
    raw: { width: 128, height: 64, channels: 4 }
  })
    .png()
    .toBuffer();
  const edit = { width: 64, height: 64, scale: 2 };

  assert.deepEqual(
    await transform(png, { ...edit, angle: -90 }, 85),
    await transform(png, { ...edit, angle: 270 }, 85)
  );

  assert.deepEqual(
    await transform(png, { ...edit, x: 10 }, 85),
    await transform(png, { ...edit, x: 1 }, 85)
  );
  const left = await sharp(await transform(png, { ...edit, x: 1 }, 85))
    .raw()
    .toBuffer();

  const right = await sharp(await transform(png, { ...edit, x: -1 }, 85))
    .raw()
    .toBuffer();

  assert.ok(left[0] > left[2]);
  assert.ok(right[2] > right[0]);
});

test("출력 크기 기본값과 상하한을 유지한다", async () => {
  const data = await picture().png().toBuffer();
  const defaults = await sharp(await transform(data, {}, 85)).metadata();
  const clamped = await sharp(
    await transform(data, { width: 1, height: 2000 }, 85)
  ).metadata();

  assert.equal(defaults.width, 512);
  assert.equal(defaults.height, 512);
  assert.equal(clamped.width, 64);
  assert.equal(clamped.height, 1024);
});

test("변환 프레임 수·총 출력 픽셀 제한을 초과하면 거부한다", async () => {
  const frames = await animation(121);
  const pixels = await animation(65);

  assert.equal((await sharp(frames, { animated: true }).metadata()).pages, 121);
  assert.equal(await transform(frames, { width: 64, height: 64 }, 85), null);
  assert.equal(
    await store(frames, "users", {
      ...options,
      edit: { width: 64, height: 64 }
    }),
    null
  );

  assert.equal(
    await transform(pixels, { width: 1024, height: 1024 }, 85),
    null
  );
});

test("손상되거나 지원하지 않는 이미지 형식은 파일을 추가하지 않는다", async () => {
  const before = await readdir(directory, { recursive: true });
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'
  );

  assert.equal(
    await store(Buffer.from("invalid-image"), "users", options),
    null
  );
  assert.equal(await store(svg, "users", options), null);
  await assert.rejects(transform(Buffer.from("invalid-image"), {}, 85));
  assert.equal(
    await store(Buffer.from("invalid-image"), "users", {
      ...options,
      edit: {}
    }),
    null
  );
  assert.deepEqual(await readdir(directory, { recursive: true }), before);
});

test("동일 이미지의 병렬 저장은 같은 경로를 반환하고 기존 파일을 덮어쓰지 않는다", async () => {
  const data = await picture(67, 39, "green").png().toBuffer();
  const [first, second] = await Promise.all([
    store(data, "users", options),
    store(data, "users", options)
  ]);

  assert.deepEqual(first, second);
  assert.deepEqual(await readFile(file(first.original)), data);
  // 테스트 폴더의 기존 파일을 표시해 wx 덮어쓰기 방지 동작을 확인합니다.
  await writeFile(file(first.original), "existing-test-file");
  assert.deepEqual(await store(data, "users", options), first);
  assert.equal(
    await readFile(file(first.original), "utf8"),
    "existing-test-file"
  );
});
