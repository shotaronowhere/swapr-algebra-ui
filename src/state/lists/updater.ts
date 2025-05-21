import { useCallback, useEffect } from "react";
import useInterval from "../../hooks/useInterval";
import { useAccount, usePublicClient } from "wagmi";
import { useAppDispatch } from "../hooks";
import useIsWindowVisible from "../../hooks/useIsWindowVisible";
import { useActiveListUrls, useAllLists } from "./hooks";
import { useFetchListCallback } from "../../hooks/useFetchListCallback";
import { acceptListUpdate } from "./actions";
import { UNSUPPORTED_LIST_URLS } from "../../constants/lists";
import { VersionUpgrade, getVersionUpgrade, minVersionBump } from "@uniswap/token-lists";
import { publicClientToProvider } from "../../utils/ethersAdapters";

export default function Updater(): null {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const publicClient = usePublicClient({ chainId });
    const provider = publicClient ? publicClientToProvider(publicClient) : undefined;
    const dispatch = useAppDispatch();
    const isWindowVisible = useIsWindowVisible();

    // get all loaded lists, and the active urls
    const lists = useAllLists();
    const activeListUrls = useActiveListUrls();

    const fetchList = useFetchListCallback();
    const fetchAllListsCallback = useCallback(() => {
        if (!isWindowVisible) return;
        Object.keys(lists).forEach((url) => fetchList(url).catch((error) => console.debug("interval list fetching error", error)));
    }, [fetchList, isWindowVisible, lists]);

    // useEffect(() => {
    //     if (chainId && [100].includes(chainId)) {
    //         dispatch(enableList(HONEYSWAP_LIST));
    //     }
    // }, [chainId, dispatch]);
    // fetch all lists every 10 minutes, but only after we initialize provider
    useInterval(fetchAllListsCallback, provider ? 1000 * 60 * 10 : null);

    // whenever a list is not loaded and not loading, try again to load it
    useEffect(() => {
        Object.keys(lists).forEach((listUrl) => {
            const list = lists[listUrl];
            if (!list.current && !list.loadingRequestId && !list.error) {
                fetchList(listUrl).catch((error) => console.debug("list added fetching error", error));
            }
        });
    }, [dispatch, fetchList, provider, lists]);

    // if any lists from unsupported lists are loaded, check them too (in case new updates since last visit)
    useEffect(() => {
        UNSUPPORTED_LIST_URLS.forEach((listUrl) => {
            const list = lists[listUrl];
            if (!list || (!list.current && !list.loadingRequestId && !list.error)) {
                fetchList(listUrl).catch((error) => console.debug("list added fetching error", error));
            }
        });
    }, [dispatch, fetchList, provider, lists]);

    // automatically update lists if versions are minor/patch
    useEffect(() => {
        Object.keys(lists).forEach((listUrl) => {
            const list = lists[listUrl];
            if (list.current && list.pendingUpdate) {
                const bump = getVersionUpgrade(list.current.version, list.pendingUpdate.version);
                switch (bump) {
                    case VersionUpgrade.NONE:
                        throw new Error("unexpected no version bump");
                    case VersionUpgrade.PATCH:
                    case VersionUpgrade.MINOR:
                        const min = minVersionBump(list.current.tokens, list.pendingUpdate.tokens);
                        // automatically update minor/patch as long as bump matches the min update
                        if (bump >= min) {
                            dispatch(acceptListUpdate(listUrl));
                        } else {
                            console.error(
                                `List at url ${listUrl} could not automatically update because the version bump was only PATCH/MINOR while the update had breaking changes and should have been MAJOR`
                            );
                        }
                        break;

                    // update any active or inactive lists
                    case VersionUpgrade.MAJOR:
                        dispatch(acceptListUpdate(listUrl));
                }
            }
        });
    }, [dispatch, lists, activeListUrls]);

    return null;
}
