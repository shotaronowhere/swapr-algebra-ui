import React from 'react'
import styled from "styled-components/macro"
import {formatUnits} from "ethers/lib/utils"

const FrozenWrapper = styled.div`
  width: 100%;
  background-color: #111621;
  height: 190px;
  position: absolute;
  top: 41px;
  z-index: 100;
  border-radius: 16px;
  padding: 25px 30px;
  overflow-y: scroll;
`

const FrozenTransaction = styled.div`
  display: flex;
  color: white;
  justify-content: space-between;
  p {
    color: white !important;
    font-size: 16px !important;
    margin: 5px 0 !important;
    font-weight: 600;
  }
`

const Frozen = ({data}: {data: any[]}) => {
    return (
        <FrozenWrapper>
            {data && data.map((el, i) => {
                    const time = new Date(el.timestamp * 1000)
                return  <FrozenTransaction key={i}>
                    <p>{formatUnits(el.stakedALGBAmount).slice(0,6)} ALGB</p>
                    <p>Freeze for {`${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`}</p>
                </FrozenTransaction>
                })}
        </FrozenWrapper>
    )
}

export default Frozen