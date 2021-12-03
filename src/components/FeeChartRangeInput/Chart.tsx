import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ChartScale, daysCount } from './index'

interface ChartInterface {
  feeData:
    | {
        changesCount: number
        fee: number
        id: string
        pool: string
        timestamp: number
        endFee: number
        maxFee: number
        minFee: number
        startFee: number
      }[]
    | undefined

  dimensions: {
    width: number
    height: number
    margin: { top: number; right: number; bottom: number; left: number }
  }

  scale: ChartScale

  isScale: boolean
}

export default function Chart({ feeData = [], scale, dimensions, isScale }: ChartInterface) {
  const svgRef = useRef(null)
  const { width, height, margin } = dimensions
  const svgWidth = width + margin.left + margin.right + 10
  const svgHeight = height + margin.bottom + margin.top
  const days =
    feeData[0] !== undefined
      ? daysCount(new Date(feeData[0].timestamp * 1000).getMonth(), new Date(feeData[0].timestamp * 1000).getFullYear())
      : 0
  let chartData =
    feeData[0] !== undefined
      ? feeData.map((item) => ({
          time: new Date(item.timestamp * 1000).getDate(),
          fee: item.fee / item.changesCount / 10000,
          start: item.startFee,
          end: item.endFee,
          high: item.maxFee,
          low: item.minFee,
        }))
      : []

  const xDomain = isScale ? [d3.min(chartData, (d) => +d.time - 1), d3.max(chartData, (d) => +d.time + 1)] : [1, days]

  const xScale = useMemo(() => {
    if (scale === ChartScale.MONTH) {
      return d3.scaleLinear().domain(xDomain).range([0, width])
    } else {
      return d3.scaleLinear().domain([0, 24]).range([0, width])
    }
  }, [scale, days, chartData])

  if (feeData.length !== 0) {
    if (chartData[0].time !== 0) {
      let sameDays = []
      const res = []
      for (let i = 0; i < chartData.length; i++) {
        if (chartData[i - 1] !== undefined) {
          if (chartData[i].time === chartData[i - 1].time) {
            sameDays.push(chartData[i])
          } else {
            if (sameDays.length !== 0) {
              // console.log(sameDays)
              res.push(
                sameDays.reduce(
                  (prev, cur) => {
                    return { time: cur.time, fee: prev.fee + cur.fee }
                  },
                  {
                    fee: 0,
                    time: null,
                  }
                )
              )
              res[res.length - 1].fee = res[res.length - 1].fee / sameDays.length
            }
            sameDays = []
          }
        }
      }
      const newA = []
      for (let i = 1; i < chartData[0].time; i++) {
        newA.push({ time: i, start: 0, low: 0, high: 0, end: 0, fee: d3.min(chartData, (d) => +d.fee) })
      }

      // console.log([...newA, ...res])
      chartData = [...newA, ...res]
    }

    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()

    const svg = svgEl.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    const focus = svg
      .append('g')
      .append('circle')
      .style('fill', 'white')
      .attr('stroke', 'black')
      .attr('r', 5.5)
      .style('opacity', 1)
      .style('z-index', 99)

    // mouse events
    d3.select('g').on('mousemove', function () {
      const mouse = d3.pointer(event)

      svg.selectAll('#infoLabel').remove()
      svg.selectAll('#pointer').remove()
      svg.selectAll('#infoLabelText').remove()

      const bisect = d3.bisector((d) => d.time).right
      const x0 = xScale.invert(mouse[0])
      const i = bisect(chartData, Math.round(x0), 0)
      const selectedData = chartData[i - 1]

      svg
        .append('line')
        .attr('id', 'pointer')
        .attr('x1', mouse[0])
        .attr('y1', 0)
        .attr('x2', mouse[0])
        .attr('y2', height)
        .style('stroke-width', 2)
        .style('stroke', 'red')
        .style('fill', 'none')

      if (chartData[i] !== undefined) {
        svg
          .append('rect')
          .attr('id', 'infoLabel')
          .attr('x', mouse[0] - 75)
          .attr('y', mouse[1] - 37)
          .attr('width', 150)
          .attr('height', 75)
          .style('fill', 'rgba(32,38,53,0.84)')

        svg
          .append('text')
          .attr('id', 'infoLabelText')
          .attr('x', mouse[0] - 75)
          .attr('y', mouse[1])
          .style('fill', 'white')
          .attr('dominant-baseline', 'middle ')
          .text('Fee: ' + selectedData.fee + '\n Day: ' + selectedData.time)
        // console.log(x0)
        focus.attr('cx', xScale(selectedData.time)).attr('cy', y(selectedData.fee))
      }
    })

    // xAxis
    const xTicks = isScale ? d3.max(chartData, (d) => +d.time + 1) - d3.min(chartData, (d) => +d.time - 1) : days
    const xAxisGroup = svg.append('g').attr('transform', `translate(0, ${height})`).call(
      d3
        .axisBottom(xScale)
        .ticks(xTicks)
        .tickSize(-height)
        // .tickPadding(10)
        .tickSizeOuter(0)
    )

    xAxisGroup.select('.domain').remove()
    //
    xAxisGroup.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0)').attr('id', 'xline')

    // yAxis
    const y = d3
      .scaleLinear()
      .domain([d3.min(chartData, (d) => +d.fee - 0.01), d3.max(chartData, (d) => +d.fee + 0.01)])
      .range([height, 0])

    const yAxisGroup = svg.append('g').call(
      d3
        .axisLeft(y)
        .ticks(10)
        .tickFormat((val) => `${val}%`)
        .tickSize(-width)
    )

    yAxisGroup.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.1)').attr('id', 'xline')

    yAxisGroup.select('.domain').remove()
    yAxisGroup.selectAll('text').attr('opacity', 0.5).attr('color', 'white').attr('font-size', '0.75rem')

    //Gradient
    svg
      .append('linearGradient')
      .attr('id', 'gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
      .selectAll('stop')
      .data([
        {
          offset: '0%',
          color: 'rgba(4,120,106,0.75)',
        },
        {
          offset: '100%',
          color: 'rgba(163,218,211,0)',
        },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color)

    // Chart data visualize
    svg
      .append('path')
      .datum(chartData)
      .attr('fill', 'url(#gradient)')
      .attr('stroke', '#00cab2')
      .attr('stroke-width', 1.5)
      .attr(
        'd',
        d3
          .area()
          // .curve(d3.curveBasis)
          .x((d) => xScale(d.time))
          .y0((d) => y(d3.min(chartData, (d) => +d.fee - 0.01)))
          .y1((d) => y(d.fee))
      )
  }
  return <svg ref={svgRef} width={svgWidth} height={svgHeight} />
}
