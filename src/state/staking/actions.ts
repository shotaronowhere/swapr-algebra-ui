import { createAction } from '@reduxjs/toolkit'

export enum TimePart {
    START_TIME = 'START_TIME',
    END_TIME = 'END_TIME'
}

export const incentiveRewardAmount = createAction<{ amount: string }>('farming/incentiveRewardAmount')
export const incentiveBonusRewardAmount = createAction<{ amount: string }>('farming/incentiveBonusRewardAmount')
export const incentiveRefundeeAddress = createAction<{ address: string }>('farming/incentiveRefundeeAddress')
export const incentiveTime = createAction<{ part: TimePart, time: number }>('farming/incentiveTime')