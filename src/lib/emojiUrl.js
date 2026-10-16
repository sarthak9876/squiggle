/* Raw emoji character -> local Twemoji SVG url.

   The SIL keys have their own files; this covers every OTHER emoji the content
   uses — the flags in Put In Order and Place The Dot, and the Bias Fingerprint
   faces. Flags are the reason this exists: Windows does not render regional
   indicator pairs at all, it draws two letters, so a question whose answer is a
   country had no picture to answer.

   Twemoji's filename rule: lowercase hex codepoints joined by '-', with the
   FE0F variation selector dropped unless the sequence uses a ZWJ. */
export function emojiFile(ch) {
  if (!ch) return null;
  const cps = [...ch].map(c => c.codePointAt(0));
  const keep = cps.includes(0x200D) ? cps : cps.filter(c => c !== 0xFE0F);
  return keep.map(c => c.toString(16)).join('-');
}

export function emojiUrl(ch) {
  const f = emojiFile(ch);
  return f ? `/emoji/u/${f}.svg` : null;
}

/** Load one as an Image, for canvas. Resolves null rather than rejecting, so a
 *  missing file degrades to the system glyph instead of blanking the card. */
export function loadEmojiImage(ch) {
  return new Promise(resolve => {
    const url = emojiUrl(ch);
    if (!url) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
