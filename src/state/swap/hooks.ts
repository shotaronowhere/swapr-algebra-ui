import { t } from "@lingui/macro";
import JSBI from "jsbi";
import { Trade as V3Trade } from "lib/src";
import { useBestV3TradeExactIn, useBestV3TradeExactOut, V3TradeState } from "../../hooks/useBestV3Trade";
import useENS from "../../hooks/useENS";
import { parseUnits } from "ethers";
import { Currency, CurrencyAmount, Percent, TradeType } from "@uniswap/sdk-core";
import { Trade as V2Trade } from "@uniswap/v2-sdk";
import { ParsedQs } from "qs";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useCurrency } from "../../hooks/Tokens";
import useSwapSlippageTolerance from "../../hooks/useSwapSlippageTolerance";
import useParsedQueryString from "../../hooks/useParsedQueryString";
import { isAddress } from "../../utils";
import { AppState } from "../index";
import { useCurrencyBalances } from "../wallet/hooks";
import { Field, replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput } from "./actions";
import { SwapState } from "./reducer";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { ListenerOptions } from "../multicall/hooks";

import AlgebraConfig from "algebra.config";

export function useSwapState(): AppState["swap"] {
    return useAppSelector((state) => state.swap);
}

export function useSwapActionHandlers(): {
    onCurrencySelection: (field: Field, currency: Currency) => void;
    onSwitchTokens: () => void;
    onUserInput: (field: Field, typedValue: string) => void;
    onChangeRecipient: (recipient: string | null) => void;
} {
    const dispatch = useAppDispatch();

    const onCurrencySelection = useCallback(
        (field: Field, currency: Currency) => {
            dispatch(
                selectCurrency({
                    field,
                    currencyId: currency.isToken ? currency.address : currency.isNative ? AlgebraConfig.CHAIN_PARAMS.nativeCurrency.symbol : "",
                })
            );
        },
        [dispatch]
    );

    const onSwitchTokens = useCallback(() => {
        dispatch(switchCurrencies());
    }, [dispatch]);

    const onUserInput = useCallback(
        (field: Field, typedValue: string) => {
            dispatch(typeInput({ field, typedValue }));
        },
        [dispatch]
    );

    const onChangeRecipient = useCallback(
        (recipient: string | null) => {
            dispatch(setRecipient({ recipient }));
        },
        [dispatch]
    );

    return {
        onSwitchTokens,
        onCurrencySelection,
        onUserInput,
        onChangeRecipient,
    };
}

// try to parse a user entered amount for a given token
export function tryParseAmount<T extends Currency>(value?: string, currency?: T): CurrencyAmount<T> | undefined {
    if (!value || !currency) {
        return undefined;
    }
    try {
        const typedValueParsed = parseUnits(value, currency.decimals).toString();
        if (typedValueParsed !== "0") {
            return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed));
        }
    } catch (error) {
        // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
        console.debug(`Failed to parse input amount: "${value}"`, error);
    }
    // necessary for all paths to return a value
    return undefined;
}

const BAD_RECIPIENT_ADDRESSES: { [address: string]: true } = {
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": true, // v2 factory
    "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a": true, // v2 router 01
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": true, // v2 router 02
};

// from the current swap inputs, compute the best trade and return it.
export function useDerivedSwapInfo(): {
    currencies: { [field in Field]?: Currency };
    currencyBalances: { [field in Field]?: CurrencyAmount<Currency> };
    parsedAmount: CurrencyAmount<Currency> | undefined;
    inputError?: string;
    v2Trade: V2Trade<Currency, Currency, TradeType> | undefined;
    v3TradeState: { trade: V3Trade<Currency, Currency, TradeType> | null; state: V3TradeState };
    toggledTrade: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType> | undefined;
    allowedSlippage: Percent;
} {
    const { address: account } = useAccount();

    const {
        independentField,
        typedValue,
        [Field.INPUT]: { currencyId: inputCurrencyId },
        [Field.OUTPUT]: { currencyId: outputCurrencyId },
        recipient,
    } = useSwapState();

    const inputCurrency = useCurrency(inputCurrencyId);
    const outputCurrency = useCurrency(outputCurrencyId);

    // const recipientLookup = useENS(recipient ?? undefined); // Temporarily disable ENS lookup for recipient
    const to: string | null = (recipient === null ? account : recipient) ?? null; // Use raw recipient or account directly

    const currenciesForBalance = useMemo(() => [
        inputCurrency ?? undefined,
        outputCurrency ?? undefined
    ], [inputCurrency, outputCurrency]);

    const relevantTokenBalances = useCurrencyBalances(account ?? undefined, currenciesForBalance);

    const isExactIn: boolean = independentField === Field.INPUT;
    const parsedAmount = tryParseAmount(typedValue, (isExactIn ? inputCurrency : outputCurrency) ?? undefined);

    // Define listener options for fetching pool data less frequently
    const tradeListenerOptions: ListenerOptions = useMemo(() => ({ blocksPerFetch: 5 }), []);

    // const bestV2TradeExactIn = useV2TradeExactIn(isExactIn ? parsedAmount : undefined, outputCurrency ?? undefined, {
    //   maxHops: singleHopOnly ? 1 : undefined,
    // })
    // const bestV2TradeExactOut = useV2TradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmount : undefined, {
    //   maxHops: singleHopOnly ? 1 : undefined,
    // })

    const bestV3TradeExactIn = useBestV3TradeExactIn(isExactIn ? parsedAmount : undefined, outputCurrency ?? undefined, tradeListenerOptions);
    const bestV3TradeExactOut = useBestV3TradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmount : undefined, tradeListenerOptions);

    // const v2Trade = isExactIn ? bestV2TradeExactIn : bestV2TradeExactOut
    const v3Trade = (isExactIn ? bestV3TradeExactIn : bestV3TradeExactOut) ?? undefined;

    const currencyBalances = {
        [Field.INPUT]: relevantTokenBalances[0],
        [Field.OUTPUT]: relevantTokenBalances[1],
    };

    const currencies: { [field in Field]?: Currency } = {
        [Field.INPUT]: inputCurrency ?? undefined,
        [Field.OUTPUT]: outputCurrency ?? undefined,
    };

    let inputError: string | undefined;
    if (!account) {
        inputError = t`Connect Wallet`;
    }

    if (!parsedAmount) {
        inputError = inputError ?? t`Enter an amount`;
    }

    if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
        inputError = inputError ?? t`Select a token`;
    }

    const formattedTo = isAddress(to);
    if (!to || !formattedTo) {
        inputError = inputError ?? t`Enter a recipient`;
    } else {
        if (
            BAD_RECIPIENT_ADDRESSES[formattedTo]
            // (bestV2TradeExactIn && involvesAddress(bestV2TradeExactIn, formattedTo)) ||
            // (bestV2TradeExactOut && involvesAddress(bestV2TradeExactOut, formattedTo))
        ) {
            inputError = inputError ?? t`Invalid recipient`;
        }
    }

    const toggledTrade = v3Trade.trade ?? undefined;
    const allowedSlippage = useSwapSlippageTolerance(toggledTrade);

    // compare input balance to max input based on version
    const [balanceIn, amountIn] = [currencyBalances[Field.INPUT], relevantTokenBalances[Field.INPUT]];

    if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
        inputError = t`Insufficient ${amountIn.currency.symbol || ''} balance`;
    }

    return {
        currencies,
        currencyBalances,
        parsedAmount,
        inputError,
        v2Trade: undefined,
        v3TradeState: v3Trade,
        toggledTrade,
        allowedSlippage,
    };
}

function parseCurrencyFromURLParameter(urlParam: any, chainId: number): string {
    let chainSymbol;

    if (chainId === AlgebraConfig.CHAIN_PARAMS.chainId) {
        chainSymbol = AlgebraConfig.CHAIN_PARAMS.nativeCurrency.symbol;
    }

    if (typeof urlParam === "string") {
        const valid = isAddress(urlParam);
        if (valid) return valid;
        if (urlParam.toUpperCase() === chainSymbol) return chainSymbol;
    }
    return "";
}

function parseTokenAmountURLParameter(urlParam: any): string {
    return typeof urlParam === "string" && !isNaN(parseFloat(urlParam)) ? urlParam : "";
}

function parseIndependentFieldURLParameter(urlParam: any): Field {
    return typeof urlParam === "string" && urlParam.toLowerCase() === "output" ? Field.OUTPUT : Field.INPUT;
}

const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/;
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validatedRecipient(recipient: any): string | null {
    if (typeof recipient !== "string") return null;
    const address = isAddress(recipient);
    if (address) return address;
    if (ENS_NAME_REGEX.test(recipient)) return recipient;
    if (ADDRESS_REGEX.test(recipient)) return recipient;
    return null;
}

export function queryParametersToSwapState(parsedQs: ParsedQs, chainId: number): SwapState {
    let inputCurrency = parseCurrencyFromURLParameter(parsedQs.inputCurrency, chainId);
    let outputCurrency = parseCurrencyFromURLParameter(parsedQs.outputCurrency, chainId);
    if (inputCurrency === "" && outputCurrency === "") {
        // default to ETH input
        if (chainId === AlgebraConfig.CHAIN_PARAMS.chainId) {
            inputCurrency = AlgebraConfig.CHAIN_PARAMS.nativeCurrency.symbol;
        }
    } else if (inputCurrency === outputCurrency) {
        // clear output if identical
        outputCurrency = "";
    }

    const recipient = validatedRecipient(parsedQs.recipient);

    return {
        [Field.INPUT]: {
            currencyId: inputCurrency,
        },
        [Field.OUTPUT]: {
            currencyId: outputCurrency,
        },
        typedValue: parseTokenAmountURLParameter(parsedQs.exactAmount),
        independentField: parseIndependentFieldURLParameter(parsedQs.exactField),
        recipient,
    };
}

// updates the swap state to use the defaults for a given network
export function useDefaultsFromURLSearch(): { inputCurrencyId: string | undefined; outputCurrencyId: string | undefined } | undefined {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const dispatch = useAppDispatch();
    const parsedQs = useParsedQueryString();
    const [result, setResult] = useState<{ inputCurrencyId: string | undefined; outputCurrencyId: string | undefined } | undefined>();

    useEffect(() => {
        if (!chainId) return;
        const parsed = queryParametersToSwapState(parsedQs, chainId);

        dispatch(
            replaceSwapState({
                typedValue: parsed.typedValue,
                field: parsed.independentField,
                inputCurrencyId: parsed[Field.INPUT].currencyId,
                outputCurrencyId: parsed[Field.OUTPUT].currencyId,
                recipient: parsed.recipient,
            })
        );

        setResult({
            inputCurrencyId: parsed[Field.INPUT].currencyId,
            outputCurrencyId: parsed[Field.OUTPUT].currencyId,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, chainId]);

    return result;
}
