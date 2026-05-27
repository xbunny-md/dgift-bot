export default function modernDesign({ title, content, footer, brand }) {
  return `┌─「 ${title} 」
│ ${content.replace(/\n/g, '\n│ ')}
└─「 ${footer} 」`
}