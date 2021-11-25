import React, { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { ChartScale, daysCount } from './index'


export default function Chart({
                                feeData = [],
                                scale,
                                dimensions
                              }: {
  feeData: {
    changesCount: number
    fee: number
    id: string
    pool: string
    timestamp: number
  }[] | undefined,
  dimensions: {
    width: number
    height: number
    margin: { top: number, right: number, bottom: number, left: number }
  },
  scale: ChartScale
}) {

  const svgRef = useRef(null)
  const { width, height, margin } = dimensions
  const svgWidth = width + margin.left + margin.right + 100
  const svgHeight = height + margin.bottom + margin.top

  const xScale = useMemo(() => {

    if (scale === ChartScale.MONTH) {
      return d3.scaleLinear()
        // .domain(d3.extent(timeArr))
        .domain([0, daysCount(1, 2020) -1 ])
        .range([0, width])
    } else {
      return d3.scaleLinear()
        // .domain(d3.extent(timeArr))
        .domain([0, 24])
        .range([0, width])
    }
  }, [scale])

    if (feeData.length !== 0) {

      const testTime = [1577836800,
        1577923200,
        1578009600,
        1578096000,
        1578182400,
        1578268800,
        1578355200,
        1578441600,
        1578528000,
        1578614400,
        1578700800,
        1578787200,
        1578873600,
        1578960000,
        1579046400,
        1579132800,
        1579219200,
        1579305600,
        1579392000,
        1579478400,
        1579564800,
        1579651200,
        1579737600,
        1579824000,
        1579910400,
        1579996800,
        1580083200,
        1580169600,
        1580256000,
        1580342400,
        1580428800 ]

      const timeArr = testTime.map(item => item * 1000)
    // const timeArr = testTime.map((el, i) => i)
    //   console.log(d3.extent(timeArr))

      console.log(timeArr)

      const yScale = d3.scaleLinear()
        .domain([0.01, 1])
        .range([height, 0])

      const svgEl = d3.select(svgRef.current)
      svgEl.selectAll('*').remove()

      const svg = svgEl
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

      const dateFormat = d3.timeFormat('%d')

      const xAxis = d3.axisBottom(xScale)
        .ticks(daysCount(1, 2020))
        .tickFormat(domainValue => dateFormat(timeArr[domainValue]))
        .tickSizeOuter(0)

      const xAxisGroup = svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
      // xAxisGroup.select(".domain").remove();
      xAxisGroup.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.2)')
      xAxisGroup.selectAll('text')
        .attr('opacity', 0.5)
        .attr('color', 'white')
        .attr('font-size', '0.75rem')

      const yAxis = d3.axisLeft(yScale)
        .ticks(10)
        .tickSize(-width)
        .tickFormat((val) => `${val}%`)
      const yAxisGroup = svg.append('g').call(yAxis)
      yAxisGroup.select('.domain').remove()
      yAxisGroup.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.2)')
      yAxisGroup.selectAll('text')
        .attr('opacity', 0.5)
        .attr('color', 'white')
        .attr('font-size', '0.75rem')
    }
    return <svg ref={svgRef} width={svgWidth} height={svgHeight}/>
}