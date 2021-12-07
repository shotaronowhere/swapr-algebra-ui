import REAL_STAKER_ABI from 'abis/real-staker.json'
import { BigNumber, Contract, providers } from 'ethers'
import { formatEther, parseUnits } from 'ethers/lib/utils'
import { useCallback, useState } from "react"
import { REAL_STAKER_ADDRESS } from "../constants/addresses"
import { useActiveWeb3React } from "./web3"

export function useRealStakerHandlers() {

  const { chainId, account } = useActiveWeb3React()
  const _w: any = window
  const provider = _w.ethereum ? new providers.Web3Provider(_w.ethereum) : undefined

  const [stakerHash, setStaked] = useState(null)

  const stakerHandler = useCallback(async (stakedCount) => {

    if (!account || !provider) return

    setStaked(null)

    try {
      const realStaker = new Contract(
        REAL_STAKER_ADDRESS[chainId],
        REAL_STAKER_ABI,
        provider.getSigner()
      )
      const bigNumStakerCount = parseUnits(stakedCount.toString(), 18)
      const result = await realStaker.enter(bigNumStakerCount._hex)

      console.log(result)

    } catch (e) {
      setStaked('failed')
      console.error(e)
      return
    }

  }, [account, chainId])

  const stakerClaimHandler = useCallback(async (claimCount, stakesResult) => {
    try {

      const realStaker = new Contract(
        REAL_STAKER_ADDRESS[chainId],
        REAL_STAKER_ABI,
        provider.getSigner()
      )

      const claimSum = (claimCount.mul(BigNumber.from(stakesResult.factories[0].xALGBtotalSupply))).div(BigNumber.from(stakesResult.factories[0].ALGBbalance))

      const result = await realStaker.leave(claimSum._hex)
      console.log(result)
    } catch (e) {
      console.log(e)
      return
    }
  }, [])

  const stakerUnstakeHandler = useCallback(async (unstakeCount, stakesResult, maxALGBAccount) => {
    try {

      const realStaker = new Contract(
        REAL_STAKER_ADDRESS[chainId],
        REAL_STAKER_ABI,
        provider.getSigner()
      )

      const bigNumUnstakeAmount = (parseUnits(unstakeCount.toString(), 18).mul(BigNumber.from(stakesResult.stakes[0].xALGBAmount))).div(maxALGBAccount)

      const result = await realStaker.leave(bigNumUnstakeAmount._hex)

    } catch (e) {
      console.log(e)
      return
    }
  }, [])

  return {
    stakerHandler,
    stakerHash,
    stakerClaimHandler,
    stakerUnstakeHandler
  }
}