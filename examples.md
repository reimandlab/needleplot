# NeedlePlot examples

### Setup

Please read [Quick start](https://github.com/reimandlab/needleplot#quick-start) and see this [online demo](https://jsfiddle.net/58hy6fet/4/) demo before proceeding.

For brevity the basic set-up (JavaScript, CSS, and HTML) is omitted in the examples below.


### Needleplot based on mutations' count

Specify mutation count in the `value` field.

[Run →](https://jsfiddle.net/58hy6fet/6/)

```js
var needle_plot = new NeedlePlot({
    element: document.getElementById('needleplot'),
    sequence_length: 393,
    data: {
        mutations: [
            {pos: 157, alt: "F", value: 6},
            {pos: 234, alt: "C", value: 18},
            {pos: 273, alt: "H", value: 18},
            {pos: 282, alt: "W", value: 10}
        ],
        sites: []
    }
});
```


### Needleplot based on mutations' frequency

To represent mutations' frequencies you should:
 - provide mutation frequency in `value` field,
 - change y-axis description to let user know that it represents frequencies,
 - add option `use_log=True` (logarithmic scale is the best to represents values from multiple orders of magnitude such as mutations frequency).

<div style="text-align: right; top: -20px"><a href="https://jsfiddle.net/58hy6fet/7/">Run →</a></div>


```js
var needle_plot = new NeedlePlot({
    use_log: true,
    legends: {y: 'Frequency of mutations', x: 'Sequence'},
    element: document.getElementById('needleplot'),
    sequence_length: 393,
    data: {
        mutations: [
            {pos: 157, alt: "F", value: 0.001},
            {pos: 234, alt: "C", value: 0.0004},
            {pos: 273, alt: "H", value: 0.023},
            {pos: 282, alt: "W", value: 0.23}
        ],
        sites: []
    }
});
```


### Custom tooltips

You can either use provided [`MinimalTooltip`](https://doclets.io/reimandlab/needleplot/master#dl-MinimalTooltip) class to create a custom tooltips or create custom, more advanced one.
Please see [`Tooltip` interface](https://doclets.io/reimandlab/needleplot/master#dl-NeedlePlot-Tooltip) documentation if you wish to hook-in advanced tooltips.

[Run →](https://jsfiddle.net/58hy6fet/9/)


```js
var needle_plot = new NeedlePlot({
    data: {
        mutations: [
            {ref: "R", pos: 282, alt: "W", value: 10, category: "network-rewiring"}
        ],
        sites: [
            {start: 142, end: 167, type: "acetylation", my_property: "some-value"},
        ]
    },
    needle_tooltip: new MinimalTooltip({
        render: function(mut){
           var name = mut.ref + mut.pos + mut.alt;
           return "My tooltip for mutation: <b>" +  name + "</b><br>" + mut.category;
        }
    }),
    site_tooltip: new MinimalTooltip({
        render: function(site){
           return "My tooltip for site: " + site.type +
           "<br><i>" + site.my_property + "</i>";
        }
    }),
    element: document.getElementById('needleplot'),
    sequence_length: 393
});
```

### Custom axes description

Use `legends: {x: 'text for x axis', y: 'text for y axis'}` to set axes descriptions.

[Run →](https://jsfiddle.net/58hy6fet/8/)


```js
var needle_plot = new NeedlePlot({
    legends: {y: 'Count of cancer-related mutations', x: 'Sequence of TP53'},
    element: document.getElementById('needleplot'),
    sequence_length: 393,
    data: {
        mutations: [
            {pos: 157, alt: "F", value: 6},
            {pos: 234, alt: "C", value: 18},
            {pos: 273, alt: "H", value: 18},
            {pos: 282, alt: "W", value: 10}
        ],
        sites: []
    }
});
```


### Customize needle heads

You can set size of needle heads with `head_size` option.
You can set colors, assigning mutations to categories and providing a color specification with `mutations_color_map`.

[Run →](https://jsfiddle.net/58hy6fet/10/)

```js
var needle_plot = new NeedlePlot({
    head_size: 10,
    mutations_color_map: {
      interesting: 'orange',
      important: 'red',
      none: 'grey',
    },
    data: {
        mutations: [
            {pos: 157, alt: "F", value: 6, category: 'interesting'},
            {pos: 234, alt: "C", value: 18, category: 'important'},
            {pos: 273, alt: "H", value: 18, category: 'none'},
            {pos: 282, alt: "W", value: 10} // category not provided
        ],
        sites: []
    },
    element: document.getElementById('needleplot'),
    sequence_length: 393
});
```


### Visualise domains or sites

Sites or domain are provided with `data.sites` option.
You need to specify `start` and `end` of each site.
You may provide `type` to use it later for custom styling.

To customize colors of the domains or sites use CSS styles like this:

```css
/* Color of the inner rectangle */
.type-name rect{
    fill: red
}
/* Color of the border */
.type-name path{
    fill: green
}
```

[Run →](https://jsfiddle.net/58hy6fet/11/)

```js
var needle_plot = new NeedlePlot({
    data: {
        mutations: [
            {pos: 157, alt: "F", value: 6},
        ],
        sites: [
            {start: 142, end: 167, type: "phosphorylation"},
            {start: 262, end: 276, type: "acetylation"}
        ]
    },
    element: document.getElementById('needleplot'),
    sequence_length: 393
});
```
