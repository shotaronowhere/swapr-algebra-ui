import { useEffect } from 'react'
import { PageWrapper } from '../../pages/AddLiquidity/styled'
import InfoPoolsTable from '../InfoPoolsTable'

import styled from 'styled-components/macro'
import Loader from '../Loader'

const MockLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 500px;
`

export function InfoPools({
  data,
  refreshing,
  fetchHandler,
  blocksFetched,
}: {
  data: any
  refreshing: boolean
  fetchHandler: () => any
  blocksFetched: boolean
}) {
  useEffect(() => {
    if (blocksFetched) {
      fetchHandler()
    }
  }, [blocksFetched])

  if (!data) return <MockLoading>
    <Loader stroke={'white'} size={'25px'}/>
  </MockLoading>

  return (
    <PageWrapper style={{ maxWidth: '100%' }}>
      <InfoPoolsTable poolDatas={data}></InfoPoolsTable>
    </PageWrapper>
  )
}
