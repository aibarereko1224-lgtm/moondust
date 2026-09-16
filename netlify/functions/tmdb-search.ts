type SearchType = 'movie' | 'tv'

interface TmdbItem {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
}

interface TmdbResponse {
  results?: TmdbItem[]
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
  },
})

export default async (request: Request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return json({ error: 'TMDB 搜索尚未配置。' }, 503)

  const url = new URL(request.url)
  const query = url.searchParams.get('query')?.trim() ?? ''
  const type = url.searchParams.get('type') as SearchType | null

  if (!query) return json({ error: '请输入搜索内容。' }, 400)
  if (type !== 'movie' && type !== 'tv') return json({ error: '只支持 Movie 或 TV 搜索。' }, 400)

  const parameters = new URLSearchParams({
    api_key: apiKey,
    language: 'zh-CN',
    query,
    include_adult: 'false',
  })

  try {
    const response = await fetch(`https://api.themoviedb.org/3/search/${type}?${parameters.toString()}`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return json({ error: 'TMDB 搜索暂时不可用，请稍后再试。' }, 502)

    const payload = await response.json() as TmdbResponse
    const results = (payload.results ?? []).slice(0, 12).map((item) => ({
      id: item.id,
      type,
      title: item.title ?? item.name ?? '未命名作品',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      date: item.release_date || item.first_air_date || null,
    }))

    return json({ results })
  } catch {
    return json({ error: 'TMDB 搜索暂时不可用，请稍后再试。' }, 502)
  }
}
