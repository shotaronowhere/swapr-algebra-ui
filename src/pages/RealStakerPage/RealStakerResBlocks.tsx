import styled, { keyframes } from 'styled-components/macro'
import { ButtonConfirmed } from '../../components/Button'
import { formatEther, parseUnits } from 'ethers/lib/utils'
import { useState } from 'react'
import { RefreshCw } from 'react-feather'
import { PageTitle } from '../../components/PageTitle'

const PageWrapper = styled.div`
  min-width: ${props => props.width};
  background-color: #202635;
  border-radius: 16px;
  position: relative;

  h2 {
    color: #687086;
    font-size: 16px;
    margin: 0;
  }

  h3 {
    font-size: 19px;
    font-weight: 600;
    margin: 10px 0 4px 0;
    cursor: default;
    width: fit-content;
  }

  p {
    color: #B1BAD3;
    font-size: 14px;
    margin: 0;
    cursor: default;
  }

  h3, p {
    margin-left: 30px;
  }
`
const StakeButton = styled(ButtonConfirmed)`
  border-radius: 8px !important;
  width: 92%;
  margin: 16px auto 27px;
`
const AmountTitle = styled.div`
  display: block;
  background-color: white;
  color: black;
  position: absolute;
  font-size: 14px;
  padding: 3px 7px;
  top: 12%;
  left: 30%;
  border-radius: 5px;
`
const spinAnimation = keyframes`
  100% {
    transform: rotate(360deg);
  }
`

const ReloadButton = styled.button`
  background-color: transparent;
  border: none;
  animation: ${(props) => (props.refreshing ? spinAnimation : '')} infinite 3s;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`
const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 30px 0;
`

interface ResBloksProps {
  title: string
  amount: number
  currency: any
  action: string
  handler?: any
  algbCourse: any
  needReload?: boolean
  reloadHandler?: any
  loading?: boolean
}

export default function RealStakerResBlocks(
  {
    title, amount, currency, action, handler, algbCourse = 0, needReload, reloadHandler, loading
  }: ResBloksProps) {
  const [isFull, setIsFull] = useState(false)
  return (
    <PageWrapper width={'367px'}>
      <TitleWrapper>
        <h2>{title}</h2>
        {needReload ? reloadHandler && loading !== undefined && (<ReloadButton disabled={loading} onClick={reloadHandler} refreshing={loading}>
          <RefreshCw style={{ display: 'block' }} size={18} stroke={'white'} />
        </ReloadButton>) : null}
      </TitleWrapper>
      {isFull && !(formatEther(amount) < formatEther(algbCourse)) ?
        <AmountTitle title={`${formatEther(amount)}`}>{formatEther(amount)}</AmountTitle> : null}
      <h3 onMouseEnter={() => {
        setIsFull(true)
      }}
          onMouseLeave={() => {
            setIsFull(false)
          }}
      >{(formatEther(amount) < formatEther(algbCourse)) ? '0.00' : parseFloat(formatEther(amount)).toFixed(2)} ALGB</h3>
      <p>$ {currency === null || formatEther(amount) < formatEther(algbCourse) ? '0' : currency?.toSignificant(6, { groupSeparator: ',' })}</p>
      <StakeButton disabled={amount == 0 || (formatEther(amount) < formatEther(algbCourse))}
                   onClick={handler}>{action}</StakeButton>
    </PageWrapper>
  )
}