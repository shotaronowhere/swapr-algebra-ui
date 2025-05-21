import React, { ReactNode, useCallback, useMemo } from "react";
import { Trans } from "@lingui/macro";
import { Currency, Price, Token } from "@uniswap/sdk-core";
import { AutoColumn, ColumnCenter } from "components/Column";
import Loader from "components/Loader";
import { CloudOff, Inbox } from "react-feather";
import { batch } from "react-redux";
import { TYPE } from "../../theme";
import { Chart } from "./Chart";
import { useDensityChartData } from "./hooks";
import { format } from "d3";
import { Bound } from "state/mint/v3/actions";
import { FeeAmount } from "lib/src";
import { ZoomLevels } from "./types";
import { ChartWrapper } from "./styled";

import ReactGA from "react-ga";
import { tryParseAmount } from "state/swap/hooks";
import useUSDCPrice, { useUSDCValue } from "hooks/useUSDCPrice";
import { PriceFormats } from "pages/NewAddLiquidity/components/PriceFomatToggler";
import { useInitialTokenPrice, useInitialUSDPrices } from "state/mint/v3/hooks";

const ZOOM_LEVEL: ZoomLevels = {
    initialMin: 0.5,
    initialMax: 2,
    min: 0.01,
    max: 20,
};

function InfoBox({ message, icon }: { message?: ReactNode; icon: ReactNode }) {
    return (
        <ColumnCenter style={{ height: "100%", justifyContent: "center" }}>
            {icon}
            {message && (
                <TYPE.mediumHeader padding={10} marginTop="20px" textAlign="center">
                    {message}
                </TYPE.mediumHeader>
            )}
        </ColumnCenter>
    );
}

interface LiquidityChartRangeInputProps {
    currencyA: Currency | undefined;
    currencyB: Currency | undefined;
    feeAmount?: FeeAmount;
    ticksAtLimit: { [bound in Bound]?: boolean | undefined };
    price: number | undefined;
    priceLower?: Price<Token, Token>;
    priceUpper?: Price<Token, Token>;
    onLeftRangeInput: (typedValue: string) => void;
    onRightRangeInput: (typedValue: string) => void;
    interactive: boolean;
    priceFormat: PriceFormats;
}

export default function LiquidityChartRangeInput({
    currencyA,
    currencyB,
    feeAmount,
    ticksAtLimit,
    price,
    priceLower,
    priceUpper,
    onLeftRangeInput,
    onRightRangeInput,
    interactive,
    priceFormat,
}: LiquidityChartRangeInputProps) {
    const { isLoading, isUninitialized, isError, error, formattedData } = useDensityChartData({
        currencyA,
        currencyB,
        feeAmount,
        priceFormat,
    });

    const initialPrice = useInitialTokenPrice();
    const initialUSDPrices = useInitialUSDPrices();
    const currencyBUSD = useUSDCPrice(currencyB);

    const mockData = useMemo(() => {
        if (formattedData) return [];

        if (!initialPrice) return [];

        if (priceFormat === PriceFormats.TOKEN) {
            return [
                { activeLiquidity: 0, price0: +initialPrice * ZOOM_LEVEL.initialMin },
                { activeLiquidity: 0, price0: +initialPrice * ZOOM_LEVEL.initialMax },
            ];
        } else {
            if (currencyBUSD || (initialUSDPrices.CURRENCY_B && initialPrice)) {
                const price = currencyBUSD?.toSignificant(8) || initialUSDPrices.CURRENCY_B;
                return [
                    { activeLiquidity: 0, price0: +price * +initialPrice * ZOOM_LEVEL.initialMin },
                    { activeLiquidity: 0, price0: +price * +initialPrice * ZOOM_LEVEL.initialMax },
                ];
            }
            return [];
        }
    }, [initialPrice, initialUSDPrices, currencyBUSD, priceFormat]);

    const mockPrice = useMemo(() => {
        if (formattedData) return 0;

        if (!initialPrice) return 0;

        if (priceFormat === PriceFormats.TOKEN) {
            if (initialPrice) return +initialPrice;
        } else {
            if (currencyBUSD) return +currencyBUSD.toSignificant(5) * +initialPrice;
            if (initialUSDPrices.CURRENCY_B) return +initialUSDPrices.CURRENCY_B * +initialPrice;
        }

        return 0;
    }, [initialPrice, initialUSDPrices, currencyBUSD, priceFormat]);

    const isSorted = currencyA && currencyB && currencyA?.wrapped.sortsBefore(currencyB?.wrapped);

    const onBrushDomainChangeEnded = useCallback(
        (domain: any[], mode: string) => {
            let leftRangeValue = Number(domain[0]);
            const rightRangeValue = Number(domain[1]);

            if (leftRangeValue <= 0) {
                leftRangeValue = 1 / 10 ** 6;
            }

            batch(() => {
                //L-2
                // simulate user input for auto-formatting and other validations
                // if ((!ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER] || mode === "handle" || mode === "reset") && leftRangeValue > 0) {
                //     onLeftRangeInput(leftRangeValue.toFixed(6));
                // }
                // if ((!ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER] || mode === "reset") && rightRangeValue > 0) {
                //     // todo: remove this check. Upper bound for large numbers
                //     // sometimes fails to parse to tick.
                //     if (rightRangeValue < 1e35) {
                //         onRightRangeInput(rightRangeValue.toFixed(6));
                //     }
                // }
            });
        },
        [isSorted, onLeftRangeInput, onRightRangeInput, ticksAtLimit]
    );

    interactive = interactive && Boolean(formattedData?.length);

    const leftPrice = useMemo(() => {
        return isSorted ? priceLower : priceUpper?.invert();
    }, [isSorted, priceLower, priceUpper, priceFormat]);

    //TODO
    const leftPriceUSD = useUSDCValue(tryParseAmount(leftPrice ? (+leftPrice.toSignificant(5) < 0.00000001 ? undefined : Number(leftPrice.toSignificant(5)).toFixed(5)) : undefined, currencyB), true);

    const rightPrice = useMemo(() => {
        return isSorted ? priceUpper : priceLower?.invert();
    }, [isSorted, priceLower, priceUpper, priceFormat]);

    //TODO
    const rightPriceUSD = useUSDCValue(
        tryParseAmount(
            rightPrice ? (rightPrice.toSignificant(5) === "3384900000000000000000000000000000000000000000000" ? undefined : Number(rightPrice.toSignificant(5)).toFixed(5)) : undefined,
            currencyB
        ),
        true
    );

    const brushDomain: [number, number] | undefined = useMemo(() => {
        if (!leftPrice || !rightPrice) return;

        if (priceFormat === PriceFormats.USD && leftPriceUSD && rightPriceUSD) {
            return [parseFloat(leftPriceUSD.toSignificant(5)), parseFloat(rightPriceUSD.toSignificant(5))];
        }

        if (priceFormat === PriceFormats.USD && initialUSDPrices.CURRENCY_B) {
            return [parseFloat(String(+leftPrice.toSignificant(5) * +initialUSDPrices.CURRENCY_B)), parseFloat(String(+rightPrice.toSignificant(5) * +initialUSDPrices.CURRENCY_B))];
        }

        return [parseFloat(leftPrice.toSignificant(5)), parseFloat(rightPrice.toSignificant(5))];
    }, [leftPrice, rightPrice, leftPriceUSD, rightPriceUSD, priceFormat]);

    const brushLabelValue = useCallback(
        (d: "w" | "e", x: number) => {
            const _price = price || mockPrice;

            if (!_price) return "";

            if (d === "w" && ticksAtLimit[Bound.LOWER]) return "0";
            if (d === "e" && ticksAtLimit[Bound.UPPER]) return "∞";

            // const percent = (((x < price ? -1 : 1) * (Math.max(x, price) - Math.min(x, price))) / Math.min(x, price)) * 100

            const percent = (x < _price ? -1 : 1) * ((Math.max(x, _price) - Math.min(x, _price)) / _price) * 100;

            return _price ? `${format(Math.abs(percent) > 1 ? ".2~s" : ".2~f")(percent)}%` : "";
        },
        [price, priceFormat, ticksAtLimit, mockPrice]
    );

    if (isError) {
        ReactGA.exception({
            ...error,
            category: "Liquidity",
            fatal: false,
        });
    }

    return (
        <AutoColumn gap="md" style={{ minHeight: "260px" }}>
            {isUninitialized ? (
                <InfoBox message={<Trans>Your position will appear here.</Trans>} icon={<Inbox size={56} />} />
            ) : isLoading ? (
                <InfoBox icon={<Loader size="40px" stroke={"white"} />} />
            ) : isError ? (
                <InfoBox message={<Trans>Liquidity data not available.</Trans>} icon={<CloudOff size={56} />} />
            ) : !formattedData || formattedData.length === 0 || !price ? (
                // <InfoBox message={<Trans>There is no liquidity data.</Trans>} icon={<BarChart2 size={56} />} />
                <ChartWrapper>
                    <Chart
                        data={{ series: mockData, current: mockPrice }}
                        dimensions={{ width: 400, height: 175 }}
                        margins={{ top: 10, right: 0, bottom: 20, left: 0 }}
                        styles={{
                            area: {
                                selection: "#6f58f6",
                            },
                        }}
                        interactive={interactive}
                        brushLabels={brushLabelValue}
                        brushDomain={brushDomain}
                        onBrushDomainChange={onBrushDomainChangeEnded}
                        zoomLevels={ZOOM_LEVEL}
                        priceFormat={priceFormat}
                    />
                </ChartWrapper>
            ) : (
                <ChartWrapper>
                    <Chart
                        data={{ series: formattedData, current: price }}
                        dimensions={{ width: 400, height: 175 }}
                        margins={{ top: 10, right: 0, bottom: 20, left: 0 }}
                        styles={{
                            area: {
                                selection: "#008FFF",
                            },
                        }}
                        interactive={interactive}
                        brushLabels={brushLabelValue}
                        brushDomain={brushDomain}
                        onBrushDomainChange={onBrushDomainChangeEnded}
                        zoomLevels={ZOOM_LEVEL}
                        priceFormat={priceFormat}
                    />
                </ChartWrapper>
            )}
        </AutoColumn>
    );
}
