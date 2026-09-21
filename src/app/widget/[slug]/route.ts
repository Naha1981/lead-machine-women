import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function safeSlug(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
}

export async function GET(_req: Request, { params }: Params) {
  const { slug: rawSlug } = await params;
  const slug = safeSlug(rawSlug);

  if (!slug) {
    return new NextResponse("/* Invalid Lead Machine slug */", {
      status: 400,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const script = `(function () {
  if (window.__NAHALABS_LEAD_MACHINE_WIDGET__) return;
  window.__NAHALABS_LEAD_MACHINE_WIDGET__ = true;

  var currentScript = document.currentScript;
  var baseOrigin = currentScript && currentScript.src
    ? new URL(currentScript.src).origin
    : window.location.origin;
  var destination = baseOrigin + "/go/${slug}";

  var style = document.createElement("style");
  style.textContent = [
    "#nahalabs-lead-machine{position:fixed;right:18px;bottom:18px;z-index:2147483647;border:0;border-radius:999px;padding:14px 18px;background:#059669;color:#fff;font:600 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.2);cursor:pointer}",
    "#nahalabs-lead-machine:hover{filter:brightness(.95)}",
    "@media(max-width:640px){#nahalabs-lead-machine{right:12px;bottom:12px;padding:13px 16px;font-size:13px}}"
  ].join("");
  document.head.appendChild(style);

  var button = document.createElement("button");
  button.id = "nahalabs-lead-machine";
  button.type = "button";
  button.setAttribute("aria-label", "Make an enquiry");
  button.textContent = "Make an enquiry";
  button.addEventListener("click", function () {
    window.open(destination, "_blank", "noopener,noreferrer");
  });

  document.body.appendChild(button);
})();
`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
