export default function elegantDesign({ title, content, footer }) {
  return `┏━━━ ${title} ━━━┓
┃ ${content.replace(/\n/g, '\n┃ ')}
┗━━━ ${footer} ━━━┛`
}