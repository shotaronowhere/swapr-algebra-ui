import React from 'react'
import styled from "styled-components/macro"

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
    color: white;
    font-size: 16px;
    margin: 5px 0;
    font-weight: 600;
  }
`
const trans = [
    {amount: '1231', timestamp: '13:13'},
    {amount: '1231', timestamp: '13:13'},
    {amount: '1231', timestamp: '13:13'},
    {amount: '1231', timestamp: '13:13'},
    {amount: '1231', timestamp: '13:13'},
    {amount: '1231', timestamp: '13:13'},
    {amount: '1231', timestamp: '13:13'},
]
const Frozen = () => {
    return (
        <FrozenWrapper>
            {trans.map((el, i) =>
                <FrozenTransaction key={i}>
                    <p>{el.amount} ALGB</p>
                    <p>Freezed for {el.timestamp} min</p>
                </FrozenTransaction>
            )}
        </FrozenWrapper>
    )
}

export default Frozen