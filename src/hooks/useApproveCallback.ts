import { TransactionResponse } from "ethers";
import { Currency, CurrencyAmount, Percent, TradeType } from "@uniswap/sdk-core";
import { Trade as V2Trade } from "@uniswap/v2-sdk";
import { Trade as V3Trade } from "lib/src";
import { useCallback, useMemo } from "react";
import { SWAP_ROUTER_ADDRESSES } from "../constants/addresses";
import { useHasPendingApproval, useTransactionAdder } from "../state/transactions/hooks";
import { calculateGasMargin } from "../utils/calculateGasMargin";
import { useTokenContract } from "./useContract";
import { useAccount } from 'wagmi';
import { useTokenAllowance } from "./useTokenAllowance";
import { useAppSelector } from "state/hooks";
import { GAS_PRICE_MULTIPLIER } from "./useGasPrice";

import { t } from "@lingui/macro";
export enum ApprovalState {
    UNKNOWN = "UNKNOWN",
    NOT_APPROVED = "NOT_APPROVED",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
}

// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
export function useApproveCallback(amountToApprove?: CurrencyAmount<Currency>, spender?: string): [ApprovalState, () => Promise<void>] {
    const { address: account, chain } = useAccount();
    const chainId = chain?.id;
    const token = amountToApprove?.currency?.isToken ? amountToApprove.currency : undefined;
    const currentAllowance = useTokenAllowance(token, account ?? undefined, spender);
    const pendingApproval = useHasPendingApproval(token?.address, spender);

    const gasPrice = useAppSelector((state) => {
        if (!state.application.gasPrice.fetched) return 36;
        return state.application.gasPrice.override ? 36 : state.application.gasPrice.fetched;
    });

    // check the current approval status
    const approvalState: ApprovalState = useMemo(() => {
        if (!amountToApprove || !spender) return ApprovalState.UNKNOWN;
        if (amountToApprove.currency.isNative) return ApprovalState.APPROVED;
        // we might not have enough data to know whether or not we need to approve
        if (!currentAllowance) return ApprovalState.UNKNOWN;

        // amountToApprove will be defined if currentAllowance is
        return currentAllowance.lessThan(amountToApprove) ? (pendingApproval ? ApprovalState.PENDING : ApprovalState.NOT_APPROVED) : ApprovalState.APPROVED;
    }, [amountToApprove, currentAllowance, pendingApproval, spender]);

    const tokenContract = useTokenContract(token?.address);
    const addTransaction = useTransactionAdder();

    const approve = useCallback(async (): Promise<void> => {
        if (approvalState !== ApprovalState.NOT_APPROVED) {
            console.error("approve was called unnecessarily");
            return;
        }
        if (!chainId) {
            console.error("no chainId");
            return;
        }

        if (!token) {
            console.error("no token");
            return;
        }

        if (!tokenContract) {
            console.error("tokenContract is null");
            return;
        }

        if (!amountToApprove) {
            console.error("missing amount to approve");
            return;
        }

        if (!spender) {
            console.error("no spender");
            return;
        }

        const exactToApprove = amountToApprove.quotient.toString();

        const estimatedGas = await tokenContract.approve.estimateGas(spender, exactToApprove).catch(() => {
            // general fallback for tokens who restrict approval amounts
            return tokenContract.approve.estimateGas(spender, amountToApprove.quotient.toString());
        });

        return tokenContract
            .approve(spender, exactToApprove, {
                gasLimit: calculateGasMargin(chainId, estimatedGas),
                gasPrice: gasPrice * GAS_PRICE_MULTIPLIER,
            })
            .then((response: TransactionResponse) => {
                addTransaction(response, {
                    summary: t`Approved ` + (amountToApprove.currency.symbol || t`LP-tokens`),
                    approval: { tokenAddress: token.address, spender: spender },
                });
            })
            .catch((error: Error) => {
                console.debug("Failed to approve token", error);
                // throw error
            });
    }, [approvalState, token, tokenContract, amountToApprove, spender, addTransaction, chainId]);

    return [approvalState, approve];
}

// wraps useApproveCallback in the context of a swap
export function useApproveCallbackFromTrade(trade: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType> | undefined, allowedSlippage: Percent) {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const v3SwapRouterAddress = chainId ? SWAP_ROUTER_ADDRESSES[chainId] : undefined;
    const amountToApprove = useMemo(() => (trade && trade.inputAmount.currency.isToken ? trade.maximumAmountIn(allowedSlippage) : undefined), [trade, allowedSlippage]);
    return useApproveCallback(amountToApprove, chainId ? (trade instanceof V3Trade ? v3SwapRouterAddress : undefined) : undefined);
}
