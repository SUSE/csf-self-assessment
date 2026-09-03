export const DESKTOP_SCHEME = 'csf';
export const DESKTOP_CSP = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'font-src data:',
    'media-src data: blob:',
    "connect-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
].join('; ');
export function decideRendererRequest(target, requestUrl, rendererHtml) {
    if (requestUrl.href === target.startUrl) {
        return { kind: 'serve', html: rendererHtml };
    }
    return { kind: 'refuse' };
}
export function rendererResponse(decision) {
    if (decision.kind === 'refuse') {
        return new Response(null, { status: 404 });
    }
    return new Response(Uint8Array.from(decision.html), {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'content-security-policy': DESKTOP_CSP,
        },
    });
}
