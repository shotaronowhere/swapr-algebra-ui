import { WrappedCurrency } from "models/types";
import { Token, Currency } from "@uniswap/sdk-core";

import "./index.scss";
import CurrencyLogo from "components/CurrencyLogo";
import { ChevronRight } from "react-feather";
import { useCallback, useMemo, useState } from "react";
import CurrencySearchModal from "components/SearchModal/CurrencySearchModal";
import { useAccount } from "wagmi";
import { useCurrencyBalance } from "state/wallet/hooks";
import useUSDCPrice, { useUSDCValue } from "hooks/useUSDCPrice";
import { PriceFormats } from "../PriceFomatToggler";
import { t, Trans } from "@lingui/macro";
import { DEFAULT_LISTENER_OPTIONS } from "state/multicall/hooks";

interface ITokenCard {
    handleTokenSelection: (currency: Currency) => void;
    currency: Currency | null | undefined;
    otherCurrency: Currency | null | undefined;
    priceFormat: PriceFormats;
}

export function TokenCard({ handleTokenSelection, currency, otherCurrency, priceFormat }: ITokenCard) {
    const [selectModal, toggleSelectModal] = useState(false);

    const { address: account } = useAccount();

    const balance = useCurrencyBalance(account ?? undefined, currency ?? undefined);
    const currencyUSD = useUSDCPrice(currency ?? undefined, undefined, DEFAULT_LISTENER_OPTIONS);
    const fiatValue = useUSDCValue(balance ?? undefined, undefined, DEFAULT_LISTENER_OPTIONS);

    const handleDismissSearch = useCallback(() => {
        toggleSelectModal(false);
    }, [toggleSelectModal]);

    const _balance = useMemo(() => {
        if (priceFormat === PriceFormats.USD) {
            if (balance && currencyUSD) {
                return parseFloat(Number(+balance?.toSignificant(5) * +currencyUSD.toSignificant(5)).toFixed(4));
            }
        }
        if (balance) {
            return parseFloat(balance.toSignificant(5));
        }

        return "0";
    }, [priceFormat, balance, currencyUSD]);

    return (
        <div className="token-card p-1 mxs_w-100 mm_w-100" onClick={() => toggleSelectModal(true)}>
            {selectModal && (
                <CurrencySearchModal
                    isOpen={selectModal}
                    onDismiss={handleDismissSearch}
                    onCurrencySelect={handleTokenSelection}
                    selectedCurrency={currency}
                    otherSelectedCurrency={otherCurrency}
                    showCommonBases={true}
                    showCurrencyAmount={true}
                    disableNonToken={true}
                ></CurrencySearchModal>
            )}
            <div className="f mb-1">
                <div className="token-card-logo">
                    <CurrencyLogo size={"35px"} currency={currency as WrappedCurrency}></CurrencyLogo>
                </div>
                <div className={"f c f-jc ml-1"}>
                    {currency && (
                        <div className="token-card__balance b">
                            <Trans>BALANCE</Trans> ({currency.symbol})
                        </div>
                    )}
                    <div>{`${priceFormat === PriceFormats.USD && currency ? "$" : ""} ${currency ? _balance : t`No token selected (Debug: currency is ${currency === null ? 'null' : currency === undefined ? 'undefined' : 'present'})`}`}</div>
                </div>
            </div>
            <div className="token-card-selector">
                <button className="token-card-selector__btn f f-ac w-100 f-jb" onClick={() => toggleSelectModal(true)}>
                    <span>{currency ? `${currency.symbol} (Selected)` : "Select a token (Debug)"}</span>
                    <span className="token-card-selector__btn-chevron">
                        <ChevronRight className="ml-05" size={18} />
                    </span>
                </button>
            </div>
        </div>
    );
}
