import RealStakerRangeButtons from './RealStakerRangeButtons'
import React, { useEffect } from 'react'
import styled from 'styled-components/macro'
import Modal from '../../components/Modal'
import { SilderWrapper, StakeButton, StakerSlider } from './index'
import RealStakerUnstakeInputRange from './RealStakerUnstakeInputRange'
import { formatEther } from 'ethers/lib/utils'

const UnStakeModalWrapper = styled(Modal)`
  flex-direction: column;
`

interface UnstakeModalProps {
  openModal: boolean
  setOpenModal: any
  unstaked: string
  setUnstaked: any
  baseCurrency: any
  unstakePercent: number
  setUnstakePercent: any
  onPercentSelect: number,
  unstakeHandler: any,
  stakedResult: any
  fiatValue: any
}

export default function RealStakerUnstakeModal(
  {
    openModal,
    setOpenModal,
    unstaked,
    setUnstaked,
    baseCurrency,
    unstakePercent,
    setUnstakePercent,
    onPercentSelect,
    unstakeHandler,
    stakedResult,
    fiatValue
  } : UnstakeModalProps
) {
  return (
    <UnStakeModalWrapper
      isOpen={openModal}
      onDismiss={() => {
        setOpenModal(false)
      }}
      maxHeight={300}
    >
      <div style={{width: '100%'}}>
        <RealStakerUnstakeInputRange
          amountValue={unstaked}
          setAmountValue={setUnstaked}
          baseCurrency={formatEther(baseCurrency)}
          fiatValue={fiatValue}
          />
        <SilderWrapper>
          <StakerSlider
            value={unstakePercent}
            onChange={setUnstakePercent}
            size={22} />
        </SilderWrapper>
        <RealStakerRangeButtons
          onPercentSelect={onPercentSelect}
          showCalculate={false}
        />
        <StakeButton onClick={() => {
          unstakeHandler(unstaked, stakedResult, baseCurrency)
          setOpenModal(false)
        }}
        disabled={unstaked === ''}>
          Unstake
        </StakeButton>
      </div>
    </UnStakeModalWrapper>
  )
}