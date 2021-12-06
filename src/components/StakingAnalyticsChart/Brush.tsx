import * as d3 from 'd3'
import { useEffect, useRef } from 'react'

interface BrushProps {
  width: number
  focusHeight: number
  data: any[]
  margin: any
  X: any
  updateChartData: any

}

export default function Brush({data, focusHeight, width, margin, updateChartData, X}: BrushProps) {
  const focusRef = useRef(null)

  useEffect(() => {
    const focusEl = d3.select(focusRef.current)
    focusEl.selectAll('*').remove()

    const focus = focusEl
      .attr('viewBox', [0, 0, width, focusHeight])
      .style('display', 'block')

    const focusLine = (x, y) => d3.line()
      .defined(d => !isNaN(d.value))
      .curve(d3.curveBumpX)
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
      .attr('stroke', '#b41870')
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

    function brushed({ selection }) {
      if (selection) {
        const div = Math.round(870 / X.length)
        const minX = Math.floor(selection[0] / div)
        const maxX = Math.floor(selection[1] / div)
        const maxY = d3.max(data, d => X[minX] <= new Date(d.date) && new Date(d.date) <= X[maxX - 1] ? d.value : NaN)

        updateChartData([data[minX].date, data[maxX - 1].date])
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
  }, [data])


  return (
    <svg ref={focusRef} width={width} height={focusHeight} />
  )
}