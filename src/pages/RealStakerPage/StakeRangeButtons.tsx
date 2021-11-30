import { Trans } from '@lingui/macro'
import styled from 'styled-components/macro'
import { SmallMaxButton } from '../RemoveLiquidity/styled'

const StakerSmallMaxButton = styled(SmallMaxButton)`
  background: #4A5982;
  border: none;
`
const ButtonsWrapper = styled.div`
  margin: 0 auto;
  width: 92%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export default function StakeRangeButtons ({onPercentSelect} : {onPercentSelect: any}) {
  return(
    <ButtonsWrapper>
      <div>
        <StakerSmallMaxButton onClick={() => onPercentSelect(25)}>
          <Trans>25%</Trans>
        </StakerSmallMaxButton>
        <StakerSmallMaxButton onClick={() => onPercentSelect(50)}>
          <Trans>50%</Trans>
        </StakerSmallMaxButton>
        <StakerSmallMaxButton onClick={() => onPercentSelect(75)}>
          <Trans>75%</Trans>
        </StakerSmallMaxButton>
        <StakerSmallMaxButton onClick={() => onPercentSelect(100)}>
          <Trans>MAX</Trans>
        </StakerSmallMaxButton>
      </div>
      <p>Calculate profits →</p>
    </ButtonsWrapper>
  )
}