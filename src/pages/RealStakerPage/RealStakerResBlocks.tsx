import styled from 'styled-components/macro'
import { ButtonConfirmed } from '../../components/Button'
import { formatEther } from 'ethers/lib/utils'
import { useState } from 'react'

const PageWrapper = styled.div`
  min-width: ${props => props.width};
  background-color: #202635;
  border-radius: 16px;
  position: relative;
  
  h2 {
    color: #687086;
    font-size: 16px;
    margin: 18px 0 0 0;
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

  h2, h3, p {
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


interface ResBloksProps {
  title: string
  amount: number
  currency: any
  action: string
  handler?: any
}

export default function RealStakerResBlocks({ title, amount, currency, action, handler }: ResBloksProps) {
  const [isFull, setIsFull] = useState(false)
  return (
    <PageWrapper width={'367px'}>
      <h2>{title}</h2>
      {isFull ? <AmountTitle title={`${formatEther(amount)}`}>{formatEther(amount)}</AmountTitle> : null}
      <h3 onMouseEnter={() => {
        setIsFull(true)
      }}
          onMouseLeave={() => {
        setIsFull(false)
      }}
      >{parseFloat(formatEther(amount)).toFixed(2)} ALGB</h3>
      {/* < 0.01 ? '< 0.01$' : '$ ' + currency?.toSignificant(6, { groupSeparator: ',' })*/}
      <p>$ {currency?.toSignificant(6, { groupSeparator: ',' })}</p>
      <StakeButton disabled={amount == 0} onClick={handler}>{action}</StakeButton>
    </PageWrapper>
  )
}