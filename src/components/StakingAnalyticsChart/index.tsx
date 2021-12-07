import styled from 'styled-components/macro'
import AreaChart from './Chart'
import { useEffect, useState } from 'react'
import * as d3 from 'd3'
import Brush from './Brush'
import { log } from 'util'
import { useInfoSubgraph } from '../../hooks/subgraph/useInfoSubgraph'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'

const data = [
  { date: '2007-04-23', value: 93.24 },
  { date: '2007-04-24', value: 95.35 },
  { date: '2007-04-25', value: 98.84 },
  { date: '2007-04-26', value: 99.92 },
  { date: '2007-04-29', value: 99.8 },
  { date: '2007-05-01', value: 99.47 },
  { date: '2007-05-02', value: 100.39 },
  { date: '2007-05-03', value: 100.4 },
  { date: '2007-05-04', value: 100.81 },
  { date: '2007-05-07', value: 103.92 },
  { date: '2007-05-08', value: 105.06 },
  { date: '2007-05-09', value: 106.88 },
  { date: '2007-05-09', value: 107.34 },
  { date: '2007-05-10', value: 108.74 },
  { date: '2007-05-13', value: 109.36 },
  { date: '2007-05-14', value: 107.52 },
  { date: '2007-05-15', value: 107.34 },
  { date: '2007-05-16', value: 109.44 },
  { date: '2007-05-17', value: 110.02 },
  { date: '2007-05-20', value: 111.98 },
  { date: '2007-05-21', value: 113.54 },
  { date: '2007-05-22', value: 112.89 },
  { date: '2007-05-23', value: 110.69 },
  { date: '2007-05-24', value: 113.62 },
  { date: '2007-05-28', value: 114.35 },
  { date: '2007-05-29', value: 118.77 },
  { date: '2007-05-30', value: 121.19 },
  { date: '2007-06-01', value: 118.4 },
  { date: '2007-06-04', value: 121.33 },
  { date: '2007-06-05', value: 122.67 },
  { date: '2007-06-06', value: 123.64 },
  { date: '2007-06-07', value: 124.07 },
  { date: '2007-06-08', value: 124.49 },
  { date: '2007-06-10', value: 120.19 },
  { date: '2007-06-11', value: 120.38 },
  { date: '2007-06-12', value: 117.5 },
  { date: '2007-06-13', value: 118.75 },
  { date: '2007-06-14', value: 120.5 },
  { date: '2007-06-17', value: 125.09 },
  { date: '2007-06-18', value: 123.66 },
  { date: '2007-06-19', value: 121.55 },
  { date: '2007-06-20', value: 123.9 },
  { date: '2007-06-21', value: 123 },
  { date: '2007-06-24', value: 122.34 },
  { date: '2007-06-25', value: 119.65 },
  { date: '2007-06-26', value: 121.89 },
  { date: '2007-06-27', value: 120.56 },
  { date: '2007-06-28', value: 122.04 },
  { date: '2007-07-02', value: 121.26 },
  { date: '2007-07-03', value: 127.17 },
  { date: '2007-07-05', value: 132.75 }
]

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


function convertDate(date) {
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
  const margin = { left: 30, top: 30, right: 30, bottom: 30 }
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