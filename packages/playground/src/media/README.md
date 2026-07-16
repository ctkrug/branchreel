# Demo media

These eight clips are the sample story ("The Signal") the playground ships with. Each is a
3-second, ffmpeg-generated placeholder — a solid color card with the node's label and id, no
real footage — so the repo stays tiny and the demo has zero external asset dependencies.

Swap in real video by pointing each `BranchNode.src` in `src/story.ts` at your own segment;
nothing else about the library or playground UI needs to change. Segments do not need to be the
same resolution or duration as each other or as these placeholders.

Regenerate placeholders with:

```sh
ffmpeg -f lavfi -i "color=c=0x0b1220:s=480x270:d=3,format=yuv420p" \
  -vf "drawtext=fontfile=/path/to/font.ttf:text='LABEL':fontcolor=0x4fd1ff:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2" \
  -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -movflags +faststart -an -y out.mp4
```
