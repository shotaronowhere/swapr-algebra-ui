import React, { useLayoutEffect, useState } from 'react'
import Chart from './Chart'
import {useParams} from 'react-router-dom'
import styled from 'styled-components/macro'
import { DarkGreyCard } from '../Card'
import { useInfoSubgraph } from '../../hooks/subgraph/useInfoSubgraph'
import { useEffect } from 'react'
import Loader from '../Loader'


const Wrapper = styled(DarkGreyCard)`
  width: 100%;
  background-color: #202635;
`

const MockLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 385px;
  padding: 0 16px;
  max-width: 1000px;
`

export enum ChartScale {
  MONTH,
  DAY
}

function useWindowSize () {
  const [size, setSize] = useState([0,0])
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight])
    }
    window.addEventListener('resize', updateSize)
    updateSize()
    return () => window.removeEventListener('resize', updateSize)
  },[])
  return size
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
  const [isScale, setIsScale] = useState(false)
  const windowWidth = useWindowSize()
  // 0x38822da8434c40af7fd1902fb3dbee9405407828
  useEffect(() => {
    fetchFeePoolFn(id, 1636984800, 1637917200)
  }, [])

  // useEffect(() => console.log('FEE: ',feesResult), [feesResult, feesLoading])

  // console.log(windowWidth)

  return (
    <Wrapper>
      {/*<MockLoading><Loader stroke={'white'} size={'25px'}/></MockLoading>*/}
      {feesLoading && feesResult === null ? <MockLoading><Loader stroke={'white'} size={'25px'}/></MockLoading> :
        <React.Fragment>
          <button onClick={() => {setIsScale(!isScale)}}>{isScale ? '-' : '+'}</button>
          <Chart
            feeData={feesResult === null ? undefined : feesResult}
            dimensions={{
              width: windowWidth[0] < 1100 ? windowWidth[0] - 200 : 900,
              height: 300,
              margin: { top: 30, right: windowWidth[0] < 961 ? 10 : 30, bottom: 30, left: 60 }
            }}
            scale={0}
            isScale={isScale}
          />
        </React.Fragment>}
    </Wrapper>
  )

}