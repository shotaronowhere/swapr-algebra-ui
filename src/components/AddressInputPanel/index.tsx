import { t, Trans } from "@lingui/macro";
import { ReactNode, useCallback, useContext } from "react";
import { ThemeContext } from "styled-components/macro";
import useENS from "../../hooks/useENS";
import { useAccount } from "wagmi";
import { ExternalLink, TYPE } from "../../theme";
import { ExplorerDataType, getExplorerLink } from "../../utils/getExplorerLink";
import { AutoColumn } from "../Column";
import { RowBetween } from "../Row";
import { ContainerRow, Input, InputContainer, InputPanel } from "./styled";

export default function AddressInputPanel({
    id,
    className = "recipient-address-input",
    label,
    placeholder,
    value,
    onChange,
}: {
    id?: string;
    className?: string;
    label?: ReactNode;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const theme = useContext(ThemeContext);

    const { address, loading, name } = useENS(value);

    const handleInput = useCallback(
        (event: any) => {
            const input = event.target.value;
            const withoutSpaces = input.replace(/\s+/g, "");
            onChange(withoutSpaces);
        },
        [onChange]
    );

    const error = Boolean(value.length > 0 && !loading && !address);

    return (
        <InputPanel id={id}>
            <ContainerRow error={error}>
                <InputContainer>
                    <AutoColumn gap="md">
                        <RowBetween>
                            <TYPE.black color={theme.text2} fontWeight={500} fontSize={14}>
                                {label ?? <Trans>Recipient</Trans>}
                            </TYPE.black>
                            {address && chainId && (
                                <ExternalLink href={getExplorerLink(chainId, name ?? address, ExplorerDataType.ADDRESS)} style={{ fontSize: "14px" }}>
                                    <Trans>(View on Explorer)</Trans>
                                </ExternalLink>
                            )}
                        </RowBetween>
                        <Input
                            className={className}
                            type="text"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            placeholder={placeholder ?? t`Wallet Address or ENS name`}
                            error={error}
                            pattern="^(0x[a-fA-F0-9]{40})$"
                            onChange={handleInput}
                            value={value}
                        />
                    </AutoColumn>
                </InputContainer>
            </ContainerRow>
        </InputPanel>
    );
}
