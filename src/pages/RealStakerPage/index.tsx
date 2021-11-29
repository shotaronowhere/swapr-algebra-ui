import styled, { css } from 'styled-components/macro'
import { Helmet } from 'react-helmet'
import { PageTitle } from '../../components/PageTitle'
import { useActiveWeb3React } from '../../hooks/web3'

const PageWrapper = styled.div`
  min-width: 995px;
`

export default function RealStakerPage() {
  const { account } = useActiveWeb3React()

  return (
    <>
      <Helmet>
        <title>Algebra — Farming • My rewards</title>
      </Helmet>
      {/* <PageTitle
            title={'Staking'}
            refreshHandler={() => (account ? fetchRewards?.fetchRewardsFn(true) : undefined)}
            isLoading={fetchRewards?.rewardsLoading}></PageTitle> */}
      <PageWrapper>
        <PageTitle title={'Staking'} refreshHandler={() => console.log('staking')} isLoading={false}></PageTitle>
      </PageWrapper>
    </>
  )
}
