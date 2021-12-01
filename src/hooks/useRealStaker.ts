import REAL_STAKER_ABI from 'abis/real-staker.json'
import { BigNumber, Contract, providers } from 'ethers'
import { hexlify, Interface, parseUnits } from 'ethers/lib/utils'
import { useCallback, useState } from "react"
import { REAL_STAKER_ADDRESS } from "../constants/addresses"
import { useActiveWeb3React } from "./web3"
import { formatUnits } from '@ethersproject/units'

export function useRealStakerHandlers() {

  const { chainId, account, library } = useActiveWeb3React()
  const _w: any = window
  const provider = _w.ethereum ? new providers.Web3Provider(_w.ethereum) : undefined
  const stakerInterface = new Interface(REAL_STAKER_ABI)

  const [stakerHash, setStaked] = useState(null)

  const stakerHandler = useCallback(async (stakedCount) => {

    if (!account || !provider) return

    setStaked(null)

    let current

    try {

      const realStaker = new Contract(
        REAL_STAKER_ADDRESS[chainId],
        REAL_STAKER_ABI,
        provider.getSigner()
      )


     //  const getHex = i => ('00' + i.toString(16)).slice(-2)
     //  const view = new DataView(new ArrayBuffer(4))
     //  view.setFloat32(0, stakedCount)
     //  // eslint-disable-next-line prefer-spread
     // const result = Array
     //    .apply(null, { length: 4 })
     //    .map((_, i) => getHex(view.getUint8(i)))
     //    .join('');

      const bigNumStakerCount = parseUnits(stakedCount.toString(), 18)


      const result = await realStaker.enter(bigNumStakerCount._hex)

      console.log(result)

    } catch (e) {
      setStaked('failed')
      console.error(e, current)
      return
    }

  }, [account, chainId])

  return {
    stakerHandler,
    stakerHash,
  }
}