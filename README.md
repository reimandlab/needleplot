# Needleplot

[![Code Climate](https://codeclimate.com/github/reimandlab/needleplot/badges/gpa.svg)](https://codeclimate.com/github/reimandlab/needleplot) [![API Doc](https://doclets.io/reimandlab/needleplot/master.svg)](https://doclets.io/reimandlab/needleplot/master)

A needleplot for mutation data, used by [ActiveDriverDB](https://github.com/reimandlab/ActiveDriverDB).
The visualisation is built with d3.js library.

Inspired and partially compatibile with [bbglab/muts-needle-plot](https://github.com/bbglab/muts-needle-plot).

Please click here for an [online demo](https://jsfiddle.net/58hy6fet/4/).

## Quick start

Include required files:

```html
<script src="https://d3js.org/d3.v3.min.js"></script>
<script src="needleplot.js"></script>
<link rel="stylesheet" type="text/css" href="style.css">
```

Add custom styling:


```html
<style>
  .phosphorylation rect, .phosphorylation path{
    fill: rgb(67, 162, 202)
  }
</style>
```

Create a wrapper element:

```html
<div id="needleplot"></div>
```

Initialise the needleplot and provide your data:

```html
<script>
    var needle_plot = NeedlePlot({
        element: document.getElementById('needleplot'),
        sequence_length: 393,
        mutations_color_map: {
            proximal: 'orange',
            none: 'grey',
            distal: 'yellow',
            'network-rewiring': 'red'
        },
        data: {
            mutations: [
                {ref: "V", pos: 157, alt: "F", value: 6, category: "proximal"},
                {ref: "Y", pos: 234, alt: "C", value: 18, category: "none"},
                {ref: "R", pos: 273, alt: "H", value: 18, category: "distal"},
                {ref: "R", pos: 282, alt: "W", value: 10, category: "network-rewiring"}
            ],
            sites: [
                {start: 142, end: 167, type: "phosphorylation"},
                {start: 262, end: 276, type: "phosphorylation"}
            ]
        }
    });
</script>
```

Please see the above example [running online](https://jsfiddle.net/58hy6fet/4/).
