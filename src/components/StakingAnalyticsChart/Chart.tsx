import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components/macro'

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

export default function AreaChart({ data }: {
  data: any
}) {
  //-------------
  const width = 900
  const margin = { left: 30, top: 30, right: 30, bottom: 30 }
  const height = 500
  const focusHeight = 70
  //---------
  const svgRef = useRef(null)
  const focusRef = useRef(null)

  const [chartXDomain, setChartData] = useState([])
  // const [chartYDomain, setChartYDomain] = useState([])

  const X = d3.map(data, d => new Date(d.date))
  const Y = d3.map(data, d => d.value)
  const I = d3.range(X.length)

  // Compute which data points are considered defined.
  const D = d3.map(data, (d, i) => !isNaN(X[i]) && !isNaN(Y[i]))

  // Compute default domains.
  const xDomain = d3.extent(X)
  const yDomain = [d3.min(Y), d3.max(Y)]

  const memoData = useMemo(() => chartXDomain, [chartXDomain])

  console.log(memoData)

  useEffect(() => {

    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()

    const svg = svgEl
      .append('g')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])


    // Construct scales and axes.
    const xScale = d3.scaleUtc(chartXDomain, [margin.left, width - margin.right])
    const yScale = d3.scaleLinear(yDomain, [height - margin.bottom, margin.top])
    const xAxis = d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0)
    const yAxis = d3.axisLeft(yScale).ticks(height / 40)

    // Construct an area generator.
    const line = d3.line()
      .defined(i => D[i])
      .curve(d3.curveBasis)
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
      .attr('stroke', 'blue')

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)

    //___________________________________________________________________________//

    const focusEl = d3.select(focusRef.current)

    focusEl.selectAll('*').remove()

    const focus = focusEl
      .attr('viewBox', [0, 0, width, focusHeight])
      .style('display', 'block')

    const focusLine = (x, y) => d3.line()
      .defined(d => !isNaN(d.value))
      .x(d => x(new Date(d.date)))
      .y(d => y(d.value))

    const focusX = d3.scaleUtc()
      .domain(d3.extent(data, d => new Date(d.date)))
      .range([margin.left, width - margin.right])

    const focusY = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([focusHeight - margin.bottom, margin.top])

    const focusXAxis = (g, x, height) => g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))

    const focusYAxis = (g, y, title) => g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.title').data([title]).join('text')
        .attr('class', 'title')
        .attr('x', -margin.left)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .text(title))

    focus.append('g')
      .call(focusXAxis, focusX, focusHeight)

    focus.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 1)
      .attr('d', focusLine(focusX, focusY.copy().range([focusHeight - margin.bottom, 4])))

    const brush = d3.brushX()
      .extent([[margin.left, 0.5], [width - margin.right, focusHeight - margin.bottom + 0.5]])
      .on('brush', brushed)
      .on('end', brushended)

    const defaultSelection = [focusX(X[X.length - Math.round(((X.length / 100) * 10))]), focusX.range()[1]]

    const gb = focus.append('g')
      .call(brush)
      .call(brush.move, defaultSelection)

    const pos = []

    function brushed({ selection }) {
      if (selection) {
        const div = Math.round(870 / X.length)
        const minX = Math.floor(selection[0] / div)
        const maxX = Math.floor(selection[1] / div)
        const maxY = d3.max(data, d => X[minX] <= new Date(d.date) && new Date(d.date) <= X[maxX - 1] ? d.value : NaN)

        console.log(pos === selection)
        console.log('adasdad')
        setChartData([X[minX], X[maxX - 1]])
        // setChartYDomain([d3.min(Y), maxY])

        // xDomain = [X[minX], X[maxX - 1]]
        // yDomain = [0, maxY]
        // xScale = xScale.copy().domain()
        // yScale = yScale.copy().domain()

        focus.property('value', selection.map(focusX.invert, focusX).map(d3.utcDay.round))
        focus.dispatch('input')
      }
    }

    function brushended({ selection }) {
      if (!selection) {
        gb.call(brush.move, defaultSelection)
      }
    }

  }, [])


  return (
    <ChartWrapper>
      <svg ref={svgRef} width={width} height={height} />
      <svg ref={focusRef} width={width} height={focusHeight} />
    </ChartWrapper>
  )
}