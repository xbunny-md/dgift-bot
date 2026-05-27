export default function cyberDesign({ title, content, footer, brand }) {
  return `▓ ${title} ▓▓
░ ${content.replace(/\n/g, '\n░ ')}
▓ ${footer} ▓▓`
}