import { createCn } from 'cn/config'

/**
 * Class merging aware of the Figma type scale (src/index.css). Without this, `text-body`
 * looks like a text *color* to the merger and silently drops real colors such as
 * `text-accent-foreground` from the same class list.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['tiny', 'caption', 'body', 'body-lg', 'title', 'heading', 'display'] },
      ],
    },
  },
})
