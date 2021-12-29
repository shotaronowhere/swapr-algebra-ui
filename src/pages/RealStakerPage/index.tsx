import styled from 'styled-components/macro'
import { Helmet } from 'react-helmet'
import { useCurrency } from '../../hooks/Tokens'
import Slider from '../../components/Slider'
import useDebouncedChangeHandler from '../../hooks/useDebouncedChangeHandler'
import { useBurnV3ActionHandlers, useBurnV3State } from '../../state/burn/v3/hooks'
import { ButtonConfirmed } from '../../components/Button'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import RealStakerInputRange from './RealStakerInputRange'
import RealStakerRangeButtons from './RealStakerRangeButtons'
import RealStakerResBlocks from './RealStakerResBlocks'
import { NavLink } from 'react-router-dom'
import StakerStatistic from '../../assets/images/StakerStatisticBackground.svg'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { useActiveWeb3React } from '../../hooks/web3'
import { useRealStakerHandlers } from '../../hooks/useRealStaker'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { REAL_STAKER_ADDRESS } from '../../constants/addresses'
import Loader from '../../components/Loader'
import { ALGEBRA_POLYGON } from '../../constants/tokens'
import { useInfoSubgraph } from '../../hooks/subgraph/useInfoSubgraph'
import { BigNumber } from 'ethers'
import { formatEther, formatUnits, parseUnits } from 'ethers/lib/utils'
import RealStakerUnstakeModal from './RealStakerUnstakeModal'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { tryParseAmount } from '../../state/swap/hooks'
import { useAllTransactions } from '../../state/transactions/hooks'
import { useWalletModalToggle } from '../../state/application/hooks'

const PageWrapper = styled.div`
  min-width: ${(props) => props.width};
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
    background: #4a5982;
    height: 5px;
    border-radius: 20px;
  }

  &::-moz-range-track {
    background: #4a5982;
    height: 5px;
    border-radius: 20px;
  }

  &::-moz-range-progress {
    background-color: #5d32ed;
    height: 5px;
    border-radius: 20px;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: ${({ size }) => size}px;
    width: ${({ size }) => size}px;
    background-color: #2e3957;
    border-radius: 100%;
    border: 7px solid #6f86c9;
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
    background-color: #2e3957;
    border-radius: 100%;
    border: 7px solid #6f86c9;
    color: ${({ theme }) => theme.bg1};

    &:hover,
    &:focus {
      box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.08), 0px 16px 24px rgba(0, 0, 0, 0.06),
        0px 24px 32px rgba(0, 0, 0, 0.04);
    }
  }
`
export const StakeButton = styled(ButtonConfirmed)`
  border-radius: 8px !important;
  width: 92%;
  margin: 24px auto 27px;
`
const EarnedStakedWrapper = styled.div`
  margin: 27px auto;
  display: flex;
  justify-content: space-between;
  min-width: ${(props) => props.width};
`
const StakerStatisticWrapper = styled(NavLink)`
  position: relative;
  min-width: 765px;
  height: 107px;
  text-decoration: none;

  h2,
  p {
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
  const currencyId = '0x0169eC1f8f639B32Eec6D923e24C2A2ff45B9DD6'
  const algbId = '0x0169eC1f8f639B32Eec6D923e24C2A2ff45B9DD6'
  const { chainId, account } = useActiveWeb3React()
  const { percent } = useBurnV3State()
  const { onPercentSelect } = useBurnV3ActionHandlers()
  const { stakerHash, stakerHandler, stakerClaimHandler, stakerUnstakeHandler } = useRealStakerHandlers()
  const {
    getStakes: { stakesResult, stakesLoading, fetchStakingFn },
  } = useInfoSubgraph()
  const toggleWalletModal = useWalletModalToggle()

  const baseCurrency = useCurrency(currencyId)
  const algbCurrency = useCurrency(algbId)

  //balances
  const balance = useCurrencyBalance(account ?? undefined, baseCurrency)

  const _balance = useMemo(() => {
    return balance
  }, [balance])

  const numBalance = useMemo(() => {
    if (!balance) return 0
    return balance
  }, [balance])

  const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect)
  const [unstakePercent, setUnstakePercent] = useState(0)

  const [openModal, setOpenModal] = useState(false)

  const [amountValue, setAmountValue] = useState('')
  const [earned, setEarned] = useState(0)
  const [staked, setStaked] = useState(0)
  const [unstaked, setUnstaked] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState(0)
  const [algbCourse, setAlbgCourse] = useState()

  const [approval, approveCallback] = useApproveCallback(balance, chainId ? REAL_STAKER_ADDRESS[chainId] : undefined)
  const valueAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(amountValue.toString(), baseCurrency)
  const earnedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    earned !== 0 ? formatEther(earned._hex) : earned.toString(),
    baseCurrency
  )
  const stakedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    staked !== 0 ? formatEther(staked._hex) : staked.toString(),
    baseCurrency
  )
  const unstakedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(unstaked.toString(), baseCurrency)

  const fiatValue = useUSDCValue(valueAmount)
  const fiatValueEarned = useUSDCValue(earnedAmount)
  const fiatValueStaked = useUSDCValue(stakedAmount)
  const fiatUnstakedAmount = useUSDCValue(unstakedAmount)

  const allTransactions = useAllTransactions()

  const sortedRecentTransactions = useMemo(() => {
    const txs = Object.values(allTransactions)
    return txs
      .filter((tx) => new Date().getTime() - tx.addedTime < 86_400_000)
      .sort((a, b) => b.addedTime - a.addedTime)
  }, [allTransactions])

  const confirmed = useMemo(
    () => sortedRecentTransactions.filter((tx) => tx.receipt).map((tx) => tx.hash),
    [sortedRecentTransactions, allTransactions]
  )

  const [loadingClaim, setLoadingClaim] = useState(false)
  const reloadClaim = useCallback(() => {
    if (!account) return
    setLoadingClaim(true)
    fetchStakingFn(account.toLowerCase()).then((res) => {
      setLoadingClaim(false)
    })
  }, [])

  useEffect(() => {
    if (!account) return


    fetchStakingFn(account.toLowerCase())

    // if (stakerHash && confirmed.includes(stakerHash.hash)) {
    //  fetchStakingFn(account.toLowerCase())
    // }
  }, [account])

  // useEffect(() => {
  //   if (!account) return
  //   fetchStakingFn(account.toLowerCase())
  // }, [allTransactions])

  //calc amount when choose range in slider
  useEffect(() => {
    if (percentForSlider === 0) {
      setAmountValue('')
    } else if (percentForSlider === 100) {
      setAmountValue(+numBalance.toSignificant(4))
    } else {
      setAmountValue((+numBalance.toSignificant(4) / 100) * percentForSlider)
    }
  }, [percentForSlider])

  //calc unstakeAmount when choose range in slider
  useEffect(() => {
    if (unstakePercent === 0) {
      setUnstaked('')
    } else if (unstakePercent === 100) {
      setUnstaked(formatUnits(BigNumber.from(unstakeAmount), 18))
    } else {
      setUnstaked(formatUnits(BigNumber.from(unstakeAmount).div(100).mul(unstakePercent), 18))
    }
  }, [unstakePercent])

  //get data for staked and earned
  useEffect(() => {
    if (stakesResult || !account) return
    fetchStakingFn(account.toLowerCase())
  }, [_balance])

  //get data for staked and earned

  //calc staked, earned, algbCourse, unstakedAmount
  useEffect(() => {
    // console.log('HERE', stakesResult)
    if (stakesResult !== null && stakesResult.stakes[0] !== undefined) {
      console.log(stakesResult.stakes[0].xALGBAmount, stakesResult.stakes[0].xALGBtotalSupply, stakesResult.stakes[0].ALGBbalance, stakesResult.stakes[0].stakedALGBAmount)
      if (+stakesResult.stakes[0].stakedALGBAmount !== 0 && +stakesResult.stakes[0].xALGBAmount !== 0) {
        setEarned(
            BigNumber.from(stakesResult.stakes[0].xALGBAmount)
                .mul(BigNumber.from(stakesResult.factories[0].ALGBbalance))
                .div(BigNumber.from(stakesResult.factories[0].xALGBtotalSupply))
                .sub(BigNumber.from(stakesResult.stakes[0].stakedALGBAmount))
        )
      }
      setStaked(BigNumber.from(stakesResult.stakes[0].stakedALGBAmount))

      if (+stakesResult.factories[0].xALGBtotalSupply !== 0) {
        setAlbgCourse(
            BigNumber.from(stakesResult.factories[0].ALGBbalance)
                .div(BigNumber.from(stakesResult.factories[0].xALGBtotalSupply))
        )
      }
    }
  }, [stakesResult])

  useEffect(() => {
    if (typeof staked !== 'number') {
      setUnstakeAmount(staked.add(earned))
    }
  }, [staked, earned])

  return (
    <>
      <Helmet>
        <title>Algebra — Staking</title>
      </Helmet>
      <PageWrapper width={'765px'}>
        <StakeTitle>Stake ALGB</StakeTitle>
        <RealStakerInputRange
          amountValue={amountValue}
          setAmountValue={setAmountValue}
          baseCurrency={baseCurrency}
          fiatValue={fiatValue}
        />
        {numBalance == 0 && balance ? (
          <NavLink to={''} style={{ textDecoration: 'none' }}>
            <StakeButton>BUY ALGB</StakeButton>
          </NavLink>
        ) : (
          <>
            <SilderWrapper>
              <StakerSlider value={percentForSlider} onChange={onPercentSelectForSlider} size={22} />
            </SilderWrapper>
            <RealStakerRangeButtons onPercentSelect={onPercentSelect} showCalculate={true} />
            {approval === ApprovalState.NOT_APPROVED ? (
              <StakeButton onClick={approveCallback}>Approve token</StakeButton>
            ) : approval === ApprovalState.UNKNOWN && account === null ? (
              <StakeButton onClick={toggleWalletModal}>Connect to a wallet</StakeButton>
            ) : approval === ApprovalState.UNKNOWN ? (
              <StakeButton>
                <Loader stroke={'white'} size={'19px'} />
              </StakeButton>
            ) : approval === ApprovalState.APPROVED ? (
              <StakeButton
                onClick={() => {
                  stakerHandler(amountValue)
                  onPercentSelectForSlider(0)
                  if (percentForSlider === 0) {
                    setAmountValue('')
                  }
                }}
                disabled={amountValue === ''}
              >
                Stake
              </StakeButton>
            ) : null}
          </>
        )}
      </PageWrapper>
      <EarnedStakedWrapper width={'765px'}>
        <RealStakerResBlocks
          action={'Claim'}
          currency={fiatValueEarned}
          amount={earned}
          title={'EARNED'}
          handler={() => {
            stakerClaimHandler(earned, stakesResult)
          }}
          algbCourse={algbCourse}
          needReload={true}
          reloadHandler={reloadClaim}
          loading={loadingClaim}
        />
        <RealStakerResBlocks
          action={'Unstake'}
          currency={fiatValueStaked}
          amount={staked}
          title={'STAKED'}
          handler={() => {
            setOpenModal(true)
          }}
          algbCourse={algbCourse}
        />
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
        baseCurrency={unstakeAmount}
        onPercentSelect={setUnstakePercent}
        stakedResult={stakesResult}
        unstakeHandler={stakerUnstakeHandler}
        fiatValue={fiatUnstakedAmount}
      />
    </>
  )
}
