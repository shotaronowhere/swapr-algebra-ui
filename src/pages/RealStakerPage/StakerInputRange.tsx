import { CurrencyDropdown } from '../AddLiquidity/styled'
import styled from 'styled-components/macro'

const CurrencyInputPanelWrapper = styled.div`
  width: 92%;
  background-color: #111621;
  margin: 26px auto 32px;
  border-radius: 16px;
  padding: 21px 0 20px 24px;
  min-height: 150px;

  img {
    width: 36px;
    height: 36px;
  }

  span {
    font-size: 21px;
  }
`

interface StakerInputRangeProps {
  baseCurrency : any
  amountValue: string
  setAmountValue: any
}

export default function StakerInputRange ({baseCurrency, amountValue, setAmountValue}: StakerInputRangeProps) {
  return (
    <CurrencyInputPanelWrapper>
      <CurrencyDropdown
        currency={baseCurrency}
        value={'100'}
        hideInput={true}
        showCommonBases
        showBalance={true}
        disabled={false}
        shallow={true}
      />
      <CurrencyDropdown
        onUserInput={(e) => {setAmountValue(e)}}
        currency={baseCurrency}
        value={amountValue}
        hideInput={false}
        hideCurrency={true}
        locked={false}
        showCommonBases
        showBalance={true}
        disabled={false}
        shallow={true}
      />
    </CurrencyInputPanelWrapper>
  )
}