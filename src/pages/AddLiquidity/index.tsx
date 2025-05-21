import { useCallback, useContext, useState } from "react";
import { TransactionResponse } from "ethers";
import { Currency, CurrencyAmount, Percent } from "@uniswap/sdk-core";
import { FeeAmount } from "../../lib/src";
import { ZERO_PERCENT } from "../../constants/misc";
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from "../../constants/addresses";
import { useV3NFTPositionManagerContract } from "../../hooks/useContract";
import { RouteComponentProps } from "react-router-dom";
import { Text } from "rebass";
import { ThemeContext } from "styled-components/macro";
import { ButtonError, ButtonPrimary } from "../../components/Button";
import { AutoColumn } from "../../components/Column";
import TransactionConfirmationModal, { ConfirmationModalContent } from "../../components/TransactionConfirmationModal";
import CurrencyInputPanel from "../../components/CurrencyInputPanel";
import { RowBetween } from "../../components/Row";
import { useUSDCValue } from "../../hooks/useUSDCPrice";
import { calculateGasMargin } from "../../utils/calculateGasMargin";
import { Review } from "./Review";
import { useCurrency } from "../../hooks/Tokens";
import { ApprovalState, useApproveCallback } from "../../hooks/useApproveCallback";
import useTransactionDeadline from "../../hooks/useTransactionDeadline";
import { useWalletModalToggle } from "../../state/application/hooks";
import { Bound, Field } from "../../state/mint/v3/actions";
import { useTransactionAdder } from "../../state/transactions/hooks";
import { useIsExpertMode, useUserSlippageToleranceWithDefault } from "../../state/user/hooks";
import { TYPE } from "../../theme";
import { maxAmountSpend } from "../../utils/maxAmountSpend";
import { Dots } from "../Pool/styleds";
import { HideMedium, MediumOnly, RightContainer } from "./styled";
import { t, Trans } from "@lingui/macro";
import { useV3DerivedMintInfo, useV3MintActionHandlers, useV3MintState } from "state/mint/v3/hooks";
import { useV3PositionFromTokenId } from "hooks/useV3Positions";
import { useDerivedPositionInfo } from "hooks/useDerivedPositionInfo";
import { PositionPreview } from "components/PositionPreview";
import { AddRemoveTabs } from "components/NavigationTabs";
import { SwitchLocaleLink } from "components/SwitchLocaleLink";
import { NonfungiblePositionManager as NonFunPosMan } from "../../lib/src/nonfungiblePositionManager";
import "./index.scss";

import { useIsNetworkFailed } from "../../hooks/useIsNetworkFailed";

import ReactGA from "react-ga";
import { WrappedCurrency } from "../../models/types";
import Card from "../../shared/components/Card/Card";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { publicClientToProvider, walletClientToSigner } from "../../utils/ethersAdapters";

const DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE = new Percent(50, 10_000);

export default function AddLiquidity({
    match: {
        params: { currencyIdA, currencyIdB, tokenId },
    },
    history,
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string; feeAmount?: string; tokenId?: string }>) {
    const { address: account, chainId } = useAccount();
    const publicClient = usePublicClient({ chainId });
    const { data: walletClient } = useWalletClient({ chainId });

    const theme = useContext(ThemeContext);
    const toggleWalletModal = useWalletModalToggle();
    const expertMode = useIsExpertMode();
    const addTransaction = useTransactionAdder();
    const positionManager = useV3NFTPositionManagerContract();

    const { position: existingPositionDetails, loading: positionLoading } = useV3PositionFromTokenId(tokenId ? BigInt(tokenId) : undefined);

    const networkFailed = useIsNetworkFailed();

    const hasExistingPosition = !!existingPositionDetails && !positionLoading;
    const { position: existingPosition } = useDerivedPositionInfo(existingPositionDetails);
    const feeAmountFromUrl = 100;
    const feeAmount: FeeAmount = FeeAmount.LOWEST;

    const baseCurrency = useCurrency(currencyIdA);
    const currencyB = useCurrency(currencyIdB);
    const quoteCurrency = baseCurrency && currencyB && baseCurrency.wrapped.equals(currencyB.wrapped) ? undefined : currencyB;

    const { independentField, typedValue } = useV3MintState();

    const {
        ticks,
        dependentField,
        pricesAtTicks,
        parsedAmounts,
        currencyBalances,
        position,
        noLiquidity,
        currencies,
        errorMessage,
        invalidPool,
        invalidRange,
        outOfRange,
        depositADisabled,
        depositBDisabled,
        ticksAtLimit,
    } = useV3DerivedMintInfo(baseCurrency ?? undefined, quoteCurrency ?? undefined, feeAmount, baseCurrency ?? undefined, existingPosition);

    const { onFieldAInput, onFieldBInput } = useV3MintActionHandlers(noLiquidity);

    const isValid = !errorMessage && !invalidRange;

    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false);

    const deadline = useTransactionDeadline();
    const [txHash, setTxHash] = useState<string>("");

    const formattedAmounts = {
        [independentField]: typedValue,
        [dependentField]: parsedAmounts[dependentField]?.toSignificant(6) ?? "",
    };

    const usdcValues = {
        [Field.CURRENCY_A]: useUSDCValue(parsedAmounts[Field.CURRENCY_A]),
        [Field.CURRENCY_B]: useUSDCValue(parsedAmounts[Field.CURRENCY_B]),
    };

    const maxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce((accumulator, field) => {
        return {
            ...accumulator,
            [field]: maxAmountSpend(currencyBalances[field]),
        };
    }, {});

    const atMaxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce((accumulator, field) => {
        return {
            ...accumulator,
            [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? "0"),
        };
    }, {});

    const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined);
    const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined);

    const allowedSlippage = useUserSlippageToleranceWithDefault(outOfRange ? ZERO_PERCENT : DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE);

    async function onAdd() {
        if (!chainId || !publicClient || !walletClient || !account) return;

        if (!positionManager || !baseCurrency || !quoteCurrency) {
            return;
        }

        const ethersSigner = walletClientToSigner(walletClient);
        if (!ethersSigner) return;

        if (position && account && deadline) {
            const useNative = baseCurrency.isNative ? baseCurrency : quoteCurrency.isNative ? quoteCurrency : undefined;

            const { calldata, value } =
                hasExistingPosition && tokenId
                    ? NonFunPosMan.addCallParameters(position, {
                        tokenId: tokenId,
                        slippageTolerance: allowedSlippage,
                        deadline: deadline.toString(),
                        useNative,
                    })
                    : NonFunPosMan.addCallParameters(position, {
                        slippageTolerance: allowedSlippage,
                        recipient: account,
                        deadline: deadline.toString(),
                        useNative,
                        createPool: noLiquidity,
                    });

            const txn: { to: string; data: string; value: string } = { to: NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId], data: calldata, value };

            setAttemptingTxn(true);
            try {
                const estimate = await ethersSigner.estimateGas(txn);
                const newTxn = {
                    ...txn,
                    gasLimit: calculateGasMargin(chainId, estimate),
                };

                const response: TransactionResponse = await ethersSigner.sendTransaction(newTxn);

                setAttemptingTxn(false);
                addTransaction(response, {
                    summary: noLiquidity
                        ? baseCurrency?.symbol && quoteCurrency?.symbol && t`Create pool and add ${baseCurrency.symbol}/${quoteCurrency.symbol} liquidity` || ''
                        : baseCurrency?.symbol && quoteCurrency?.symbol && t`Add ${baseCurrency.symbol}/${quoteCurrency.symbol} liquidity` || '',
                });
                setTxHash(response.hash);
                ReactGA.event({
                    category: "Liquidity",
                    action: "Add",
                    label: [currencies[Field.CURRENCY_A]?.symbol, currencies[Field.CURRENCY_B]?.symbol].join("/"),
                });
            } catch (error: any) {
                console.error("Failed to send transaction", error);
                setAttemptingTxn(false);
                if (error?.code !== 4001) {
                    console.error("Transaction error:", error);
                }
            }
        } else {
            return;
        }
    }

    const mustCreateSeparately = noLiquidity;

    const handleDismissConfirmation = useCallback(() => {
        setShowConfirm(false);
        if (txHash) {
            onFieldAInput("");
            if (!mustCreateSeparately) {
                history.push("/pool");
            }
        }
        setTxHash("");
    }, [history, mustCreateSeparately, onFieldAInput, txHash]);

    const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = ticks;
    const { [Bound.LOWER]: priceLower, [Bound.UPPER]: priceUpper } = pricesAtTicks;

    const showApprovalA = approvalA !== ApprovalState.APPROVED && !!parsedAmounts[Field.CURRENCY_A];
    const showApprovalB = approvalB !== ApprovalState.APPROVED && !!parsedAmounts[Field.CURRENCY_B];

    const pendingText = "Loading...";

    const Buttons = () =>
        !account ? (
            <button className={"btn primary pv-1 br-12 b"} onClick={toggleWalletModal}>
                <Trans>Connect wallet</Trans>
            </button>
        ) : (
            <AutoColumn gap={"md"}>
                {(approvalA === ApprovalState.NOT_APPROVED || approvalA === ApprovalState.PENDING || approvalB === ApprovalState.NOT_APPROVED || approvalB === ApprovalState.PENDING) && isValid && (
                    <RowBetween>
                        {showApprovalA && (
                            <ButtonPrimary
                                onClick={approveACallback}
                                style={{ color: "white", background: theme.winterMainButton }}
                                disabled={approvalA === ApprovalState.PENDING}
                                width={showApprovalB ? "48%" : "100%"}
                            >
                                {approvalA === ApprovalState.PENDING ? (
                                    <Dots>
                                        <Trans>Approving {currencies[Field.CURRENCY_A]?.symbol}</Trans>
                                    </Dots>
                                ) : (
                                    <Trans>Approve {currencies[Field.CURRENCY_A]?.symbol}</Trans>
                                )}
                            </ButtonPrimary>
                        )}
                        {showApprovalB && (
                            <ButtonPrimary
                                onClick={approveBCallback}
                                style={{ color: "white", background: theme.winterMainButton }}
                                disabled={approvalB === ApprovalState.PENDING}
                                width={showApprovalA ? "48%" : "100%"}
                            >
                                {approvalB === ApprovalState.PENDING ? (
                                    <Dots>
                                        <Trans>Approving {currencies[Field.CURRENCY_B]?.symbol}</Trans>
                                    </Dots>
                                ) : (
                                    <Trans>Approve {currencies[Field.CURRENCY_B]?.symbol}</Trans>
                                )}
                            </ButtonPrimary>
                        )}
                    </RowBetween>
                )}
                <ButtonError
                    onClick={() => {
                        expertMode ? onAdd() : setShowConfirm(true);
                    }}
                    disabled={attemptingTxn || !isValid || (approvalA !== ApprovalState.APPROVED && !!parsedAmounts[Field.CURRENCY_A]) || (approvalB !== ApprovalState.APPROVED && !!parsedAmounts[Field.CURRENCY_B])}
                    error={!isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
                >
                    <Text fontWeight={500}>{errorMessage || <Trans>Preview</Trans>}</Text>
                </ButtonError>
            </AutoColumn>
        );

    return (
        <div className={"maw-765 mh-a"}>
            <TransactionConfirmationModal
                isOpen={showConfirm}
                onDismiss={handleDismissConfirmation}
                attemptingTxn={attemptingTxn}
                hash={txHash}
                content={() => (
                    <ConfirmationModalContent
                        title={t`Increase Liquidity`}
                        onDismiss={handleDismissConfirmation}
                        topContent={() => <Review position={position} outOfRange={outOfRange} ticksAtLimit={ticksAtLimit} />}
                        bottomContent={() => (
                            <button style={{ marginTop: "1rem" }} onClick={onAdd} className={"btn primary"}>
                                <Trans>Add</Trans>
                            </button>
                        )}
                    />
                )}
                pendingText={pendingText}
            />
            <Card classes={"card-gradient-shadow p-2 br-24"}>
                <AddRemoveTabs creating={false} adding={true} positionID={tokenId} defaultSlippage={DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE} showBackLink={!hasExistingPosition} />
                <div className={"add-liquidity pt-1 mt-1"} data-wide={!hasExistingPosition && !networkFailed}>
                    <AutoColumn gap="lg">
                        {hasExistingPosition && existingPosition && (
                            <PositionPreview position={existingPosition} title={<Trans>Selected Range</Trans>} inRange={!outOfRange} ticksAtLimit={ticksAtLimit} />
                        )}
                    </AutoColumn>
                    <Card isDark={false} classes={"add-liquidity__bottom p-1 br-12 card-bg"} data-disabled={tickLower === undefined || tickUpper === undefined || invalidPool || invalidRange}>
                        <TYPE.label>{hasExistingPosition ? <Trans>Add more liquidity</Trans> : <Trans>Deposit Amounts</Trans>}</TYPE.label>

                        <CurrencyInputPanel
                            value={formattedAmounts[Field.CURRENCY_A]}
                            onUserInput={onFieldAInput}
                            onMax={() => {
                                onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? "");
                            }}
                            showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
                            currency={currencies[Field.CURRENCY_A] as WrappedCurrency}
                            id="add-liquidity-input-tokena"
                            fiatValue={usdcValues[Field.CURRENCY_A]}
                            showCommonBases
                            locked={depositADisabled}
                            hideInput={depositADisabled}
                            shallow={true}
                            showBalance={!depositADisabled}
                            page={"addLiq"}
                            disabled={false}
                            swap={false}
                        />

                        <CurrencyInputPanel
                            value={formattedAmounts[Field.CURRENCY_B]}
                            onUserInput={onFieldBInput}
                            onMax={() => {
                                onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? "");
                            }}
                            showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
                            fiatValue={usdcValues[Field.CURRENCY_B]}
                            currency={currencies[Field.CURRENCY_B] as WrappedCurrency}
                            id="add-liquidity-input-tokenb"
                            showCommonBases
                            locked={depositBDisabled}
                            hideInput={depositBDisabled}
                            showBalance={!depositBDisabled}
                            shallow={true}
                            page={"addLiq"}
                            disabled={false}
                            swap={false}
                        />
                    </Card>
                    {!hasExistingPosition ? (
                        <>
                            <HideMedium>
                                <Buttons />
                            </HideMedium>
                            <RightContainer gap="lg">
                                <MediumOnly>
                                    <Buttons />
                                </MediumOnly>
                            </RightContainer>
                        </>
                    ) : (
                        <Buttons />
                    )}
                </div>
            </Card>
            <SwitchLocaleLink />
        </div>
    );
}
