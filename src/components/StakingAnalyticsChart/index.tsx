import styled from 'styled-components/macro'
import AreaChart from './Chart'
import {useCallback, useEffect, useMemo, useState} from 'react'
import * as d3 from 'd3'
import Brush from './Brush'
import {useInfoSubgraph} from '../../hooks/subgraph/useInfoSubgraph'
import {BigNumber} from 'ethers'
import {formatEther} from 'ethers/lib/utils'

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
    const mm = (date.getMonth() + 1).toString();
    const dd = date.getDate().toString();

    const mmChars = mm.split('');
    const ddChars = dd.split('');

    return yyyy + '-' + (mmChars[1] ? mm : "0" + mmChars[0]) + '-' + (ddChars[1] ? dd : "0" + ddChars[0]);
}

export default function StakingAnalyticsChart() {
    const [chartData, setChartData] = useState([])
    const [chartBorder, setChartBorder] = useState([])
    const focusHeight = 70
    const dimensions = {width: 900, height: 400}
    const margin = {left: 50, top: 30, right: 30, bottom: 30}
    const {fetchStakedHistory: {fetchStakingHistoryFn, historiesLoading, stakeHistoriesResult}} = useInfoSubgraph()
    const stepData = []

    useEffect(() => {
        fetchStakingHistoryFn()
    }, [])

    const getDaysArray = useCallback((start, end) => {
        const arr = []
        const dt = new Date(start)

        while (dt <= end) {
            const day = new Date(dt).getDate()
            const month = new Date(dt).getMonth() + 1
            const year = new Date(dt).getFullYear()
            arr.push(`${year}-${month !== 10 && month !== 11 && month !== 12 ? `0${month}` : month}-${day === 1 || day === 2 || day === 3 || day === 4 || day === 5 || day === 6 || day === 7 || day === 8 || day === 9 ? `0${day}`: day}`)

            dt.setDate(dt.getDate() + 1)
        }
        return arr
    }, [])


    const kek = useMemo(() => getDaysArray(d3.min(chartData)?.date, new Date()).map(item => {
        for (let i = 0; i < chartData.length; i++) {
            if (chartData[i].date === item) {
                return chartData[i]
            }
        }
        return {value: '0', date: item}
    }), [chartData])

    useEffect(() => {
        // console.log(kek)
    }, [kek])

    useEffect(() => {
        if (stakeHistoriesResult) {
            setChartData(stakeHistoriesResult.map(item => {
                // console.log(item)
                return {
                    value: formatEther(BigNumber.from(item.xALGBminted)._hex),
                    date: convertDate(new Date(item.date * 1000))
                }
            }))
        }

        // console.log(stakeHistoriesResult)

    }, [stakeHistoriesResult])

    kek.map(item => {
        if (item.date >= chartBorder[0] && item.date <= chartBorder[1]) {
            stepData.push(item)
        }
    })


    const X = useMemo(() => d3.map(kek, d => new Date(d.date)), [kek])

    if (chartData.length !== 0) {
        return (
            <StakingAnalyticsChartWrapper>
                <AreaChart
                    data={stepData}
                    margin={margin}
                    dimensions={dimensions}
                />
                <Brush
                    data={kek}
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