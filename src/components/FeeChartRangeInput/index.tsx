import * as React from 'react'
import Chart from './Chart'
import {useParams} from 'react-router-dom'
import styled from 'styled-components/macro'
import { DarkGreyCard } from '../Card'
import { useInfoSubgraph } from '../../hooks/subgraph/useInfoSubgraph'
import { useEffect } from 'react'


const Wrapper = styled(DarkGreyCard)`
  width: 100%;
  background-color: #202635;
`

export enum ChartScale {
  MONTH,
  DAY
}

export function daysCount (month: number, year: number) {
  switch (month) {
    case 4:
    case 11:
    case 9:
    case 6:
      return 30
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31
    case 2:
        return (year - 2000) % 4 === 0 ? 29 : 28
    default:
      return 31
  }
}

export default function FeeChartRangeInput() {
  const { id } = useParams<{id: string}>()
  const { fetchFees: { feesResult, feesLoading, fetchFeePoolFn } } = useInfoSubgraph()

  useEffect(() => {
    fetchFeePoolFn('0x07c30d0664a802120ffd987a9f038052f165e707', 1636966800, 1637827593)
  }, [])

  useEffect(() => console.log('FEE: ',feesResult), [feesResult])


  return (

    <Wrapper>

      <Chart
      feeData={feesResult === null ? undefined : feesResult}
      dimensions={{
        width: 900,
        height: 300,
        margin: { top: 30, right: 30, bottom: 30, left: 60 }
      }}
      scale={0}/>
    </Wrapper>
  )

}