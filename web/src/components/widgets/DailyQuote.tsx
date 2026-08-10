import { useState, useEffect, useCallback } from 'react'
import { Quote, RefreshCw } from 'lucide-react'

interface QuoteItem {
  text: string
  author: string
  source?: string
}

/** 内置名言库：诗词、名言、电影名句 */
const QUOTES: QuoteItem[] = [
  // 古诗词
  { text: '人生若只如初见，何事秋风悲画扇。', author: '纳兰性德', source: '《木兰花·拟古决绝词柬友》' },
  { text: '纵浪大化中，不喜亦不惧。', author: '陶渊明', source: '《形影神》' },
  { text: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', author: '苏轼', source: '《定风波》' },
  { text: '玲珑骰子安红豆，入骨相思知不知。', author: '温庭筠', source: '《南歌子》' },
  { text: '曾经沧海难为水，除却巫山不是云。', author: '元稹', source: '《离思》' },
  { text: '长风破浪会有时，直挂云帆济沧海。', author: '李白', source: '《行路难》' },
  { text: '落霞与孤鹜齐飞，秋水共长天一色。', author: '王勃', source: '《滕王阁序》' },
  { text: '此情可待成追忆，只是当时已惘然。', author: '李商隐', source: '《锦瑟》' },
  { text: '人生得意须尽欢，莫使金樽空对月。', author: '李白', source: '《将进酒》' },
  { text: '采菊东篱下，悠然见南山。', author: '陶渊明', source: '《饮酒·其五》' },
  { text: '海上生明月，天涯共此时。', author: '张九龄', source: '《望月怀远》' },
  { text: '山有木兮木有枝，心悦君兮君不知。', author: '佚名', source: '《越人歌》' },
  { text: '众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。', author: '辛弃疾', source: '《青玉案·元夕》' },
  { text: '但愿人长久，千里共婵娟。', author: '苏轼', source: '《水调歌头》' },
  { text: '莫听穿林打叶声，何妨吟啸且徐行。', author: '苏轼', source: '《定风波》' },
  // 名言
  { text: '生活不止眼前的苟且，还有诗和远方。', author: '高晓松' },
  { text: '愿你出走半生，归来仍是少年。', author: '苏轼', source: '化用' },
  { text: '世界上只有一种英雄主义，就是看清生活的真相之后依然热爱生活。', author: '罗曼·罗兰', source: '《米开朗琪罗传》' },
  { text: '愿你一生勇敢，不负聪明。', author: '茨威格' },
  { text: '我们都是阴沟里的虫子，但总还是要有人仰望星空。', author: '王尔德', source: '《温德米尔夫人的扇子》' },
  { text: '一个人至少拥有一个梦想，有一个理由去坚强。', author: '三毛' },
  { text: '如果你不出去走走，你就会以为这就是世界。', author: '佚名' },
  { text: '从前的日色变得慢，车、马、邮件都慢，一生只够爱一个人。', author: '木心', source: '《从前慢》' },
  { text: '我所有的努力，都是为了配得上未来想要的生活。', author: '佚名' },
  { text: '保持热爱，奔赴山海。', author: '佚名' },
  // 电影名句
  { text: '希望是美好的，也许是人间至善，而美好的事物永不消逝。', author: '斯蒂芬·金', source: '《肖申克的救赎》' },
  { text: '人生就是不断地放下，但最遗憾的是我们来不及好好告别。', author: '李安', source: '《少年派的奇幻漂流》' },
  { text: '你跳，我也跳。', author: '詹姆斯·卡梅隆', source: '《泰坦尼克号》' },
  { text: '如果你有梦想，就要守护它。', author: '加布里尔·穆奇诺', source: '《当幸福来敲门》' },
  { text: '做正确的事，永远不会太晚。', author: '罗伯特·泽米吉斯', source: '《阿甘正传》' },
  { text: '愿原力与你同在。', author: '乔治·卢卡斯', source: '《星球大战》' },
  { text: '世界上有那么多的城镇，城镇中有那么多的酒馆，她却走进了我的。', author: '迈克尔·柯蒂兹', source: '《卡萨布兰卡》' },
  { text: '不管你做什么，都要做到极致。', author: '史蒂文·斯皮尔伯格', source: '《绿皮书》' },
  { text: '这世上只有一种成功，就是能够用自己喜欢的方式度过自己的一生。', author: '韩寒', source: '《后会无期》' },
  { text: '有些鸟儿是永远关不住的，因为它们的每一片羽翼上都沾满了自由的光辉。', author: '弗兰克·德拉邦特', source: '《肖申克的救赎》' },
]

/** 根据日期生成稳定的索引，同一天显示同一条 */
function getIndexByDate(): number {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % QUOTES.length
}

export default function DailyQuote() {
  const [index, setIndex] = useState(getIndexByDate())

  const refresh = useCallback(() => {
    let next = Math.floor(Math.random() * QUOTES.length)
    if (next === index) next = (next + 1) % QUOTES.length
    setIndex(next)
  }, [index])

  const quote = QUOTES[index]

  return (
    <div
      className="card p-5 relative overflow-hidden"
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg)), var(--card-bg))',
      }}
    >
      {/* 装饰引号 */}
      <Quote
        size={48}
        className="absolute -top-2 -right-2 opacity-10"
        style={{ color: 'var(--accent-primary)' }}
      />

      <div className="flex items-center gap-2 mb-3 relative">
        <Quote size={14} style={{ color: 'var(--accent-primary)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
          每日一言
        </span>
        <button
          onClick={refresh}
          className="ml-auto p-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-subtle)' }}
          title="换一句"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <blockquote
        className="text-sm leading-relaxed relative"
        style={{ color: 'var(--text-fg)' }}
      >
        {quote.text}
      </blockquote>

      <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: 'var(--text-subtle)' }}>
        <span>——</span>
        <span className="font-medium">{quote.author}</span>
        {quote.source && (
          <>
            <span>·</span>
            <span className="italic">{quote.source}</span>
          </>
        )}
      </div>
    </div>
  )
}
