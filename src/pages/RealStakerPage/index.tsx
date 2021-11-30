import styled, { css } from 'styled-components/macro'
import { Helmet } from 'react-helmet'
import { useCurrency } from '../../hooks/Tokens'
import { ALGEBRA_POLYGON } from '../../constants/tokens'
import Slider from '../../components/Slider'
import useDebouncedChangeHandler from '../../hooks/useDebouncedChangeHandler'
import { useBurnV3ActionHandlers, useBurnV3State } from '../../state/burn/v3/hooks'
import { ButtonConfirmed } from '../../components/Button'
import React, { useEffect, useState } from 'react'
import StakerInputRange from './StakerInputRange'
import StakeRangeButtons from './StakeRangeButtons'
import ResBlocks from './ResBlocks'
import { NavLink } from 'react-router-dom'
import StakerStatistic from '../../assets/images/StakerStatisticBackground.svg'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { useActiveWeb3React } from '../../hooks/web3'

const PageWrapper = styled.div`
  min-width: ${props => props.width};
  background-color: #202635;
  border-radius: 16px;
`
const StakeTitle = styled.h1`
  width: 92%;
  margin: 26px auto 0;
  font-size: 20px;
`
const SilerWrapper = styled.div`
  width: 92%;
  margin: 0 auto;
`
const StakerSlider = styled(Slider)`

  &::-webkit-slider-runnable-track {
    background: #4A5982;
    height: 5px;
    border-radius: 20px;
  }

  &::-moz-range-track {
    background: #4A5982;
    height: 5px;
    border-radius: 20px;
  }

  &::-moz-range-progress {
    background-color: #5D32ED;
    height: 5px;
    border-radius: 20px;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: ${({ size }) => size}px;
    width: ${({ size }) => size}px;
    background-color: #2E3957;
    border-radius: 100%;
    border: 7px solid #6F86C9;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.bg1};

    &:hover,
    &:focus {
      box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.08), 0px 16px 24px rgba(0, 0, 0, 0.06),
      0px 24px 32px rgba(0, 0, 0, 0.04);
    }
  }

  &::-moz-range-thumb {
    height: ${({ size }) => size}px;
    width: ${({ size }) => size}px;
    background-color: #2E3957;
    border-radius: 100%;
    border: 7px solid #6F86C9;
    color: ${({ theme }) => theme.bg1};

    &:hover,
    &:focus {
      box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.08), 0px 16px 24px rgba(0, 0, 0, 0.06),
      0px 24px 32px rgba(0, 0, 0, 0.04);
    }
  }`
const StakeButton = styled(ButtonConfirmed)`
  border-radius: 8px !important;
  width: 92%;
  margin: 24px auto 27px;
`
const EarnedStakedWrapper = styled.div`
  margin: 27px auto;
  display: flex;
  justify-content: space-between;
  min-width: ${props => props.width};

`
const StakerStatisticWrapper = styled(NavLink)`
  position: relative;
  min-width: 765px;
  height: 107px;
  text-decoration: none;
  
  h2, p {
    color: white;
    text-decoration: none;
    margin: 0 0 0 27px;
    font-size: 16px;
  }
  h2 {
    margin: 17px 0 6px 27px;
    font-size: 20px;
    font-weight: 600;
  }
`
const StakerStatisticBackground = styled.img`
  height: 107px;
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
`

export default function RealStakerPage({}) {
  const currencyId = ALGEBRA_POLYGON.address
  const baseCurrency = useCurrency(currencyId)
  const { percent } = useBurnV3State()
  const { onPercentSelect } = useBurnV3ActionHandlers()
  const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect)
  const [amountValue, setAmountValue] = useState('')

  const { account } = useActiveWeb3React()
  const balance = useCurrencyBalance(account ?? undefined, baseCurrency)

  useEffect(() => {
    if (percentForSlider === 0){
      setAmountValue('')
    } else {
     if (balance !== undefined) {
       setAmountValue((balance.toSignificant(4) / 100) * percentForSlider)
     }
    }
  },[percentForSlider])

  return (
    <>
      <Helmet>
        <title>Algebra — Farming • My rewards</title>
      </Helmet>
      <PageWrapper width={'765px'}>
        <StakeTitle>Stake ALGB</StakeTitle>
        <StakerInputRange
        amountValue={amountValue}
        setAmountValue={setAmountValue}
        baseCurrency={baseCurrency}/>
        <SilerWrapper>
          <StakerSlider
            value={percentForSlider}
            onChange={onPercentSelectForSlider}
            size={22} />
        </SilerWrapper>
        <StakeRangeButtons
        onPercentSelect={onPercentSelect}/>
        <StakeButton>
          Stake
        </StakeButton>
      </PageWrapper>
      <EarnedStakedWrapper width={'765px'}>
        <ResBlocks
        action={'Claim'}
        currency={13}
        amount={1123}
        title={'EARNED'}/>
        <ResBlocks
          action={'Unstake'}
          currency={13}
          amount={1123}
          title={'STAKED'}/>
      </EarnedStakedWrapper>
      <StakerStatisticWrapper to={''}>
        <StakerStatisticBackground src={StakerStatistic}/>
        <h2>Statistics</h2>
        <p>APY / APR / Fees →</p>
      </StakerStatisticWrapper>
    </>
  )
}
