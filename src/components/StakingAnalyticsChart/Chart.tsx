import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components/macro'
import Brush from './Brush'

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

interface ChartProps {
  data: any[]
  chartData: any[]
  updateChartData: any
  xDomain: any
}

export default function AreaChart({ data, updateChartData, chartData }: ChartProps) {
  //-------------
  const width = 900
  const margin = { left: 50, top: 30, right: 30, bottom: 20 }
  const height = 400
  //---------
  const svgRef = useRef(null)

  // console.log(data)

  // const [chartYDomain, setChartYDomain] = useState([])

  // console.log(xDomain)

  const X = d3.map(data, d => new Date(d.date))
  const Y = d3.map(data, d => d.value)
  const I = d3.range(X.length)

  // Compute which data points are considered defined.
  const D = d3.map(data, (d, i) => !isNaN(X[i]) && !isNaN(Y[i]))

  // Compute default domains.
  // const xDomain = d3.extent(X)
  const yDomain = [d3.min(Y), d3.max(Y)]
  const xDomain = d3.extent(X)

  useEffect(() => {
    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()

    const svg = svgEl
      .append('g')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])


    // Construct scales and axes.
    const xScale = d3.scaleUtc(xDomain, [margin.left, width - margin.right])
    const yScale = d3.scaleLinear(yDomain, [height - margin.bottom, margin.top])
    const xAxis = d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0)
    const yAxis = d3.axisLeft(yScale).ticks(height / 40)

    // Construct an area generator.
    const line = d3.line()
      .defined(i => D[i])
      .curve(d3.curveBumpX)
      .x(i => xScale(X[i]))
      .y(i => yScale(Y[i]))

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').clone()
        .attr('x2', width - margin.left - margin.right)
        .attr('stroke-opacity', 0.1))

    svg.append('path')
      .attr('fill', 'none')
      .attr('d', line(I))
      .attr('stroke-width', 2)
      .attr('stroke', '#b41870')

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)
  }, [data, xDomain])

  return (
    <ChartWrapper>
      <svg ref={svgRef} width={width} height={height} />
    </ChartWrapper>
  )
}