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
        {
          text: [
            'tiny',
            'caption',
            'body',
            'body-lg',
            'title',
            'heading',
            'display',
            ...[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28, 32, 43].map(
              String,
            ),
          ],
        },
      ],
    },
  },
})
