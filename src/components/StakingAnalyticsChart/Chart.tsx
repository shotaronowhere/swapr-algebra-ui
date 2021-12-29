import * as d3 from 'd3'
import {useEffect, useMemo, useRef, useState} from 'react'
import styled from 'styled-components/macro'
import Brush from './Brush'
import {convertDate} from './index'
import {sv} from "make-plural/plurals";

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

interface ChartProps {
    data: any[]
    margin: { left: number, top: number, right: number, bottom: number }
    dimensions: { width: number, height: number }
}

export default function AreaChart({data, margin, dimensions}: ChartProps) {
    const svgRef = useRef(null)
    const X = d3.map(data, d => new Date(d.date))
    const Y = d3.map(data, d => +d.value)
    const I = d3.range(X.length)

    // Compute which data points are considered defined.
    const D = d3.map(data, (d, i) => !isNaN(X[i]) && !isNaN(Y[i]))

    // Compute default domains.
    const yDomain = [0, d3.max(Y)]
    const xDomain = [d3.min(X), d3.max(X)]


    //Todo auto length
    const tickWidth = useMemo(() => {
        return dimensions.width / data.length
    }, [dimensions, data])

    useEffect(() => {
        const svgEl = d3.select(svgRef.current)
        svgEl.selectAll('*').remove()

        const svg = svgEl
            .append('g')
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)
            .attr('viewBox', [0, 0, dimensions.width, dimensions.height])


        // Construct scales and axes.
        const xScale = d3.scaleUtc(xDomain, [margin.left, dimensions.width - margin.right])
        const yScale = d3.scaleLinear(yDomain, [dimensions.height - margin.bottom, margin.top])
        const xAxis = d3.axisBottom(xScale).ticks(data.length)
        const yAxis = d3.axisLeft(yScale).ticks(dimensions.height / 40)

        // console.log(data.length)

        const Line = d3
            .create('svg:line')
            .attr('id', 'pointer2')
            .attr('x1', '0px')
            .attr('y1', margin.top)
            .attr('x2', '0px')
            .attr('y2', dimensions.height - margin.bottom)
            .style('stroke-width', 1)
            .style('stroke', '#595f6e')
            .style('display', 'none')

        // Construct an line generator.
        const line = d3.line()
            .curve(d3.curveBumpX)
            .x(i => xScale(X[i]))
            .y(i => yScale(Y[i]))

        //Construct infoLabel
        const InfoRectGroup = d3.create('svg:g').style('pointer-events', 'none').style('display', 'none')

        const InfoRect = d3
            .create('svg:rect')
            .append('rect')
            .attr('id', 'info-label')
            .attr('width', '150px')
            .attr('height', '60px')
            .attr('rx', '6')
            .style('fill', '#12151d')

        const InfoRectFeeText = d3
            .create('svg:text')
            .attr('transform', 'translate(16, 25)')
            .attr('fill', 'white')
            .attr('font-weight', '600')
            .attr('font-size', '14px')

        const InfoRectDateText = d3
            .create('svg:text')
            .attr('transform', 'translate(16, 45)')
            .attr('fill', 'white')
            .attr('font-weight', '500')
            .attr('font-size', '12px')
            .attr('fill', '#b0b0b0')

        InfoRectGroup.node().append(InfoRect.node())
        InfoRectGroup.node().append(InfoRectFeeText.node())
        InfoRectGroup.node().append(InfoRectDateText.node())

        const Focus = d3
            .create('svg:circle')
            .style('fill', 'white')
            .attr('stroke', '#b41870')
            .attr('stroke-width', '2')
            .attr('r', 5.5)
            .style('opacity', 1)
            .style('display', 'none')

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(yAxis)
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').clone()
                .attr('x2', dimensions.width - margin.left - margin.right)
                .attr('stroke-opacity', 0.1))

        const xGroup = svg.append('g')
            .attr('transform', `translate(0,${dimensions.height - margin.bottom})`)
            .call(xAxis)
        // .select('domain').attr('fill', 'transparent')

        svg.append('path')
            .attr('fill', 'none')
            .attr('d', line(I))
            .attr('stroke-width', 2)
            .attr('stroke', '#b41870')

        xGroup
            .selectAll('.tick')
            .nodes()
            .map((el, i) => {
                if (i % 2 === 0) {
                    if (data.length > 14) {
                        d3.select(el).attr('display', 'none')
                    }
                }
                const xTranslate = d3
                    .select(el)
                    .attr('transform')
                    .match(/\((.*?)\)/)[1]
                    .split(',')[0]

                const rect = d3
                    .create('svg:rect')
                    .attr('x', `${xTranslate - tickWidth / 2}px`)
                    .attr('y', `-${0}px`)
                    .attr('width', `${tickWidth}px`)
                    .attr('height', `${dimensions.height}px`)
                    .attr('fill', 'transparent')
                    .on('mouseover', (e) => {

                        // console.log(data)

                        const isOverflowing = Number(xTranslate) + 150 + 16 > dimensions.width
                        Line.attr('x1', `${xTranslate}px`).attr('x2', `${xTranslate}px`)
                        InfoRectGroup.attr(
                            'transform',
                            `translate(${isOverflowing ? Number(xTranslate) - 150 - 16 : Number(xTranslate) + 16},10)`
                        )
                        InfoRectFeeText.property('innerHTML', `Value: ${parseFloat(data[i]?.value).toFixed(3)}`)
                        InfoRectDateText.property('innerHTML', `${data[i]?.date}`)
                        Focus.attr('transform', `translate(${xScale(new Date(data[i]?.date))},${yScale(data[i]?.value)})`)
                    })
                svg.node().append(rect.node())
            })

        svgEl.on('mouseenter', () => {
            Line.style('display', 'block')
            InfoRectGroup.style('display', 'block')
            Focus.style('display', 'block')
        })

        svgEl.on('mouseleave', () => {
            Line.style('display', 'none')
            InfoRectGroup.style('display', 'none')
            Focus.style('display', 'none')
        })

        svg.append(() => InfoRectGroup.node())
        svg.append(() => Line.node())
        svg.append(() => Focus.node())
    }, [data, xDomain])

    return (
        <ChartWrapper>
            <svg ref={svgRef} width={dimensions.width} height={dimensions.height}/>
        </ChartWrapper>
    )
}