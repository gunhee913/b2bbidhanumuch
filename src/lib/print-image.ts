/**
 * 그림 한 장을 종이 한 장으로 뽑는다 · 등급판정확인서·도축검사증명서 같은 스캔본용.
 *
 * 숨긴 iframe 에 찍는다. `window.open` 으로 띄우면 팝업 차단에 걸리는데, 증명서를
 * 뽑는 건 사용자가 단추를 누른 결과라 막히면 아무 일도 안 일어난 것처럼 보인다.
 *
 * 그림이 다 뜬 뒤에 찍는다. 바로 부르면 빈 종이가 나온다 — 인쇄 대화상자는 그 시점의
 * 문서를 그대로 뜨므로 아직 안 받은 그림은 없는 것과 같다.
 *
 * PDF 는 여기서 다루지 않는다. iframe 에 끼워 넣어도 브라우저마다 내장 뷰어를 쓰는
 * 방식이 달라 인쇄 명령이 먹지 않는 데가 있다 — 새 탭으로 넘겨 뷰어에 맡긴다.
 */
export function printImage(src: string, title: string, fileType?: string) {
  if (fileType?.toLowerCase().includes("pdf")) {
    window.open(src, "_blank", "noopener,noreferrer");
    return;
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }

  const cleanup = () => frame.remove();

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      `<style>` +
      /* 종이 가장자리는 프린터가 못 찍는 자리라 넉넉히 비운다 */
      `@page{margin:12mm}` +
      `html,body{margin:0;padding:0}` +
      /* 세로로 긴 스캔본이 두 장으로 넘어가지 않게 높이를 한 장에 가둔다 */
      `img{display:block;width:100%;height:auto;max-height:100vh;object-fit:contain}` +
      `</style></head><body><img alt="${escapeHtml(title)}" src="${escapeHtml(src)}"></body></html>`,
  );
  doc.close();

  const img = doc.images[0];
  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    /* 인쇄 대화상자가 닫힐 때까지 틀을 살려 둔다 · 먼저 지우면 미리보기가 빈다 */
    setTimeout(cleanup, 1000);
  };

  if (!img) {
    cleanup();
    return;
  }
  if (img.complete) {
    run();
    return;
  }
  img.addEventListener("load", run, { once: true });
  img.addEventListener("error", cleanup, { once: true });
}

const escapeHtml = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
