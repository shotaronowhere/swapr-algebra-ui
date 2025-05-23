import { t, Trans } from "@lingui/macro";
import { TokenList } from "@uniswap/token-lists";
import Card from "components/Card";
import { UNSUPPORTED_LIST_URLS } from "constants/lists";
import { useListColor } from "hooks/useColor";
import { useAccount } from "wagmi";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Settings } from "react-feather";
import { usePopper } from "react-popper";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { useFetchListCallback } from "../../hooks/useFetchListCallback";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import useTheme from "../../hooks/useTheme";
import useToggle from "../../hooks/useToggle";
import { acceptListUpdate, disableList, enableList, removeList } from "../../state/lists/actions";
import { useActiveListUrls, useAllLists, useIsListActive } from "../../state/lists/hooks";
import { ExternalLink, IconWrapper, TYPE } from "../../theme";
import listVersionLabel from "../../utils/listVersionLabel";
import { parseENSAddress } from "../../utils/parseENSAddress";
import uriToHttp from "../../utils/uriToHttp";
import { ButtonEmpty, ButtonPrimary } from "../Button";
import Column, { AutoColumn } from "../Column";
import ListLogo from "../ListLogo";
import Row, { RowBetween, RowFixed } from "../Row";
import ListToggle from "../Toggle/ListToggle";
import { CurrencyModalView } from "./CurrencySearchModal";
import {
    ListContainer,
    ManageWrapper,
    PaddedColumn,
    PopoverContainer,
    RowWrapper,
    SearchInput,
    Separator,
    SeparatorDark,
    StyledListUrlText,
    StyledMenu,
    StyledTitleText,
    UnpaddedLinkStyledButton,
} from "./styled";

function listUrlRowHTMLId(listUrl: string) {
    return `list-row-${listUrl.replace(/\./g, "-")}`;
}

const ListRow = memo(function ListRow({ listUrl }: { listUrl: string }) {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const listsByUrl = useAppSelector((state) => state.lists.byUrl);
    const dispatch = useAppDispatch();
    const { current: list, pendingUpdate: pending } = listsByUrl[listUrl];

    const activeTokensOnThisChain = useMemo(() => {
        if (!list || !chainId) {
            return 0;
        }
        return list.tokens.reduce((acc, cur) => (cur.chainId === chainId ? acc + 1 : acc), 0);
    }, [chainId, list]);

    const theme = useTheme();
    const listColor = useListColor(list?.logoURI);
    const isActive = useIsListActive(listUrl);

    const [open, toggle] = useToggle(false);
    const node = useRef<HTMLDivElement>();
    const [referenceElement, setReferenceElement] = useState<HTMLDivElement>();
    const [popperElement, setPopperElement] = useState<HTMLDivElement>();

    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: "auto",
        strategy: "fixed",
        modifiers: [{ name: "offset", options: { offset: [8, 8] } }],
    });

    useOnClickOutside(node, open ? toggle : undefined);

    const handleAcceptListUpdate = useCallback(() => {
        if (!pending) return;
        dispatch(acceptListUpdate(listUrl));
    }, [dispatch, listUrl, pending]);

    const handleRemoveList = useCallback(() => {
        if (window.prompt(t`Please confirm you would like to remove this list by typing REMOVE`) === `REMOVE`) {
            dispatch(removeList(listUrl));
        }
    }, [dispatch, listUrl]);

    const handleEnableList = useCallback(() => {
        dispatch(enableList(listUrl));
    }, [dispatch, listUrl]);

    const handleDisableList = useCallback(() => {
        dispatch(disableList(listUrl));
    }, [dispatch, listUrl]);

    if (!list) return null;

    return (
        <RowWrapper active={isActive} hasActiveTokens={activeTokensOnThisChain > 0} bgColor={listColor} key={listUrl} id={listUrlRowHTMLId(listUrl)}>
            {list.logoURI ? (
                <ListLogo size="40px" style={{ marginRight: "1rem" }} logoURI={list.logoURI} alt={`${list.name} list logo`} />
            ) : (
                <div style={{ width: "24px", height: "24px", marginRight: "1rem" }} />
            )}
            <Column style={{ flex: "1" }}>
                <Row>
                    <StyledTitleText active={isActive}>{list.name}</StyledTitleText>
                </Row>
                <RowFixed mt="4px">
                    <StyledListUrlText active={isActive} mr="6px">
                        <Trans>{activeTokensOnThisChain} tokens</Trans>
                    </StyledListUrlText>
                    <StyledMenu ref={node as any}>
                        <ButtonEmpty onClick={toggle} ref={setReferenceElement} padding="0">
                            <Settings stroke={isActive ? theme.bg1 : theme.text1} size={12} />
                        </ButtonEmpty>
                        {open && (
                            <PopoverContainer show={true} ref={setPopperElement as any} style={styles.popper} {...attributes.popper}>
                                <div>{list && listVersionLabel(list.version)}</div>
                                <SeparatorDark />
                                <ExternalLink href={`https://tokenlists.org/token-list?url=${listUrl}`}>
                                    <Trans>View list</Trans>
                                </ExternalLink>
                                <UnpaddedLinkStyledButton onClick={handleRemoveList} disabled={Object.keys(listsByUrl).length === 1}>
                                    <Trans>Remove list</Trans>
                                </UnpaddedLinkStyledButton>
                                {pending && (
                                    <UnpaddedLinkStyledButton onClick={handleAcceptListUpdate}>
                                        <Trans>Update list</Trans>
                                    </UnpaddedLinkStyledButton>
                                )}
                            </PopoverContainer>
                        )}
                    </StyledMenu>
                </RowFixed>
            </Column>
            <ListToggle
                isActive={isActive}
                bgColor={listColor}
                toggle={() => {
                    isActive ? handleDisableList() : handleEnableList();
                }}
            />
        </RowWrapper>
    );
});

export function ManageLists({
    setModalView,
    setImportList,
    setListUrl,
}: {
    setModalView: (view: CurrencyModalView) => void;
    setImportList: (list: TokenList) => void;
    setListUrl: (url: string) => void;
}) {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const theme = useTheme();

    const [listUrlInput, setListUrlInput] = useState<string>("");

    const lists = useAllLists();

    const tokenCountByListName = useMemo<Record<string, number>>(
        () =>
            Object.values(lists).reduce((acc, { current: list }) => {
                if (!list) {
                    return acc;
                }
                return {
                    ...acc,
                    [list.name]: list.tokens.reduce((count: number, token) => (token.chainId === chainId ? count + 1 : count), 0),
                };
            }, {}),
        [chainId, lists]
    );

    // sort by active but only if not visible
    const activeListUrls = useActiveListUrls();

    const handleInput = useCallback((e) => {
        setListUrlInput(e.target.value);
    }, []);

    const fetchList = useFetchListCallback();

    const validUrl: boolean = useMemo(() => {
        return uriToHttp(listUrlInput).length > 0 || Boolean(parseENSAddress(listUrlInput));
    }, [listUrlInput]);

    const sortedLists = useMemo(() => {
        const listUrls = Object.keys(lists);
        return listUrls
            .filter((listUrl) => {
                // only show loaded lists, hide unsupported lists
                return Boolean(lists[listUrl].current) && !Boolean(UNSUPPORTED_LIST_URLS.includes(listUrl));
            })
            .sort((listUrlA, listUrlB) => {
                const { current: listA } = lists[listUrlA];
                const { current: listB } = lists[listUrlB];

                // first filter on active lists
                if (activeListUrls?.includes(listUrlA) && !activeListUrls?.includes(listUrlB)) {
                    return -1;
                }
                if (!activeListUrls?.includes(listUrlA) && activeListUrls?.includes(listUrlB)) {
                    return 1;
                }

                if (listA && listB) {
                    if (tokenCountByListName[listA.name] > tokenCountByListName[listB.name]) {
                        return -1;
                    }
                    if (tokenCountByListName[listA.name] < tokenCountByListName[listB.name]) {
                        return 1;
                    }
                    return listA.name.toLowerCase() < listB.name.toLowerCase() ? -1 : listA.name.toLowerCase() === listB.name.toLowerCase() ? 0 : 1;
                }
                if (listA) return -1;
                if (listB) return 1;
                return 0;
            });
    }, [lists, activeListUrls, tokenCountByListName]);

    // temporary fetched list for import flow
    const [tempList, setTempList] = useState<TokenList>();
    const [addError, setAddError] = useState<string | undefined>();

    useEffect(() => {
        async function fetchTempList() {
            fetchList(listUrlInput, false)
                .then((list) => setTempList(list))
                .catch(() => setAddError(t`Error importing list`));
        }

        // if valid url, fetch details for card
        if (validUrl) {
            fetchTempList();
        } else {
            setTempList(undefined);
            listUrlInput !== "" && setAddError(t`Enter valid list location`);
        }

        // reset error
        if (listUrlInput === "") {
            setAddError(undefined);
        }
    }, [fetchList, listUrlInput, validUrl]);

    // check if list is already imported
    const isImported = Object.keys(lists).includes(listUrlInput);

    // set list values and have parent modal switch to import list view
    const handleImport = useCallback(() => {
        if (!tempList) return;
        setImportList(tempList);
        setModalView(CurrencyModalView.importList);
        setListUrl(listUrlInput);
    }, [listUrlInput, setImportList, setListUrl, setModalView, tempList]);

    return (
        <ManageWrapper>
            <PaddedColumn gap="14px">
                <Row>
                    <SearchInput type="text" id="list-add-input" placeholder={t`https:// or ipfs:// or ENS name`} value={listUrlInput} onChange={handleInput} />
                </Row>
                {addError ? (
                    <TYPE.error title={addError} style={{ textOverflow: "ellipsis", overflow: "hidden" }} error>
                        {addError}
                    </TYPE.error>
                ) : null}
            </PaddedColumn>
            {tempList && (
                <PaddedColumn style={{ paddingTop: 0 }}>
                    <Card backgroundColor={theme.bg2} padding="12px 20px">
                        <RowBetween>
                            <RowFixed>
                                {tempList.logoURI && <ListLogo logoURI={tempList.logoURI} size="40px" />}
                                <AutoColumn gap="4px" style={{ marginLeft: "20px" }}>
                                    <TYPE.body fontWeight={600}>{tempList.name}</TYPE.body>
                                    <TYPE.main fontSize={"12px"}>
                                        <Trans>{tempList.tokens.length} tokens</Trans>
                                    </TYPE.main>
                                </AutoColumn>
                            </RowFixed>
                            {isImported ? (
                                <RowFixed>
                                    <IconWrapper stroke={theme.text2} size="16px" marginRight={"10px"}>
                                        <CheckCircle />
                                    </IconWrapper>
                                    <TYPE.body color={theme.text2}>
                                        <Trans>Loaded</Trans>
                                    </TYPE.body>
                                </RowFixed>
                            ) : (
                                <ButtonPrimary style={{ fontSize: "14px" }} padding="6px 8px" width="fit-content" onClick={handleImport}>
                                    <Trans>Import</Trans>
                                </ButtonPrimary>
                            )}
                        </RowBetween>
                    </Card>
                </PaddedColumn>
            )}
            <Separator />
            <ListContainer>
                <AutoColumn gap="md">
                    {sortedLists.map((listUrl) => (
                        <ListRow key={listUrl} listUrl={listUrl} />
                    ))}
                </AutoColumn>
            </ListContainer>
        </ManageWrapper>
    );
}
