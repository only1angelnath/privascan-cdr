export const runtime = "nodejs"

const STORY_API = "http://172.192.41.96:1317"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = new URL(request.url)
  const target = `${STORY_API}/${path.join("/")}${url.search}`
  const response = await fetch(target)
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = new URL(request.url)
  const target = `${STORY_API}/${path.join("/")}${url.search}`
  const body = await request.text()
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    },
    body,
  })
  const responseBody = await response.text()
  return new Response(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
