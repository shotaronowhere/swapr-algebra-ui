import { Currency, CurrencyAmount, Ether, Token } from "@uniswap/sdk-core";
import JSBI from "jsbi";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAllTokens } from "../../hooks/Tokens";
import { useMulticall2Contract } from "../../hooks/useContract";
import { isAddress } from "../../utils";
import { useMultipleContractSingleData, useSingleContractMultipleData, NEVER_RELOAD } from "../multicall/hooks";
import { Interface } from "ethers";
import ERC20ABI from "abis/erc20.json";
import usePrevious, { usePreviousNonEmptyObject } from "hooks/usePrevious";

/**
 * Returns a map of the given addresses to their eventually consistent ETH balances.
 */
export function useETHBalances(uncheckedAddresses?: (string | undefined)[]): {
    [address: string]: CurrencyAmount<Currency> | undefined;
} {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const multicallContract = useMulticall2Contract();

    const addresses: string[] = useMemo(
        () =>
            uncheckedAddresses
                ? uncheckedAddresses
                    .map(isAddress)
                    .filter((a): a is string => a !== false)
                    .sort()
                : [],
        [uncheckedAddresses]
    );

    const results = useSingleContractMultipleData(
        multicallContract,
        "getEthBalance",
        addresses.map((address) => [address]),
        NEVER_RELOAD
    );

    const balances = useMemo(
        () =>
            addresses.reduce<{ [address: string]: CurrencyAmount<Currency> }>((memo, address, i) => {
                const value = results?.[i]?.result?.[0];
                if (value && chainId) memo[address] = CurrencyAmount.fromRawAmount(Ether.onChain(chainId), JSBI.BigInt(value.toString()));
                return memo;
            }, {}),
        [addresses, chainId, results]
    );

    const prevBalances = usePreviousNonEmptyObject(balances);

    return useMemo(() => {
        if (!prevBalances) return {};

        if (Object.keys(balances).length === 0 && Object.keys(prevBalances).length !== 0) return prevBalances;

        return balances;
    }, [balances]);
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useTokenBalancesWithLoadingIndicator(address?: string, tokens?: (Token | undefined)[]): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
    const validatedTokens: Token[] = useMemo(() => tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false) ?? [], [tokens]);

    const validatedTokenAddresses = useMemo(() => validatedTokens.map((vt) => vt.address), [validatedTokens]);
    const erc20Interface = new Interface(ERC20ABI);

    // Memoize callInputs array
    const callInputs = useMemo(() => (address ? [address] : undefined), [address]);

    const balances = useMultipleContractSingleData(validatedTokenAddresses, erc20Interface, "balanceOf", callInputs, {
        gasRequired: 100_000,
        ...NEVER_RELOAD,
    });

    const _balances = useMemo(
        () =>
            address && validatedTokens.length > 0
                ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token, i) => {
                    const value = balances?.[i]?.result?.[0];
                    const amount = value ? JSBI.BigInt(value.toString()) : undefined;
                    if (amount) {
                        memo[token.address] = CurrencyAmount.fromRawAmount(token, amount);
                    }
                    return memo;
                }, {})
                : {},
        [address, validatedTokens, balances]
    );
    const prevBalances = usePreviousNonEmptyObject(_balances);

    const anyLoading: boolean = useMemo(() => balances.some((callState) => callState.loading), [_balances]);

    return useMemo(() => {
        if (!prevBalances) return [_balances, anyLoading];

        if (Object.keys(_balances).length === 0 && Object.keys(_balances).length !== 0) return [prevBalances, anyLoading];

        return [_balances, anyLoading];
    }, [anyLoading, _balances]);
}

export function useTokenBalances(address?: string, tokens?: (Token | undefined)[]): { [tokenAddress: string]: CurrencyAmount<Token> | undefined } {
    return useTokenBalancesWithLoadingIndicator(address, tokens)[0];
}

// get the balance for a single token/account combo
export function useTokenBalance(account?: string, token?: Token): CurrencyAmount<Token> | undefined {
    const tokenBalances = useTokenBalances(account, [token]);
    if (!token) return undefined;
    return tokenBalances[token.address];
}

export function useCurrencyBalances(account?: string, currencies?: (Currency | undefined)[]): (CurrencyAmount<Currency> | undefined)[] {
    const tokens = useMemo(() => currencies?.filter((currency): currency is Token => currency?.isToken ?? false) ?? [], [currencies]);

    const tokenBalances = useTokenBalances(account, tokens);
    const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies]);
    const ethBalance = useETHBalances(containsETH ? [account] : []);

    return useMemo(
        () =>
            currencies?.map((currency) => {
                if (!account || !currency) return undefined;
                if (currency.isToken) return tokenBalances[currency.address];
                if (currency.isNative) return ethBalance[account];
                return undefined;
            }) ?? [],
        [account, currencies, ethBalance, tokenBalances]
    );
}

export function useCurrencyBalance(account?: string, currency?: Currency): CurrencyAmount<Currency> | undefined {
    return useCurrencyBalances(account, [currency])[0];
}

// mimics useAllBalances
export function useAllTokenBalances(): { [tokenAddress: string]: CurrencyAmount<Token> | undefined } {
    const { address: account } = useAccount();
    const allTokens = useAllTokens();
    const allTokensArray = useMemo(() => Object.values(allTokens ?? {}), [allTokens]);
    const balances = useTokenBalances(account ?? undefined, allTokensArray);
    return balances ?? {};
}
