import StakingAnalyticsChart from '../../components/StakingAnalyticsChart'
import styled from "styled-components/macro";
import {useEffect} from "react";
import {useInfoSubgraph} from "../../hooks/subgraph/useInfoSubgraph";
import Loader from "../../components/Loader";
import React from 'react'

const StakingAnalyticsPageWrapper = styled.div`
  width: 100%;
  max-width: 900px;
`
const LoaderWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 470px;
  margin: 2rem 0;
  background-color: #313644;
  border-radius: 16px;
`

const chartsInfo = [
    {title: 'xALGB Minted', type: 'xALGBminted'},
    {title: 'ALGB From Vault', type: 'ALGBfromVault'},
    {title: 'xALGB Total Supply', type: 'xALGBtotalSupply'},
    {title: 'APR', type: 'apr'},
]

export default function StakingAnalyticsPage() {

    const {fetchStakedHistory: {fetchStakingHistoryFn, historiesLoading, stakeHistoriesResult}} = useInfoSubgraph()

    useEffect(() => {
        fetchStakingHistoryFn()
    }, [])

    return (
        <StakingAnalyticsPageWrapper>
            {chartsInfo.map((item, i) =>
                    <React.Fragment key={i}>
                        <h2>{item.title}</h2>
                        {historiesLoading ?
                            <LoaderWrapper key={i}>
                                <Loader size={'35px'} stroke={'white'}/>
                            </LoaderWrapper> :
                            <React.Fragment key={i}>
                                <StakingAnalyticsChart
                                    stakeHistoriesResult={stakeHistoriesResult}
                                    type={item.type}/>
                            </React.Fragment>
                        }
                    </React.Fragment>
            )}
        </StakingAnalyticsPageWrapper>

    )
}