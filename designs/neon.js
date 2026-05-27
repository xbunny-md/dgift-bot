export default function neonDesign({ title, content, footer, brand }) {
  return `╔════════╗
║  ${title}
╠════════╣
${content.split('\n').map(l => `║  ${l}`).join('\n')}
╚════════╝
» ${footer} «`
}