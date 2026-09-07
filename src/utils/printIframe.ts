/**
 * Robust print flow: clones the given element into a hidden, isolated iframe
 * (with its own stylesheets), waits for images/fonts to be ready, then opens
 * the browser's native print dialog for that iframe only.
 *
 * This avoids the common pitfalls of printing the whole page directly
 * (position:fixed modals, sidebars, scroll containers) which can produce a
 * blank or broken print/PDF output in some browsers.
 */
export async function printElementViaIframe(
  element: HTMLElement,
  documentTitle = 'Document'
): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 300);
  };

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!iframeDoc || !win) {
      throw new Error('iframe document unavailable');
    }

    // Absolute URLs for existing stylesheets (covers Tailwind's compiled CSS,
    // both the <link> tag used in production and the <style> tags injected by Vite in dev).
    const headParts: string[] = [];
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      if (node.tagName === 'LINK') {
        const href = (node as HTMLLinkElement).href;
        headParts.push(`<link rel="stylesheet" href="${href}">`);
      } else {
        headParts.push(node.outerHTML);
      }
    });

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${documentTitle}</title>
${headParts.join('\n')}
<style>
  @page { size: A4; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  body {
    display: flex;
    justify-content: center;
  }
</style>
</head>
<body></body>
</html>`);
    iframeDoc.close();

    const clone = element.cloneNode(true) as HTMLElement;
    // Neutralize any print-only visibility rules that might otherwise fight
    // with this isolated document (nothing else exists here to hide).
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    iframeDoc.body.appendChild(clone);

    // Wait for external stylesheets to finish loading
    const linkEls = Array.from(iframeDoc.querySelectorAll('link[rel="stylesheet"]'));
    await Promise.all(
      linkEls.map(
        (link) =>
          new Promise<void>((resolve) => {
            const el = link as HTMLLinkElement;
            if ((el as any).sheet) return resolve();
            el.addEventListener('load', () => resolve());
            el.addEventListener('error', () => resolve());
            setTimeout(resolve, 2000);
          })
      )
    );

    // Wait for images (logo, etc.) inside the cloned content
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve());
                img.addEventListener('error', () => resolve());
                setTimeout(resolve, 2000);
              })
      )
    );

    // Give layout/fonts one more tick to settle before printing
    await new Promise((resolve) => setTimeout(resolve, 150));

    win.focus();
    win.onafterprint = cleanup;
    win.print();
    // Fallback cleanup in case `onafterprint` never fires in some browsers
    setTimeout(cleanup, 8000);
  } catch (err) {
    console.error('Print via iframe failed, falling back to window.print():', err);
    cleanup();
    window.print();
  }
}
