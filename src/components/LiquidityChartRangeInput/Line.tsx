import React, { useMemo } from 'react'
import { ScaleLinear } from 'd3'
import styled from 'styled-components/macro'

const StyledLine = styled.line`
  opacity: 0.5;
  stroke-width: 1;
  stroke: ${({ theme }) => 'white'};
  fill: none;
`

export const Line = ({
  value,
  xScale,
  innerHeight,
}: {
  value: number
  xScale: ScaleLinear<number, number>
  innerHeight: number
}) =>
  useMemo(
    () => (
      <>
        <StyledLine x1={xScale(value)} y1="0" x2={xScale(value)} y2={innerHeight - 1} />
        <rect x={xScale(value) - 22} y={0} width={44} height={15} fill={'#2d3f6c'} rx={4}></rect>
        <text fill={'white'} fontSize={8} x={xScale(value) - 20} y={10}>
          Curr. price
        </text>
      </>
    ),
    [value, xScale, innerHeight]
  )
