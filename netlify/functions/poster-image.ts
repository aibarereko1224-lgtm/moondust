const allowedHosts = new Set(['image.tmdb.org'])

export default async (request: Request) => {
  if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 })

  const source = new URL(request.url).searchParams.get('url')
  if (!source) return new Response('Missing image URL.', { status: 400 })

  let imageUrl: URL
  try {
    imageUrl = new URL(source)
  } catch {
    return new Response('Invalid image URL.', { status: 400 })
  }

  if (imageUrl.protocol !== 'https:' || !allowedHosts.has(imageUrl.hostname)) {
    return new Response('Image host is not allowed.', { status: 403 })
  }

  try {
    const response = await fetch(imageUrl, { headers: { Accept: 'image/*' } })
    if (!response.ok) return new Response('Image unavailable.', { status: 502 })
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return new Response('Invalid image response.', { status: 502 })
    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response('Image unavailable.', { status: 502 })
  }
}
