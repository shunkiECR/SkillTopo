/** ASCIIを幅1、その他を幅2として最大2行に省略する。SVGのラベル幅の近似値。 */
export const shortLines = (name: string, limit = 10) => {
  const lines = [''];
  let width = 0;
  for (const char of name) {
    const size = /[\x00-\x7f]/.test(char) ? 1 : 2;
    if (width + size > limit) {
      if (lines.length === 2) {
        lines[1] += '…';
        break;
      }
      lines.push('');
      width = 0;
    }
    lines[lines.length - 1] += char;
    width += size;
  }
  return lines;
};
