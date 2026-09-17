const paragraphs = [
  '九月的雨停在傍晚。窗没有完全关好，风把桌上的电影票吹动了一厘米，又安静下来。我重新打开那本读到一半的书，纸页里夹着一张去年的车票，上面印着 21:47——那是我们离开海边的时间。',
  '记忆并不总按年份排列。它更像房间里的灰尘：平时看不见，光线斜着照进来时，才忽然有了形状。我想起银幕熄灭后的几秒，所有人都没有起身；也想起你说，“有些故事不必急着理解。”于是那些没有写完的感受，被我放进括号里（暂时不解释），等某个普通的星期三再回来。',
  '夜深以后，城市的声音一层层退远。冰箱偶尔响一下，楼下有人收起晾晒的衣服，远处的车灯从天花板上缓慢掠过……生活没有给出答案，却留下许多细小的证据：一段被反复播放的配乐、书脊上浅浅的折痕、杯底已经凉掉的茶，以及日历边缘随手画下的月亮。它们并不宏大，也不完整，却让一天获得了可以被触摸的重量。',
  '我开始明白，记录不是为了把时间固定下来。恰恰相反，它承认一切都会变化——喜欢会变，理解会变，同一部电影在 20 岁和 30 岁时也会显出不同的颜色。我们能做的，只是在当下认真看一眼，然后写下：“此刻，我在这里。”字不需要很多，页面也不必填满；留一点空白，让后来的人（也许就是未来的自己）能够坐下来，呼吸，再继续往下读。'
]

const tests = [
  {
    number: '01',
    label: '约 100 字',
    note: '短段落 · 观察起笔重量',
    text: [paragraphs[0]]
  },
  {
    number: '02',
    label: '约 200 字',
    note: '中等长度 · 观察连续阅读',
    text: [paragraphs[0], paragraphs[1]]
  },
  {
    number: '03',
    label: '约 500 字',
    note: '长文本 · 观察页面是否下沉',
    text: paragraphs
  }
]

const schemes = [
  {
    id: 'A',
    className: 'scheme-a',
    intent: '紧凑 / 纸感',
    params: [
      ['Font family', 'Noto Serif SC'],
      ['Font size', '17px'],
      ['Line height', '1.88 / 31.96px'],
      ['Letter spacing', '0.005em / 0.085px'],
      ['Reading width', '560px'],
      ['Paragraph gap', '1.25em / 21.25px'],
      ['Text color', '#30312D'],
      ['Font weight', '400']
    ]
  },
  {
    id: 'B',
    className: 'scheme-b',
    intent: '舒展 / 轻盈',
    params: [
      ['Font family', 'Noto Serif SC'],
      ['Font size', '18px'],
      ['Line height', '2.04 / 36.72px'],
      ['Letter spacing', '0.018em / 0.324px'],
      ['Reading width', '620px'],
      ['Paragraph gap', '1.55em / 27.9px'],
      ['Text color', '#3D3E38'],
      ['Font weight', '300']
    ]
  },
  {
    id: 'C',
    className: 'scheme-c',
    intent: '清透 / 当代',
    params: [
      ['Font family', 'Noto Sans SC'],
      ['Font size', '17px'],
      ['Line height', '2.00 / 34px'],
      ['Letter spacing', '0.025em / 0.425px'],
      ['Reading width', '720px'],
      ['Paragraph gap', '1.40em / 23.8px'],
      ['Text color', '#41423D'],
      ['Font weight', '300']
    ]
  }
]

const playground = document.querySelector('#playground')

const createParameterList = (params) => `
  <dl class="parameter-list">
    ${params.map(([name, value]) => `
      <div class="parameter-row">
        <dt>${name}</dt>
        <dd>${value}</dd>
      </div>
    `).join('')}
  </dl>
`

const createCard = (scheme, paragraphsForTest) => `
  <article class="type-card ${scheme.className}">
    <aside class="variant-meta">
      <div class="variant-label">
        <strong>${scheme.id}</strong>
        <span>${scheme.intent}</span>
      </div>
      ${createParameterList(scheme.params)}
    </aside>
    <div class="reading-stage">
      <div class="reading-copy">
        ${paragraphsForTest.map((paragraph) => `<p>${paragraph}</p>`).join('')}
      </div>
    </div>
  </article>
`

playground.innerHTML = tests.map((test) => {
  const characterCount = test.text.join('').length

  return `
    <section class="test-section" aria-labelledby="test-${test.number}">
      <header class="section-heading">
        <div class="section-heading-inner">
          <p class="section-kicker">Test ${test.number}</p>
          <h2 id="test-${test.number}">${test.label}</h2>
          <p>${test.note}<br />实际 ${characterCount} 字符</p>
        </div>
      </header>
      <div class="variant-list">
        ${schemes.map((scheme) => createCard(scheme, test.text)).join('')}
      </div>
    </section>
  `
}).join('')
