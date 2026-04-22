import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import {
  getPublishedProjectForReader,
  tokenSchema,
} from '@/lib/public-project'
import ReaderView from './ReaderView'

const demoChapters = [
  {
    number: 1,
    title: 'The Drawing',
    source: `Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal. Here is a copy of the drawing.

In the book it said: "Boa constrictors swallow their prey whole, without chewing it. After that they are not able to move, and they sleep through the six months that they need for digestion."

I pondered deeply, then, over the adventures of the jungle. And after some work with a colored pencil I succeeded in making my first drawing. My Drawing Number One. I showed my masterpiece to the grown-ups, and asked them whether the drawing frightened them.

But they answered: "Frighten? Why should any one be frightened by a hat?"

My drawing was not a picture of a hat. It was a picture of a boa constrictor digesting an elephant. But since the grown-ups were not able to understand it, I made another drawing: I drew the inside of a boa constrictor, so that the grown-ups could see it clearly. They always need to have things explained.`,
    translation: `我六岁的时候，在一本描述原始森林的，名叫《真实的故事》的书中，看到了一幅精彩的插画。画的是一条蟒蛇正在吞食一只动物。这里是那幅画的摹本。

书中写道："蟒蛇把猎物整个吞下去，一点也不咀嚼。此后它们就不能动弹了，要睡上六个月来消化食物。"

那时我对丛林中的奇遇想了很多，最后用彩色铅笔画出了我的第一幅画。我的第一号作品。我把我的杰作拿给大人看，问他们我的画是不是让他们害怕。

他们回答说："害怕？一顶帽子有什么可怕的？"

我画的不是一顶帽子。我画的是一条蟒蛇在消化一头大象。但是大人们看不懂，我只好又画了一幅画——把蟒蛇的内部画了出来，好让大人们能够看明白。他们总是需要别人给他们解释。`,
  },
  {
    number: 2,
    title: 'The Pilot',
    source: `So then I chose another profession, and learned to pilot airplanes. I have flown a little over all parts of the world; and it is true that geography has been very useful to me. At a glance I can distinguish China from Arizona. If one gets lost in the night, such knowledge is valuable.

In the course of this life I have had a great many encounters with a great many people who have been concerned with matters of consequence. I have lived a great deal among grown-ups. I have seen them intimately, close at hand. And that hasn't much improved my opinion of them.

Whenever I met one of them who seemed to me at all clear-sighted, I tried the experiment of showing him my Drawing Number One, which I have always kept. I would try to find out, so, if this was a person of true understanding. But, whoever it was, he, or she, would always say: "That is a hat."

Then I would never talk to that person about boa constrictors, or primeval forests, or stars. I would bring myself down to his level. I would talk to him about bridge, and golf, and politics, and neckties. And the grown-up would be greatly pleased to have met such a sensible man.`,
    translation: `于是我就选择了另外一个职业，学会了开飞机。我差不多飞遍了世界各地，地理学确实对我很有帮助。我一眼就能看出中国和亚利桑那。在夜间迷了路，这样的知识是很有用的。

在我的生活中，我跟许许多多严肃的人有过很多的接触。我在大人中间生活了很长时间。我仔细地观察过他们，但这并没有使我对他们的看法有多大的改变。

每当我遇到一个头脑看起来稍微清楚一点的大人时，我就拿出一直保存着的我的那幅第一号作品来测验测验他。我想知道他是不是真的有理解力。可是，得到的回答总是："这是顶帽子。"

于是我就不和他谈蟒蛇了，也不谈原始森林和星星了。我把自己放在他的水平上。我和他谈桥牌、谈高尔夫球、谈政治、谈领带。于是大人就很高兴能认识一个这样通情达理的人。`,
  },
  {
    number: 3,
    title: 'The Asteroid',
    source: `I had thus learned a second fact of great importance: this was that the planet the little prince came from was scarcely any larger than a house!

But that did not really surprise me much. I knew very well that in addition to the great planets — such as the Earth, Jupiter, Mars, Venus — to which we have given names, there are also hundreds of others, some of which are so small that one has a hard time seeing them through the telescope. When an astronomer discovers one of these he does not give it a name, but only a number. He might call it, for example, "Asteroid 325."

I have serious reason to believe that the planet from which the little prince came is the asteroid known as B-612. This asteroid has only once been seen through the telescope. That was by a Turkish astronomer, in 1909.

On making his discovery, the astronomer had presented it to the International Astronomical Congress, in a great demonstration. But he was in Turkish costume, and so nobody would believe what he said. Grown-ups are like that.`,
    translation: `这样，我又知道了一个很重要的事实：他来的那个星球比一所房子大不了多少！

这倒不使我感到太奇怪。我知道除了地球、木星、火星、金星这些有名字的大行星以外，还有成百个别的星球，它们有的小得很，就是用望远镜也很难看见。当一个天文学家发现了其中的一个，他就不用名字来称呼它，而只给它一个编号。比如他把它叫做"325小行星"。

我有重要的根据认为小王子所来自的那个星球是B-612号小行星。这颗小行星仅仅在1909年被一个土耳其天文学家用望远镜看到过一次。

当时他曾经在国际天文学大会上对他的发现作了重大的论证。但是由于他穿着土耳其的服装，所以没有人相信他。大人们就是这样。`,
  },
  {
    number: 4,
    title: 'The Baobabs',
    source: `Every day I learned something new about the planet, about the departure, about the journey. It would come very quietly, as a chance reflection. Thus on the third day I learned about the catastrophe of the baobabs.

This time, once more, I had the sheep to thank for it. For the little prince asked me abruptly — as if seized by a grave doubt — "It is true, isn't it, that sheep eat little bushes?"

"Yes, that is true."

"Ah! I am glad!"

I did not understand why it was so important that sheep should eat little bushes. But the little prince added: "Then it follows that they also eat baobabs?"

I pointed out to the little prince that baobabs are not little bushes, but, on the contrary, trees as big as castles; and that even if he took a whole herd of elephants away with him, the herd would not eat up one single baobab.

The idea of the herd of elephants made the little prince laugh. "We would have to put them one on top of the other," he said. But he made a wise comment: "Before they grow so big, the baobabs start out by being little."

"That is strictly correct," I said. "But why do you want the sheep to eat the little baobabs?"`,
    translation: `每天我都能了解到一些关于他的星球、他的出走和旅行的事情。这些都是偶然从他无意中说出的话里慢慢了解到的。就这样，第三天我知道了猴面包树的事。

这一次又是多亏了小羊。小王子突然问道——好像他产生了一个很严重的疑虑："羊吃小灌木，这是真的吗？"

"是的，是真的。"

"啊！我很高兴！"

我不明白羊吃小灌木为什么这么重要。但是小王子接着说："那么它们也吃猴面包树吗？"

我告诉小王子，猴面包树可不是小灌木，而是跟教堂一样高大的树；即使他带回去一群大象，也啃不了一棵猴面包树。

一群大象这个想法把小王子逗乐了。"那得把大象一只叠一只地摞起来。"但是他很有见识地说："猴面包树在长大之前，一开始也是小的。"

"不错。可是你为什么想让羊吃小猴面包树呢？"`,
  },
  {
    number: 5,
    title: 'The Sunset',
    source: `Oh, little prince! Bit by bit I came to understand the secrets of your sad little life. For a long time you had found your only entertainment in the quiet pleasure of looking at the sunset. I learned that new detail on the morning of the fourth day, when you said to me:

"I am very fond of sunsets. Come, let us go look at a sunset now."

"But we must wait," I said.

"Wait? For what?"

"For the sunset. We must wait until it is time."

At first you seemed to be very much surprised. And then you laughed to yourself. You said to me: "I am always thinking that I am at home!"

Just so. Everybody knows that when it is noon in the United States the sun is setting over France. If you could fly to France in one minute, you could go straight into the sunset, right from noon. Unfortunately, France is too far away for that. But on your tiny planet, my little prince, all you need do is move your chair a few steps. You can see the day end and the twilight falling whenever you like...

"One day," you said to me, "I saw the sunset forty-four times!"

And a little later you added: "You know — one loves the sunset, when one is so sad..."

"Were you so sad, then?" I asked, "on the day of the forty-four sunsets?"

But the little prince made no answer.`,
    translation: `啊！小王子，就这样，我逐渐懂得了你那忧郁的小生活的秘密。很长时间里，你唯一的乐趣就是观赏落日。这个新的细节是我在第四天早晨知道的，你那时对我说：

"我很喜欢看日落。走吧，我们去看一场日落吧。"

"可是我们得等一等。"我说。

"等什么？"

"等日落。我们得等到时间到了。"

起初你显得很惊讶，然后你自己笑了起来。你对我说："我总以为自己还在家里呢！"

的确如此。当美国是正午的时候，太阳正在法国落下去。只要一分钟就能到法国，你就能看到日落了。不幸的是法国太远了。但在你那小小的星球上，小王子，你只要把椅子挪几步就行了。你随时都能看到暮色降临……

"有一天，"你对我说，"我看了四十四次日落！"

过了一会儿你又说："你知道的……人在忧伤的时候才喜欢看日落……"

"那你看四十四次日落那天，你很忧伤吗？"我问。

但是小王子没有回答。`,
  },
]

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Intentional public bypass: /read/demo serves static marketing content
  // (public-domain Little Prince excerpts) and must remain reachable without
  // auth so the landing page can link signed-out visitors straight into the
  // demo. Any non-public content added here in future MUST move below the
  // auth() gate.
  if (id === 'demo') {
    return (
      <ReaderView
        title="The Little Prince"
        subtitle="小王子"
        sourceLang="English"
        targetLang="中文"
        chapters={demoChapters}
        isDemo
      />
    )
  }

  // Public-token branch: the token IS the authorization (OWASP A01 per #32).
  // Dispatch on `tokenSchema` (the same z.string().uuid() used elsewhere for
  // public tokens) rather than a hand-rolled regex so validation stays in one
  // place. Unknown or unpublished tokens return the same notFound() response
  // so an attacker cannot differentiate "doesn't exist" from "exists but
  // private". Next 16 forbids sibling [id]/[token] slugs, so owner cuids and
  // public uuids must share this one segment.
  if (tokenSchema.safeParse(id).success) {
    const project = await getPublishedProjectForReader(id)
    if (!project) return notFound()

    const chapters = project.chapters.map((ch) => ({
      number: ch.number,
      title: ch.title,
      source: ch.sourceContent || '',
      translation: ch.translation || '',
    }))

    return (
      <ReaderView
        title={project.title}
        sourceLang={project.sourceLang}
        targetLang={project.targetLang}
        chapters={chapters}
      />
    )
  }

  const { userId } = await auth()
  if (!userId) return redirect('/sign-in')

  const project = await prisma.project.findUnique({
    where: { id },
    include: { chapters: { orderBy: { number: 'asc' } } },
  })

  if (!project) return notFound()
  if (project.ownerId !== userId && !project.isPublic) return notFound()

  const chapters = project.chapters.map((ch) => ({
    id: ch.id,
    number: ch.number,
    title: ch.title,
    source: ch.sourceContent || '',
    translation: ch.translation || '',
  }))

  return (
    <ReaderView
      title={project.title}
      sourceLang={project.sourceLang}
      targetLang={project.targetLang}
      chapters={chapters}
      projectId={project.ownerId === userId ? id : undefined}
    />
  )
}
