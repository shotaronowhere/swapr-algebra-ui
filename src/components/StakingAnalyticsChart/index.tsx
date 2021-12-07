import styled from 'styled-components/macro'
import AreaChart from './Chart'
import { useEffect, useState } from 'react'
import * as d3 from 'd3'
import Brush from './Brush'
import { log } from 'util'
import { useInfoSubgraph } from '../../hooks/subgraph/useInfoSubgraph'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'

const StakingAnalyticsChartWrapper = styled.div`
  max-width: 1000px;
  width: 100%;
  background-color: #313644;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`


export function convertDate(date) {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth()+1).toString();
  const dd  = date.getDate().toString();

  const mmChars = mm.split('');
  const ddChars = dd.split('');

  return yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);
}

export default function StakingAnalyticsChart () {
  const [chartData, setChartData] = useState([])
  const [chartBorder, setChartBorder] = useState([])
  const focusHeight = 70
 const dimensions = {width: 900, height: 400}
  const margin = { left: 50, top: 30, right: 30, bottom: 30 }
  const {fetchStakedHistory: {fetchStakingHistoryFn, historiesLoading, stakeHistoriesResult}} = useInfoSubgraph()
  const stepData = []
  const X = d3.map(chartData, d => new Date(d.date))

  useEffect(() => {
    fetchStakingHistoryFn()
  }, [])

  useEffect(() => {
    if (stakeHistoriesResult) {
      setChartData(stakeHistoriesResult.map(item => {
        return {value: formatEther(BigNumber.from(item.ALGBbalance)._hex), date: convertDate(new Date(item.date * 1000))}
      }))
    }
      }, [stakeHistoriesResult])

  chartData.map(item => {
    if (item.date >= chartBorder[0] && item.date <= chartBorder[1]) {
      stepData.push(item)
    }
  })

  if (chartData.length !== 0) {
    return (
      <StakingAnalyticsChartWrapper>
        <AreaChart
          data={stepData}
          margin={margin}
          dimensions={dimensions}
        />
        <Brush
          data={chartData}
          width={dimensions.width}
          margin={margin}
          focusHeight={focusHeight}
          X={X}
          updateChartData={setChartBorder}/>
      </StakingAnalyticsChartWrapper>
    )
  }
  return null
}