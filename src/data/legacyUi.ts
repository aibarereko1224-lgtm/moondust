export type Scene = 'forest' | 'starry' | 'stream' | 'desert'
export type MediaKind = 'movie' | 'tv' | 'book'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const scenes: Array<{ id: Scene; label: string }> = [
  { id: 'forest', label: 'Forest' },
  { id: 'starry', label: 'Starry' },
  { id: 'stream', label: 'Stream' },
  { id: 'desert', label: 'Desert' },
]

export const legacyQuotes = [
  { text: '我们阅读以知道我们并不孤独。', author: '林奕含' },
  { text: '忍耐是美德,可我却无法不怀疑。', author: '林奕含' },
  { text: '我已经知道,爱情是最甜美的复仇。', author: '林奕含' },
  { text: '写作是一种反抗。', author: 'Annie Ernaux' },
  { text: '生命不是安排,而是追求,是人的意义追寻过程。', author: 'Joan Didion' },
  { text: '一个人能使自己成为自己,比什么都重要。', author: 'Virginia Woolf' },
  { text: '如果有一件事是好且是对的,那就去做。', author: '李娟' },
  { text: '我的朋友是生活本身。', author: '李娟' },
  { text: '世界就在手边,躺倒就是睡眠。', author: '李娟' },
  { text: '岁月极美,在于它必然的流逝。春花，秋月、夏日、冬雪。', author: '三毛' },
  { text: '每想你一次,天上飘落一粒沙,从此形成了撒哈拉。', author: '三毛' },
  { text: '一个人至少拥有一个梦想,有一个理由去坚强。', author: '三毛' },
  { text: '生命有它的图案,我们惟有临摹。', author: '张爱玲' },
  { text: '因为懂得,所以慈悲。', author: '张爱玲' },
  { text: '你年轻么?不要紧,过两年就老了。', author: '张爱玲' },
  { text: 'We write to taste life twice, in the moment and in retrospect.', author: 'Anaïs Nin' },
  { text: 'I am not afraid of storms, for I am learning how to sail my ship.', author: 'Louisa May Alcott' },
  { text: 'The things we fear most have nothing to do with darkness.', author: 'Susanna Clarke' },
  { text: 'Stay gold, Ponyboy. Stay gold.', author: 'S.E. Hinton' },
  { text: "I am not a has-been. I am a will-be.", author: 'Lauren Bacall' },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: 'Alice Walker' },
]

export interface LegacyPreviewRecord {
  id: string
  type: MediaKind
  title: string
  poster: string
  date: string
  year: string
  rating: number
  review: string
  pending: boolean
}

// Static, read-only presentation data. It exists only to preserve the legacy
// library, detail and export UI until Supabase becomes the real data source.
export const previewRecords: LegacyPreviewRecord[] = [
  {
    id: 'preview-past-lives',
    type: 'movie',
    title: 'Past Lives',
    poster: '/posters/film-one.svg',
    date: '2026-09-06',
    year: '2023',
    rating: 5,
    review: '有些关系不是为了抵达，而是为了让我们看清自己曾经走过的路。',
    pending: false,
  },
  {
    id: 'preview-aftersun',
    type: 'movie',
    title: 'Aftersun',
    poster: '/posters/film-two.svg',
    date: '2026-07-18',
    year: '2022',
    rating: 4,
    review: '记忆像一段曝光不稳定的录像，越想看清，越接近失去。',
    pending: false,
  },
  {
    id: 'preview-the-years',
    type: 'book',
    title: '悠悠岁月',
    poster: '/posters/book-one.svg',
    date: '2026-03-21',
    year: '2008',
    rating: 5,
    review: '个人的时间与公共记忆交叠在一起，像一本没有署名的相册。',
    pending: false,
  },
]

export function getSeason(date: string): Season {
  const month = new Date(`${date}T00:00:00`).getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

export function getSeasonName(season: Season) {
  return { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }[season]
}

export function getMonthName(month: number) {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]
}
