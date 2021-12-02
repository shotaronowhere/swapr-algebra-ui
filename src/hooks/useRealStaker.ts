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

      const claimSum = claimCount * formatEther(BigNumber.from(stakesResult.factories[0].xALGBminted)) / formatEther(BigNumber.from(stakesResult.factories[0].ALGBbalance))
      const bigNumClaimCount = parseUnits(claimSum.toString(), 18)
      // console.log(bigNumClaimCount)
      const result = await realStaker.leave(bigNumClaimCount._hex)
      console.log(claimSum)

    } catch (e) {
      console.log(e)
      return
    }
  }, [])

  const stakerUnstakeHandler = useCallback(async (unstakeCount, stakesResult) => {
    try {

      const realStaker = new Contract(
        REAL_STAKER_ADDRESS[chainId],
        REAL_STAKER_ABI,
        provider.getSigner()
      )

      const unstakeSum = unstakeCount * formatEther(BigNumber.from(stakesResult.factories[0].xALGBminted)) / formatEther(BigNumber.from(stakesResult.factories[0].ALGBbalance))
      const bigNumClaimCount = parseUnits(unstakeSum.toString(), 18)
      const result = await realStaker.leave(bigNumClaimCount._hex)

      console.log(unstakeSum)


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