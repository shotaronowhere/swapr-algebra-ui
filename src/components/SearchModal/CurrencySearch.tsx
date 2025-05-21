import { Currency, Token } from "@uniswap/sdk-core";
import { KeyboardEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, Trans } from "@lingui/macro";
import { FixedSizeList } from "react-window";
import { ExtendedEther } from "../../constants/tokens";
import { useAccount } from "wagmi";
import { useAllTokens, useIsUserAddedToken, useSearchInactiveTokenLists, useToken } from "../../hooks/Tokens";
import { CloseIcon, TYPE } from "../../theme";
import { isAddress } from "../../utils";
import Column from "../Column";
import CommonBases from "./CommonBases";
import CurrencyList from "./CurrencyList";
import { filterTokens, useSortedTokensByQuery } from "./filtering";
import { useTokenComparator } from "./sorting";
import { SearchInput } from "./styled";
import useToggle from "hooks/useToggle";
import { useOnClickOutside } from "hooks/useOnClickOutside";
import useTheme from "hooks/useTheme";
import ImportRow from "./ImportRow";
import useDebounce from "hooks/useDebounce";
import ReactGA from "react-ga";
import { Text } from "rebass";
import "./index.scss";

interface CurrencySearchProps {
    isOpen: boolean;
    onDismiss: () => void;
    selectedCurrency?: Currency | null;
    onCurrencySelect: (currency: Currency) => void;
    otherSelectedCurrency?: Currency | null;
    showCommonBases?: boolean;
    showCurrencyAmount?: boolean;
    disableNonToken?: boolean;
    showManageView: () => void;
    showImportView: () => void;
    setImportToken: (token: Token) => void;
}

export function CurrencySearch({
    selectedCurrency,
    onCurrencySelect,
    otherSelectedCurrency,
    showCommonBases,
    showCurrencyAmount,
    disableNonToken,
    onDismiss,
    isOpen,
    showImportView,
    setImportToken,
}: CurrencySearchProps) {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const theme = useTheme();

    const fixedList = useRef<FixedSizeList>();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const debouncedQuery = useDebounce(searchQuery, 200);

    const allTokens = useAllTokens();

    const isAddressSearch = isAddress(debouncedQuery);
    const searchToken = useToken(debouncedQuery);
    const searchTokenIsAdded = useIsUserAddedToken(searchToken);

    useEffect(() => {
        if (isAddressSearch) {
            ReactGA.event({
                category: "Currency Select",
                action: "Search by address",
                label: isAddressSearch,
            });
        }
    }, [isAddressSearch]);

    const [invertSearchOrder] = useState<boolean>(false);
    const tokenComparator = useTokenComparator(invertSearchOrder);

    const filteredTokens: Token[] = useMemo(() => {
        return filterTokens(Object.values(allTokens), debouncedQuery);
    }, [allTokens, debouncedQuery]);

    const sortedTokens: Token[] = useMemo(() => {
        return filteredTokens.sort(tokenComparator);
    }, [filteredTokens, tokenComparator]);

    const filteredSortedTokens = useSortedTokensByQuery(sortedTokens, debouncedQuery);

    const ether = useMemo(() => chainId && ExtendedEther.onChain(chainId), [chainId]);

    const filteredSortedTokensWithETH: Currency[] = useMemo(() => {
        const s = debouncedQuery.toLowerCase().trim();
        if (s === "x" || s === "xd" || s === "xda" || s === "xdai") {
            return ether ? [ether, ...filteredSortedTokens] : filteredSortedTokens;
        }
        return filteredSortedTokens;
    }, [debouncedQuery, ether, filteredSortedTokens]);

    const handleCurrencySelect = useCallback(
        (currency: Currency) => {
            onCurrencySelect(currency);
            onDismiss();
        },
        [onDismiss, onCurrencySelect]
    );

    useEffect(() => {
        if (isOpen) setSearchQuery("");
    }, [isOpen]);

    const inputRef = useRef<HTMLInputElement>();
    const handleInput = useCallback((event: any) => {
        const input = event.target.value;
        const checksummedInput = isAddress(input);
        setSearchQuery(checksummedInput || input);
        fixedList.current?.scrollTo(0);
    }, []);

    const handleEnter = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                const s = debouncedQuery.toLowerCase().trim();
                if (s === "xdai" && ether) {
                    handleCurrencySelect(ether);
                } else if (filteredSortedTokensWithETH.length > 0) {
                    if (filteredSortedTokensWithETH[0].symbol?.toLowerCase() === debouncedQuery.trim().toLowerCase() || filteredSortedTokensWithETH.length === 1) {
                        handleCurrencySelect(filteredSortedTokensWithETH[0]);
                    }
                }
            }
        },
        [debouncedQuery, ether, filteredSortedTokensWithETH, handleCurrencySelect]
    );

    const [open, toggle] = useToggle(false);
    const node = useRef<HTMLDivElement>();
    useOnClickOutside(node, open ? toggle : undefined);

    const filteredInactiveTokens = useSearchInactiveTokenLists(filteredTokens.length === 0 || (debouncedQuery.length > 2 && !isAddressSearch) ? debouncedQuery : undefined);

    return (
        <div className={"w-100"}>
            <div>
                <div className={"flex-s-between mb-1"}>
                    <Trans>Select a token</Trans>
                    <CloseIcon onClick={onDismiss} />
                </div>
                <SearchInput
                    type="text"
                    id="token-search-input"
                    placeholder={t`Search name or paste address`}
                    autoComplete="off"
                    value={searchQuery}
                    ref={inputRef as RefObject<HTMLInputElement>}
                    onChange={handleInput}
                    onKeyDown={handleEnter}
                />
                {showCommonBases && <CommonBases onSelect={handleCurrencySelect} selectedCurrency={selectedCurrency as Token | null} />}
            </div>
            {searchToken && !searchTokenIsAdded ? (
                <div>
                    <ImportRow token={searchToken} showImportView={showImportView} setImportToken={setImportToken} />
                </div>
            ) : filteredSortedTokens?.length > 0 || filteredInactiveTokens?.length > 0 ? (
                <div className={"h-200"} style={{ overflow: "auto" }}>
                    <CurrencyList
                        height={Infinity}
                        currencies={disableNonToken ? filteredSortedTokens : filteredSortedTokensWithETH}
                        otherListTokens={filteredInactiveTokens}
                        onCurrencySelect={handleCurrencySelect}
                        otherCurrency={otherSelectedCurrency}
                        selectedCurrency={selectedCurrency}
                        fixedListRef={fixedList}
                        showImportView={showImportView}
                        setImportToken={setImportToken}
                        showCurrencyAmount={showCurrencyAmount}
                    />
                </div>
            ) : (
                <Column style={{ padding: "20px", height: "auto" }}>
                    <TYPE.main color={theme.text3} textAlign="center" mb="20px">
                        <Trans>No results found.</Trans>
                    </TYPE.main>
                </Column>
            )}
        </div>
    );
}
