# Rafael Ngai: portfolio

**Live:** https://rafaelkoo.github.io/

My portfolio is run by a small rebuild of my timetable engine. The bar at the top is the page's timetable: the red line follows your scroll, dragging a block (or Rearrange on a phone) reorders the page, Lunch and my start date are locked, and the Recruiter / Developer switch changes how much detail you see.

| Folder | What it is |
|---|---|
| `index.html` | The portfolio: one file, plain HTML, CSS and JavaScript, no build step |
| `img/` | Screenshots (demos use invented people and data) |
| `timetable-demo/` | The real timetable app running on an invented school, entirely in the browser |
| `tracker-demo/` | The Student Tracker with made-up people and the real AIM course content |

Built with AI assistance (Claude). I decided what each piece does and tested it before publishing.

**To update the start date:** in `index.html`, set `CONFIG.start` to a date like `'2027-02-01'`.
