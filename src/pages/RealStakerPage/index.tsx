import styled from 'styled-components/macro'
import { Helmet } from 'react-helmet'
import { useCurrency } from '../../hooks/Tokens'
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
const UnStakeModal = styled(Modal)`
  flex-direction: column;
`

export default function RealStakerPage({}) {
  const currencyId = '0x4259Abc22981480D81075b0E8C4Bb0b142be8EF8'
  const { chainId, account } = useActiveWeb3React()
  const { percent } = useBurnV3State()
  const { onPercentSelect } = useBurnV3ActionHandlers()
  const { stakerHash, stakerHandler } = useRealStakerHandlers()
  const { getStakes: { stakesResult, stakesLoading, fetchStakingFn } } = useInfoSubgraph()
  const baseCurrency = useCurrency(currencyId)
  const balance = useCurrencyBalance(account ?? undefined, baseCurrency)
  const numBalance = balance !== undefined ? balance.toSignificant(4) : 0

  const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect)

  const [amountValue, setAmountValue] = useState('')
  const [earned, setEarned] = useState(0)
  const [staked, setStaked] = useState(0)
  const [openModal, setOpenModal] = useState(false)
  const [unstaked, setUnstaked] = useState('')

  const [approval, approveCallback] = useApproveCallback(
    balance, chainId ? REAL_STAKER_ADDRESS[chainId] : undefined
  )

  useEffect(() => {
    if (percentForSlider === 0) {
      setAmountValue('')
    } else {
      setAmountValue((numBalance / 100) * percentForSlider)
    }
  }, [percentForSlider])
  useEffect(() => {
    fetchStakingFn(account.toLowerCase())
  }, [])
  useEffect(() => {
    if (stakesResult !== undefined && stakesResult !== null) {
      setEarned((formatEther(BigNumber.from(stakesResult.stakes[0].xALGBAmount)) / formatEther(BigNumber.from(stakesResult.factories[0].xALGBminted)) * formatEther(BigNumber.from(stakesResult.factories[0].ALGBbalance))) - formatEther(BigNumber.from(stakesResult.stakes[0].stakedALGBAmount)))
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
        <StakerInputRange
          amountValue={amountValue}
          setAmountValue={setAmountValue}
          baseCurrency={baseCurrency} />
        {numBalance == 0 && balance ?
          <NavLink to={''} style={{ textDecoration: 'none' }}>
            <StakeButton>
              BUY ALGB
            </StakeButton>
          </NavLink> :
          <>
            <SilerWrapper>
              <StakerSlider
                value={percentForSlider}
                onChange={onPercentSelectForSlider}
                size={22} />
            </SilerWrapper>
            <StakeRangeButtons
              onPercentSelect={onPercentSelect} />
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
        <ResBlocks
          action={'Claim'}
          currency={13}
          amount={earned}
          title={'EARNED'} />
        <ResBlocks
          action={'Unstake'}
          currency={13}
          amount={staked}
          title={'STAKED'}
          openModal={() => {
            setOpenModal(true)
          }} />
      </EarnedStakedWrapper>

      <StakerStatisticWrapper to={''}>
        <StakerStatisticBackground src={StakerStatistic} />
        <h2>Statistics</h2>
        <p>APY / APR / Fees →</p>
      </StakerStatisticWrapper>

      <UnStakeModal
        isOpen={openModal}
        onDismiss={() => {
          setOpenModal(false)
        }}
        maxHeight={300}
      >
        <div style={{width: '100%'}}>
          <StakerInputRange
            amountValue={unstaked}
            setAmountValue={setUnstaked}
            baseCurrency={baseCurrency} />
          <SilerWrapper>
            <StakerSlider
              value={percentForSlider}
              onChange={onPercentSelectForSlider}
              size={22} />
          </SilerWrapper>
          <StakeRangeButtons
            onPercentSelect={onPercentSelect} />
          <StakeButton onClick={() => {
            console.log()
          }}>
            Unstake
          </StakeButton>
        </div>
      </UnStakeModal>
    </>
  )
}
