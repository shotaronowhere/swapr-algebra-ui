import React, {useEffect, useState} from 'react'
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


const FrozenTrans = ({el}: {el: any}) => {
    const { hours = 0, minutes = 0, seconds = 60 } = {hours: 0, minutes: 3, seconds: 0}
    const [[hrs, mins, secs], setTime] = React.useState([hours, minutes, seconds])


    const tick = () => {
        if (hrs === 0 && mins === 0 && secs === 0)
           return
        else if (mins === 0 && secs === 0) {
            setTime([hrs - 1, 59, 59]);
        } else if (secs === 0) {
            setTime([hrs, mins - 1, 59]);
        } else {
            setTime([hrs, mins, secs - 1]);
        }
    }

    useEffect(() => {
        const interval = setInterval(() => {
            tick()
        }, 1000)
        return () => clearInterval(interval)
    })
    return (
        <FrozenTransaction>
            <p>{formatUnits(el.stakedALGBAmount).slice(0, 6)} ALGB</p>
            <p>Frozen for {`${mins >= 0 && mins <10 ? `0${mins}` : mins}:${secs >= 0 && secs <10 ? `0${secs}` : secs}minutes`}</p>
        </FrozenTransaction>
    )
}

const Frozen = ({data}: { data: any[] }) => {
    return (
        <FrozenWrapper>
            {data && data.map((el, i) => {
                return <FrozenTrans key={i} el={el}/>
            })}
        </FrozenWrapper>
    )
}

export default Frozen