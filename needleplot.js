/**
 * Simplified, shallow equivalent of jquery.extend
 * @private
 * @param modified_obj
 * @param modifying_obj
 */
function update_object(modified_obj, modifying_obj)
{
    for(var key in modifying_obj)
    {
        if(modifying_obj.hasOwnProperty(key))
        {
            modified_obj[key] = modifying_obj[key]
        }
    }
}

/**
 * Minimal (but no shortest possible) implementation of {@link NeedlePlot.Tooltip} type for use with the {@link NeedlePlot}.
 *
 * @class
 * @type {NeedlePlot.Tooltip}
 * @param {Object} tooltip_config - configuration of the tooltip
 * @param {function} tooltip_config.render - generates HTML content of a tooltip
 * for provided d3js object.
 *
 * @example
 * new NeedlePlot({
 *     sequence_length: 393,
 *     data: {
 *         mutations: [
 *             {ref: "R", pos: 282, alt: "W", value: 10, category: "network-rewiring"}
 *         ],
 *         sites: [
 *             {start: 142, end: 167, type: 'acetylation', my_property: "some-value"},
 *         ]
 *     },
 *     needle_tooltip: new MinimalTooltip({
 *         render: function(mut){
 *            var name = mut.ref + mut.pos + mut.alt;
 *            return "My tooltip for mutation: " + name + " " + mut.category;
 *         }
 *     }),
 *     site_tooltip: new MinimalTooltip({
 *         render: function(site){
 *            return "My tooltip for site: " + site.type + " " + site.my_property;
 *         }
 *     })
 * });
 */

var MinimalTooltip = function(tooltip_config)
{
    var self = this

    this.moveToPointer = function(){
        self.tooltip
            .style('left', d3.event.clientX + 'px')
            .style('top', d3.event.clientY + 'px')
    }

    this.show = function (d) {
        self.tooltip.html(self.render(d))
        self.tooltip.style('opacity', 1)
        self.moveToPointer()
    }

    this.hide = function () {
        self.tooltip.style('opacity', 0)
    }

    /**
     * Bind the mouseout/mouseover events of selection to private methods: show/hide respectively.
     * @param selection - d3.js selection with objects to which mouseover and mouseout events will be bound.
     */
    this.bind = function(selection)
    {
        self.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('pointer-events', 'none')
            .style('position', 'fixed')

        self.render = tooltip_config.render
        self.hide()

        selection.on('mouseover', self.show)
        selection.on('mouseout', self.hide)
    }
}

/**
 * Initializes the NeedlePlot using provided configuration.
 * @constructor
 * @class
 * @public
 * @param {NeedlePlot.Config} configuration - Configuration for the NeedlePlot
 *
 * @playground
 * var NeedlePlot = require("@runkit/krassowski/needleplot/1.0.0");
 * // This an interactive example. To embed on a website you will need to:
 * // - set up minimal HTML code (instead of the `require` above) - see `example.html`
 * // - use "new" keyword before `NeedlePlot()`
 * // - specify DOM element (e.g. `element: document.getElemenbtById('some_id')`)
 * NeedlePlot({
 *     element: '<substitute this string with a DOM element>',
 *     sequence_length: 393,
 *     mutations_color_map: {
 *         proximal: 'orange',
 *         none: 'grey',
 *         distal: 'yellow',
 *         'network-rewiring': 'red'
 *     },
 *     data: {
 *         mutations: [
 *             {ref: "V", pos: 157, alt: "F", value: 6, category: "proximal"},
 *             {ref: "Y", pos: 234, alt: "C", value: 18, category: "none"},
 *             {ref: "R", pos: 273, alt: "H", value: 18, category: "distal"},
 *             {ref: "R", pos: 282, alt: "W", value: 10, category: "network-rewiring"}
 *         ],
 *         sites: [
 *             {start: 142, end: 167, type: ["phosphorylation"]},
 *             {start: 262, end: 276, type: ["phosphorylation"]}
 *         ]
 *     }
 * });
 */
var NeedlePlot = function(configuration)
{
    var svg, zoom, vis, vertical_scalable, unit
    var scale = 1
	var position = 0
    var dispatch = d3.dispatch('zoomAndMove')

    var paddings, needles, sites, site_boxes, leftPadding;

    var legend = {
        x: {
            obj: null
        },
        y: {
            obj: null
        }
    }

    var Axis = function()
    {
        this.scale = null
        this.group = null
        this.obj = null

        this.createObj = function(orient)
        {
            this.obj = d3.svg.axis()
                .orient(orient)
                .scale(this.scale)
        }

        this.createGroup = function(class_name)
        {
            this.group = paddings.append('g')
               .attr('class', 'axis ' + class_name)
               .call(this.obj)
        }

        this.setDomain = function(start, end)
        {
            this.start = start
            this.end = end
            this.scale.domain([start, end]).clamp(true)
        }

        this.getCoverage = function()
        {
            return this.end / scale
        }

        this.moveTo = function(start_pos)
        {
            this.scale.domain([start_pos, start_pos + this.getCoverage()])
        }

        this.getShiftLimit = function()
        {
            return this.getCoverage() - this.end
        }
    }

    var axes = {
        x: new Axis(),
        y: new Axis()
    }

    /**
     * Tooltip interface required for tooltips provided to {@link NeedlePlot} instances at initialization.
     * The NeedlePlot comes with a simple implementation of the tooltip interface: {@link MinimalTooltip}.
     *
     * For more advanced implementation example please refer to [ActiveDriver's tooltip.js]{@link https://github.com/reimandlab/ActiveDriverDB/blob/master/website/static/tooltip.js}.
     * @typedef Tooltip
     * @memberOf NeedlePlot
     * @property {function} [moveToElement] - callback handling change caused by any of the plot transforming events
     * (i.e. zoom or move) which may displace the tooltip (relatively to the element it was originally placed upon)
     * @property {function} moveToPointer - callback for mouse movement event
     * @property {function} bind - should bind the tooltip to provided d3 selection.
     * For example implementation see {@link MinimalTooltip#bind}.
     */


    /**
     * Callback called after the zoom is changed
     *
     * @callback zoom_callback
     * @memberOf NeedlePlot
     * @param {number} new_zoom
     * @param {boolean} stop_callback
     */

    /**
     * Callback called after the plot is scrolled horizontally
     *
     * @callback position_callback
     * @memberOf NeedlePlot
     * @param {number} new_position - position (in aminoacids) of the first visible aminoacid in the plot
     * @param {boolean} stop_callback
     */

    /**
     * Mutation objects are required to initialize the plot.
     * You can add any number of additional properties and use them later to your liking
     * (e.g. to generate more elaborated tooltips).
     * @typedef {Object} Mutation
     * @memberOf NeedlePlot
     * @property {number} pos - position of the mutation
     * @property {number} value - determines height of a needle for this mutation
     * @property [category] - name or any other identifier of mutations category
     *           Used to extract color of needle's head for this mutation
     *           from {@see NeedlePlot.Config.mutations_color_map}
     * @property {string} [ref] - reference aminoacid
     * @property {string} [alt] - alternative aminoacid
     */

    /**
     * Site objects are required to initialize the plot.
     * Sites will appear on x axis as small rectangles, spanning from their start to end position.
     * You can adjust colors of each site type providing custom CSS styles.
     * Like for mutations, you can provide any number of additional properties
     * which you can later use for generation of advanced tooltips.
     * @typedef {Object} Site
     * @memberOf NeedlePlot
     * @property {number} start - beginning of the site
     * @property {number} end - end of the site
     * @property [type] - site type
     */

    /**
     * @typedef {Object} Config
     * @memberOf NeedlePlot
     * @property {HTMLElement} element - an HTML wrapper in which the needleplot will be created
     * @property {number} sequence_length - the length of the protein sequence
     * @property {Object} data - object with array of mutations and sites
     * @property {Mutation[]} data.mutations - mutations are represented by "needles"
     *            which vary in height and color of heads (accordingly to provided values).
     * @property {Site[]} data.sites - sites can be used to represent domains, PTM or binding sites.
     *           Sites are shown as small rectangles on x-axis.
     * @property {number} [site_height] - the height of site/domain boxes which are placed on x axis
     * @property {number} [animations_speed] - speed of animations in milliseconds
     * @property {{bottom: number, top: number, left: number, right: number}} [paddings] - size of each padding in pixels
     * @property {number} [width] - width in pixels
     * @property {number} [height] - height in pixels (or null if should be determined from ratio)
     * @property {number} [ratio] - width/height ratio
     * @property {number} [min_zoom] - how far away user is allowed to zoom out
     * @property {number} [max_zoom] - how close user is allowed to zoom in
     * @property {{string: color}} [mutations_color_map] - category name => color map, used to colorize heads of needles
     * @property {number} [head_size] - size of needles' heads
     * @property {boolean} [use_log] - should logarithmic (base 10) scale be used for y axis (instead of linear one)? Useful for mutations frequency visualisation.
     * @property {string} [y_scale] - 'auto' (default): the y axis be determined automatically, 'manual': I will provide y_scale_min and y_scale_max
     * @property {number} [y_scale_min]
     * @property {number} [y_scale_max]
     * @property {{x: string, y: string}} [legends] - text to show as legend beside y and below x axes
     * @property {NeedlePlot.Tooltip} [needle_tooltip]
     * @property {NeedlePlot.Tooltip} [site_tooltip]
     * @property {NeedlePlot.zoom_callback} [zoom_callback] - will be called on zoom event
     * @property {NeedlePlot.position_callback} [position_callback] - will be called on move event
     */


    /**
     * @type {Config}
     * @private
     */
    var config = {
        use_log: false,
        site_height: 10,
        animations_speed: 300,
        paddings: {bottom: 60, top: 30, left: 90, right: 5},
        y_scale: 'auto',
        legends: {x: 'Sequence', y: '# of mutations'},
        width: 600,
        ratio: 0.5,
        min_zoom: 1,
        max_zoom: 6,
        head_size: 6,
        needle_tooltip: new MinimalTooltip({render: function(mutation){return mutation.pos}}),
        site_tooltip: new MinimalTooltip({render: function(site){return site.type}})
    }

    var _adjust_plot_dimensions = function()
    {
        if(!config.width && !config.height)
        {
            config.width = config.sequence_length
        }

        if(config.height && config.width)
        {
            config.ratio = config.height / config.width
        }
        else if(!config.height)
        {
            config.height = config.width * config.ratio
        }
        else if(!config.width)
        {
            config.height = config.width * config.ratio
        }
    }

    var configure = function(new_config)
    {
        // Automatic configuration update:
        update_object(config, new_config)

        // Manual configuration patching:
        _adjust_plot_dimensions()
    }

    function is_color_dark(color)
    {
        var rgb = d3.rgb(color)
        var yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000
	    return yiq < 128
    }

    function scale_to_needles()
    {
		if (config.y_scale === 'auto')
		{
            var accessor = function(mutation) {
                return mutation.value
            }
			config.y_scale_max = d3.max(config.data.mutations, accessor)
			config.y_scale_min = d3.min(config.data.mutations, accessor)
		}
    }

    var _rescale_plot = function()
    {
        svg
            .attr('viewBox', '0 0 ' + config.width + ' ' + config.height)

		unit = (config.width - config.paddings.left - config.paddings.right) / config.sequence_length

        axes.x.scale
            .range([0, config.width - config.paddings.left - config.paddings.right])

        axes.y.scale
            .range([config.height - config.paddings.bottom, config.paddings.top])


        axes.y.obj.scale(axes.y.scale)
        axes.y.group
            .call(axes.y.obj)

        var bottom_axis_pos = config.height - config.paddings.bottom

        axes.x.obj
            .scale(axes.x.scale)
            .tickSize(config.site_height + 3)

        axes.x.group
	        .attr('transform', 'translate(' + [0, bottom_axis_pos] + ')')
            .call(axes.x.obj)

        sites
            .attr('transform', function(d)
                {
                    return 'translate(' + [posToX(d.start), bottom_axis_pos] + ')'
                }
            )

        site_boxes
			.attr('width', function(d){ return posToX(d.end - d.start) })

        needles
            .attr('transform', function(d)
                {
                    return 'translate(' + [posToX(d.pos), 0] + ')'
                }
            )

        needles.selectAll('line')
            .attr('stroke-width', posToX(1) / 2 + 'px')
            .attr('y1', function(d){ return axes.y.scale(d.value) + 'px' })
            .attr('y2', bottom_axis_pos + 'px')

        leftPadding.attr('height', config.height)

        if(legend.x.obj)
            legend.x.obj.attr('x', (config.width - config.paddings.left) / 2)
        if(legend.y.obj)
            legend.y.obj.attr('transform','translate(' + -(config.paddings.left - 15) + ' ' + (config.height - config.paddings.top) / 2 + ') rotate(-90)')

        adjust_content()
    }

    function create_needles(vis, needle_tooltip)
    {
        var needles = vis.selectAll('.needle')
            .data(
                config.data.mutations
                    .sort(function(a,b){ return b.value - a.value })
            )
            .enter()
            .append('g')
            .attr('class', function(d){return d.background ? 'needle background' : 'needle'})
            .call(needle_tooltip.bind)

        needles
            .append('line')
                .attr('x1', 0)
                .attr('x2', 0)


        // numerate needles
        var i = 0
        needles.
            each(function(mutation){ mutation.id = i++ })

        // lets group needle heads occurring in the same place
        var head_groups = {}

        needles.
            each(function(mutation){

                var key = mutation.pos + ':' + mutation.value
                if(key in head_groups)
                {
                    head_groups[key].push(mutation.id)
                }
                else
                {
                    head_groups[key] = [mutation.id]
                }
            })

        // add a head of a needle
        var head = needles
            .append('g')
            .attr('class', 'head')
            .attr('id', function(d){ return 'h_' + d.id })

        var circle = head.append('circle')

        // add count of overlaying heads to those
        // which are overlaid / overlaying

        function is_overlaying(d)
        {
            var key = d.pos + ':' + d.value
            var head_group = head_groups[key]
            return head_group.length > 1
        }

        var overlap_counts =head
            .filter(is_overlaying)
            .append('text')
            .text(function(d){
                var key = d.pos + ':' + d.value
                return head_groups[key].length
            })

        if(config.mutations_color_map)
        {
            circle.attr('fill', function (d) {
                    return config.mutations_color_map[d.category]
                }
            )
            overlap_counts.attr('fill', function(d){
                var head_color = config.mutations_color_map[d.category]
                return (is_color_dark(head_color) ? 'white' : 'black')
            })
        }

        head
            .filter(is_overlaying)
            .on('mouseover', function(d){

                // make hover popup
                var key = d.pos + ':' + d.value
                var head_group = head_groups[key]

                var width_per_head = posToX(1) * get_constant_scale()
                var width = head_group.length * width_per_head

                var shift = width_per_head / 2 - width / 2

                function transform(){
                    return transform_needle_head(d, shift)
                }

                for(var i = 0; i < head_group.length; i++)
                {
                    var needle_id = head_group[i]
                    var head_id = 'h_' + needle_id
                    var head = d3.select('#' + head_id)


                    head
                        .transition()
                        .ease('quad')
                        .duration(config.animations_speed)
                        .attr('transform', transform)

                    shift += width_per_head
                }
            })

        return needles
    }

    function create_axes()
    {
        if(config.use_log)
        {
            axes.y.scale = d3.scale.log()
                .base(10)
            // we have to avoid having exact 0 on scale_min
            var min = config.y_scale_min
            if(min === 0)
            {
                min = d3.min(
                    config.data.mutations.filter(function(mutation) {return mutation.value !== 0}),
                    function(mutation) {
                        return mutation.value
                    }
                ) || Number.MIN_VALUE
            }
            axes.y.setDomain(min, config.y_scale_max)
        }
        else
        {
            axes.y.scale = d3.scale.linear()
            axes.y.setDomain(0, config.y_scale_max)
        }

        axes.y.scale.
            nice()

        var format

        if(config.use_log)
        {
            var cnt = -1
            var labels_count_in_log = config.height / 40
            var ticks_cnt = axes.y.scale.ticks().length
            if (ticks_cnt > labels_count_in_log)
                config.log_ticks_per_label = Math.round(ticks_cnt / labels_count_in_log)
            else
                config.log_ticks_per_label = ticks_cnt

            format = function(d){
                cnt += 1

                if(cnt % config.log_ticks_per_label !== 0)
                    return ''

                d /= 100
                if(d < 0.0001)
                    return d3.format('.3%')(d)
                if(d < 0.001)
                    return d3.format('.2%')(d)
                if(d < 0.01)
                    return d3.format('.1%')(d)
                return d3.format('%')(d)
            }
        }
        else
        {
            format = d3.format('d')
        }

        axes.y.createObj('left')

        axes.y.obj
            .tickFormat(format)
            .tickSubdivide(0)

        axes.y.createGroup('y')

        axes.x.scale = d3.scale.linear()
        axes.x.setDomain(0, config.sequence_length)

        axes.x.createObj('bottom')
        axes.x.createGroup('x')
    }

    function prepare_zoom(min, max, callback)
    {
        return d3.behavior.zoom()
            .scaleExtent([min, max])
            .on('zoom', callback)
            // allows to differentiate between pan-related clicks and normal clicks
            .on('zoomstart', function(){
                if(d3.event.sourceEvent) d3.event.sourceEvent.stopPropagation()
            })
    }

    var prepare_svg = function(element)
    {
        return d3
            .select(element)
            .append('svg')
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr('class', 'svg-content-responsive needleplot')
    }

    var create_plot = function()
    {
        zoom = prepare_zoom(config.min_zoom, config.max_zoom, zoomAndMove)

        svg = prepare_svg(config.element)
            .call(zoom)

        // we don't want to close tooltips after panning (which is set to emit
        // stopPropagation on start what allows us to detect end-of-panning events)
        svg.on('click', function(){
            if(d3.event.defaultPrevented) d3.event.stopPropagation()
        })

		paddings = svg.append('g')
			.attr('class', 'paddings')
			.attr('transform', 'translate(' + config.paddings.left + ' , 0)')

		vertical_scalable = paddings.append('g')
			.attr('class', 'vertical scalable')

        leftPadding = paddings.append('rect')
            .attr('fill', 'white')
            .attr('width', config.paddings.left)
			.attr('transform', 'translate(-' + config.paddings.left + ' , 0)')

        create_axes()

        vis = vertical_scalable.append('g')

        if(config.legends.x)
        {
            legend.x.obj = paddings.append('text')
                .attr('class', 'label')
                .text(config.legends.x)
                .attr('y', config.height - config.paddings.bottom)
                .attr('dy','3em')
                .style('text-anchor','middle')
        }

        if(config.legends.y)
        {
            legend.y.obj = paddings.append('text')
                .attr('class', 'label')
                .text(config.legends.y)
                .style('text-anchor','middle')
        }


        needles = create_needles(vis, config.needle_tooltip)

        dispatch.on('zoomAndMove', function(){
            if(config.needle_tooltip.moveToElement)
                config.needle_tooltip.moveToElement()
            if(config.site_tooltip.moveToElement)
                config.site_tooltip.moveToElement()
        });

        sites = vis.selectAll('.site')
            .data(config.data.sites)
            .enter()
            .append('g')
            .attr('class', function(d)
                {
                    if(d.type.length === 1)
                        return ('site ' + d.type).replace('(', '').replace(')', '')
                    else
                        return 'site multi_ptm'
                }
            )
            .call(config.site_tooltip.bind)

        sites
            .append('path')
            .attr('d', d3.svg.symbol().size(1).type('triangle-up'))

        site_boxes = sites
			.append('rect')
			.attr('height', config.site_height)

        _rescale_plot()

        if(config.onload)
            config.onload()
    }

	var _setPosition = function(new_position, stop_callback)
	{
		var boundary = posToX(axes.x.getShiftLimit()) * scale

		if(new_position > 0)
			position = 0
		else if(new_position < boundary)
			position = boundary
		else
			position = new_position

        // let d3 know that we changed the position
        zoom.translate([position, 0])

        if(!stop_callback && config.position_callback)
        {
            var aa_position = publicSpace.getAAPosition()
            config.position_callback(aa_position, true)
        }
	}

    var canvasAnimated = function(animate)
    {
        var t;
        if(animate)
        {
		    t = svg
			    .transition().ease('quad').duration(config.animations_speed)
        }
        else
        {
            t = svg
        }
        return t
    }

    var changeTicksCount = function(ticks_count)
    {
        axes.x.obj.ticks(ticks_count)
        canvasAnimated(true).select('.x.axis').call(axes.x.obj)
    }

    var transform_needle_head = function(d, x_pos)
    {
        if(!x_pos)
            x_pos = 0
        return 'translate('  + [x_pos, axes.y.scale(d.value)] + ')scale(1, '+ scale +')'
    }

    var get_constant_scale = function()
    {
        return config.head_size / scale
    }

    var adjust_content = function(animate)
    {
        if(scale === config.max_zoom)
        {
            changeTicksCount(20)
        }
        else if(axes.x.obj.ticks() !== 10)
        {
            changeTicksCount(10)
        }
        var constant_scale = get_constant_scale()

        var canvas = canvasAnimated(animate)
		canvas.select('.vertical.scalable').attr('transform', 'translate(' + position + ', 0)scale(' + scale + ', 1)')

        needles.selectAll('.head')
            .attr('transform', transform_needle_head)

        sites.selectAll('path, rect')
            .attr('stroke-width', posToX(1) / 10 + 'px')

        sites.selectAll('path')
            .attr('transform', function(d)
                {
                    // shift by -2 in y axis is meant to lay the shape
                    // on top of site box (it's size_of_shape/2 = 4/2 = 2)
                    return 'translate(' + [posToX((d.end - d.start) / 2), -2] + ')scale(' + [posToX(1), 4] + ')'
                }
            )

        var head_size = posToX(1) / 2 * constant_scale
        needles.selectAll('circle')
            .attr('r', head_size + 'px')
        needles.selectAll('text')
            .attr('font-size', head_size * 2 + 'px')
            .attr('dx', -head_size/2 + 'px')
            .attr('dy', +head_size/2 + 'px')
    }

	var posToX = function(pos)
	{
		return pos * unit
	}

    var xToPos = function(coord)
    {
        return -(coord / unit) / scale
    }

    function adjustXAxis(animate)
    {
        var canvas = canvasAnimated(animate)
        var start_position = xToPos(position)
        axes.x.moveTo(start_position)
		canvas.select('.x.axis').call(axes.x.obj)
    }

    var refresh = function(animate)
    {
        adjustXAxis(animate)
        adjust_content(animate)
    }

    var zoomAndMove = function()
    {
        // with callback, without animation
        _setZoomAndMove(d3.event.scale, d3.event.translate[0], false, true)
    }

    var _setZoomAndMove = function(new_scale, new_position, stop_callback, stop_animation, recalculate_position)
    {
        // zoom level restricts the leftmost and rightmost position which can be set,
        // so setting zoom level needs to be evaluated first

        var old_aa_pos = xToPos(new_position)

        if(recalculate_position)
        {
            _setZoom(new_scale, true)
            new_position = _positionFromAAPosition(old_aa_pos)
            _setPosition(new_position, true)
        }
        else
        {
            _setPosition(new_position, true)
            _setZoom(new_scale, true)
        }

        if(!stop_callback && config.zoomAndMove_callback)
        {
            var aa_position = xToPos(position)
            config.zoomAndMove_callback(scale, aa_position, true, stop_animation)
        }

        refresh(!stop_animation)
        dispatch.zoomAndMove(this)
    }

	var _setZoom = function(new_scale, stop_callback, recalculate_position)
	{
        if(scale === new_scale)
            return

        var old_aa_pos = publicSpace.getAAPosition()

		scale = new_scale

        // let d3 know that the zoom was changed
        zoom.scale(scale)

        // if we have a callback, call it (unless explicitly asked to refrain)
        if(!stop_callback && config.zoom_callback)
        {
            config.zoom_callback(scale, true)
        }

        // recalculate position so we do not exceed boundaries
        if(recalculate_position)
        {
            var position_after_zoom = _positionFromAAPosition(old_aa_pos)
            _setPosition(position_after_zoom, stop_callback)

        }
	}

	var _positionFromAAPosition = function(aa_position)
    {
        return posToX(-aa_position) * scale
    }

    var init = function(config)
    {
        configure(config)
        scale_to_needles()
        create_plot()

    }
    var publicSpace = {
        /**
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         * @param {Number} new_scale
         * @param {Boolean} stop_callback
         * @param {Boolean} recalculate_position
         * @param {Boolean} animate
         */
        setZoom: function(new_scale, stop_callback, recalculate_position, animate){
            _setZoom(new_scale, stop_callback, recalculate_position)
            // adjust axes
            refresh(animate)
        },
        /**
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         * @return {Number}
         */
        getZoom: function () {
            return scale
        },
        /**
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         * @param {Number} position
         * @param {Boolean} stop_callback
         * @param {Boolean} animate
         */
		setPosition: function(position, stop_callback, animate) {
            _setPosition(position, stop_callback)
            refresh(animate)
        },
        /**
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         * @param {Number} aa_position
         * @param {Boolean} stop_callback
         * @param {Boolean} animate
         */
        setAAPosition: function(aa_position, stop_callback, animate)
        {
            var converted_position = _positionFromAAPosition(aa_position)
            _setPosition(converted_position, stop_callback)
            refresh(animate)
        },
        /**
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         * @param {Number} new_zoom
         * @param {Number} aa_position
         * @param {Boolean} stop_callback
         * @param {Boolean} animate
         */
        setZoomAndAAPosition: function(new_zoom, aa_position, stop_callback, animate)
        {
            var converted_position = _positionFromAAPosition(aa_position)
            _setZoomAndMove(new_zoom, converted_position, stop_callback, !animate, true)
        },
        /**
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         * @returns {Number} current aminoacid position
         */
        getAAPosition: function () {
            return xToPos(position)
        },
        /**
         * Rescale plot to given dimensions
         * @memberOf NeedlePlot
         * @instance
         * @method
         * @param {Number} width
         * @param {Number} height
         * @param {Number} max_zoom
         */
        setSize: function(width, height, max_zoom)
        {
            config.width = width
            config.height = height
            config.max_zoom = max_zoom

            _adjust_plot_dimensions()

            _rescale_plot()

            // refresh zoom and position with current values, with callback and animation
            _setZoomAndMove(scale, position, false, false)
        },
        /**
         * Remove created DOM elements including tooltips (if support .remove method)
         * @memberOf NeedlePlot
         * @public
         * @instance
         * @method
         */
        destroy: function()
        {
            var tooltips = [config.needle_tooltip, config.site_tooltip]
            var tooltip

            while(tooltip = tooltips.pop())
                if (tooltip && tooltip.remove)
                    tooltip.remove()

            svg.remove()

            tooltip = null
        }
    }

    init(configuration)

    return publicSpace
}
