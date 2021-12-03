import styled from 'styled-components/macro'
import { Helmet } from 'react-helmet'
import { useCurrency } from '../../hooks/Tokens'
import Slider from '../../components/Slider'
import useDebouncedChangeHandler from '../../hooks/useDebouncedChangeHandler'
import { useBurnV3ActionHandlers, useBurnV3State } from '../../state/burn/v3/hooks'
import { ButtonConfirmed } from '../../components/Button'
import React, { useEffect, useState } from 'react'
import RealStakerInputRange from './RealStakerInputRange'
import RealStakerRangeButtons from './RealStakerRangeButtons'
import RealStakerResBlocks from './RealStakerResBlocks'
import { NavLink } from 'react-router-dom'
import StakerStatistic from '../../assets/images/StakerStatisticBackground.svg'
import { useCurrencyBalance, useCurrencyBalances } from '../../state/wallet/hooks'
import { useActiveWeb3React } from '../../hooks/web3'
import Modal from '../../components/Modal'
import { useRealStakerHandlers } from '../../hooks/useRealStaker'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { REAL_STAKER_ADDRESS } from '../../constants/addresses'
import { Field } from '../../state/mint/v3/actions'
import Loader from '../../components/Loader'
import { ALGEBRA_POLYGON } from '../../constants/tokens'
import { useInfoSubgraph } from '../../hooks/subgraph/useInfoSubgraph'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import RealStakerUnstakeModal from './RealStakerUnstakeModal'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import { FiatValue } from '../../components/CurrencyInputPanel/FiatValue'
import { useV3DerivedMintInfo } from '../../state/mint/v3/hooks'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { tryParseAmount } from '../../state/swap/hooks'

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
export const SilderWrapper = styled.div`
  width: 92%;
  margin: 0 auto;
`
export const StakerSlider = styled(Slider)`

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
export const StakeButton = styled(ButtonConfirmed)`
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
  const currencyId = '0x4259Abc22981480D81075b0E8C4Bb0b142be8EF8'
  const algbId = '0x0169eC1f8f639B32Eec6D923e24C2A2ff45B9DD6'
  const { chainId, account } = useActiveWeb3React()
  const { percent } = useBurnV3State()
  const { onPercentSelect } = useBurnV3ActionHandlers()
  const { stakerHash, stakerHandler, stakerClaimHandler, stakerUnstakeHandler} = useRealStakerHandlers()
  const { getStakes: { stakesResult, stakesLoading, fetchStakingFn } } = useInfoSubgraph()

  const baseCurrency = useCurrency(currencyId)
  const algbCurrency = useCurrency(algbId)

  const balance = useCurrencyBalance(account ?? undefined, baseCurrency)
  const numBalance = balance !== undefined ? balance.toSignificant(4) : 0

  const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect)
  const [unstakePercent, setUnstakePercent] = useState(0)

  const [amountValue, setAmountValue] = useState('')
  const [earned, setEarned] = useState(0)
  const [staked, setStaked] = useState(0)
  const [openModal, setOpenModal] = useState(false)
  const [unstaked, setUnstaked] = useState('')
  const unstakeAmount = parseFloat(staked) + parseFloat(earned)

  const [approval, approveCallback] = useApproveCallback(
    balance, chainId ? REAL_STAKER_ADDRESS[chainId] : undefined
  )
  const valueAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    amountValue.toString(),
    baseCurrency
  )
  const earnedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    earned.toString(),
    baseCurrency
  )
  const stakedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    staked.toString(),
    baseCurrency
  )
  const fiatValue = useUSDCValue(valueAmount)
  const fiatValueEarned = useUSDCValue(earnedAmount)
  const fiatValueStaked = useUSDCValue(stakedAmount)

  useEffect(() => {
    if (percentForSlider === 0) {
      setAmountValue('')
    } else {
      setAmountValue((numBalance / 100) * percentForSlider)
    }
  }, [percentForSlider])

  useEffect(() => {
    if (unstakePercent === 0) {
      setUnstaked('')
    } else {
      setUnstaked((unstakeAmount / 100) * unstakePercent)
    }
  }, [unstakePercent])

  useEffect(() => {
    account && fetchStakingFn(account.toLowerCase())
  }, [account])

  useEffect(() => {
    if (stakesResult !== null && stakesResult.stakes[0] !== undefined) {
      console.log(stakesResult)
      setEarned(parseFloat((formatEther(BigNumber.from(stakesResult.stakes[0].xALGBAmount)) / formatEther(BigNumber.from(stakesResult.factories[0].xALGBtotalSupply)) * formatEther(BigNumber.from(stakesResult.factories[0].ALGBbalance))) - formatEther(BigNumber.from(stakesResult.stakes[0].stakedALGBAmount))).toFixed(2))
      setStaked(formatEther(BigNumber.from(stakesResult.stakes[0].stakedALGBAmount)))
    }
  }, [stakesResult])

  return (
    <>
      <Helmet>
        <title>Algebra — Farming • My rewards</title>
      </Helmet>
      <PageWrapper width={'765px'}>
        <StakeTitle>Stake ALGB</StakeTitle>
        <RealStakerInputRange
          amountValue={amountValue}
          setAmountValue={setAmountValue}
          baseCurrency={baseCurrency}
          fiatValue={fiatValue}/>
        {numBalance == 0 && balance ?
          <NavLink to={''} style={{ textDecoration: 'none' }}>
            <StakeButton>
              BUY ALGB
            </StakeButton>
          </NavLink> :
          <>
            <SilderWrapper>
              <StakerSlider
                value={percentForSlider}
                onChange={onPercentSelectForSlider}
                size={22} />
            </SilderWrapper>
            <RealStakerRangeButtons
              onPercentSelect={onPercentSelect}
              showCalculate={true} />
            {approval === ApprovalState.NOT_APPROVED ?
              <StakeButton onClick={approveCallback}>
                Approve token
              </StakeButton> : approval === ApprovalState.UNKNOWN ?
                <StakeButton>
                  <Loader stroke={'white'} size={'19px'} />
                </StakeButton> : approval === ApprovalState.APPROVED ?
                  <StakeButton onClick={() => {
                    stakerHandler(amountValue)
                  }}>
                    Stake
                  </StakeButton> : null}
          </>
        }
      </PageWrapper>
      <EarnedStakedWrapper width={'765px'}>
        <RealStakerResBlocks
          action={'Claim'}
          currency={fiatValueEarned?.toSignificant(6, { groupSeparator: ',' })}
          amount={earned}
          title={'EARNED'}
          handler={() => {
            stakerClaimHandler(earned, stakesResult)
          }}/>
        <RealStakerResBlocks
          action={'Unstake'}
          currency={fiatValueStaked?.toSignificant(6, { groupSeparator: ',' })}
          amount={staked}
          title={'STAKED'}
          handler={() => {
            setOpenModal(true)
          }} />
      </EarnedStakedWrapper>

      <StakerStatisticWrapper to={''}>
        <StakerStatisticBackground src={StakerStatistic} />
        <h2>Statistics</h2>
        <p>APY / APR / Fees →</p>
      </StakerStatisticWrapper>
      <RealStakerUnstakeModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        unstakePercent={unstakePercent}
        setUnstakePercent={setUnstakePercent}
        setUnstaked={setUnstaked}
        unstaked={unstaked}
        baseCurrency={unstakeAmount.toFixed(2)}
        onPercentSelect={setUnstakePercent}
        stakedResult={stakesResult}
        unstakeHandler={stakerUnstakeHandler}
      />
    </>
  )
}