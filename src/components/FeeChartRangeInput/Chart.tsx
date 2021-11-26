import React, { useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { ChartScale, daysCount } from './index'


interface ChartInterface {
  feeData: {
    changesCount: number
    fee: number
    id: string
    pool: string
    timestamp: number
  }[] | undefined

  dimensions: {
    width: number
    height: number
    margin: { top: number, right: number, bottom: number, left: number }
  }

  scale: ChartScale

  isScale: boolean
}

export default function Chart({
                                feeData = [],
                                scale,
                                dimensions,
                                isScale
                              }: ChartInterface) {

  const svgRef = useRef(null)
  const { width, height, margin } = dimensions
  const svgWidth = width + margin.left + margin.right + 10
  const svgHeight = height + margin.bottom + margin.top
  const days = feeData[0] !== undefined ? daysCount(new Date(feeData[0].timestamp).getMonth(), new Date(feeData[0].timestamp).getFullYear()) : 0
  const chartData = feeData[0] !== undefined ? feeData.map(item => ({
    time: new Date(item.timestamp * 1000).getDate(),
    fee: (item.fee / item.changesCount) / 1000
  })) : []

  const xScale = useMemo(() => {
    if (scale === ChartScale.MONTH) {
      return d3.scaleLinear()
        .domain(isScale ? [d3.min(chartData, d => +d.time - 1), d3.max(chartData, d => +d.time + 1)] : [1, days])
        .range([0, width])
    } else {
      return d3.scaleLinear()
        .domain([0, 24])
        .range([0, width])
    }
  }, [scale, days, chartData])

  if (feeData.length !== 0) {

    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()

    const svg = svgEl
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // mouse event
    svg.on('click', () => {
      console.log('click')
    })

// xAxis
    const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .ticks(isScale ? d3.max(chartData, d => +d.time + 1) - d3.min(chartData, d => +d.time - 1) : days)
        .tickSizeOuter(0))

    xAxisGroup.select('.domain').remove()
    xAxisGroup.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.2)')
    xAxisGroup.selectAll('text')
      .attr('opacity', 0.5)
      .attr('color', 'white')
      .attr('font-size', '0.75rem')

    // yAxis
    const y = d3.scaleLinear()
      .domain([d3.min(chartData, function(d) {
        return +d.fee - 0.01
      }), d3.max(chartData, function(d) {
        return +d.fee + 0.01
      })])
      .range([height, 0])

    const yAxisGroup = svg.append('g')
      .call(d3.axisLeft(y)
        .ticks(10)
        .tickFormat(val => `${val}%`)
        .tickSize(-width))

    yAxisGroup.select('.domain').remove()
    yAxisGroup.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.2)')
    yAxisGroup.selectAll('text')
      .attr('opacity', 0.5)
      .attr('color', 'white')
      .attr('font-size', '0.75rem')

    //Gradient
    svg.append('linearGradient')
      .attr('id', 'gradient')
      .selectAll('stop')
      .data([
        {
          offset: '0%',
          color: 'rgba(4,120,106,0.75)'
        },
        {
          offset: '66%',
          color: 'rgba(71,172,160,0.75)'
        },
        {
          offset: '100%',
          color: 'rgba(163,218,211,0.75)'
        }])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color)

    // Chart Line
    svg.append('path')
      .datum(chartData)
      .attr('fill', 'url(#gradient)')
      .attr('stroke', '#00cab2')
      .attr('stroke-width', 1.5)
      .attr('d', d3.area()
        // .curve(d3.curveBasis)
        .x(d => xScale(d.time))
        .y0(d => y(d3.min(chartData, d => +d.fee - 0.01)))
        .y1(d => y(d.fee))
      )
  }
  return <svg ref={svgRef} width={svgWidth} height={svgHeight}/>
}